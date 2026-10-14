<?php

namespace Tests\Feature;

use App\Models\ItemJenis;
use App\Models\Peminjaman;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SuratPermohonanUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    /**
     * Helper to generate a valid PDF UploadedFile with actual PDF signature (%PDF-)
     */
    private function createValidPdf(string $filename, int $totalBytes): UploadedFile
    {
        $header = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Surat) >>\nendobj\n";
        $trailer = "\nxref\n0 2\n0000000000 65535 f \n0000000015 00000 n \ntrailer\n<< /Size 2 >>\nstartxref\n100\n%%EOF";
        $neededPadding = max(0, $totalBytes - strlen($header) - strlen($trailer));
        $content = $header . str_repeat('A', $neededPadding) . $trailer;

        // Truncate or ensure exact size
        if (strlen($content) > $totalBytes) {
            $content = substr($content, 0, $totalBytes);
        }

        return UploadedFile::fake()->createWithContent($filename, $content);
    }

    private function getValidPayload(array $overrides = []): array
    {
        $item = ItemJenis::first();
        return array_merge([
            'nip' => '198501012010011001',
            'nama_peminjam' => 'Drs. H. Mulyadi, M.Ag',
            'unit_kerja' => 'Pendidikan Madrasah',
            'nomor_hp' => '081234567890',
            'mulai' => '2026-11-20 08:00:00',
            'selesai' => '2026-11-20 15:00:00',
            'keperluan' => 'Asesmen Kompetensi Madrasah',
            'selected_items' => json_encode([
                ['item_id' => $item ? $item->id : 1, 'jumlah' => 1],
            ]),
        ], $overrides);
    }

    /**
     * 1. PDF valid berukuran di bawah 1 MB — harus diterima.
     */
    public function test_1_valid_pdf_under_1mb_is_accepted(): void
    {
        $fileSize = 500 * 1024; // 500 KB
        $file = $this->createValidPdf('surat_permohonan_500kb.pdf', $fileSize);

        $payload = $this->getValidPayload(['surat_file' => $file]);
        $response = $this->post('/api/peminjaman', $payload);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $savedId = $response->json('data.id_peminjaman');
        $booking = Peminjaman::find($savedId);
        $this->assertNotNull($booking);
        $this->assertNotNull($booking->surat_url);
        Storage::disk('local')->assertExists($booking->surat_url);
    }

    /**
     * 2. PDF valid berukuran tepat 1 MB (1.048.576 byte) — harus diterima.
     */
    public function test_2_valid_pdf_exact_1mb_is_accepted(): void
    {
        $exact1MbBytes = 1048576; // Exact 1 MB
        $file = $this->createValidPdf('surat_exact_1mb.pdf', $exact1MbBytes);
        $this->assertEquals($exact1MbBytes, $file->getSize());

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-21 08:00:00',
            'selesai' => '2026-11-21 15:00:00',
            'surat_file' => $file,
        ]);
        $response = $this->post('/api/peminjaman', $payload);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $savedId = $response->json('data.id_peminjaman');
        $booking = Peminjaman::find($savedId);
        $this->assertNotNull($booking);
        $this->assertNotNull($booking->surat_url);
        Storage::disk('local')->assertExists($booking->surat_url);
    }

    /**
     * 3. PDF valid berukuran lebih dari 1 MB (1.048.577 byte) — harus ditolak.
     */
    public function test_3_pdf_over_1mb_is_rejected(): void
    {
        $overSize = 1048576 + 1; // 1 MB + 1 byte
        $file = $this->createValidPdf('surat_oversized.pdf', $overSize);
        $this->assertEquals($overSize, $file->getSize());

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-22 08:00:00',
            'selesai' => '2026-11-22 15:00:00',
            'surat_file' => $file,
        ]);
        $response = $this->postJson('/api/peminjaman', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['surat_file']);

        $errorMsg = $response->json('errors.surat_file.0');
        $this->assertMatchesRegularExpression('/1 MB/i', $errorMsg);
    }

    /**
     * 4. File JPG, PNG, DOCX, ZIP, dan format non-PDF lainnya — harus ditolak.
     */
    public function test_4_non_pdf_formats_are_rejected(): void
    {
        $nonPdfSamples = [
            'surat.jpg' => UploadedFile::fake()->create('surat.jpg', 100, 'image/jpeg'),
            'surat.png' => UploadedFile::fake()->create('surat.png', 100, 'image/png'),
            'surat.docx' => UploadedFile::fake()->create('surat.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            'surat.zip' => UploadedFile::fake()->create('surat.zip', 100, 'application/zip'),
        ];

        foreach ($nonPdfSamples as $name => $file) {
            $payload = $this->getValidPayload([
                'mulai' => '2026-11-23 08:00:00',
                'selesai' => '2026-11-23 15:00:00',
                'surat_file' => $file,
            ]);

            $response = $this->postJson('/api/peminjaman', $payload);
            $response->assertStatus(422)
                     ->assertJsonValidationErrors(['surat_file']);
        }
    }

    /**
     * 5. File dengan ekstensi .pdf tetapi isi sebenarnya bukan PDF — harus ditolak.
     */
    public function test_5_fake_pdf_with_non_pdf_content_is_rejected(): void
    {
        // Fake file has .pdf extension but content is plain text / HTML without %PDF-
        $fakeContent = "<html><body><h1>Ini dokumen palsu</h1></body></html>";
        $fakePdf = UploadedFile::fake()->createWithContent('dokumen_palsu.pdf', $fakeContent);

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-24 08:00:00',
            'selesai' => '2026-11-24 15:00:00',
            'surat_file' => $fakePdf,
        ]);

        $response = $this->postJson('/api/peminjaman', $payload);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 6. File tanpa ekstensi atau dengan MIME type yang tidak sesuai — harus ditolak.
     */
    public function test_6_file_without_extension_or_invalid_mime_is_rejected(): void
    {
        $invalidFile = UploadedFile::fake()->createWithContent('surat_permohonan', 'Random binary text content');

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-25 08:00:00',
            'selesai' => '2026-11-25 15:00:00',
            'surat_file' => $invalidFile,
        ]);

        $response = $this->postJson('/api/peminjaman', $payload);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 7. Tidak mengunggah surat — hasil harus mengikuti aturan bahwa surat opsional.
     */
    public function test_7_submission_without_surat_is_allowed(): void
    {
        $payload = $this->getValidPayload([
            'mulai' => '2026-11-26 08:00:00',
            'selesai' => '2026-11-26 15:00:00',
            'surat_file' => null,
            'surat_peminjaman_name' => null,
        ]);

        $response = $this->post('/api/peminjaman', $payload);
        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $savedId = $response->json('data.id_peminjaman');
        $booking = Peminjaman::find($savedId);
        $this->assertNotNull($booking);
        $this->assertNull($booking->surat_url);
    }

    /**
     * 8. Mengganti file invalid dengan PDF valid — validasi harus berhasil setelah file diganti.
     */
    public function test_8_replacing_invalid_file_with_valid_pdf_succeeds(): void
    {
        // Percobaan 1: Kirim file DOCX invalid -> harus gagal
        $invalidFile = UploadedFile::fake()->create('surat.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $payloadInvalid = $this->getValidPayload([
            'mulai' => '2026-11-27 08:00:00',
            'selesai' => '2026-11-27 15:00:00',
            'surat_file' => $invalidFile,
        ]);

        $res1 = $this->postJson('/api/peminjaman', $payloadInvalid);
        $res1->assertStatus(422);

        // Percobaan 2: Pengguna mengganti dengan berkas PDF valid berukuran 200 KB -> harus sukses
        $validFile = $this->createValidPdf('surat_pengganti.pdf', 200 * 1024);
        $payloadValid = $this->getValidPayload([
            'mulai' => '2026-11-27 08:00:00',
            'selesai' => '2026-11-27 15:00:00',
            'surat_file' => $validFile,
        ]);

        $res2 = $this->post('/api/peminjaman', $payloadValid);
        $res2->assertStatus(201)
             ->assertJson(['success' => true]);

        $savedId = $res2->json('data.id_peminjaman');
        $booking = Peminjaman::find($savedId);
        $this->assertNotNull($booking->surat_url);
        Storage::disk('local')->assertExists($booking->surat_url);
    }

    /**
     * 9. Mengirim file invalid langsung melalui request API — backend tetap harus menolak.
     */
    public function test_9_direct_api_request_with_invalid_file_is_strictly_rejected(): void
    {
        // Bypass UI: kirim file executable/binary berbahaya bernama permohonan.pdf
        $maliciousContent = "MZ\x90\x00\x03\x00\x00\x00FakeExecutableHeader";
        $spoofedFile = UploadedFile::fake()->createWithContent('malicious.pdf', $maliciousContent);

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-28 08:00:00',
            'selesai' => '2026-11-28 15:00:00',
            'surat_file' => $spoofedFile,
        ]);

        $response = $this->postJson('/api/peminjaman', $payload);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['surat_file']);
    }

    /**
     * 10. Memastikan kegagalan validasi tidak menyimpan file maupun membuat pengajuan yang tidak semestinya.
     */
    public function test_10_validation_failure_does_not_persist_file_or_database_record(): void
    {
        $initialCount = Peminjaman::count();
        $initialStorageFiles = Storage::disk('local')->allFiles();

        // Kirim request dengan file PDF palsu berukuran melebihi batas
        $hugeFake = $this->createValidPdf('huge.pdf', 2 * 1024 * 1024); // 2 MB

        $payload = $this->getValidPayload([
            'mulai' => '2026-11-29 08:00:00',
            'selesai' => '2026-11-29 15:00:00',
            'surat_file' => $hugeFake,
        ]);

        $response = $this->postJson('/api/peminjaman', $payload);
        $response->assertStatus(422);

        // Verifikasi database tidak bertambah
        $this->assertEquals($initialCount, Peminjaman::count());

        // Verifikasi storage tidak memiliki file baru
        $afterStorageFiles = Storage::disk('local')->allFiles();
        $this->assertEquals($initialStorageFiles, $afterStorageFiles);
    }
}
