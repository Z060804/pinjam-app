<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Models\Peminjaman;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BorrowerLifecycleAndConflictTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test catalog query and category filtering.
     */
    public function test_catalog_query_and_category_filtering(): void
    {
        $resAll = $this->getJson('/api/item/jenis');
        $resAll->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNotEmpty($resAll->json('data'));

        // Filter category 1 (Ruangan)
        $resRuangan = $this->getJson('/api/item/jenis?id_jenis=1');
        $resRuangan->assertStatus(200);
        foreach ($resRuangan->json('data') as $item) {
            $this->assertEquals(1, $item['id_jenis']);
        }
    }

    /**
     * Test submission validation: missing fields, selesai before mulai, invalid items.
     */
    public function test_submission_validation_fails_on_invalid_data(): void
    {
        // 1. Empty payload
        $resEmpty = $this->postJson('/api/peminjaman', []);
        $resEmpty->assertStatus(422)
            ->assertJsonValidationErrors(['nama_peminjam', 'unit_kerja', 'mulai', 'selesai', 'keperluan', 'selected_items']);

        // 2. selesai earlier than mulai
        $resTime = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Budi Santoso',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-10-20 15:00:00',
            'selesai' => '2026-10-20 08:00:00',
            'keperluan' => 'Rapat',
            'selected_items' => [['item_id' => 1, 'jumlah' => 1]],
        ]);
        $resTime->assertStatus(422)->assertJsonValidationErrors(['selesai']);

        // 3. Requested quantity exceeds stock
        $room = ItemJenis::where('id_jenis', 1)->first();
        $resStock = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Budi Santoso',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-10-20 08:00:00',
            'selesai' => '2026-10-20 11:00:00',
            'keperluan' => 'Rapat',
            'selected_items' => [['item_id' => $room->id, 'jumlah' => 999]],
        ]);
        $resStock->assertStatus(422)->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * Test successful submission generates ID and stores multi-item details.
     */
    public function test_successful_multi_item_submission(): void
    {
        $items = ItemJenis::take(2)->get();
        $this->assertCount(2, $items);

        $payload = [
            'nama_peminjam' => 'Dra. Hj. Siti Aminah',
            'nip' => '197505122000032001',
            'unit_kerja' => 'Penyelenggara Haji dan Umrah',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-05 08:00:00',
            'selesai' => '2026-11-05 16:00:00',
            'keperluan' => 'Sosialisasi Kebijakan Haji Reguler',
            'selected_items' => [
                ['item_id' => $items[0]->id, 'jumlah' => 1],
                ['item_id' => $items[1]->id, 'jumlah' => 1],
            ],
        ];

        $response = $this->postJson('/api/peminjaman', $payload);
        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $idPeminjaman = $response->json('data.id_peminjaman');
        $this->assertNotEmpty($idPeminjaman);
        $this->assertStringStartsWith('PMJ-', $idPeminjaman);

        // Verify database persistence
        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $idPeminjaman,
            'nama_peminjam' => 'Dra. Hj. Siti Aminah',
            'status' => 'Menunggu Persetujuan',
        ]);

        // Verify tracking endpoint retrieves the created record
        $trackRes = $this->getJson("/api/peminjaman/{$idPeminjaman}");
        $trackRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id_peminjaman' => $idPeminjaman,
                    'nama_peminjam' => 'Dra. Hj. Siti Aminah',
                ],
            ]);
    }

    /**
     * Test conflict detection: overlapping time on approved booking is rejected.
     */
    public function test_overlapping_booking_on_approved_resource_is_rejected(): void
    {
        $item = ItemJenis::where('id_jenis', 1)->first();

        // 1. Create an approved booking
        $approvedBooking = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-999',
            'id' => 'PMJ-202611-999',
            'tgl_pengajuan' => '2026-11-01',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Pak Ahmad',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => '2026-11-10 08:00:00',
            'selesai' => '2026-11-10 12:00:00',
            'keperluan' => 'Acara Utama',
            'status' => 'Disetujui',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-999',
            'item_id' => $item->id,
            'jumlah' => $item->quantity, // full capacity
        ]);

        // 2. An overlapping booking (10:00 - 14:00) on same day must be rejected with 422
        $resConflict = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Ibu Farida',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-11-10 10:00:00',
            'selesai' => '2026-11-10 14:00:00',
            'keperluan' => 'Rapat Koordinasi',
            'selected_items' => [['item_id' => $item->id, 'jumlah' => 1]],
        ]);

        $resConflict->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonStructure(['message', 'conflicts']);

        // 3. A non-overlapping booking (13:00 - 16:00) on same day must succeed
        $resAvailable = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Ibu Farida',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-11-10 13:00:00',
            'selesai' => '2026-11-10 16:00:00',
            'keperluan' => 'Rapat Koordinasi Sore',
            'selected_items' => [['item_id' => $item->id, 'jumlah' => 1]],
        ]);

        $resAvailable->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * Test admin approval conflict prevention.
     */
    public function test_admin_cannot_approve_conflicting_booking(): void
    {
        $admin = User::first();
        $item = ItemJenis::where('id_jenis', 1)->first();

        // 1. Create first approved booking
        Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-888',
            'id' => 'PMJ-202611-888',
            'nip' => '198001012005011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'User A',
            'unit_kerja' => 'Unit A',
            'mulai' => '2026-11-15 08:00:00',
            'selesai' => '2026-11-15 12:00:00',
            'keperluan' => 'Acara A',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-888',
            'item_id' => $item->id,
            'jumlah' => $item->quantity,
        ]);

        // 2. Create second booking as pending
        $pending = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-889',
            'id' => 'PMJ-202611-889',
            'nip' => '198001012005011002',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'User B',
            'unit_kerja' => 'Unit B',
            'mulai' => '2026-11-15 09:00:00',
            'selesai' => '2026-11-15 11:00:00',
            'keperluan' => 'Acara B',
            'status' => 'Menunggu Persetujuan',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-889',
            'item_id' => $item->id,
            'jumlah' => 1,
        ]);

        // 3. Admin attempts to approve booking B -> should be rejected with 422 conflict
        $approveRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/peminjaman/{$pending->id_peminjaman}/status", [
            'status' => 'Disetujui',
        ]);

        $approveRes->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonStructure(['message', 'conflicts']);
    }

    /**
     * Test file upload submission with valid PDF.
     */
    public function test_submission_with_uploaded_file(): void
    {
        Storage::fake('local');
        $item = ItemJenis::first();

        $file = UploadedFile::fake()->createWithContent('surat_permohonan.pdf', "%PDF-1.4\n".str_repeat('A', 1024 * 50));

        $payload = [
            'nama_peminjam' => 'H. Suwandi, M.Pd.',
            'unit_kerja' => 'Madrasah Aliyah',
            'mulai' => '2026-12-01 08:00:00',
            'selesai' => '2026-12-01 14:00:00',
            'keperluan' => 'Ujian Sertifikasi Guru',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $item->id, 'jumlah' => 1],
            ]),
        ];

        $response = $this->post('/api/peminjaman', $payload);
        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $savedId = $response->json('data.id_peminjaman');
        $booking = Peminjaman::find($savedId);
        $this->assertNotNull($booking->surat_url);
        Storage::disk('local')->assertExists($booking->surat_url);
    }

    /**
     * Regression Test 1: Peminjaman biasa multi-hari (22-30 Oktober) hanya memblokir sesi pada tanggal mulai dan selesai.
     * Tanggal di antaranya (26-28 Oktober) kosong dan dapat dipesan.
     * Jadwal tumpang tindih pada tanggal awal/akhir ditolak dengan pesan bentrok informatif.
     */
    /**
     * Regression Test 1: Peminjaman multihari harian (22 s/d 30 Oktober, 08:00 - 15:00)
     * Setiap sesi harian aktif mencegah bentrok jadwal.
     * Pembatalan satu sesi harian membebaskan interval sesi tersebut tanpa memengaruhi sesi lainnya.
     */
    public function test_multiday_normal_booking_leaves_intermediate_dates_free_and_blocks_boundary_sessions(): void
    {
        $aula = ItemJenis::where('nama', 'like', '%Aula Lantai 3%')->first();
        $this->assertNotNull($aula);

        // 1. Ajukan peminjaman multi-hari (22 s/d 26 Oktober, 08:00 - 15:00)
        $bookingRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Panitia Bimtek Kemenag',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-26 15:00:00',
            'keperluan' => 'Pelatihan Penghulu Tingkat Kabupaten',
            'selected_items' => [
                ['item' => ['id' => $aula->id], 'jumlah' => 1],
            ],
        ]);
        $bookingRes->assertStatus(201);
        $rootId = $bookingRes->json('data.id_peminjaman');

        // Setujui seluruh sesi
        Peminjaman::where('id', $rootId)->orWhere('parent_id', $rootId)->update(['status' => 'Disetujui']);

        // 2. Tanggal tengah (24 Oktober) tumpang tindih jam (10:00 - 12:00) -> HARUS DITOLAK (422)
        $payloadIntermediate = [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Dra. Hj. Nurul Hidayah',
            'unit_kerja' => 'Penyelenggara Zawa',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-24 10:00:00',
            'selesai' => '2026-10-24 12:00:00',
            'keperluan' => 'Rapat Koordinasi Pengelolaan Wakaf',
            'selected_items' => [
                ['item' => ['id' => $aula->id], 'jumlah' => 1],
            ],
        ];
        $resInter = $this->postJson('/api/peminjaman', $payloadIntermediate);
        $resInter->assertStatus(422)->assertJson(['success' => false]);

        // 3. Batalkan sesi tanggal 24 Oktober secara individual
        $session24 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-24')->first();
        $this->assertNotNull($session24);
        $session24->update(['status' => 'Dibatalkan']);

        // 4. Setelah tanggal 24 dibatalkan, peminjaman tanggal 24 Oktober (10:00 - 12:00) -> HARUS BERHASIL (201)
        $resInterFree = $this->postJson('/api/peminjaman', $payloadIntermediate);
        $resInterFree->assertStatus(201)->assertJson(['success' => true]);

        // 5. Tanggal awal (22 Oktober) tetap aktif dan tumpang tindih jam (09:00 - 12:00) -> HARUS DITOLAK (422)
        $payloadStartConflict = [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Acara Tumpang Tindih Tanggal Awal',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 09:00:00',
            'selesai' => '2026-10-22 12:00:00',
            'keperluan' => 'Rapat Koordinasi Penma',
            'selected_items' => [
                ['item' => ['id' => $aula->id], 'jumlah' => 1],
            ],
        ];
        $resStartConflict = $this->postJson('/api/peminjaman', $payloadStartConflict);
        $resStartConflict->assertStatus(422)->assertJson(['success' => false]);
        $this->assertStringContainsString('Aula Lantai 3', $resStartConflict->json('message'));
        $this->assertStringContainsString('22 October 2026', $resStartConflict->json('message'));

        // 6. Tanggal awal batas jam bersentuhan (15:00 - 16:00) -> HARUS BERHASIL (201)
        $payloadTouching = [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Acara Jam Bersentuhan',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 15:00:00',
            'selesai' => '2026-10-22 16:00:00',
            'keperluan' => 'Evaluasi Sore Hari',
            'selected_items' => [
                ['item' => ['id' => $aula->id], 'jumlah' => 1],
            ],
        ];
        $resTouching = $this->postJson('/api/peminjaman', $payloadTouching);
        $resTouching->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * Regression Test 2: Peminjaman ruangan lain pada rentang tanggal yang sama tidak dianggap bentrok.
     */
    public function test_other_room_during_same_period_is_allowed(): void
    {
        $aula = ItemJenis::where('nama', 'like', '%Aula Lantai 3%')->first();
        $otherRoom = ItemJenis::where('nama', 'like', '%Ruang Rapat%')->first();
        $this->assertNotNull($aula);
        $this->assertNotNull($otherRoom);

        // Peminjaman aktif pada Aula Lantai 3
        $approved = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202610-098',
            'id' => 'PMJ-202610-098',
            'tgl_pengajuan' => '2026-10-15',
            'nama_peminjam' => 'Panitia A',
            'unit_kerja' => 'Unit A',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-30 15:00:00',
            'tgl_mulai' => '2026-10-22',
            'tgl_selesai' => '2026-10-30',
            'keperluan' => 'Acara Pelatihan Aula',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $approved->id_peminjaman,
            'item_id' => $aula->id,
            'jumlah' => 1,
        ]);

        // Pengajuan untuk Ruang Rapat pada tanggal 26-28 Oktober harus sukses (201)
        $payloadOther = [
            'nama_peminjam' => 'Drs. H. Ahmad',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-10-26 10:00:00',
            'selesai' => '2026-10-28 12:00:00',
            'keperluan' => 'Seleksi Berkas Administrasi',
            'selected_items' => [
                ['item_id' => $otherRoom->id, 'jumlah' => 1],
            ],
        ];

        $resOther = $this->postJson('/api/peminjaman', $payloadOther);
        $resOther->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * Regression Test 3: Jadwal yang benar-benar tidak bertumpang tindih diperbolehkan.
     */
    public function test_non_overlapping_schedule_is_allowed(): void
    {
        $aula = ItemJenis::where('nama', 'like', '%Aula Lantai 3%')->first();

        // Peminjaman aktif 22-30 Oktober
        $approved = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202610-097',
            'id' => 'PMJ-202610-097',
            'tgl_pengajuan' => '2026-10-15',
            'nama_peminjam' => 'Panitia Bimtek',
            'unit_kerja' => 'Bimas Islam',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-30 15:00:00',
            'keperluan' => 'Bimtek Rutin',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $approved->id_peminjaman,
            'item_id' => $aula->id,
            'jumlah' => 1,
        ]);

        // Pengajuan setelah 30 Oktober (misal 31 Oktober 08:00 - 15:00) harus sukses (201)
        $resAfter = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Drs. H. Mulyono',
            'unit_kerja' => 'Sekretariat',
            'mulai' => '2026-10-31 08:00:00',
            'selesai' => '2026-10-31 15:00:00',
            'keperluan' => 'Rapat Evaluasi Bulanan',
            'selected_items' => [
                ['item_id' => $aula->id, 'jumlah' => 1],
            ],
        ]);
        $resAfter->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * Regression Test 4: Pembatalan peminjaman membebaskan ketersediaan ruangan.
     */
    public function test_cancelled_booking_frees_availability(): void
    {
        $aula = ItemJenis::where('nama', 'like', '%Aula Lantai 3%')->first();

        // 1. Buat peminjaman aktif yang kemudian Dibatalkan
        $cancelled = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202610-096',
            'id' => 'PMJ-202610-096',
            'tgl_pengajuan' => '2026-10-15',
            'nama_peminjam' => 'Pemohon Batal',
            'unit_kerja' => 'Unit Terkait',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-30 15:00:00',
            'keperluan' => 'Acara yang dibatalkan',
            'status' => 'Dibatalkan',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $cancelled->id_peminjaman,
            'item_id' => $aula->id,
            'jumlah' => 1,
        ]);

        // 2. Karena status Dibatalkan, pengajuan pada rentang 26-28 Oktober harus sukses (201)
        $resNew = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Drs. H. Subarjo',
            'unit_kerja' => 'Keuangan',
            'mulai' => '2026-10-26 10:00:00',
            'selesai' => '2026-10-28 12:00:00',
            'keperluan' => 'Verifikasi Anggaran Akhir Tahun',
            'selected_items' => [
                ['item_id' => $aula->id, 'jumlah' => 1],
            ],
        ]);
        $resNew->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * Regression Test 5: Perbandingan batas waktu pada hari yang sama.
     */
    public function test_same_day_boundary_conditions(): void
    {
        $room = ItemJenis::where('nama', 'like', '%Ruang Rapat%')->first();

        // Peminjaman disetujui jam 08:00 - 12:00
        $approved = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-050',
            'id' => 'PMJ-202611-050',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Pagi',
            'unit_kerja' => 'Unit Pagi',
            'mulai' => '2026-11-12 08:00:00',
            'selesai' => '2026-11-12 12:00:00',
            'keperluan' => 'Rapat Pagi Koordinasi',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $approved->id_peminjaman,
            'item_id' => $room->id,
            'jumlah' => 1,
        ]);

        // Tepat di batas akhir (12:00 - 15:00) TIDAK BENTROK -> harus berhasil
        $resBoundary = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Siang',
            'unit_kerja' => 'Unit Siang',
            'mulai' => '2026-11-12 12:00:00',
            'selesai' => '2026-11-12 15:00:00',
            'keperluan' => 'Sesi Siang Tepat Batas',
            'selected_items' => [
                ['item_id' => $room->id, 'jumlah' => 1],
            ],
        ]);
        $resBoundary->assertStatus(201)->assertJson(['success' => true]);

        // Bertumpang tindih sebagian (11:30 - 13:00) HARUS BENTROK -> 422
        $resOverlap = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Nabrak',
            'unit_kerja' => 'Unit Nabrak',
            'mulai' => '2026-11-12 11:30:00',
            'selesai' => '2026-11-12 13:00:00',
            'keperluan' => 'Sesi Bertumpang Tindih',
            'selected_items' => [
                ['item_id' => $room->id, 'jumlah' => 1],
            ],
        ]);
        $resOverlap->assertStatus(422)->assertJson(['success' => false]);
    }

    /**
     * Regression Test 6: Peminjaman berulang hanya memblokir tanggal sesi aktualnya.
     */
    public function test_recurring_booking_only_blocks_actual_session_dates(): void
    {
        $aula = ItemJenis::where('nama', 'like', '%Aula Lantai 3%')->first();

        // Seri berulang tiap Senin: 2, 9, 16, 23 November 2026 (08:00 - 12:00)
        $parent = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-REC-P',
            'id' => 'PMJ-202611-REC-P',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-23',
            'tgl_pengajuan' => '2026-10-30',
            'nama_peminjam' => 'Pengajian Rutin Senin',
            'unit_kerja' => 'Bimas Islam',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'tgl_mulai' => '2026-11-02',
            'tgl_selesai' => '2026-11-02',
            'keperluan' => 'Kajian Rutin Senin Pagi',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create(['id_peminjaman' => $parent->id_peminjaman, 'item_id' => $aula->id, 'jumlah' => 1]);

        $child1 = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-REC-C1',
            'id' => 'PMJ-202611-REC-C1',
            'parent_id' => 'PMJ-202611-REC-P',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-23',
            'tgl_pengajuan' => '2026-10-30',
            'nama_peminjam' => 'Pengajian Rutin Senin',
            'unit_kerja' => 'Bimas Islam',
            'mulai' => '2026-11-09 08:00:00',
            'selesai' => '2026-11-09 12:00:00',
            'tgl_mulai' => '2026-11-09',
            'tgl_selesai' => '2026-11-09',
            'keperluan' => 'Kajian Rutin Senin Pagi',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create(['id_peminjaman' => $child1->id_peminjaman, 'item_id' => $aula->id, 'jumlah' => 1]);

        // Hari Selasa (3 November 2026) BUKAN hari sesi -> HARUS BERHASIL (201)
        $resTuesday = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Acara Selasa Bebas',
            'unit_kerja' => 'Madrasah',
            'mulai' => '2026-11-03 08:00:00',
            'selesai' => '2026-11-03 12:00:00',
            'keperluan' => 'Sosialisasi KSM Selasa',
            'selected_items' => [
                ['item_id' => $aula->id, 'jumlah' => 1],
            ],
        ]);
        $resTuesday->assertStatus(201)->assertJson(['success' => true]);

        // Hari Senin berikutnya (9 November 2026 09:00 - 11:00) MERUPAKAN hari sesi -> HARUS BENTROK (422)
        $resMondayConflict = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Acara Senin Bentrok',
            'unit_kerja' => 'Madrasah',
            'mulai' => '2026-11-09 09:00:00',
            'selesai' => '2026-11-09 11:00:00',
            'keperluan' => 'Acara yang menabrak pengajian',
            'selected_items' => [
                ['item_id' => $aula->id, 'jumlah' => 1],
            ],
        ]);
        $resMondayConflict->assertStatus(422)->assertJson(['success' => false]);
    }
}
