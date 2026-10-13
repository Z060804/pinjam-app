<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\ItemPeminjaman;
use App\Models\PeminjamanItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class AdminAuthAndWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@kemenag.go.id',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
                 ->assertJson(['success' => false]);
    }

    public function test_admin_login_succeeds_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@kemenag.go.id',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true])
                 ->assertJsonStructure(['success', 'token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_unauthenticated_requests_to_admin_endpoints_are_rejected(): void
    {
        // Status update
        $resStatus = $this->patchJson('/api/peminjaman/PMJ-202610-001/status', [
            'status' => 'Disetujui',
        ]);
        $resStatus->assertStatus(401);

        // Add item
        $resItem = $this->postJson('/api/item/jenis', [
            'id_jenis' => 1,
            'nama' => 'Ruang Baru',
        ]);
        $resItem->assertStatus(401);

        // Delete item
        $resDel = $this->deleteJson('/api/item/jenis/1');
        $resDel->assertStatus(401);
    }

    public function test_authenticated_admin_can_update_peminjaman_status(): void
    {
        $admin = User::where('email', 'admin@kemenag.go.id')->first();
        $peminjaman = Peminjaman::first();
        $this->assertNotNull($peminjaman);

        $response = $this->actingAs($admin, 'sanctum')->patchJson("/api/peminjaman/{$peminjaman->id_peminjaman}/status", [
            'status' => 'Disetujui',
            'petugas' => 'Petugas Pengujian',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true])
                 ->assertJsonPath('data.status', 'Disetujui');

        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $peminjaman->id_peminjaman,
            'status' => 'Disetujui',
            'petugas' => 'Petugas Pengujian',
        ]);
    }

    public function test_item_deletion_blocked_if_history_exists_in_either_table(): void
    {
        $admin = User::where('email', 'admin@kemenag.go.id')->first();
        $item = ItemJenis::first();
        $this->assertNotNull($item);

        // Scenario A: PeminjamanItem exists
        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/item/jenis/{$item->id}");
        $response->assertStatus(409)
                 ->assertJson(['success' => false]);

        // Scenario B: Item that only exists in item_peminjaman (legacy relation)
        $newItem = ItemJenis::create([
            'id_jenis' => 3,
            'nama' => 'Kabel Roll Lama',
            'is_active' => true,
            'quantity' => 2,
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => 'PMJ-202610-001',
            'item_id' => $newItem->id,
            'jumlah' => 1,
        ]);

        $resLegacy = $this->actingAs($admin, 'sanctum')->deleteJson("/api/item/jenis/{$newItem->id}");
        $resLegacy->assertStatus(409)
                  ->assertJson(['success' => false]);
    }

    public function test_peminjaman_submission_validates_item_existence_and_quantity(): void
    {
        // 1. Missing item id
        $resMissing = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Test User',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Rapat',
            'selected_items' => [
                ['item' => [], 'jumlah' => 1],
            ],
        ]);
        $resMissing->assertStatus(422);

        // 2. Non-existent item id
        $resNonExistent = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Test User',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Rapat',
            'selected_items' => [
                ['item' => ['id' => 999999], 'jumlah' => 1],
            ],
        ]);
        $resNonExistent->assertStatus(422);

        // 3. Invalid quantity
        $item = ItemJenis::first();
        $resInvalidQty = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Test User',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Rapat',
            'selected_items' => [
                ['item' => ['id' => $item->id], 'jumlah' => 0],
            ],
        ]);
        $resInvalidQty->assertStatus(422);
    }

    public function test_peminjaman_submission_with_file_upload(): void
    {
        Storage::fake('local');
        $item = ItemJenis::first();
        $fakeFile = UploadedFile::fake()->create('surat_dinas.pdf', 150, 'application/pdf');

        $response = $this->post('/api/peminjaman', [
            'nip' => '198001012010011001',
            'nama_peminjam' => 'Drs. H. Peminjam Berkas',
            'unit_kerja' => 'Seksi Bimas Islam',
            'mulai' => '2026-11-25 08:00:00',
            'selesai' => '2026-11-25 12:00:00',
            'keperluan' => 'Pelaksanaan Kegiatan Berkas',
            'surat_peminjaman_name' => 'surat_dinas.pdf',
            'surat_file' => $fakeFile,
            'selected_items' => json_encode([
                ['item' => ['id' => $item->id], 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $createdId = $response->json('data.id_peminjaman');
        $peminjaman = Peminjaman::where('id_peminjaman', $createdId)->first();
        $this->assertNotNull($peminjaman);
        $this->assertEquals('surat_dinas.pdf', $peminjaman->surat_peminjaman);
        $this->assertStringStartsWith('surat/', $peminjaman->surat_url);

        $storedPath = $peminjaman->surat_url;
        Storage::disk('local')->assertExists($storedPath);

        // Public tracking: filename dan surat_url tersembunyi (null), flag surat_terlampir true
        $resPublicTracking = $this->getJson('/api/peminjaman/' . $createdId);
        $this->assertNull($resPublicTracking->json('data.surat_peminjaman'));
        $this->assertNull($resPublicTracking->json('data.surat_url'));
        $this->assertTrue($resPublicTracking->json('data.surat_terlampir'));

        // Admin tracking: nama file dan surat_url tersedia lengkap
        $admin = User::first();
        $resAdminTracking = $this->actingAs($admin, 'sanctum')->getJson('/api/peminjaman/' . $createdId);
        $this->assertEquals('surat_dinas.pdf', $resAdminTracking->json('data.surat_peminjaman'));
        $this->assertNotNull($resAdminTracking->json('data.surat_url'));
    }

    public function test_peminjaman_submission_without_file_leaves_surat_null(): void
    {
        $item = ItemJenis::first();

        $response = $this->postJson('/api/peminjaman', [
            'nip' => '198501012010011002',
            'nama_peminjam' => 'Pemohon Tanpa Surat',
            'unit_kerja' => 'Penyelenggara Zawa',
            'mulai' => '2026-12-01 08:00:00',
            'selesai' => '2026-12-01 12:00:00',
            'keperluan' => 'Konsultasi Tanpa Surat',
            'selected_items' => [
                ['item' => ['id' => $item->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $createdId = $response->json('data.id_peminjaman');
        $peminjaman = Peminjaman::where('id_peminjaman', $createdId)->first();
        $this->assertNotNull($peminjaman);
        $this->assertNull($peminjaman->surat_peminjaman);
        $this->assertNull($peminjaman->surat_url);
    }

    public function test_peminjaman_submission_aggregates_duplicate_items_and_rejects_exceeding_stock(): void
    {
        // Item with quantity 1 (e.g. Smartroom)
        $item = ItemJenis::where('quantity', 1)->first();
        $this->assertNotNull($item);

        // Sending 2 rows of the same item each requesting 1 (total 2 > stock 1)
        $response = $this->postJson('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Duplikasi',
            'unit_kerja' => 'Subbag TU',
            'mulai' => '2026-12-05 08:00:00',
            'selesai' => '2026-12-05 12:00:00',
            'keperluan' => 'Uji Coba Duplikasi',
            'selected_items' => [
                ['item' => ['id' => $item->id], 'jumlah' => 1],
                ['item' => ['id' => $item->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['selected_items']);
    }

    public function test_check_conflict_aggregates_duplicate_item_ids(): void
    {
        $item = ItemJenis::where('quantity', 1)->first();
        $this->assertNotNull($item);

        $response = $this->postJson('/api/check-conflict', [
            'mulai' => '2026-12-10 08:00:00',
            'selesai' => '2026-12-10 12:00:00',
            'items' => [
                ['item_id' => $item->id, 'jumlah' => 1],
                ['item_id' => $item->id, 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
                 ->assertJson(['success' => false]);
    }

    public function test_public_peminjaman_endpoints_mask_borrower_privacy(): void
    {
        $responsePublicAll = $this->getJson('/api/peminjaman');
        $responsePublicAll->assertStatus(200);

        $firstPublic = $responsePublicAll->json('data.0');
        $this->assertNotNull($firstPublic);
        // NIP, nomor_hp, and surat_url must be stripped/null for unauthenticated public list
        $this->assertNull($firstPublic['nip']);
        $this->assertNull($firstPublic['nomor_hp']);
        $this->assertNull($firstPublic['surat_url']);
        // Nama pemohon, unit kerja, dan keperluan disamarkan/disanitasi pada daftar publik
        $this->assertStringContainsString('*', $firstPublic['nama_peminjam']);
        $this->assertEquals('Internal Kemenag Sleman', $firstPublic['unit_kerja']);
        $this->assertEquals('Kegiatan Kedinasan / Tugas Instansi', $firstPublic['keperluan']);

        // Query token parameter must NOT unlock private list data
        $responseQueryToken = $this->getJson('/api/peminjaman?token=fake_or_real_token');
        $this->assertStringContainsString('*', $responseQueryToken->json('data.0.nama_peminjam'));

        // Public tracking endpoint: nama dan NIP muncul asli untuk customer, tapi HP, penanggung jawab, dan berkas surat privat
        $existing = Peminjaman::first();
        $responseTracking = $this->getJson('/api/peminjaman/' . $existing->id_peminjaman);
        $responseTracking->assertStatus(200);

        $trackingData = $responseTracking->json('data');
        // Customer tracking: nama peminjam dan NIP asli muncul (unmasked)
        $this->assertEquals($existing->nama_peminjam, $trackingData['nama_peminjam']);
        $this->assertEquals($existing->nip, $trackingData['nip']);
        // Nomor HP, penanggung jawab, dan download link surat tetap terlindungi/null untuk customer
        $this->assertNull($trackingData['nomor_hp']);
        $this->assertNull($trackingData['penanggung_jawab']);
        $this->assertNull($trackingData['surat_url']);
        $this->assertNull($trackingData['surat_peminjaman']);

        // Authenticated admin can see full unmasked details via Bearer authorization
        $admin = User::first();
        $adminTracking = $this->actingAs($admin, 'sanctum')->getJson('/api/peminjaman/' . $existing->id_peminjaman);
        $adminTracking->assertStatus(200);
        $this->assertEquals($existing->nama_peminjam, $adminTracking->json('data.nama_peminjam'));
        $this->assertEquals($existing->nip, $adminTracking->json('data.nip'));
        $this->assertEquals($existing->nomor_hp, $adminTracking->json('data.nomor_hp'));
        $this->assertEquals($existing->penanggung_jawab, $adminTracking->json('data.penanggung_jawab'));
        $this->assertEquals($existing->keperluan, $adminTracking->json('data.keperluan'));
        $this->assertNotNull($adminTracking->json('data.surat_url'));
        $this->assertNotNull($adminTracking->json('data.surat_peminjaman'));

        $adminList = $this->actingAs($admin, 'sanctum')->getJson('/api/master/peminjaman');
        $adminList->assertStatus(200);
        $this->assertEquals($existing->nama_peminjam, $adminList->json('data.0.nama_peminjam'));
        $this->assertEquals($existing->nomor_hp, $adminList->json('data.0.nomor_hp'));
        $this->assertEquals($existing->penanggung_jawab, $adminList->json('data.0.penanggung_jawab'));
        $this->assertNotNull($adminList->json('data.0.surat_url'));
    }

    public function test_surat_endpoint_requires_admin_authorization(): void
    {
        Storage::fake('local');
        $fakeFile = UploadedFile::fake()->create('dokumen_rahasia.pdf', 100, 'application/pdf');
        $item = ItemJenis::first();

        $createRes = $this->post('/api/peminjaman', [
            'nama_peminjam' => 'Pemohon Berkas Rahasia',
            'unit_kerja' => 'Seksi Bimas Islam',
            'mulai' => '2026-12-15 08:00:00',
            'selesai' => '2026-12-15 12:00:00',
            'keperluan' => 'Kegiatan Berkas Rahasia',
            'surat_peminjaman_name' => 'dokumen_rahasia.pdf',
            'surat_file' => $fakeFile,
            'selected_items' => json_encode([
                ['item' => ['id' => $item->id], 'jumlah' => 1],
            ]),
        ]);
        $id = $createRes->json('data.id_peminjaman');

        // Unauthenticated access must be rejected with 403 Forbidden
        $resGuest = $this->get("/api/peminjaman/{$id}/surat");
        $resGuest->assertStatus(403);

        // Query param token is rejected for security
        $resQueryToken = $this->get("/api/peminjaman/{$id}/surat?token=fake_or_raw_token");
        $resQueryToken->assertStatus(403);

        // Authenticated admin can access and download the document via Bearer token
        $admin = User::first();
        $resAdmin = $this->actingAs($admin, 'sanctum')->get("/api/peminjaman/{$id}/surat");
        $resAdmin->assertStatus(200);
    }

    public function test_admin_can_review_seeded_or_missing_surat_document(): void
    {
        $admin = User::first();
        // PMJ-202610-002 has seeded surat_bimas_014.pdf
        $response = $this->actingAs($admin, 'sanctum')->get('/api/peminjaman/PMJ-202610-002/surat');
        $response->assertStatus(200);
        $this->assertStringContainsString('pdf', (string) $response->headers->get('Content-Type'));
    }
}
