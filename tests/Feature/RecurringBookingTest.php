<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringBookingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function getRoom(): ItemJenis
    {
        return ItemJenis::where('id_jenis', 1)->first()
            ?? ItemJenis::create(['id_jenis' => 1, 'nama' => 'Ruang Rapat Utama', 'quantity' => 1, 'is_active' => true]);
    }

    private function getAdmin(): User
    {
        return User::first() ?? User::factory()->create();
    }

    /**
     * 1. Kasus Utama: Mulai 22 Oktober 2026, berakhir 30 Oktober 2026.
     * Harus menghasilkan tepat 22 dan 29 Oktober 2026, BUKAN 30 Oktober.
     */
    public function test_recurring_booking_october_22_to_30_produces_22_and_29_not_30(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-22 16:00:00',
            'keperluan' => 'Rapat Koordinasi Mingguan',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-10-30',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $parentId = $response->json('data.id_peminjaman');
        $parent = Peminjaman::find($parentId);

        $this->assertNotNull($parent);
        // Induk adalah sesi 1: 22 Oktober 2026
        $this->assertEquals('2026-10-22', substr((string) $parent->tgl_mulai, 0, 10));
        $this->assertEquals('2026-10-22', substr((string) $parent->tgl_selesai, 0, 10));

        // Anak harus tepat 1 sesi: 29 Oktober 2026
        $children = Peminjaman::where('parent_id', $parentId)->orderBy('tgl_mulai', 'asc')->get();
        $this->assertCount(1, $children);

        $child = $children[0];
        $this->assertEquals('2026-10-29', substr((string) $child->tgl_mulai, 0, 10));
        $this->assertEquals('2026-10-29', substr((string) $child->tgl_selesai, 0, 10));

        // Pastikan TIDAK ADA tanggal 30 Oktober yang tersimpan sebagai jadwal
        $oct30Exists = Peminjaman::where(function ($q) use ($parentId) {
            $q->where('id_peminjaman', $parentId)->orWhere('parent_id', $parentId);
        })->where('tgl_mulai', '2026-10-30')->exists();

        $this->assertFalse($oct30Exists, 'Tanggal 30 Oktober tidak boleh dibuat sebagai jadwal mingguan dari 22 Oktober.');
    }

    /**
     * 2. Kasus Batas: Mulai 22 Oktober 2026, berakhir 28 Oktober 2026.
     * Hanya menghasilkan 22 Oktober karena 29 Oktober sudah melewati batas 28 Oktober.
     */
    public function test_recurring_booking_october_22_to_28_produces_only_22(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-22 16:00:00',
            'keperluan' => 'Peminjaman Batas Pendek',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-10-28',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $parentId = $response->json('data.id_peminjaman');

        // Tidak boleh ada anak karena tanggal ke-2 (29 Oktober) > 28 Oktober
        $children = Peminjaman::where('parent_id', $parentId)->get();
        $this->assertCount(0, $children);
    }

    /**
     * 3. Kasus Mulai dan Berakhir pada Tanggal yang Sama: hanya satu jadwal.
     */
    public function test_recurring_booking_same_start_and_end_date_produces_single_schedule(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-22 16:00:00',
            'keperluan' => 'Peminjaman Satu Hari Berulang Awal',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-10-22',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $parentId = $response->json('data.id_peminjaman');

        $children = Peminjaman::where('parent_id', $parentId)->get();
        $this->assertCount(0, $children);
    }

    /**
     * 4. Pengulangan Melewati Pergantian Bulan dan Tahun.
     * 24 Desember 2026 s.d. 08 Januari 2027: menghasilkan 24 Des 2026, 31 Des 2026, dan 07 Jan 2027.
     */
    public function test_recurring_booking_crossing_month_and_year(): void
    {
        $service = app(BookingService::class);
        $schedules = $service->generateWeeklySchedules(
            '2026-12-24 08:00:00',
            '2026-12-24 16:00:00',
            '2027-01-08'
        );

        $dates = array_column($schedules, 'date');
        $this->assertEquals(['2026-12-24', '2026-12-31', '2027-01-07'], $dates);
    }

    /**
     * 5. Peminjaman Berulang dengan Bentrok Jadwal Harus Gagal Secara Atomik (tanpa data parsial).
     */
    public function test_recurring_booking_with_conflict_fails_atomically(): void
    {
        $room = $this->getRoom();

        // Existing approved booking on 2026-11-09
        $existing = Peminjaman::create([
            'id_peminjaman' => 'PMJ-EXISTING-001',
            'id' => 'PMJ-EXISTING-001',
            'tgl_pengajuan' => '2026-10-19',
            'nama_peminjam' => 'Peminjam Lama',
            'unit_kerja' => 'Bimas Islam',
            'mulai' => '2026-11-09 08:00:00',
            'selesai' => '2026-11-09 12:00:00',
            'keperluan' => 'Acara Lama',
            'status' => 'Disetujui',
        ]);
        PeminjamanItem::create([
            'peminjaman_id' => $existing->id_peminjaman,
            'item_id' => $room->id,
            'jumlah' => 1,
        ]);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Pemohon Baru Bentrok',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'keperluan' => 'Rangkaian Bentrok',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-16',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);

        // Tidak boleh ada record "Pemohon Baru Bentrok" yang tersisa
        $this->assertEquals(0, Peminjaman::where('nama_peminjam', 'Pemohon Baru Bentrok')->count());
    }

    /**
     * 6. Pembatalan Per Tanggal (Single Session Scope): Sesi lain tetap utuh dan induk tidak ikut dibatalkan.
     */
    public function test_cancel_single_session_leaves_other_sessions_intact(): void
    {
        $room = $this->getRoom();

        // 3 sesi: 02 Nov, 09 Nov, 16 Nov 2026
        $createRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'keperluan' => 'Uji Pembatalan Per Tanggal',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-16',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $parentId = $createRes->json('data.id_peminjaman');
        $children = Peminjaman::where('parent_id', $parentId)->orderBy('tgl_mulai', 'asc')->get();
        $this->assertCount(2, $children);

        $session2 = $children[0]; // 09 Nov 2026
        $session3 = $children[1]; // 16 Nov 2026

        // Batalkan hanya sesi 2 dengan scope: 'single'
        $cancelRes = $this->actingAs($this->getAdmin(), 'sanctum')->patchJson("/api/peminjaman/{$session2->id_peminjaman}/status", [
            'status' => 'Dibatalkan',
            'scope' => 'single',
            'alasan' => 'Ada agenda lain di tanggal tersebut',
        ]);

        $cancelRes->assertStatus(200);

        // Verifikasi sesi 2 Dibatalkan
        $this->assertEquals('Dibatalkan', $session2->fresh()->status);
        $this->assertEquals('Ada agenda lain di tanggal tersebut', $session2->fresh()->catatan_admin);

        // Verifikasi induk (Sesi 1) dan Sesi 3 TETAP Menunggu Persetujuan
        $this->assertEquals('Menunggu Persetujuan', Peminjaman::find($parentId)->status);
        $this->assertEquals('Menunggu Persetujuan', $session3->fresh()->status);
    }

    /**
     * 7. Pembatalan Seluruh Rangkaian (Series Scope): Seluruh sesi konsisten Dibatalkan.
     */
    public function test_cancel_whole_series_cancels_all_sessions(): void
    {
        $room = $this->getRoom();

        $createRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'keperluan' => 'Uji Pembatalan Rangkaian Penuh',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-16',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $parentId = $createRes->json('data.id_peminjaman');

        $cancelSeriesRes = $this->actingAs($this->getAdmin(), 'sanctum')->patchJson("/api/peminjaman/{$parentId}/status", [
            'status' => 'Dibatalkan',
            'scope' => 'series',
            'alasan' => 'Kegiatan dibatalkan oleh dinas',
        ]);

        $cancelSeriesRes->assertStatus(200);

        $this->assertEquals('Dibatalkan', Peminjaman::find($parentId)->status);
        $children = Peminjaman::where('parent_id', $parentId)->get();
        foreach ($children as $c) {
            $this->assertEquals('Dibatalkan', $c->status);
        }
    }

    /**
     * 8. Persetujuan Rangkaian Menyetujui Sesi Aktif Tanpa Mengubah Sesi yang Sudah Dibatalkan.
     */
    public function test_approval_of_series_does_not_resurrect_cancelled_session(): void
    {
        $room = $this->getRoom();

        $createRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'keperluan' => 'Uji Persetujuan Parsial',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-16',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $parentId = $createRes->json('data.id_peminjaman');
        $children = Peminjaman::where('parent_id', $parentId)->orderBy('tgl_mulai', 'asc')->get();
        $session2 = $children[0];

        // Batalkan sesi 2 terlebih dahulu
        $this->actingAs($this->getAdmin(), 'sanctum')->patchJson("/api/peminjaman/{$session2->id_peminjaman}/status", [
            'status' => 'Dibatalkan',
            'scope' => 'single',
        ])->assertStatus(200);

        // Sekarang setujui seluruh rangkaian
        $approveRes = $this->actingAs($this->getAdmin(), 'sanctum')->patchJson("/api/peminjaman/{$parentId}/status", [
            'status' => 'Disetujui',
            'scope' => 'series',
        ]);

        $approveRes->assertStatus(200);

        // Induk (Sesi 1) harus Disetujui
        $this->assertEquals('Disetujui', Peminjaman::find($parentId)->status);
        // Sesi 2 TETAP Dibatalkan (tidak boleh dibangkitkan kembali)
        $this->assertEquals('Dibatalkan', $session2->fresh()->status);
        // Sesi 3 harus Disetujui
        $this->assertEquals('Disetujui', $children[1]->fresh()->status);
    }

    /**
     * 9. API getPeminjamanById dan getAllPeminjaman Mengembalikan Penanda Berulang Lengkap.
     */
    public function test_api_returns_complete_recurring_metadata(): void
    {
        $room = $this->getRoom();

        $createRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 12:00:00',
            'keperluan' => 'Uji Metadata Berulang',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-09',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $parentId = $createRes->json('data.id_peminjaman');

        // Uji tracking/detail endpoint
        $detailRes = $this->getJson("/api/peminjaman/{$parentId}");
        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_recurring' => true,
                    'session_number' => 1,
                    'total_sessions' => 2,
                    'session_label' => 'Sesi 1 dari 2',
                ],
            ]);

        $this->assertCount(2, $detailRes->json('data.recurring_schedules'));

        // Uji kalender/list endpoint
        $listRes = $this->getJson('/api/peminjaman');
        $listRes->assertStatus(200);

        $items = collect($listRes->json('data'));
        $parentInList = $items->firstWhere('id', $parentId);
        $this->assertNotNull($parentInList);
        $this->assertTrue($parentInList['is_recurring']);
        $this->assertEquals('Sesi 1 dari 2', $parentInList['session_label']);
    }

    /**
     * 10. Peminjaman Biasa Multi-Hari (22 - 30 Oktober 2026):
     * Tidak membuat sesi mingguan, tidak membuat record turunan parent_id, dan tidak memiliki penanda berulang.
     */
    public function test_normal_multi_day_booking_has_no_recurring_badge_and_no_child_sessions(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-22 08:00:00',
            'selesai' => '2026-10-30 16:00:00',
            'keperluan' => 'Pameran Pendidikan Multi-Hari',
            'is_recurring' => false,
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $id = $response->json('data.id_peminjaman');

        $record = Peminjaman::find($id);
        $this->assertNotNull($record);
        $this->assertFalse((bool) $record->is_recurring);
        $this->assertNull($record->parent_id);
        $this->assertEquals('2026-10-22 08:00:00', (string) $record->mulai);
        $this->assertEquals('2026-10-30 16:00:00', (string) $record->selesai);

        // Pastikan tidak ada record turunan
        $childrenCount = Peminjaman::where('parent_id', $id)->count();
        $this->assertEquals(0, $childrenCount);

        // Cek API detail: is_recurring harus false, recurring_schedules harus kosong
        $detailRes = $this->getJson("/api/peminjaman/{$id}");
        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_recurring' => false,
                    'session_label' => null,
                    'total_sessions' => null,
                    'recurring_schedules' => [],
                ],
            ]);

        // Cek API list: is_recurring harus false, session_label harus null
        $listRes = $this->getJson('/api/peminjaman');
        $item = collect($listRes->json('data'))->firstWhere('id', $id);
        $this->assertNotNull($item);
        $this->assertFalse($item['is_recurring']);
        $this->assertNull($item['session_label']);
    }

    /**
     * 11. Peminjaman Berulang 2 November - 23 November 2026:
     * Menghasilkan tepat 4 sesi: 2, 9, 16, dan 23 November 2026.
     */
    public function test_recurring_booking_nov_2_to_23_produces_exactly_four_sessions(): void
    {
        $room = $this->getRoom();

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-02 08:00:00',
            'selesai' => '2026-11-02 16:00:00',
            'keperluan' => 'Kursus Pembina Pramuka Mingguan',
            'is_recurring' => true,
            'recurring_frequency' => 'weekly',
            'recurring_end_date' => '2026-11-23',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $parentId = $response->json('data.id_peminjaman');

        $allSessions = Peminjaman::where('id_peminjaman', $parentId)
            ->orWhere('parent_id', $parentId)
            ->orderBy('tgl_mulai', 'asc')
            ->get();

        $this->assertCount(4, $allSessions, 'Harus menghasilkan tepat 4 sesi.');

        $expectedDates = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'];
        foreach ($allSessions as $idx => $session) {
            $this->assertEquals($expectedDates[$idx], substr((string) $session->tgl_mulai, 0, 10));
            $this->assertEquals($expectedDates[$idx], substr((string) $session->tgl_selesai, 0, 10));
            $this->assertEquals('08:00', substr((string) $session->waktu_mulai, 0, 5));
            $this->assertEquals('16:00', substr((string) $session->waktu_selesai, 0, 5));
        }
    }
}
