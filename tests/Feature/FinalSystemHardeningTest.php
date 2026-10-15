<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\ItemPeminjaman;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class FinalSystemHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    private function createValidPdf(string $filename, int $bytes): UploadedFile
    {
        $header = "%PDF-1.4\n1 0 obj\n<< /Title (Dokumen) >>\nendobj\n";
        $trailer = "\nxref\n0 2\ntrailer\n<< /Size 2 >>\nstartxref\n100\n%%EOF";
        $padding = max(0, $bytes - strlen($header) - strlen($trailer));
        $content = $header . str_repeat('B', $padding) . $trailer;

        if (strlen($content) > $bytes) {
            $content = substr($content, 0, $bytes);
        }

        return UploadedFile::fake()->createWithContent($filename, $content);
    }

    /**
     * 1. End-to-End full cycle: Submit -> Track -> Admin Login -> Approve -> Consistency -> Conflict -> Logout.
     */
    public function test_1_end_to_end_full_borrowing_and_admin_lifecycle(): void
    {
        $item = ItemJenis::where('id_jenis', 1)->first(); // Ruangan (qty 1)
        $pdfFile = $this->createValidPdf('permohonan_e2e.pdf', 300 * 1024);

        // Step 1 & 2: Borrower submits valid booking with PDF
        $submitRes = $this->post('/api/peminjaman', [
            'nip' => '198501012010011005',
            'nama_peminjam' => 'Dr. H. Ahmad Dahlan',
            'unit_kerja' => 'Penyelenggara Haji dan Umrah',
            'mulai' => '2026-11-10 08:00:00',
            'selesai' => '2026-11-10 12:00:00',
            'keperluan' => 'Pelepasan Calon Jamaah Haji Kloter 1',
            'surat_file' => $pdfFile,
            'selected_items' => json_encode([
                ['item_id' => $item->id, 'jumlah' => 1],
            ]),
        ]);

        $submitRes->assertStatus(201)
                  ->assertJson(['success' => true]);

        $bookingId = $submitRes->json('data.id_peminjaman');
        $this->assertNotNull($bookingId);
        $this->assertDatabaseHas('peminjaman', ['id_peminjaman' => $bookingId, 'status' => 'Menunggu Persetujuan']);

        // Step 4: Tracking check
        $trackRes = $this->getJson("/api/peminjaman/{$bookingId}");
        $trackRes->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'id_peminjaman' => $bookingId,
                         'status' => 'Menunggu Persetujuan',
                     ],
                 ]);

        // Step 5: Admin Login
        $loginRes = $this->postJson('/api/admin/login', [
            'email' => 'admin@kemenag.go.id',
            'password' => 'admin123',
        ]);
        $loginRes->assertStatus(200)
                 ->assertJson(['success' => true]);
        $token = $loginRes->json('token');
        $this->assertNotEmpty($token);

        // Admin views recap
        $rekapRes = $this->withHeader('Authorization', "Bearer {$token}")
                         ->getJson('/api/master/peminjaman');
        $rekapRes->assertStatus(200);
        $foundInRekap = collect($rekapRes->json('data'))->firstWhere('id_peminjaman', $bookingId);
        $this->assertNotNull($foundInRekap);

        // Step 6: Admin approves booking
        $approveRes = $this->withHeader('Authorization', "Bearer {$token}")
                           ->patchJson("/api/peminjaman/{$bookingId}/status", [
                               'status' => 'Disetujui',
                               'petugas' => 'H. Suwandi, S.Ag.',
                           ]);
        $approveRes->assertStatus(200)
                   ->assertJson(['success' => true]);

        // Step 7: Verify consistency across Tracking, Calendar, and Database
        $trackUpdated = $this->getJson("/api/peminjaman/{$bookingId}");
        $this->assertEquals('Disetujui', $trackUpdated->json('data.status'));

        $calendarList = $this->getJson('/api/peminjaman');
        $foundInCalendar = collect($calendarList->json('data'))->firstWhere('id_peminjaman', $bookingId);
        $this->assertNotNull($foundInCalendar);
        $this->assertEquals('Disetujui', $foundInCalendar['status']);

        // Step 8: Conflicting booking on the same item and overlapping time must be rejected
        $conflictPdf = $this->createValidPdf('permohonan_bentrok.pdf', 100 * 1024);
        $conflictRes = $this->post('/api/peminjaman', [
            'nip' => '199002022015021002',
            'nama_peminjam' => 'Pemohon Lain',
            'unit_kerja' => 'Bimas Kristen',
            'mulai' => '2026-11-10 10:00:00', // Overlaps 08:00 - 12:00
            'selesai' => '2026-11-10 14:00:00',
            'keperluan' => 'Rapat Pembinaan',
            'surat_file' => $conflictPdf,
            'selected_items' => json_encode([
                ['item_id' => $item->id, 'jumlah' => 1],
            ]),
        ]);

        $conflictRes->assertStatus(422)
                    ->assertJson(['success' => false])
                    ->assertJsonStructure(['message', 'conflicts']);

        // Step 9: Admin Logout & Session Invalidation
        $logoutRes = $this->withHeader('Authorization', "Bearer {$token}")
                          ->postJson('/api/admin/logout');
        $logoutRes->assertStatus(200);

        $this->app['auth']->forgetGuards();

        // Re-attempting admin endpoint with revoked token must return 401
        $unauthRes = $this->withHeader('Authorization', "Bearer {$token}")
                          ->getJson('/api/master/peminjaman');
        $unauthRes->assertStatus(401);
    }

    /**
     * 2. Comprehensive overlapping time conflict variations (Partial start, partial end, enclosure, exact).
     */
    public function test_2_schedule_conflict_all_time_overlapping_variations(): void
    {
        $item = ItemJenis::where('id_jenis', 1)->first();

        // Base approved booking: 10:00 - 14:00
        $base = Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-700',
            'id' => 'PMJ-202611-700',
            'nip' => '198001012005011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Base',
            'unit_kerja' => 'Unit Kerja',
            'mulai' => '2026-11-15 10:00:00',
            'selesai' => '2026-11-15 14:00:00',
            'keperluan' => 'Acara Utama',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-700',
            'item_id' => $item->id,
            'jumlah' => $item->quantity,
        ]);

        $scenarios = [
            'exact_same_time' => ['mulai' => '2026-11-15 10:00:00', 'selesai' => '2026-11-15 14:00:00'],
            'starts_before_ends_during' => ['mulai' => '2026-11-15 08:00:00', 'selesai' => '2026-11-15 12:00:00'],
            'starts_during_ends_after' => ['mulai' => '2026-11-15 12:00:00', 'selesai' => '2026-11-15 16:00:00'],
            'enclosing_whole_interval' => ['mulai' => '2026-11-15 08:00:00', 'selesai' => '2026-11-15 17:00:00'],
            'enclosed_inside_interval' => ['mulai' => '2026-11-15 11:00:00', 'selesai' => '2026-11-15 13:00:00'],
        ];

        foreach ($scenarios as $name => $time) {
            $res = $this->postJson('/api/peminjaman', [
                'nip' => '198501012010011001',
                'nama_peminjam' => "Test {$name}",
                'unit_kerja' => 'Subbag TU',
                'mulai' => $time['mulai'],
                'selesai' => $time['selesai'],
                'keperluan' => "Pengujian {$name}",
                'selected_items' => [['item_id' => $item->id, 'jumlah' => 1]],
            ]);

            $res->assertStatus(422)
                ->assertJson(['success' => false]);
        }

        // Non-overlapping times should pass: before 10:00 and after 14:00
        $resBefore = $this->postJson('/api/peminjaman', [
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Acara Pagi',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-15 07:00:00',
            'selesai' => '2026-11-15 09:30:00',
            'keperluan' => 'Acara Pagi Non-Overlap',
            'selected_items' => [['item_id' => $item->id, 'jumlah' => 1]],
        ]);
        $resBefore->assertStatus(201);

        $resAfter = $this->postJson('/api/peminjaman', [
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Acara Sore',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-15 14:30:00',
            'selesai' => '2026-11-15 17:00:00',
            'keperluan' => 'Acara Sore Non-Overlap',
            'selected_items' => [['item_id' => $item->id, 'jumlah' => 1]],
        ]);
        $resAfter->assertStatus(201);
    }

    /**
     * 3. Multi-item submission where 1 item is unavailable must reject the entire submission atomically.
     */
    public function test_3_multi_item_partial_conflict_rejects_atomically(): void
    {
        $ruang = ItemJenis::where('id_jenis', 1)->first(); // Quantity 1
        $laptop = ItemJenis::where('id_jenis', 3)->first(); // Quantity 4

        // Book the room
        Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-750',
            'id' => 'PMJ-202611-750',
            'nip' => '198001012005011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Ruang',
            'unit_kerja' => 'Unit Kerja',
            'mulai' => '2026-11-18 08:00:00',
            'selesai' => '2026-11-18 12:00:00',
            'keperluan' => 'Acara Ruang',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-750',
            'item_id' => $ruang->id,
            'jumlah' => 1,
        ]);

        $initialCount = Peminjaman::count();

        // User requests both the Room (booked) and the Laptop (free)
        $res = $this->postJson('/api/peminjaman', [
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Pemohon Multi-Item',
            'unit_kerja' => 'Seksi Bimas',
            'mulai' => '2026-11-18 09:00:00',
            'selesai' => '2026-11-18 11:00:00',
            'keperluan' => 'Acara Pelatihan',
            'selected_items' => [
                ['item_id' => $ruang->id, 'jumlah' => 1],
                ['item_id' => $laptop->id, 'jumlah' => 1],
            ],
        ]);

        $res->assertStatus(422);
        // Ensure no partial record was inserted
        $this->assertEquals($initialCount, Peminjaman::count());
    }

    /**
     * 4. Verify that conflict or transaction failure leaves zero orphan files on storage.
     */
    public function test_4_conflict_or_error_cleans_up_uploaded_file(): void
    {
        $item = ItemJenis::where('id_jenis', 1)->first();

        // Pre-create an approved booking
        Peminjaman::create([
            'id_peminjaman' => 'PMJ-202611-780',
            'id' => 'PMJ-202611-780',
            'nip' => '198001012005011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Lama',
            'unit_kerja' => 'Unit Kerja',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Rakor',
            'status' => 'Disetujui',
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202611-780',
            'item_id' => $item->id,
            'jumlah' => $item->quantity,
        ]);

        $initialDiskFiles = Storage::disk('local')->allFiles();

        $pdf = $this->createValidPdf('surat_bentrok_orphan_test.pdf', 200 * 1024);

        $res = $this->post('/api/peminjaman', [
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Pemohon Baru',
            'unit_kerja' => 'Seksi Penma',
            'mulai' => '2026-11-20 09:00:00',
            'selesai' => '2026-11-20 11:00:00',
            'keperluan' => 'Bentrok Jadwal',
            'surat_file' => $pdf,
            'selected_items' => json_encode([
                ['item_id' => $item->id, 'jumlah' => 1],
            ]),
        ]);

        $res->assertStatus(422);

        // Verify that storage has NO orphan files left behind
        $afterDiskFiles = Storage::disk('local')->allFiles();
        $this->assertEquals($initialDiskFiles, $afterDiskFiles);
    }

    /**
     * 5. Unauthorized access to all admin endpoints is strictly rejected with 401.
     */
    public function test_5_unauthenticated_requests_strictly_rejected(): void
    {
        $this->getJson('/api/admin/me')->assertStatus(401);
        $this->postJson('/api/admin/logout')->assertStatus(401);
        $this->getJson('/api/master/peminjaman')->assertStatus(401);
        $this->getJson('/api/admin/peminjaman')->assertStatus(401);
        $this->postJson('/api/item/jenis', ['nama' => 'Test'])->assertStatus(401);
        $this->putJson('/api/item/jenis/1', ['nama' => 'Test'])->assertStatus(401);
        $this->deleteJson('/api/item/jenis/1')->assertStatus(401);
        $this->patchJson('/api/peminjaman/PMJ-202610-001/status', ['status' => 'Disetujui'])->assertStatus(401);
    }

    /**
     * 6. Token lifecycle: previous tokens revoked on login, current token revoked on logout.
     */
    public function test_6_sanctum_token_single_session_and_revocation(): void
    {
        $user = User::where('email', 'admin@kemenag.go.id')->first();

        // 1. First login
        $res1 = $this->postJson('/api/admin/login', [
            'email' => 'admin@kemenag.go.id',
            'password' => 'admin123',
        ]);
        $token1 = $res1->json('token');
        $this->assertNotEmpty($token1);
        $this->assertEquals(1, $user->tokens()->count());

        // 2. Second login should revoke first token
        $res2 = $this->postJson('/api/admin/login', [
            'email' => 'admin@kemenag.go.id',
            'password' => 'admin123',
        ]);
        $token2 = $res2->json('token');
        $this->assertNotEquals($token1, $token2);
        $this->assertEquals(1, $user->tokens()->count());

        $this->app['auth']->forgetGuards();

        // Token 1 must now be invalid
        $this->withHeader('Authorization', "Bearer {$token1}")
             ->getJson('/api/admin/me')
             ->assertStatus(401);

        $this->app['auth']->forgetGuards();

        // Token 2 must be valid
        $this->withHeader('Authorization', "Bearer {$token2}")
             ->getJson('/api/admin/me')
             ->assertStatus(200);

        // 3. Logout revokes token 2
        $this->withHeader('Authorization', "Bearer {$token2}")
             ->postJson('/api/admin/logout')
             ->assertStatus(200);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token2}")
             ->getJson('/api/admin/me')
             ->assertStatus(401);
    }
}
