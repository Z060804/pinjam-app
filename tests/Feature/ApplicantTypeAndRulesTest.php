<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApplicantTypeAndRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    private function createValidPdf(string $filename = 'surat_dinas.pdf', int $totalBytes = 10240): UploadedFile
    {
        $header = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Surat Permohonan Resmi) >>\nendobj\n";
        $trailer = "\nxref\n0 2\n0000000000 65535 f \n0000000015 00000 n \ntrailer\n<< /Size 2 >>\nstartxref\n100\n%%EOF";
        $neededPadding = max(0, $totalBytes - strlen($header) - strlen($trailer));
        $content = $header.str_repeat('A', $neededPadding).$trailer;

        if (strlen($content) > $totalBytes) {
            $content = substr($content, 0, $totalBytes);
        }

        return UploadedFile::fake()->createWithContent($filename, $content);
    }

    private function getRoom(int $index = 0): ItemJenis
    {
        return ItemJenis::where('id_jenis', 1)->skip($index)->first()
            ?? ItemJenis::create(['id_jenis' => 1, 'nama' => "Ruangan {$index}", 'quantity' => 1, 'is_active' => true]);
    }

    private function getVehicle(int $index = 0): ItemJenis
    {
        return ItemJenis::where('id_jenis', 2)->skip($index)->first()
            ?? ItemJenis::create(['id_jenis' => 2, 'nama' => "Kendaraan {$index}", 'quantity' => 1, 'is_active' => true]);
    }

    private function getEquipment(int $index = 0): ItemJenis
    {
        return ItemJenis::where('id_jenis', 3)->skip($index)->first()
            ?? ItemJenis::create(['id_jenis' => 3, 'nama' => "Peralatan {$index}", 'quantity' => 10, 'is_active' => true]);
    }

    /**
     * 1. Internal + satu ruangan + tanpa surat: harus diterima jika persyaratan lain valid.
     */
    public function test_1_internal_one_room_without_surat_accepted(): void
    {
        $room = $this->getRoom(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Seksi Pendidikan Madrasah (Penma)',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 12:00:00',
            'keperluan' => 'Rapat Koordinasi Penma',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $id = $response->json('data.id_peminjaman');
        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $id,
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
        ]);
    }

    /**
     * 2. Internal + beberapa ruangan + tanpa surat: harus diterima jika sistem mendukung pilihan beberapa ruangan.
     */
    public function test_2_internal_multiple_rooms_without_surat_accepted(): void
    {
        $room1 = $this->getRoom(0);
        $room2 = $this->getRoom(1);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Seksi Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 15:00:00',
            'keperluan' => 'Bimtek Penghulu dan Penyuluh Multi-Ruangan',
            'selected_items' => [
                ['item' => ['id' => $room1->id], 'jumlah' => 1],
                ['item' => ['id' => $room2->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 3. Internal + kendaraan + tanpa surat: harus ditolak.
     */
    public function test_3_internal_vehicle_without_surat_rejected(): void
    {
        $vehicle = $this->getVehicle(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Subbag Tata Usaha',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 17:00:00',
            'keperluan' => 'Monitoring KUA Wilayah Barat',
            'selected_items' => [
                ['item' => ['id' => $vehicle->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 4. Internal + peralatan + tanpa surat: harus ditolak.
     */
    public function test_4_internal_equipment_without_surat_rejected(): void
    {
        $equipment = $this->getEquipment(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 17:00:00',
            'keperluan' => 'Peminjaman LCD Projector',
            'selected_items' => [
                ['item' => ['id' => $equipment->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 5. Internal + ruangan dan peralatan + tanpa surat: harus ditolak.
     */
    public function test_5_internal_room_and_equipment_without_surat_rejected(): void
    {
        $room = $this->getRoom(0);
        $equipment = $this->getEquipment(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Seksi PHU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-23 08:00:00',
            'selesai' => '2026-11-23 16:00:00',
            'keperluan' => 'Pelepasan Jamaah Haji & Sewa Proyektor',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
                ['item' => ['id' => $equipment->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 6. Eksternal + satu ruangan + tanpa surat: harus ditolak.
     */
    public function test_6_external_one_room_without_surat_rejected(): void
    {
        $room = $this->getRoom(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Siti Nurjanah, S.Pd.',
            'unit_kerja' => 'MTs Negeri 1 Sleman',
            'nomor_hp' => '089876543210',
            'mulai' => '2026-11-24 08:00:00',
            'selesai' => '2026-11-24 14:00:00',
            'keperluan' => 'Lomba Sains Madrasah',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 7. Eksternal + satu ruangan + surat valid: harus diterima jika persyaratan lain valid.
     */
    public function test_7_external_one_room_with_valid_surat_accepted(): void
    {
        $room = $this->getRoom(0);
        $file = $this->createValidPdf('surat_mts1.pdf');

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Siti Nurjanah, S.Pd.',
            'unit_kerja' => 'MTs Negeri 1 Sleman',
            'nomor_hp' => '089876543210',
            'mulai' => '2026-11-24 08:00:00',
            'selesai' => '2026-11-24 14:00:00',
            'keperluan' => 'Lomba Sains Madrasah',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $room->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $id = $response->json('data.id_peminjaman');
        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $id,
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nip' => null,
        ]);
    }

    /**
     * 8. Eksternal + dua ruangan: harus ditolak.
     */
    public function test_8_external_two_rooms_rejected(): void
    {
        $room1 = $this->getRoom(0);
        $room2 = $this->getRoom(1);
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Budi Santoso',
            'unit_kerja' => 'KUA Mlati',
            'nomor_hp' => '081234567899',
            'mulai' => '2026-11-25 08:00:00',
            'selesai' => '2026-11-25 12:00:00',
            'keperluan' => 'Peminjaman Dua Aula',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $room1->id, 'jumlah' => 1],
                ['item_id' => $room2->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 9. Eksternal + satu kendaraan + surat valid: harus diterima jika persyaratan lain valid.
     */
    public function test_9_external_one_vehicle_with_valid_surat_accepted(): void
    {
        $vehicle = $this->getVehicle(0);
        $file = $this->createValidPdf('surat_kendaraan.pdf');

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Agus Prayitno',
            'unit_kerja' => 'MAN 1 Sleman',
            'nomor_hp' => '087712345678',
            'mulai' => '2026-11-26 08:00:00',
            'selesai' => '2026-11-26 16:00:00',
            'keperluan' => 'Antar Jemput Peserta KSM',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $vehicle->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 10. Eksternal + dua kendaraan: harus ditolak.
     */
    public function test_10_external_two_vehicles_rejected(): void
    {
        $v1 = $this->getVehicle(0);
        $v2 = $this->getVehicle(1);
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Agus Prayitno',
            'unit_kerja' => 'MAN 1 Sleman',
            'nomor_hp' => '087712345678',
            'mulai' => '2026-11-26 08:00:00',
            'selesai' => '2026-11-26 16:00:00',
            'keperluan' => 'Antar Jemput 2 Bus',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $v1->id, 'jumlah' => 1],
                ['item_id' => $v2->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 11. Eksternal + beberapa peralatan + surat valid: harus diterima jika persyaratan lain valid.
     */
    public function test_11_external_multiple_equipment_with_valid_surat_accepted(): void
    {
        $eq1 = $this->getEquipment(0);
        $eq2 = $this->getEquipment(1);
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Hj. Rohanah',
            'unit_kerja' => 'KUA Depok',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-27 08:00:00',
            'selesai' => '2026-11-27 15:00:00',
            'keperluan' => 'Peminjaman Alat Pernikahan Massal',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $eq1->id, 'jumlah' => 2],
                ['item_id' => $eq2->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 12. Eksternal + peralatan + tanpa surat: harus ditolak.
     */
    public function test_12_external_equipment_without_surat_rejected(): void
    {
        $eq = $this->getEquipment(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Hj. Rohanah',
            'unit_kerja' => 'KUA Depok',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-27 08:00:00',
            'selesai' => '2026-11-27 15:00:00',
            'keperluan' => 'Peminjaman Proyektor Tanpa Surat',
            'selected_items' => [
                ['item' => ['id' => $eq->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 13. Internal tanpa NIP: harus ditolak.
     */
    public function test_13_internal_without_nip_rejected(): void
    {
        $room = $this->getRoom(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nama_peminjam' => 'Pegawai Internal',
            'unit_kerja' => 'Seksi Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-28 08:00:00',
            'selesai' => '2026-11-28 12:00:00',
            'keperluan' => 'Rapat Internal',
            'selected_items' => [
                ['item' => ['id' => $room->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nip']);
    }

    /**
     * 14. Eksternal tanpa NIP: harus tetap bisa diajukan.
     */
    public function test_14_external_without_nip_accepted(): void
    {
        $room = $this->getRoom(0);
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Kepala Madrasah Swasta',
            'unit_kerja' => 'MI Al-Ikhlas',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-28 08:00:00',
            'selesai' => '2026-11-28 12:00:00',
            'keperluan' => 'Pelatihan Kurikulum Merdeka',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $room->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $id = $response->json('data.id_peminjaman');
        $saved = Peminjaman::find($id);
        $this->assertNull($saved->nip);
    }

    /**
     * 15. Kedua jenis pemohon tanpa nama atau asal instansi: harus ditolak.
     */
    public function test_15_both_types_without_name_or_agency_rejected(): void
    {
        $room = $this->getRoom(0);

        // Internal missing nama & unit_kerja
        $resInternal = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'nip' => '198501012010011001',
            'mulai' => '2026-11-29 08:00:00',
            'selesai' => '2026-11-29 12:00:00',
            'keperluan' => 'Uji Validasi Form',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $resInternal->assertStatus(422)
            ->assertJsonValidationErrors(['nama_peminjam', 'unit_kerja']);

        // External missing nama & unit_kerja
        $file = $this->createValidPdf();
        $resExternal = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'surat_file' => $file,
            'mulai' => '2026-11-29 08:00:00',
            'selesai' => '2026-11-29 12:00:00',
            'keperluan' => 'Uji Validasi Form Eksternal',
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);
        $resExternal->assertStatus(422)
            ->assertJsonValidationErrors(['nama_peminjam', 'unit_kerja']);
    }

    /**
     * 16. Pengguna mengganti jenis pemohon setelah mengisi form: field dan validasi harus mengikuti pilihan terakhir.
     */
    public function test_16_applicant_type_switch_validations_and_payload(): void
    {
        $room = $this->getRoom(0);
        $file = $this->createValidPdf();

        // If user changed to external: NIP sent as empty/null is accepted, and surat is required
        $resExternal = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'nip' => '', // NIP cleared
            'nama_peminjam' => 'Drs. Subarkah',
            'unit_kerja' => 'MTs Negeri 2',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-30 08:00:00',
            'selesai' => '2026-11-30 11:00:00',
            'keperluan' => 'Pertemuan Komite',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);

        $resExternal->assertStatus(201);
        $saved = Peminjaman::find($resExternal->json('data.id_peminjaman'));
        $this->assertEquals('Eksternal (Madrasah/KUA/Lainnya)', $saved->pihak_pemohon);
        $this->assertNull($saved->nip);
    }

    /**
     * 17. Permintaan langsung ke backend yang mencoba melewati batas jumlah item: harus tetap ditolak.
     */
    public function test_17_direct_backend_api_bypassing_item_limits_rejected(): void
    {
        $room1 = $this->getRoom(0);
        $room2 = $this->getRoom(1);
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'nama_peminjam' => 'Hacker Bypasser',
            'unit_kerja' => 'Organisasi Luar',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-01 08:00:00',
            'selesai' => '2026-12-01 12:00:00',
            'keperluan' => 'Bypass Multi Room Limits',
            'surat_file' => $file,
            'selected_items' => json_encode([
                ['item_id' => $room1->id, 'jumlah' => 1],
                ['item_id' => $room2->id, 'jumlah' => 1],
            ]),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 18. Data internal dan eksternal tersimpan dengan benar serta ditampilkan menggunakan badge yang sesuai pada halaman admin.
     */
    public function test_18_data_storage_and_admin_endpoints_include_applicant_type(): void
    {
        $admin = User::first() ?? User::factory()->create();
        $token = $admin->createToken('admin_test_token')->plainTextToken;

        $room = $this->getRoom(0);
        $file = $this->createValidPdf();

        // 1. Create Internal
        $resInternal = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Pegawai Internal Kemenag',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-02 08:00:00',
            'selesai' => '2026-12-02 11:00:00',
            'keperluan' => 'Acara Internal',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $resInternal->assertStatus(201);
        $internalId = $resInternal->json('data.id_peminjaman');

        // 2. Create External
        $resExternal = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Tamu Eksternal',
            'unit_kerja' => 'Madrasah Aliyah Luar',
            'nomor_hp' => '089988776655',
            'mulai' => '2026-12-03 08:00:00',
            'selesai' => '2026-12-03 11:00:00',
            'keperluan' => 'Acara Eksternal',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);
        $resExternal->assertStatus(201);
        $externalId = $resExternal->json('data.id_peminjaman');

        // Verify admin list API returns both with applicant_type and pihak_pemohon
        $listRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/peminjaman');
        $listRes->assertStatus(200);

        $internalRecord = collect($listRes->json('data'))->firstWhere('id', $internalId);
        $externalRecord = collect($listRes->json('data'))->firstWhere('id', $externalId);

        $this->assertNotNull($internalRecord);
        $this->assertEquals('internal', $internalRecord['applicant_type']);
        $this->assertEquals('Internal Kemenag Sleman', $internalRecord['pihak_pemohon']);
        $this->assertEquals('198501012010011001', $internalRecord['nip']);

        $this->assertNotNull($externalRecord);
        $this->assertEquals('external', $externalRecord['applicant_type']);
        $this->assertEquals('Eksternal (Madrasah/KUA/Lainnya)', $externalRecord['pihak_pemohon']);

        // Verify detail endpoint
        $detailRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/peminjaman/{$externalId}");
        $detailRes->assertStatus(200);
        $this->assertEquals('external', $detailRes->json('data.applicant_type'));
    }

    /**
     * 19. Pengajuan lama tetap dapat dibuka tanpa error akibat perubahan baru.
     */
    public function test_19_legacy_submissions_without_applicant_type_open_without_error(): void
    {
        $room = $this->getRoom(0);
        $legacyBooking = Peminjaman::create([
            'id_peminjaman' => 'PMJ-LEGACY-001',
            'id' => 'PMJ-LEGACY-001',
            'tgl_pengajuan' => '2025-01-01',
            'nama_peminjam' => 'Pengguna Lama',
            'nama_pemohon' => 'Pengguna Lama',
            'unit_kerja' => 'Seksi Lama',
            'unit_pemohon' => 'Seksi Lama',
            'mulai' => '2026-12-05 08:00:00',
            'selesai' => '2026-12-05 12:00:00',
            'keperluan' => 'Arsip Data Lama',
            'status' => 'Disetujui',
        ]);

        $response = $this->getJson('/api/peminjaman/PMJ-LEGACY-001');
        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.id_peminjaman', 'PMJ-LEGACY-001');
    }

    /**
     * 20. Upload surat tidak valid harus ditolak sesuai aturan validasi aplikasi.
     */
    public function test_20_invalid_surat_upload_rejected(): void
    {
        $room = $this->getRoom(0);

        // 1. Non-PDF file (.png)
        $pngFile = UploadedFile::fake()->create('fake_document.png', 50, 'image/png');
        $resPng = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'nama_peminjam' => 'Uji Berkas Rusak',
            'unit_kerja' => 'Madrasah',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-06 08:00:00',
            'selesai' => '2026-12-06 12:00:00',
            'keperluan' => 'Uji File Salah Ekstensi',
            'surat_file' => $pngFile,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);
        $resPng->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);

        // 2. Oversized file (> 1 MB = 1048576 bytes)
        $oversizedFile = $this->createValidPdf('oversized.pdf', 1048576 + 500);
        $resOversized = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'nama_peminjam' => 'Uji Berkas Besar',
            'unit_kerja' => 'Madrasah',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-06 08:00:00',
            'selesai' => '2026-12-06 12:00:00',
            'keperluan' => 'Uji File Terlalu Besar',
            'surat_file' => $oversizedFile,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);
        $resOversized->assertStatus(422)
            ->assertJsonValidationErrors(['surat_file']);
    }
}
