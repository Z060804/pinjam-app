<?php

namespace Tests\Unit;

use App\Models\ItemJenis;
use App\Models\MasterJenis;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingServiceTest extends TestCase
{
    use RefreshDatabase;

    protected BookingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(BookingService::class);
        MasterJenis::create(['id' => 1, 'nama' => 'Ruangan']);
        MasterJenis::create(['id' => 2, 'nama' => 'Kendaraan']);
        MasterJenis::create(['id' => 3, 'nama' => 'Perlengkapan']);
    }

    public function test_resolve_category_metadata_for_single_and_multi_item(): void
    {
        $ruangan = ItemJenis::create([
            'id_jenis' => 1,
            'nama' => 'Aula Utama',
            'quantity' => 1,
            'is_active' => true,
        ]);

        $kendaraan = ItemJenis::create([
            'id_jenis' => 2,
            'nama' => 'Bus Dinas',
            'quantity' => 1,
            'is_active' => true,
        ]);

        $itemA = (object) ['item_id' => $ruangan->id, 'jumlah' => 1, 'item' => $ruangan];
        $singleMeta = $this->service->resolveCategoryMetadata(collect([$itemA]));
        $this->assertEquals(['ruangan'], $singleMeta['kategori_list']);
        $this->assertFalse($singleMeta['is_multi_item']);
        $this->assertEquals('ruangan', $singleMeta['jenis']);

        $itemB = (object) ['item_id' => $kendaraan->id, 'jumlah' => 1, 'item' => $kendaraan];
        $multiMeta = $this->service->resolveCategoryMetadata(collect([$itemA, $itemB]));
        $this->assertCount(2, $multiMeta['kategori_list']);
        $this->assertTrue($multiMeta['is_multi_item']);
        $this->assertEquals('kombinasi', $multiMeta['jenis']);
    }

    public function test_detect_conflicts_respects_time_overlap_and_quantity(): void
    {
        $ruang = ItemJenis::create([
            'id_jenis' => 1,
            'nama' => 'Ruang Rapat A',
            'quantity' => 1,
            'is_active' => true,
        ]);

        // Peminjaman 1 disetujui: 2026-11-10 09:00 - 11:00
        $p1 = Peminjaman::create([
            'id' => 'PMJ-202611-001',
            'id_peminjaman' => 'PMJ-202611-001',
            'tgl_pengajuan' => '2026-11-01',
            'nip' => '198501012010011001',
            'nama_pemohon' => 'Pegawai A',
            'nama_peminjam' => 'Pegawai A',
            'unit_pemohon' => 'Kepegawaian',
            'unit_kerja' => 'Kepegawaian',
            'tgl_mulai' => '2026-11-10',
            'tgl_selesai' => '2026-11-10',
            'waktu_mulai' => '09:00',
            'waktu_selesai' => '11:00',
            'mulai' => '2026-11-10 09:00:00',
            'selesai' => '2026-11-10 11:00:00',
            'status' => 'Disetujui',
            'keperluan' => 'Rapat Koordinasi',
        ]);
        PeminjamanItem::create([
            'peminjaman_id' => 'PMJ-202611-001',
            'item_id' => $ruang->id,
            'jumlah' => 1,
        ]);

        // Request 1: Overlapping time (10:00 - 12:00) harus bentrok
        $conflicts = $this->service->detectConflicts(
            '2026-11-10 10:00',
            '2026-11-10 12:00',
            [['item_id' => $ruang->id, 'jumlah' => 1]]
        );
        $this->assertNotEmpty($conflicts);
        $this->assertEquals($ruang->id, $conflicts[0]['item_id']);

        // Request 2: Non-overlapping time (11:00 - 13:00) tidak boleh bentrok
        $noConflicts = $this->service->detectConflicts(
            '2026-11-10 11:00',
            '2026-11-10 13:00',
            [['item_id' => $ruang->id, 'jumlah' => 1]]
        );
        $this->assertEmpty($noConflicts);
    }
}
