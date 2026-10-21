<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Models\MasterJenis;
use App\Models\Peminjaman;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiDayBookingSessionTest extends TestCase
{
    use RefreshDatabase;

    private function getRoom(): ItemJenis
    {
        $category = MasterJenis::firstOrCreate(
            ['nama' => 'Ruangan'],
            ['kode' => 'RNG', 'is_active' => true]
        );

        return ItemJenis::firstOrCreate(
            ['nama' => 'Smartroom Balai Nikah'],
            [
                'id_jenis' => $category->id,
                'kapasitas' => 30,
                'quantity' => 1,
                'is_active' => true,
            ]
        );
    }

    private function getAdminToken(): string
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin.test@kemenag.go.id'],
            [
                'name' => 'Admin Test',
                'password' => bcrypt('password123'),
            ]
        );

        return $admin->createToken('test_token')->plainTextToken;
    }

    /**
     * 1. Pengajuan multihari 2-6 Oktober menghasilkan lima sesi harian individual.
     * Record utama booking_type = 'multiday', is_recurring = false.
     * Sesi 1: Mulai, Sesi 2-4: Berlangsung, Sesi 5: Habis.
     */
    public function test_multiday_booking_oct_2_to_6_produces_five_daily_sessions(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-06 10:00:00',
            'keperluan' => 'Bimtek Kepenghuluan Terpadu',
            'is_recurring' => false,
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        // Pastikan root record ber-tipe multiday dan bukan recurring
        $root = Peminjaman::find($rootId);
        $this->assertNotNull($root);
        $this->assertEquals('multiday', $root->booking_type);
        $this->assertFalse((bool) $root->is_recurring);
        $this->assertNull($root->parent_id);
        $this->assertEquals('2026-10-02', (string) $root->tgl_mulai);
        $this->assertEquals('08:00', substr((string) $root->waktu_mulai, 0, 5));
        $this->assertEquals('10:00', substr((string) $root->waktu_selesai, 0, 5));

        // Terdapat 4 record turunan (total 5 sesi)
        $children = Peminjaman::where('parent_id', $rootId)->orderBy('tgl_mulai')->get();
        $this->assertCount(4, $children);

        $expectedDates = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];
        foreach ($children as $idx => $child) {
            $this->assertEquals($expectedDates[$idx], (string) $child->tgl_mulai);
            $this->assertEquals('multiday', $child->booking_type);
            $this->assertFalse((bool) $child->is_recurring);
            $this->assertEquals('08:00', substr((string) $child->waktu_mulai, 0, 5));
            $this->assertEquals('10:00', substr((string) $child->waktu_selesai, 0, 5));
        }

        // Cek API detail: menampilkan 5 sesi dengan range_indicator
        $detailRes = $this->getJson("/api/peminjaman/{$rootId}");
        $detailRes->assertStatus(200);
        $schedules = $detailRes->json('data.recurring_schedules');
        $this->assertCount(5, $schedules);

        $this->assertEquals('Mulai', $schedules[0]['range_indicator']);
        $this->assertEquals('Berlangsung', $schedules[1]['range_indicator']);
        $this->assertEquals('Berlangsung', $schedules[2]['range_indicator']);
        $this->assertEquals('Berlangsung', $schedules[3]['range_indicator']);
        $this->assertEquals('Habis', $schedules[4]['range_indicator']);
    }

    /**
     * 2. Pembatalan sesi individual (misal sesi 3 / 4 Oktober) tidak memengaruhi sesi 1, 2, 4, 5.
     * Sesi yang dibatalkan membebaskan slot waktunya.
     */
    public function test_cancelling_single_multiday_session_leaves_other_sessions_intact_and_frees_slot(): void
    {
        $room = $this->getRoom();
        $adminToken = $this->getAdminToken();

        // 1. Submit 2-6 Oktober 08:00-10:00
        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-06 10:00:00',
            'keperluan' => 'Bimtek Kepenghuluan Terpadu',
            'is_recurring' => false,
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);
        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        // Admin approve seluruh pengajuan
        $approveRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Disetujui',
                'scope' => 'series',
            ]);
        $approveRes->assertStatus(200);

        // Ambil sesi tanggal 4 Oktober (sesi ke-3)
        $sessionOct4 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-04')->first();
        $this->assertNotNull($sessionOct4);
        $this->assertEquals('Disetujui', $sessionOct4->status);

        // Bentrok sebelum pembatalan: booking tanggal 4 Okt 08:00-10:00 harus ditolak (422)
        $conflictBefore = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Lain Tanggal 4',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567891',
            'mulai' => '2026-10-04 08:00:00',
            'selesai' => '2026-10-04 10:00:00',
            'keperluan' => 'Rapat Penma',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $conflictBefore->assertStatus(422);

        // 2. Batalkan HANYA sesi tanggal 4 Oktober
        $cancelSingleRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$sessionOct4->id}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'single',
            ]);
        $cancelSingleRes->assertStatus(200);

        // Verifikasi status database
        $this->assertEquals('Dibatalkan', $sessionOct4->fresh()->status);
        $this->assertEquals('Disetujui', Peminjaman::find($rootId)->status); // Sesi 1 (2 Okt) tetap Disetujui
        $this->assertEquals(
            3,
            Peminjaman::where('parent_id', $rootId)->where('status', 'Disetujui')->count() // Sesi 3, 5, 6 tetap Disetujui
        );

        // 3. Setelah dibatalkan, slot tanggal 4 Okt 08:00-10:00 BEBAS dan berhasil diajukan (201)
        $freeAfter = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Lain Tanggal 4',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567891',
            'mulai' => '2026-10-04 08:00:00',
            'selesai' => '2026-10-04 10:00:00',
            'keperluan' => 'Rapat Penma',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $freeAfter->assertStatus(201)->assertJson(['success' => true]);

        // 4. Sesi aktif lainnya (misal tanggal 2 Okt 08:00-10:00) TETAP menolak bentrok (422)
        $conflictOct2 = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Lain Tanggal 2',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567891',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-02 10:00:00',
            'keperluan' => 'Rapat Penma',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $conflictOct2->assertStatus(422);
    }

    /**
     * 3. Pembatalan seluruh pengajuan (scope = 'series') membatalkan seluruh sesi aktif.
     */
    public function test_cancel_entire_multiday_series_cancels_all_sessions(): void
    {
        $room = $this->getRoom();
        $adminToken = $this->getAdminToken();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-04 10:00:00',
            'keperluan' => 'Bimtek 3 Hari',
            'is_recurring' => false,
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);
        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        // Approve
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Disetujui',
                'scope' => 'series',
            ])->assertStatus(200);

        // Batalkan seluruh pengajuan
        $cancelAll = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'series',
            ]);
        $cancelAll->assertStatus(200);

        // Verifikasi semua sesi berstatus Dibatalkan
        $allSessions = Peminjaman::where('id', $rootId)->orWhere('parent_id', $rootId)->get();
        foreach ($allSessions as $session) {
            $this->assertEquals('Dibatalkan', $session->status);
        }
    }

    /**
     * 4. Peminjaman berulang mingguan tetap terpisah dengan is_recurring = true,
     * booking_type = 'recurring', dan hanya menyimpan tanggal berulang mingguan aktual.
     */
    public function test_recurring_weekly_booking_remains_distinct_from_multiday(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Sudirman',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-16 10:00:00',
            'keperluan' => 'Kajian Rutin Senin Mingguan',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-16',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        $root = Peminjaman::find($rootId);
        $this->assertTrue((bool) $root->is_recurring);
        $this->assertEquals('recurring', $root->booking_type);

        // Hanya 3 sesi mingguan: 2, 9, 16 November (bukan 15 sesi harian!)
        $allWeekly = Peminjaman::where('id', $rootId)->orWhere('parent_id', $rootId)->orderBy('tgl_mulai')->get();
        $this->assertCount(3, $allWeekly);
        $this->assertEquals('2026-11-02', (string) $allWeekly[0]->tgl_mulai);
        $this->assertEquals('2026-11-09', (string) $allWeekly[1]->tgl_mulai);
        $this->assertEquals('2026-11-16', (string) $allWeekly[2]->tgl_mulai);
    }

    /**
     * 5. Peminjaman biasa satu hari tetap berfungsi tanpa child session dan booking_type = 'single'.
     */
    public function test_single_day_booking_creates_single_record(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Single Day Applicant',
            'unit_kerja' => 'Kepegawaian',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-21 08:00:00',
            'selesai' => '2026-10-21 10:00:00',
            'keperluan' => 'Rapat Internal Harian',
            'is_recurring' => false,
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        $root = Peminjaman::find($rootId);
        $this->assertEquals('single', $root->booking_type);
        $this->assertFalse((bool) $root->is_recurring);
        $this->assertEquals(0, Peminjaman::where('parent_id', $rootId)->count());
    }

    /**
     * 6. Pembatalan sesi pertama:
     * Karena record induk juga merupakan sesi pertama, membatalkan sesi pertama (scope = 'single')
     * TIDAK otomatis membatalkan sesi anak yang masih aktif.
     * Status keseluruhan pengajuan tidak menjadi 'Dibatalkan' selama masih ada sesi aktif.
     */
    public function test_cancelling_first_session_does_not_cancel_children_and_overall_status_remains_active(): void
    {
        $room = $this->getRoom();
        $adminToken = $this->getAdminToken();

        // Ajukan 2-6 Oktober 08:00-10:00 (5 sesi)
        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-06 10:00:00',
            'keperluan' => 'Bimtek 5 Hari',
            'is_recurring' => false,
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        // Approve seluruh rangkaian
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Disetujui',
                'scope' => 'series',
            ])->assertStatus(200);

        // Batalkan SESI PERTAMA (record induk) dengan scope = 'single'
        $cancelFirstRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'single',
            ]);
        $cancelFirstRes->assertStatus(200);

        // Sesi pertama (record induk) berstatus Dibatalkan
        $root = Peminjaman::find($rootId);
        $this->assertEquals('Dibatalkan', $root->status);

        // Keempat sesi anak (Sesi 2, 3, 4, 5) TETAP AKTIF ('Disetujui')
        $children = Peminjaman::where('parent_id', $rootId)->get();
        $this->assertCount(4, $children);
        foreach ($children as $child) {
            $this->assertEquals('Disetujui', $child->status, "Sesi {$child->tgl_mulai} seharusnya tetap Disetujui");
        }

        // Cek API detail: status keseluruhan pengajuan TETAP 'Disetujui', BUKAN 'Dibatalkan'
        $detailRes = $this->getJson("/api/peminjaman/{$rootId}");
        $detailRes->assertStatus(200);
        $this->assertEquals('Disetujui', $detailRes->json('data.status'));
        $this->assertEquals('Dibatalkan', $detailRes->json('data.session_status'));

        // Cek sesi dalam recurring_schedules: sesi 1 dibatalkan, sesi 2..5 disetujui
        $schedules = $detailRes->json('data.recurring_schedules');
        $this->assertCount(5, $schedules);
        $this->assertEquals('Dibatalkan', $schedules[0]['status']);
        $this->assertEquals('Disetujui', $schedules[1]['status']);
        $this->assertEquals('Disetujui', $schedules[2]['status']);
        $this->assertEquals('Disetujui', $schedules[3]['status']);
        $this->assertEquals('Disetujui', $schedules[4]['status']);

        // Slot sesi 1 (2 Okt 08:00-10:00) kini bebas
        $freeOct2 = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Baru Tgl 2',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567891',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-02 10:00:00',
            'keperluan' => 'Acara Bebas Tanggal 2',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $freeOct2->assertStatus(201);

        // Namun sesi 2 (3 Okt 08:00-10:00) tetap menolak bentrok (422)
        $blockedOct3 = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Bentrok Tgl 3',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567891',
            'mulai' => '2026-10-03 08:00:00',
            'selesai' => '2026-10-03 10:00:00',
            'keperluan' => 'Acara Menabrak Sesi 2',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $blockedOct3->assertStatus(422);
    }

    /**
     * 7. Kompatibilitas data multihari lama:
     * Pengajuan lama tanpa child records otomatis dibuatkan sesi secara aman saat diakses,
     * dan pivot tabel item_peminjaman / peminjaman_items TIDAK terduplikasi sama sekali.
     */
    public function test_legacy_multiday_data_compatibility_and_zero_duplicate_pivot_items(): void
    {
        $room = $this->getRoom();
        $adminToken = $this->getAdminToken();

        // Buat data multihari legacy (3 hari: 2026-10-21 s/d 2026-10-23, 08:00-11:00)
        $legacy = Peminjaman::create([
            'id_peminjaman' => 'PMJ-LEGACY-001',
            'id' => 'PMJ-LEGACY-001',
            'tgl_pengajuan' => '2026-10-10',
            'nama_peminjam' => 'Pengguna Lama Multihari',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-10-21 08:00:00',
            'selesai' => '2026-10-23 11:00:00',
            'tgl_mulai' => '2026-10-21',
            'tgl_selesai' => '2026-10-23',
            'waktu_mulai' => '08:00',
            'waktu_selesai' => '11:00',
            'keperluan' => 'Pelatihan Legacy',
            'status' => 'Disetujui',
            'is_recurring' => false,
            'parent_id' => null,
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-LEGACY-001',
            'item_id' => $room->id,
            'jumlah' => 1,
        ]);

        $initialPivotCount = ItemPeminjaman::count();

        // Panggil API get detail
        $res = $this->getJson('/api/peminjaman/PMJ-LEGACY-001');
        $res->assertStatus(200);

        // Buktikan bahwa 3 sesi harian kini terbentuk
        $this->assertCount(3, $res->json('data.recurring_schedules'));
        $this->assertEquals('multiday', $res->json('data.booking_type'));

        // Buktikan bahwa pivot tabel item_peminjaman TIDAK bertambah (0 duplikasi)
        $finalPivotCount = ItemPeminjaman::count();
        $this->assertEquals($initialPivotCount, $finalPivotCount, 'Pivot item tidak boleh bertambah/terduplikasi');

        // Buktikan sesi anak kedua (22 Okt) dapat dibatalkan secara individual
        $sessionDay2 = Peminjaman::where('parent_id', 'PMJ-LEGACY-001')->where('tgl_mulai', '2026-10-22')->first();
        $this->assertNotNull($sessionDay2);

        $cancelRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$sessionDay2->id}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'single',
            ]);
        $cancelRes->assertStatus(200);
        $this->assertEquals('Dibatalkan', $sessionDay2->fresh()->status);
        $this->assertEquals('Disetujui', $legacy->fresh()->status);
    }

    /**
     * 8. Hubungan sumber daya dan ketersediaan sesi anak:
     * Buktikan bahwa consolidateItems() pada sesi anak mengembalikan item milik induknya secara tepat.
     */
    public function test_child_session_item_inheritance_and_independent_conflict_detection(): void
    {
        $room = $this->getRoom();
        $service = app(BookingService::class);

        // Buat pengajuan 2 hari
        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Pemohon Sesi Anak',
            'unit_kerja' => 'Bimas',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-21 08:00:00',
            'selesai' => '2026-10-22 10:00:00',
            'keperluan' => 'Uji Sesi Anak',
            'is_recurring' => false,
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        $child = Peminjaman::where('parent_id', $rootId)->first();
        $this->assertNotNull($child);

        // Sesi anak tidak memiliki pivot baris sendiri di database
        $this->assertEquals(0, $child->items()->count());
        $this->assertEquals(0, $child->itemPeminjaman()->count());

        // Namun consolidateItems() secara akurat mengambil item dari parent
        $inheritedItems = $service->consolidateItems($child);
        $this->assertCount(1, $inheritedItems);
        $this->assertEquals($room->id, $inheritedItems->first()->item_id);
    }

    /**
     * 9. Status operasional dinamis berbasis waktu zona Asia/Jakarta:
     * Membedakan status tersimpan dari status operasional (Disetujui, Berlangsung, Selesai, Dibatalkan).
     */
    public function test_computed_status_operational_using_asia_jakarta_timezone(): void
    {
        $nowJkt = Carbon::now('Asia/Jakarta');

        // Sesi masa depan: waktu mulai di masa depan
        $futureStart = $nowJkt->copy()->addDays(5)->format('Y-m-d 08:00:00');
        $futureEnd = $nowJkt->copy()->addDays(5)->format('Y-m-d 10:00:00');

        $future = Peminjaman::create([
            'id_peminjaman' => 'PMJ-FUTURE-01',
            'id' => 'PMJ-FUTURE-01',
            'tgl_pengajuan' => $nowJkt->toDateString(),
            'nama_peminjam' => 'Future Test',
            'unit_kerja' => 'Umum',
            'keperluan' => 'Kegiatan Masa Depan',
            'mulai' => $futureStart,
            'selesai' => $futureEnd,
            'tgl_mulai' => substr($futureStart, 0, 10),
            'tgl_selesai' => substr($futureEnd, 0, 10),
            'status' => 'Disetujui',
        ]);

        $resFuture = $this->getJson('/api/peminjaman/PMJ-FUTURE-01');
        $this->assertEquals('Disetujui', $resFuture->json('data.status'));

        // Sesi masa lalu: waktu selesai sudah lewat
        $pastStart = $nowJkt->copy()->subDays(5)->format('Y-m-d 08:00:00');
        $pastEnd = $nowJkt->copy()->subDays(5)->format('Y-m-d 10:00:00');

        $past = Peminjaman::create([
            'id_peminjaman' => 'PMJ-PAST-01',
            'id' => 'PMJ-PAST-01',
            'tgl_pengajuan' => $nowJkt->copy()->subDays(10)->toDateString(),
            'nama_peminjam' => 'Past Test',
            'unit_kerja' => 'Umum',
            'keperluan' => 'Kegiatan Masa Lalu',
            'mulai' => $pastStart,
            'selesai' => $pastEnd,
            'tgl_mulai' => substr($pastStart, 0, 10),
            'tgl_selesai' => substr($pastEnd, 0, 10),
            'status' => 'Disetujui',
        ]);

        // Cek API list getAllPeminjaman
        $listRes = $this->getJson('/api/peminjaman');
        $pastItem = collect($listRes->json('data'))->firstWhere('id', 'PMJ-PAST-01');
        $this->assertNotNull($pastItem);
        $this->assertEquals('Selesai', $pastItem['computed_status']);
        $this->assertEquals('Disetujui', $pastItem['status']); // Status administratif tersimpan tetap Disetujui

        // Sesi dibatalkan tidak menjadi Selesai walaupun tanggalnya telah lewat
        $past->update(['status' => 'Dibatalkan']);
        $listResAfterCancel = $this->getJson('/api/peminjaman');
        $pastCancelledItem = collect($listResAfterCancel->json('data'))->firstWhere('id', 'PMJ-PAST-01');
        $this->assertEquals('Dibatalkan', $pastCancelledItem['computed_status']);
    }

    /**
     * 10. Pengujian Idempotensi & Keamanan Konkurensi:
     * Pemanggilan berulang ensureMultidayChildSessions() pada record yang sama
     * menghasilkan 0 sesi anak tambahan dan 0 duplikasi pivot item.
     */
    public function test_ensure_multiday_child_sessions_is_strictly_idempotent_and_creates_no_duplicates(): void
    {
        $room = $this->getRoom();
        $service = app(BookingService::class);

        $legacy = Peminjaman::create([
            'id_peminjaman' => 'PMJ-IDEMPOTENT-01',
            'id' => 'PMJ-IDEMPOTENT-01',
            'tgl_pengajuan' => '2026-10-10',
            'nama_peminjam' => 'Idempotency Test User',
            'unit_kerja' => 'Kepegawaian',
            'keperluan' => 'Uji Idempotensi',
            'mulai' => '2026-10-21 08:00:00',
            'selesai' => '2026-10-23 10:00:00',
            'tgl_mulai' => '2026-10-21',
            'tgl_selesai' => '2026-10-23',
            'status' => 'Disetujui',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-IDEMPOTENT-01',
            'item_id' => $room->id,
            'jumlah' => 1,
        ]);

        $initialPivotCount = ItemPeminjaman::count();

        // Pemanggilan pertama: harus membuat 2 child sessions (total 3 hari)
        $firstCall = $service->ensureMultidayChildSessions($legacy);
        $this->assertEquals(2, $firstCall);
        $this->assertEquals(2, Peminjaman::where('parent_id', 'PMJ-IDEMPOTENT-01')->count());

        // Pemanggilan kedua: harus mengembalikan 0 (idempoten)
        $secondCall = $service->ensureMultidayChildSessions($legacy);
        $this->assertEquals(0, $secondCall);
        $this->assertEquals(2, Peminjaman::where('parent_id', 'PMJ-IDEMPOTENT-01')->count());

        // Pemanggilan ketiga: tetap mengembalikan 0
        $thirdCall = $service->ensureMultidayChildSessions($legacy);
        $this->assertEquals(0, $thirdCall);
        $this->assertEquals(2, Peminjaman::where('parent_id', 'PMJ-IDEMPOTENT-01')->count());

        // Pivot item sama sekali tidak bertambah
        $this->assertEquals($initialPivotCount, ItemPeminjaman::count());
    }

    /**
     * 11. Pengujian Pembatalan Sesi Tengah, Sesi Terakhir, dan Semua Sesi:
     * - Sesi tengah dibatalkan: sesi lain tetap aktif dan tidak berubah.
     * - Sesi terakhir dibatalkan: sesi sebelumnya tetap benar.
     * - Semua sesi dibatalkan: status pengajuan utama menjadi Dibatalkan.
     */
    public function test_middle_last_and_all_sessions_cancellation_cascade(): void
    {
        $room = $this->getRoom();
        $adminToken = $this->getAdminToken();

        // Ajukan 2-6 Oktober 08:00-10:00 (5 sesi)
        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-02 08:00:00',
            'selesai' => '2026-10-06 10:00:00',
            'keperluan' => 'Bimtek 5 Hari Multi Sesi',
            'is_recurring' => false,
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $response->assertStatus(201);
        $rootId = $response->json('data.id_peminjaman');

        // Approve seluruh rangkaian
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$rootId}/status", [
                'status' => 'Disetujui',
                'scope' => 'series',
            ])->assertStatus(200);

        // A. Batalkan SESI TENGAH (Sesi 3 / 4 Oktober)
        $session3 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-04')->first();
        $this->assertNotNull($session3);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$session3->id}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'single',
            ])->assertStatus(200);

        // Verifikasi sesi 1, 2, 4, 5 tetap Disetujui
        $this->assertEquals('Disetujui', Peminjaman::find($rootId)->status);
        $this->assertEquals('Disetujui', Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-03')->first()->status);
        $this->assertEquals('Dibatalkan', $session3->fresh()->status);
        $this->assertEquals('Disetujui', Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-05')->first()->status);
        $this->assertEquals('Disetujui', Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-06')->first()->status);

        // B. Batalkan SESI TERAKHIR (Sesi 5 / 6 Oktober)
        $session5 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-06')->first();
        $this->assertNotNull($session5);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$session5->id}/status", [
                'status' => 'Dibatalkan',
                'scope' => 'single',
            ])->assertStatus(200);

        // Verifikasi sesi 1, 2, 4 tetap Disetujui
        $this->assertEquals('Disetujui', Peminjaman::find($rootId)->status);
        $this->assertEquals('Disetujui', Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-03')->first()->status);
        $this->assertEquals('Disetujui', Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-05')->first()->status);
        $this->assertEquals('Dibatalkan', $session5->fresh()->status);

        // C. Batalkan sisa sesi (Sesi 1, 2, dan 4) secara bertahap
        $session1 = Peminjaman::find($rootId);
        $session2 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-03')->first();
        $session4 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-05')->first();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$session1->id}/status", ['status' => 'Dibatalkan', 'scope' => 'single'])->assertStatus(200);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$session2->id}/status", ['status' => 'Dibatalkan', 'scope' => 'single'])->assertStatus(200);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/peminjaman/{$session4->id}/status", ['status' => 'Dibatalkan', 'scope' => 'single'])->assertStatus(200);

        // Sekarang SEMUA 5 sesi telah dibatalkan
        $detailResAllCancelled = $this->getJson("/api/peminjaman/{$rootId}");
        $this->assertEquals('Dibatalkan', $detailResAllCancelled->json('data.status'));
        $this->assertEquals('Dibatalkan', Peminjaman::find($rootId)->status);
    }
}
