<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConcurrencyAndTransactionIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected string $adminToken;
    protected ItemJenis $roomItem;
    protected ItemJenis $projectorItem;
    protected ItemJenis $vehicleItem;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');

        $this->seed(\Database\Seeders\SimpruSeeder::class);

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@kemenag.go.id'],
            [
                'name' => 'Administrator SIMPRU',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ]
        );

        $this->adminToken = $this->admin->createToken('admin-test-token')->plainTextToken;

        // Fetch master inventory items
        $this->roomItem = ItemJenis::where('id_jenis', 1)->first() ?? ItemJenis::find(1);
        $this->projectorItem = ItemJenis::where('id_jenis', 3)->first() ?? ItemJenis::find(7);
        $this->vehicleItem = ItemJenis::where('id_jenis', 2)->first() ?? ItemJenis::find(5);
    }

    private function generateValidPdf(): UploadedFile
    {
        $content = "%PDF-1.4\n1 0 obj\n<< /Title (Test Surat) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
        return UploadedFile::fake()->createWithContent('surat_tugas.pdf', $content);
    }

    /**
     * 1. Dua pengajuan dengan item dan waktu yang identik.
     * Pengajuan pertama yang disetujui harus memblokir pengajuan kedua dengan HTTP 422.
     */
    public function test_1_two_requests_identical_item_and_time(): void
    {
        $startTime = '2026-11-20 09:00:00';
        $endTime = '2026-11-20 12:00:00';

        // Base booking approved
        $approvedBooking = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-101',
            'id' => 'PMJ-202611-101',
            'nip' => '198001012005011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Pertama',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => $startTime,
            'selesai' => $endTime,
            'keperluan' => 'Rapat Koordinasi Identik',
            'status' => 'Disetujui',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-101',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // Second request with exact identical item and time
        $response = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Kedua',
            'unit_kerja' => 'Seksi Penmad',
            'mulai' => $startTime,
            'selesai' => $endTime,
            'keperluan' => 'Rapat Identik Bertabrakan',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
                 ->assertJson(['success' => false])
                 ->assertJsonPath('conflicts.0.item_id', $this->roomItem->id);

        $this->assertDatabaseMissing('peminjaman', [
            'nama_peminjam' => 'Pemohon Kedua',
        ]);
    }

    /**
     * 2. Dua pengajuan dengan rentang waktu yang bertumpang tindih sebagian.
     * Memverifikasi formula: mulai < request_selesai AND selesai > request_mulai
     */
    public function test_2_two_requests_partial_time_overlap(): void
    {
        // Base approved: 10:00 - 14:00
        Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-102',
            'id' => 'PMJ-202611-102',
            'nip' => '198001012005011002',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Base 10-14',
            'unit_kerja' => 'Seksi Haji',
            'mulai' => '2026-11-21 10:00:00',
            'selesai' => '2026-11-21 14:00:00',
            'keperluan' => 'Sosialisasi Manasik',
            'status' => 'Disetujui',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-102',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // Partial overlap: 13:00 - 16:00 (starts inside, ends after)
        $resOverlapAfter = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Overlap Akhir',
            'unit_kerja' => 'Seksi Urusan Agama',
            'mulai' => '2026-11-21 13:00:00',
            'selesai' => '2026-11-21 16:00:00',
            'keperluan' => 'Bimwin',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);
        $resOverlapAfter->assertStatus(422);

        // Partial overlap: 08:00 - 11:00 (starts before, ends inside)
        $resOverlapBefore = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Overlap Awal',
            'unit_kerja' => 'Seksi Zakat Wakaf',
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 11:00:00',
            'keperluan' => 'Audit Zakat',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);
        $resOverlapBefore->assertStatus(422);

        // Exact boundary (non-overlapping): 14:00 - 17:00 must be accepted
        $resBoundary = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Tepat Selesai',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-21 14:00:00',
            'selesai' => '2026-11-21 17:00:00',
            'keperluan' => 'Evaluasi Kinerja Sore',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);
        $resBoundary->assertStatus(201);
    }

    /**
     * 3. Dua pengajuan multi-item yang berbagi salah satu item.
     * Jika satu item bentrok (misal Ruangan), maka seluruh paket item (Ruangan + Proyektor + Mobil) harus gagal secara atomik.
     */
    public function test_3_two_multi_item_requests_sharing_conflicting_item(): void
    {
        // Existing approved booking holds the room
        Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-103',
            'id' => 'PMJ-202611-103',
            'nip' => '198001012005011003',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemegang Ruangan',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 12:00:00',
            'keperluan' => 'Workshop IT',
            'status' => 'Disetujui',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-103',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // Multi-item request requesting: Room + Projector
        $response = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Paket Multi Item',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-11-22 09:00:00',
            'selesai' => '2026-11-22 11:00:00',
            'keperluan' => 'Seleksi PPPK',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
                ['item' => ['id' => $this->projectorItem->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
                 ->assertJson(['success' => false])
                 ->assertJsonPath('conflicts.0.item_id', $this->roomItem->id);

        // Entire transaction must rollback: neither room nor projector has records for this applicant
        $this->assertDatabaseMissing('peminjaman', [
            'nama_peminjam' => 'Pemohon Paket Multi Item',
        ]);
        $this->assertDatabaseMissing('item_peminjaman', [
            'item_id' => $this->projectorItem->id,
            'jumlah' => 1,
        ]);
    }

    /**
     * 4. Dua request bersamaan ketika belum ada booking sebelumnya.
     * Dua permohonan bersaing pada slot kosong: saat admin menyetujui yang pertama,
     * persetujuan permohonan kedua wajib ditolak 422 untuk mencegah double booking.
     */
    public function test_4_two_concurrent_approvals_on_empty_slot_prevents_double_booking(): void
    {
        $slotStart = '2026-11-25 09:00:00';
        $slotEnd = '2026-11-25 12:00:00';

        // 1. Booking A (Menunggu Persetujuan)
        $bookingA = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-201',
            'id' => 'PMJ-202611-201',
            'nip' => '198101012006041001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Kompetitif A',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => $slotStart,
            'selesai' => $slotEnd,
            'keperluan' => 'Rapat Koordinasi Utama',
            'status' => 'Menunggu Persetujuan',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-201',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // 2. Booking B (Menunggu Persetujuan, same slot and room)
        $bookingB = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-202',
            'id' => 'PMJ-202611-202',
            'nip' => '198202022007052002',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Kompetitif B',
            'unit_kerja' => 'Seksi Dikmad',
            'mulai' => $slotStart,
            'selesai' => $slotEnd,
            'keperluan' => 'Sosialisasi Kurikulum Merdeka',
            'status' => 'Menunggu Persetujuan',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-202',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // Admin approves Booking A -> Must succeed 200
        $resA = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                     ->patchJson("/api/peminjaman/{$bookingA->id_peminjaman}/status", [
                         'status' => 'Disetujui',
                         'petugas' => 'Petugas Verifikator',
                     ]);
        $resA->assertStatus(200)
             ->assertJsonPath('data.status', 'Disetujui');

        // Admin attempts to approve competing Booking B -> Must be blocked 422!
        $resB = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                     ->patchJson("/api/peminjaman/{$bookingB->id_peminjaman}/status", [
                         'status' => 'Disetujui',
                         'petugas' => 'Petugas Verifikator',
                     ]);
        $resB->assertStatus(422)
             ->assertJson(['success' => false]);

        // Verify database: Booking A is approved, Booking B remains pending
        $this->assertEquals('Disetujui', $bookingA->fresh()->status);
        $this->assertEquals('Menunggu Persetujuan', $bookingB->fresh()->status);
    }

    /**
     * 5. Pengajuan yang berjalan bersamaan dengan persetujuan admin.
     * Setelah admin menyetujui suatu slot, submission baru pada slot yang sama langsung ditolak.
     */
    public function test_5_submission_concurrent_with_admin_approval_detects_conflict(): void
    {
        $slotStart = '2026-11-26 13:00:00';
        $slotEnd = '2026-11-26 16:00:00';

        // Existing pending booking
        $existing = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-301',
            'id' => 'PMJ-202611-301',
            'nip' => '198505052010011005',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Pertama 301',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => $slotStart,
            'selesai' => $slotEnd,
            'keperluan' => 'Ujian Dinas',
            'status' => 'Menunggu Persetujuan',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-301',
            'item_id' => $this->roomItem->id,
            'jumlah' => 1,
        ]);

        // Admin approves existing booking
        $this->withHeader('Authorization', "Bearer {$this->adminToken}")
             ->patchJson("/api/peminjaman/{$existing->id_peminjaman}/status", [
                 'status' => 'Disetujui',
             ])
             ->assertStatus(200);

        // Concurrent public submission with valid PDF upload attempt
        $pdf = $this->generateValidPdf();
        $resSubmit = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Kedua 302',
            'unit_kerja' => 'Seksi Haji',
            'mulai' => '2026-11-26 14:00:00',
            'selesai' => '2026-11-26 17:00:00',
            'keperluan' => 'Rapat Paruh Waktu',
            'surat_file' => $pdf,
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);

        $resSubmit->assertStatus(422)
                  ->assertJson(['success' => false]);

        // Verify orphan file cleanup on conflict
        $storedFiles = Storage::disk('local')->allFiles('surat');
        $this->assertEmpty($storedFiles);
    }

    /**
     * 6. Kegagalan transaksi di tengah proses.
     * Jika terjadi kegagalan/error tak terduga dalam transaksi, data tidak boleh tersimpan parsial.
     */
    public function test_6_mid_transaction_failure_aborts_cleanly_without_partial_records(): void
    {
        $pdf = $this->generateValidPdf();

        // Request with non-existent item ID that passes validation initially but causes error or is detected
        $payload = [
            'nama_peminjam' => 'Pemohon Gagal Transaksi',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-28 08:00:00',
            'selesai' => '2026-11-28 10:00:00',
            'keperluan' => 'Simulasi Rollback Error',
            'surat_file' => $pdf,
            'selected_items' => [
                ['item' => ['id' => 999999], 'jumlah' => 1],
            ],
        ];

        $res = $this->postJson('/api/peminjaman', $payload);
        $res->assertStatus(422);

        $this->assertDatabaseMissing('peminjaman', [
            'nama_peminjam' => 'Pemohon Gagal Transaksi',
        ]);
        $this->assertDatabaseMissing('item_peminjaman', [
            'item_id' => 999999,
        ]);
    }

    /**
     * 7. Pemulihan konsistensi data setelah rollback.
     * Setelah pengajuan yang bentrok/gagal dibatalkan, slot waktu lain yang sah
     * tetap dapat dipinjam secara normal tanpa lock tersangkut.
     */
    public function test_7_data_consistency_and_availability_restored_after_rollback(): void
    {
        // 1. Rejected conflicting submission
        $resFail = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Gagal Jadwal',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => '2026-10-05 09:00:00',
            'selesai' => '2026-10-05 11:00:00',
            'keperluan' => 'Mencoba Jam Sibuk',
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);
        $resFail->assertStatus(422);

        // 2. Legitimate booking on open slot immediately following the failure
        $pdf = $this->generateValidPdf();
        $resSuccess = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Sah Setelah Rollback',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => '2026-11-29 08:00:00',
            'selesai' => '2026-11-29 11:00:00',
            'keperluan' => 'Acara Sah dan Aman',
            'surat_file' => $pdf,
            'selected_items' => [
                ['item' => ['id' => $this->roomItem->id], 'jumlah' => 1],
            ],
        ]);
        $resSuccess->assertStatus(201);

        $createdId = $resSuccess->json('data.id_peminjaman');
        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $createdId,
            'status' => 'Menunggu Persetujuan',
        ]);
        $this->assertDatabaseHas('item_peminjaman', [
            'id_peminjaman' => $createdId,
            'item_id' => $this->roomItem->id,
        ]);
    }
}
