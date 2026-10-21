<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Database\QueryException;
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

    private function getAulaLantai3(): ItemJenis
    {
        return ItemJenis::where('id_jenis', 1)
            ->where(function ($q) {
                $q->where('nama', 'like', '%Aula Lantai 3%')
                    ->orWhere('registration_id', 'RNG-AULA-02');
            })->first()
            ?? ItemJenis::create([
                'id_jenis' => 1,
                'nama' => 'Aula Lantai 3 (Sasana Budhaya)',
                'registration_id' => 'RNG-AULA-02',
                'quantity' => 1,
                'is_active' => true,
            ]);
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
     * 3. Internal + kendaraan + tanpa surat: harus diterima (surat tidak wajib bagi internal).
     */
    public function test_3_internal_vehicle_without_surat_accepted(): void
    {
        $vehicle = $this->getVehicle(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Subbag Tata Usaha',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 16:00:00',
            'keperluan' => 'Monitoring KUA Wilayah Barat',
            'selected_items' => [
                ['item' => ['id' => $vehicle->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 4. Internal + peralatan + tanpa surat: harus diterima (surat tidak wajib bagi internal).
     */
    public function test_4_internal_equipment_without_surat_accepted(): void
    {
        $equipment = $this->getEquipment(0);

        $response = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Ahmad Fauzi, M.Ag.',
            'unit_kerja' => 'Seksi Penmad',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 16:00:00',
            'keperluan' => 'Peminjaman LCD Projector',
            'selected_items' => [
                ['item' => ['id' => $equipment->id], 'jumlah' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 5. Internal + ruangan dan peralatan + tanpa surat: harus diterima (surat tidak wajib bagi internal).
     */
    public function test_5_internal_room_and_equipment_without_surat_accepted(): void
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

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    /**
     * 6. Eksternal + satu ruangan (Aula Lt 3) + tanpa surat: harus ditolak (surat wajib untuk eksternal).
     */
    public function test_6_external_one_room_without_surat_rejected(): void
    {
        $room = $this->getAulaLantai3();

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
     * 7. Eksternal + Aula Lantai 3 + surat valid: harus diterima.
     */
    public function test_7_external_one_room_with_valid_surat_accepted(): void
    {
        $room = $this->getAulaLantai3();
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
     * 8. Eksternal + dua ruangan: harus ditolak (hanya 1 aula lantai 3 yang diizinkan).
     */
    public function test_8_external_two_rooms_rejected(): void
    {
        $room1 = $this->getAulaLantai3();
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
     * 9. Eksternal + kendaraan: harus ditolak (eksternal tidak boleh meminjam kendaraan).
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

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
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
     * 11. Eksternal + peralatan: harus ditolak (eksternal tidak boleh meminjam peralatan).
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

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
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

        $response->assertStatus(422);
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
        $room = $this->getAulaLantai3();
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
        $aula = $this->getAulaLantai3();

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
            'selected_items' => json_encode([['item_id' => $aula->id, 'jumlah' => 1]]),
        ]);
        $resExternal->assertStatus(422)
            ->assertJsonValidationErrors(['nama_peminjam', 'unit_kerja']);
    }

    /**
     * 16. Pengguna mengganti jenis pemohon setelah mengisi form: field dan validasi harus mengikuti pilihan terakhir.
     */
    public function test_16_applicant_type_switch_validations_and_payload(): void
    {
        $room = $this->getAulaLantai3();
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
        $room1 = $this->getAulaLantai3();
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
        $aula = $this->getAulaLantai3();
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
            'selected_items' => json_encode([['item_id' => $aula->id, 'jumlah' => 1]]),
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
        $room = $this->getAulaLantai3();

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

    /**
     * 21. Eksternal mencoba memilih ruangan selain Aula Lantai 3: harus ditolak.
     */
    public function test_21_external_choosing_non_aula_room_rejected(): void
    {
        $nonAulaRoom = $this->getRoom(0); // e.g. Smart Room
        $file = $this->createValidPdf();

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Tamu Eksternal',
            'unit_kerja' => 'Luar',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-07 08:00:00',
            'selesai' => '2026-12-07 12:00:00',
            'keperluan' => 'Coba Ruangan Non-Aula',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $nonAulaRoom->id, 'jumlah' => 1]]),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 22. Pengajuan pemohon eksternal tanpa NIP berhasil disimpan jika seluruh data wajib lain valid.
     */
    public function test_22_external_without_nip_succeeds_and_stores_null_nip(): void
    {
        $room = $this->getAulaLantai3();
        $file = $this->createValidPdf('surat_eksternal_tanpa_nip.pdf');

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nip' => '', // string kosong harus ditangani konsisten menjadi null
            'nama_peminjam' => 'Dra. Hj. Maryani',
            'unit_kerja' => 'KUA Seyegan',
            'nomor_hp' => '081398765432',
            'mulai' => '2026-12-08 08:00:00',
            'selesai' => '2026-12-08 12:00:00',
            'keperluan' => 'Rakor KUA Se-Kabupaten Sleman',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
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
     * 23. Pengajuan pemohon eksternal yang memiliki dan mengisi NIP valid tetap tersimpan dengan benar.
     */
    public function test_23_external_with_valid_nip_succeeds_and_stores_nip(): void
    {
        $room = $this->getAulaLantai3();
        $file = $this->createValidPdf('surat_eksternal_dengan_nip.pdf');

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nip' => '198005102005011002',
            'nama_peminjam' => 'Drs. H. Maryono',
            'unit_kerja' => 'MAN 1 Sleman',
            'nomor_hp' => '081398765433',
            'mulai' => '2026-12-09 08:00:00',
            'selesai' => '2026-12-09 12:00:00',
            'keperluan' => 'Pelatihan Guru Madrasah',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $id = $response->json('data.id_peminjaman');
        $this->assertDatabaseHas('peminjaman', [
            'id_peminjaman' => $id,
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nip' => '198005102005011002',
        ]);
    }

    /**
     * 24. Pengajuan pemohon internal tanpa NIP tetap ditolak karena NIP diwajibkan bagi internal.
     */
    public function test_24_internal_without_nip_fails_validation(): void
    {
        $room = $this->getRoom(0);

        // 1. Tanpa field nip
        $response1 = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nama_peminjam' => 'Pegawai Tanpa NIP',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-10 08:00:00',
            'selesai' => '2026-12-10 12:00:00',
            'keperluan' => 'Uji NIP Kosong',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);

        $response1->assertStatus(422)
            ->assertJsonValidationErrors(['nip']);

        // 2. NIP berisi string kosong / whitespace
        $response2 = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '   ',
            'nama_peminjam' => 'Pegawai NIP Spasi',
            'unit_kerja' => 'Bimas Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-10 08:00:00',
            'selesai' => '2026-12-10 12:00:00',
            'keperluan' => 'Uji NIP Spasi',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);

        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['nip']);
    }

    /**
     * 25. Respons error validasi API tetap informatif dan tidak membocorkan detail SQL kepada pengguna.
     */
    public function test_25_api_does_not_leak_sql_details_on_query_exception(): void
    {
        $room = $this->getAulaLantai3();
        $file = $this->createValidPdf();

        // Mock BookingService untuk melempar QueryException simulasi constraint violation
        $this->mock(BookingService::class, function ($mock) {
            $mock->shouldReceive('validateOperationalRules')
                ->andReturn(['valid' => true]);
            $mock->shouldReceive('createPeminjaman')
                ->andThrow(new QueryException(
                    'sqlite',
                    'insert into "peminjaman" ("nip") values (?)',
                    [null],
                    new \Exception("SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'nip' cannot be null")
                ));
        });

        $response = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Uji Keamanan QueryException',
            'unit_kerja' => 'Madrasah',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-12-11 08:00:00',
            'selesai' => '2026-12-11 12:00:00',
            'keperluan' => 'Uji Error Masking',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $room->id, 'jumlah' => 1]]),
        ]);

        $response->assertStatus(422);
        $content = $response->getContent();
        $this->assertStringNotContainsString('SQLSTATE', $content);
        $this->assertStringNotContainsString('Integrity constraint violation', $content);
        $this->assertStringNotContainsString('Column \'nip\' cannot be null', $content);
        $this->assertStringNotContainsString('insert into', $content);
        $response->assertJson([
            'success' => false,
            'message' => 'Terjadi kendala pada database saat menyimpan data pengajuan. Pastikan seluruh isian telah sesuai ketentuan.',
        ]);
    }

    /**
     * 26. Pemohon eksternal boleh meminjam ruangan (Aula Lantai 3) pada akhir pekan (Sabtu & Minggu).
     */
    public function test_26_external_applicant_can_borrow_room_on_weekends(): void
    {
        $aula = $this->getAulaLantai3();
        $file = $this->createValidPdf();

        // Sabtu, 21 November 2026
        $resSaturday = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Ustadz Mansyur',
            'unit_kerja' => 'Yayasan Pendidikan Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 16:00:00',
            'keperluan' => 'Seminar Pendidikan Akhir Pekan',
            'surat_file' => $file,
            'selected_items' => json_encode([['item_id' => $aula->id, 'jumlah' => 1]]),
        ]);
        $resSaturday->assertStatus(201)->assertJson(['success' => true]);

        // Minggu, 22 November 2026
        $resSunday = $this->post('/api/peminjaman', [
            'applicant_type' => 'external',
            'pihak_pemohon' => 'Eksternal (Madrasah/KUA/Lainnya)',
            'nama_peminjam' => 'Ustadz Mansyur',
            'unit_kerja' => 'Yayasan Pendidikan Islam',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 16:00:00',
            'keperluan' => 'Workshop Hari Minggu',
            'surat_file' => $this->createValidPdf('surat_minggu.pdf'),
            'selected_items' => json_encode([['item_id' => $aula->id, 'jumlah' => 1]]),
        ]);
        $resSunday->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * 27. Kendaraan dan perlengkapan dinas DITOLAK pada akhir pekan (Sabtu & Minggu).
     */
    public function test_27_vehicle_and_equipment_rejected_on_weekends(): void
    {
        $vehicle = $this->getVehicle(0);
        $equipment = $this->getEquipment(0);

        // Uji pemohon internal pinjam kendaraan pada hari Sabtu (2026-11-21)
        $resVeh = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 12:00:00',
            'keperluan' => 'Dinas Luar',
            'selected_items' => [['item' => ['id' => $vehicle->id], 'jumlah' => 1]],
        ]);
        $resVeh->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);

        // Uji perlengkapan pada hari Minggu (2026-11-22)
        $resEq = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 12:00:00',
            'keperluan' => 'Peminjaman Proyektor',
            'selected_items' => [['item' => ['id' => $equipment->id], 'jumlah' => 1]],
        ]);
        $resEq->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 28. Kendaraan dan perlengkapan dinas DITOLAK pada hari libur nasional resmi 2026.
     */
    public function test_28_vehicle_and_equipment_rejected_on_official_national_holidays(): void
    {
        $vehicle = $this->getVehicle(0);

        // 17 Agustus 2026 (Senin) - Hari Kemerdekaan Republik Indonesia
        $resHoliday = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-08-17 08:00:00',
            'selesai' => '2026-08-17 12:00:00',
            'keperluan' => 'Perjalanan Hari Kemerdekaan',
            'selected_items' => [['item' => ['id' => $vehicle->id], 'jumlah' => 1]],
        ]);
        $resHoliday->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);
    }

    /**
     * 29. Batas jam operasional kendaraan dan perlengkapan (Senin–Kamis 07.30–16.00, Jumat 07.30–16.30 WIB).
     */
    public function test_29_vehicle_and_equipment_operating_hours_validation(): void
    {
        $vehicle = $this->getVehicle(0);

        // Senin 2026-11-16: mulai jam 07:00 (sebelum 07.30) -> HARUS DITOLAK
        $resEarly = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-16 07:00:00',
            'selesai' => '2026-11-16 11:00:00',
            'keperluan' => 'Dinas Pagi Buta',
            'selected_items' => [['item' => ['id' => $vehicle->id], 'jumlah' => 1]],
        ]);
        $resEarly->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);

        // Kamis 2026-11-19: selesai jam 17:00 (melebihi 16.00) -> HARUS DITOLAK
        $resLateThu = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-19 13:00:00',
            'selesai' => '2026-11-19 17:00:00',
            'keperluan' => 'Dinas Lembur',
            'selected_items' => [['item' => ['id' => $vehicle->id], 'jumlah' => 1]],
        ]);
        $resLateThu->assertStatus(422)
            ->assertJsonValidationErrors(['selected_items']);

        // Jumat 2026-11-20: jadwal valid 07:30 s/d 16:30 -> HARUS DITERIMA
        $resFriValid = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198001012005011001',
            'nama_peminjam' => 'Staf Umum',
            'unit_kerja' => 'Subbag TU',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-20 07:30:00',
            'selesai' => '2026-11-20 16:30:00',
            'keperluan' => 'Monitoring Jumat Berkah',
            'selected_items' => [['item' => ['id' => $vehicle->id], 'jumlah' => 1]],
        ]);
        $resFriValid->assertStatus(201)->assertJson(['success' => true]);
    }

    /**
     * 30. Peminjaman multihari: setiap tanggal dalam rentang merupakan sesi harian aktif
     * yang mencegah bentrok waktu. Pembatalan sesi satu tanggal membebaskan interval sesi tersebut.
     */
    public function test_30_multiday_normal_booking_leaves_intermediate_dates_free(): void
    {
        $room = $this->getAulaLantai3();

        // 1. Ajukan peminjaman multihari: 26 Oktober s/d 29 Oktober (08:00 - 10:00)
        $bookingRes = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Panitia Multihari',
            'unit_kerja' => 'Kemenag Sleman',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-26 08:00:00',
            'selesai' => '2026-10-29 10:00:00',
            'keperluan' => 'Kegiatan Multihari 26-29 Okt',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $bookingRes->assertStatus(201);
        $rootId = $bookingRes->json('data.id_peminjaman');

        // Setujui seluruh sesi
        Peminjaman::where('id', $rootId)->orWhere('parent_id', $rootId)->update(['status' => 'Disetujui']);

        // 2. Tanggal tengah (27 Oktober 08:00-10:00) bentrok -> HARUS DITOLAK (422)
        $resDay27Overlap = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Peminjam Tanggal Antara 27',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-27 08:00:00',
            'selesai' => '2026-10-27 10:00:00',
            'keperluan' => 'Acara Bentrok Tanggal 27',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $resDay27Overlap->assertStatus(422)->assertJson(['success' => false]);

        // 3. Batalkan sesi tanggal 27 Oktober secara spesifik
        $session27 = Peminjaman::where('parent_id', $rootId)->where('tgl_mulai', '2026-10-27')->first();
        $this->assertNotNull($session27);
        $session27->update(['status' => 'Dibatalkan']);

        // 4. Setelah sesi tanggal 27 dibatalkan, peminjaman tanggal 27 (08:00-10:00) -> HARUS BERHASIL (201)
        $resDay27Free = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Peminjam Tanggal Antara 27 Bebas',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-27 08:00:00',
            'selesai' => '2026-10-27 10:00:00',
            'keperluan' => 'Acara Tanggal 27 Setelah Pembatalan',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $resDay27Free->assertStatus(201)->assertJson(['success' => true]);

        // 5. Tanggal 26 (sesi awal) tetap aktif dan menolak bentrok (08:00-10:00) -> 422
        $resDay26Overlap = $this->postJson('/api/peminjaman', [
            'applicant_type' => 'internal',
            'pihak_pemohon' => 'Internal Kemenag Sleman',
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Peminjam Jam Bentrok',
            'unit_kerja' => 'Penma',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-10-26 09:00:00',
            'selesai' => '2026-10-26 10:00:00',
            'keperluan' => 'Sesi yang menabrak jadwal lama',
            'selected_items' => [['item' => ['id' => $room->id], 'jumlah' => 1]],
        ]);
        $resDay26Overlap->assertStatus(422)->assertJson(['success' => false]);
    }
}
