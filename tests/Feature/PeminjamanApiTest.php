<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\MasterJenis;
use App\Models\ItemJenis;
use App\Models\Peminjaman;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PeminjamanApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_can_get_master_jenis(): void
    {
        $response = $this->getJson('/api/master/jenis');

        $response->assertStatus(200)
                 ->assertJson(['success' => true])
                 ->assertJsonStructure(['success', 'data' => [['id', 'nama']]]);
    }

    public function test_can_get_item_jenis_and_filter(): void
    {
        $responseAll = $this->getJson('/api/item/jenis');
        $responseAll->assertStatus(200)->assertJson(['success' => true]);

        $responseFiltered = $this->getJson('/api/item/jenis?id_jenis=1');
        $responseFiltered->assertStatus(200)
                         ->assertJson(['success' => true]);
        
        $data = $responseFiltered->json('data');
        foreach ($data as $item) {
            $this->assertEquals(1, $item['id_jenis']);
        }
    }

    public function test_can_get_master_peminjaman(): void
    {
        $response = $this->getJson('/api/master/peminjaman');

        $response->assertStatus(200)
                 ->assertJson(['success' => true])
                 ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_get_single_peminjaman_by_id(): void
    {
        $existing = Peminjaman::first();
        $this->assertNotNull($existing);

        $response = $this->getJson('/api/peminjaman/' . $existing->id_peminjaman);

        $response->assertStatus(200)
                 ->assertJson(['success' => true])
                 ->assertJsonPath('data.id_peminjaman', $existing->id_peminjaman);
    }

    public function test_returns_404_for_nonexistent_peminjaman(): void
    {
        $response = $this->getJson('/api/peminjaman/PMJ-999999-999');

        $response->assertStatus(404)
                 ->assertJson(['success' => false]);
    }

    public function test_can_submit_valid_peminjaman(): void
    {
        $item = ItemJenis::where('is_active', true)->first();
        $this->assertNotNull($item);

        $payload = [
            'nip' => '199501012022031001',
            'nama_peminjam' => 'Automated Test User, S.Kom.',
            'unit_kerja' => 'Seksi Bimas Islam',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Penyusunan Laporan Uji Otomatis',
            'surat_peminjaman_name' => 'surat_test.pdf',
            'selected_items' => [
                [
                    'item' => ['id' => $item->id],
                    'jumlah' => 1,
                ],
            ],
        ];

        $response = $this->postJson('/api/peminjaman', $payload);

        $response->assertStatus(201)
                 ->assertJson(['success' => true])
                 ->assertJsonStructure(['success', 'message', 'data' => ['id_peminjaman', 'items']]);

        $createdId = $response->json('data.id_peminjaman');
        $this->assertDatabaseHas('peminjaman', ['id_peminjaman' => $createdId]);
        $this->assertDatabaseHas('item_peminjaman', ['id_peminjaman' => $createdId, 'item_id' => $item->id]);
    }

    public function test_rejects_when_selesai_before_mulai(): void
    {
        $payload = [
            'nip' => '199501012022031001',
            'nama_peminjam' => 'Invalid Time User',
            'unit_kerja' => 'Seksi Bimas Islam',
            'mulai' => '2026-11-20 12:00:00',
            'selesai' => '2026-11-20 08:00:00',
            'keperluan' => 'Invalid Time Test',
            'selected_items' => [
                ['item' => ['id' => 1], 'jumlah' => 1],
            ],
        ];

        $response = $this->postJson('/api/peminjaman', $payload);

        $response->assertStatus(422);
    }

    public function test_detects_schedule_conflict(): void
    {
        // PMJ-202610-001 has Ruang Rapat Lt. 2 (id: 1, qty: 1) on 2026-10-05 08:00 to 14:00 (Disetujui)
        $payload = [
            'nip' => '198504122010011003',
            'nama_peminjam' => 'Conflicting Borrower',
            'unit_kerja' => 'Seksi Penma',
            'mulai' => '2026-10-05 09:00:00',
            'selesai' => '2026-10-05 11:00:00',
            'keperluan' => 'Test Schedule Overlap Conflict',
            'selected_items' => [
                ['item' => ['id' => 1], 'jumlah' => 1],
            ],
        ];

        $response = $this->postJson('/api/peminjaman', $payload);

        $response->assertStatus(422)
                 ->assertJson(['success' => false])
                 ->assertJsonPath('conflicts.0.item_id', 1);
    }

    public function test_check_conflict_endpoint(): void
    {
        $conflictPayload = [
            'mulai' => '2026-10-05 09:00:00',
            'selesai' => '2026-10-05 11:00:00',
            'items' => [
                ['item_id' => 1, 'jumlah' => 1],
            ],
        ];

        $resConflict = $this->postJson('/api/check-conflict', $conflictPayload);
        $resConflict->assertStatus(422)
                    ->assertJson(['has_conflict' => true]);

        $availablePayload = [
            'mulai' => '2026-12-01 08:00:00',
            'selesai' => '2026-12-01 10:00:00',
            'items' => [
                ['item_id' => 1, 'jumlah' => 1],
            ],
        ];

        $resAvailable = $this->postJson('/api/check-conflict', $availablePayload);
        $resAvailable->assertStatus(200)
                     ->assertJson(['has_conflict' => false]);
    }
}
