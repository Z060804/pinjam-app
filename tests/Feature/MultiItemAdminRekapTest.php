<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MultiItemAdminRekapTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected string $adminToken;
    protected ItemJenis $room;
    protected ItemJenis $vehicle;
    protected ItemJenis $equipment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SimpruSeeder::class);

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@kemenag.go.id'],
            [
                'name' => 'Administrator SIMPRU',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ]
        );

        $this->adminToken = $this->admin->createToken('admin-rekap-token')->plainTextToken;

        $this->room = ItemJenis::where('id_jenis', 1)->first() ?? ItemJenis::find(1);
        $this->vehicle = ItemJenis::where('id_jenis', 2)->first() ?? ItemJenis::find(5);
        $this->equipment = ItemJenis::where('id_jenis', 3)->first() ?? ItemJenis::find(8);
    }

    /**
     * Test multi-item cross-category (Ruangan, Kendaraan, Perlengkapan) appears in Admin Rekap.
     */
    public function test_multi_item_cross_category_submission_appears_in_admin_rekap(): void
    {
        $id = 'PMJ-202611-999';

        $peminjaman = Peminjaman::create([
            'id_peminjaman' => $id,
            'id' => $id,
            'nip' => '199001012015011001',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Multi Kategori',
            'unit_kerja' => 'Seksi Bimas Islam',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 16:00:00',
            'keperluan' => 'Penyuluhan Lapangan dan Dokumentasi',
            'status' => 'Menunggu Persetujuan',
        ]);

        // Attach items from 3 distinct categories
        ItemPeminjaman::create([
            'id_peminjaman' => $id,
            'item_id' => $this->room->id,
            'jumlah' => 1,
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $id,
            'item_id' => $this->vehicle->id,
            'jumlah' => 1,
        ]);
        ItemPeminjaman::create([
            'id_peminjaman' => $id,
            'item_id' => $this->equipment->id,
            'jumlah' => 2,
        ]);

        // Admin queries all peminjaman for Rekap
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->getJson('/api/master/peminjaman');

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $data = $response->json('data');
        $found = collect($data)->firstWhere('id', $id);

        $this->assertNotNull($found, "Multi-item peminjaman {$id} must appear in /api/master/peminjaman");
        $this->assertEquals('kombinasi', $found['jenis']);
        $this->assertTrue($found['is_multi_item']);
        $this->assertEquals(['ruangan', 'kendaraan', 'perlengkapan'], $found['kategori_list']);
        $this->assertCount(3, $found['items']);

        // Assert item names are all listed in item_dipinjam and ruangan string
        $this->assertStringContainsString($this->room->nama, $found['item_dipinjam']);
        $this->assertStringContainsString($this->vehicle->nama, $found['item_dipinjam']);
        $this->assertStringContainsString($this->equipment->nama, $found['item_dipinjam']);

        // Assert category metadata in each item
        $roomItem = collect($found['items'])->firstWhere('item_id', $this->room->id);
        $vehicleItem = collect($found['items'])->firstWhere('item_id', $this->vehicle->id);
        $equipmentItem = collect($found['items'])->firstWhere('item_id', $this->equipment->id);

        $this->assertEquals('ruangan', $roomItem['kategori']);
        $this->assertEquals('kendaraan', $vehicleItem['kategori']);
        $this->assertEquals('perlengkapan', $equipmentItem['kategori']);
        $this->assertEquals(2, $equipmentItem['jumlah']);
    }

    /**
     * Test single item loan continues to function correctly with single category.
     */
    public function test_single_item_submission_retains_exact_category(): void
    {
        $id = 'PMJ-202611-998';

        Peminjaman::create([
            'id_peminjaman' => $id,
            'id' => $id,
            'nip' => '199001012015011002',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Ruangan Saja',
            'unit_kerja' => 'Kepegawaian',
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 12:00:00',
            'keperluan' => 'Rapat Internal',
            'status' => 'Menunggu Persetujuan',
        ]);

        ItemPeminjaman::create([
            'id_peminjaman' => $id,
            'item_id' => $this->room->id,
            'jumlah' => 1,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->getJson('/api/master/peminjaman');

        $data = $response->json('data');
        $found = collect($data)->firstWhere('id', $id);

        $this->assertNotNull($found);
        $this->assertEquals('ruangan', $found['jenis']);
        $this->assertFalse($found['is_multi_item']);
        $this->assertEquals(['ruangan'], $found['kategori_list']);
        $this->assertCount(1, $found['items']);
    }

    /**
     * Test unique loan count in Rekap is based on unique loans, not item count.
     */
    public function test_rekap_count_is_based_on_unique_loans(): void
    {
        $initialRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                           ->getJson('/api/master/peminjaman');
        $initialCount = count($initialRes->json('data'));

        $id = 'PMJ-202611-997';
        Peminjaman::create([
            'id_peminjaman' => $id,
            'id' => $id,
            'nip' => '199001012015011003',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Unik',
            'unit_kerja' => 'Penma',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 12:00:00',
            'keperluan' => 'Peminjaman 3 Item',
            'status' => 'Menunggu Persetujuan',
        ]);

        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->room->id, 'jumlah' => 1]);
        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->vehicle->id, 'jumlah' => 1]);
        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->equipment->id, 'jumlah' => 1]);

        $afterRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->getJson('/api/master/peminjaman');
        $afterCount = count($afterRes->json('data'));

        $this->assertEquals($initialCount + 1, $afterCount, "Count must increase by exactly 1 unique loan, regardless of item details");
    }

    /**
     * Test tracking endpoint getPeminjamanById returns all items and categories.
     */
    public function test_get_peminjaman_by_id_returns_all_cross_category_items(): void
    {
        $id = 'PMJ-202611-996';
        Peminjaman::create([
            'id_peminjaman' => $id,
            'id' => $id,
            'nip' => '199001012015011004',
            'tgl_pengajuan' => '2026-11-01',
            'nama_peminjam' => 'Pemohon Tracking',
            'unit_kerja' => 'Penma',
            'mulai' => '2026-11-23 08:00:00',
            'selesai' => '2026-11-23 12:00:00',
            'keperluan' => 'Tracking Multi Item',
            'status' => 'Menunggu Persetujuan',
        ]);

        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->room->id, 'jumlah' => 1]);
        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->vehicle->id, 'jumlah' => 1]);
        ItemPeminjaman::create(['id_peminjaman' => $id, 'item_id' => $this->equipment->id, 'jumlah' => 3]);

        $res = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                    ->getJson("/api/peminjaman/{$id}");

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals($id, $data['id']);
        $this->assertEquals('kombinasi', $data['jenis']);
        $this->assertTrue($data['is_multi_item']);
        $this->assertCount(3, $data['items']);
    }
}
