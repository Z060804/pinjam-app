<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\ItemPeminjaman;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

        $file = UploadedFile::fake()->createWithContent('surat_permohonan.pdf', "%PDF-1.4\n" . str_repeat('A', 1024 * 50));

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
}
