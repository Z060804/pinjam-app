<?php

namespace App\Http\Controllers;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PeminjamanController extends Controller
{
    public function __construct(
        protected BookingService $bookingService
    ) {}

    /**
     * Get all item peminjaman relations (historical data).
     */
    public function getItemPeminjaman(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ItemPeminjaman::all(),
        ]);
    }

    /**
     * Endpoint pengecekan bentrok jadwal secara remote untuk kalkulasi ketersediaan live.
     * Mendukung validasi seluruh jadwal pada peminjaman berulang mingguan.
     */
    public function checkConflict(Request $request): JsonResponse
    {
        $request->validate([
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:item_jenis,id',
            'items.*.jumlah' => 'required|integer|min:1',
            'is_recurring' => 'nullable|boolean',
            'recurring_frequency' => 'nullable|string|in:weekly',
            'recurring_end_date' => 'nullable|date',
        ]);

        $aggregated = $this->aggregateItemsPayload($request->input('items'));
        $isRecurring = $request->boolean('is_recurring');
        $recurringEndDate = $request->input('recurring_end_date');
        $isExternal = $this->determineIsExternal($request);

        if ($isRecurring && $recurringEndDate) {
            $schedules = $this->bookingService->generateWeeklySchedules(
                $request->input('mulai'),
                $request->input('selesai'),
                $recurringEndDate
            );

            if (empty($schedules)) {
                return response()->json([
                    'success' => false,
                    'has_conflict' => true,
                    'message' => 'Tanggal akhir pengulangan tidak boleh lebih awal dari tanggal mulai.',
                    'conflicts' => [],
                ], 422);
            }

            // Validasi aturan operasional untuk setiap jadwal pengulangan
            foreach ($schedules as $sched) {
                $opResult = $this->bookingService->validateOperationalRules(
                    $sched['mulai'],
                    $sched['selesai'],
                    $aggregated,
                    $isExternal
                );
                if (! $opResult['valid']) {
                    return response()->json([
                        'success' => false,
                        'has_conflict' => true,
                        'message' => $opResult['message'],
                        'conflicts' => [],
                    ], 422);
                }
            }

            $allConflicts = [];
            $conflictingDates = [];
            foreach ($schedules as $sched) {
                $conflicts = $this->bookingService->detectConflicts(
                    $sched['mulai'],
                    $sched['selesai'],
                    $aggregated
                );
                if (! empty($conflicts)) {
                    $allConflicts[$sched['date']] = $conflicts;
                    $conflictingDates[] = $sched['date'];
                }
            }

            if (! empty($allConflicts)) {
                $firstDate = array_key_first($allConflicts);
                $firstConflicts = $allConflicts[$firstDate];
                $firstConflict = $firstConflicts[0];
                $conflictItemNames = implode(', ', array_unique(array_column($firstConflicts, 'item_nama')));
                $dateLabel = Carbon::parse($firstConflict['session_date'] ?? $firstDate)->translatedFormat('d F Y');
                $reqTime = ($firstConflict['session_waktu_mulai'] ?? '').'-'.($firstConflict['session_waktu_selesai'] ?? '').' WIB';

                $existingDetail = '';
                if (! empty($firstConflict['overlapping_bookings'][0])) {
                    $firstOverlap = $firstConflict['overlapping_bookings'][0];
                    $oldTime = ($firstOverlap['waktu_mulai'] ?? '').'-'.($firstOverlap['waktu_selesai'] ?? '').' WIB';
                    $peminjamOld = $firstOverlap['peminjam'] ?? 'peminjam lain';
                    $existingDetail = " (jadwal lama: {$oldTime} oleh {$peminjamOld})";
                }

                return response()->json([
                    'success' => false,
                    'has_conflict' => true,
                    'message' => "Terdapat bentrok jadwal pada tanggal {$dateLabel} untuk {$conflictItemNames} (jam {$reqTime}){$existingDetail}.",
                    'conflicts' => $firstConflicts,
                    'conflicting_dates' => $conflictingDates,
                    'all_conflicts_by_date' => $allConflicts,
                ], 422);
            }

            return response()->json([
                'success' => true,
                'has_conflict' => false,
                'message' => 'Semua jadwal peminjaman berulang tersedia.',
                'schedules_count' => count($schedules),
            ]);
        }

        // Validasi aturan operasional pengajuan biasa
        $opResult = $this->bookingService->validateOperationalRules(
            $request->input('mulai'),
            $request->input('selesai'),
            $aggregated,
            $isExternal
        );
        if (! $opResult['valid']) {
            return response()->json([
                'success' => false,
                'has_conflict' => true,
                'message' => $opResult['message'],
                'conflicts' => [],
            ], 422);
        }

        $conflicts = $this->bookingService->detectConflicts(
            $request->input('mulai'),
            $request->input('selesai'),
            $aggregated
        );

        if (! empty($conflicts)) {
            $firstConflict = $conflicts[0];
            $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
            $dateLabel = Carbon::parse($firstConflict['session_date'] ?? $request->input('mulai'))->translatedFormat('d F Y');
            $reqTime = ($firstConflict['session_waktu_mulai'] ?? '').'-'.($firstConflict['session_waktu_selesai'] ?? '').' WIB';

            $existingDetail = '';
            if (! empty($firstConflict['overlapping_bookings'][0])) {
                $firstOverlap = $firstConflict['overlapping_bookings'][0];
                $oldTime = ($firstOverlap['waktu_mulai'] ?? '').'-'.($firstOverlap['waktu_selesai'] ?? '').' WIB';
                $peminjamOld = $firstOverlap['peminjam'] ?? 'peminjam lain';
                $existingDetail = " (jadwal lama: {$oldTime} oleh {$peminjamOld})";
            }

            return response()->json([
                'success' => false,
                'has_conflict' => true,
                'message' => "Terdapat bentrok jadwal pada tanggal {$dateLabel} untuk {$conflictItemNames} (jam {$reqTime}){$existingDetail}.",
                'conflicts' => $conflicts,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'has_conflict' => false,
            'message' => 'Jadwal tersedia.',
        ]);
    }

    /**
     * Pengajuan peminjaman baru oleh pemohon (Customer submission).
     */
    public function store(Request $request): JsonResponse
    {
        $this->normalizeSelectedItemsInput($request);

        $validator = $this->makeStoreValidator($request);
        $validated = $validator->validate();

        $itemsPayload = $this->aggregateItemsPayload($validated['selected_items']);

        // Simpan file berkas surat jika ada yang diunggah secara nyata (ke disk private 'local')
        $suratFilename = null;
        $suratUrl = null;
        $uploadedFilePath = null;

        if ($request->hasFile('surat_file')) {
            $file = $request->file('surat_file');
            $originalName = $file->getClientOriginalName();
            $safeName = time().'_'.preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $originalName);
            $storedPath = $file->storeAs('surat', $safeName, 'local');
            $uploadedFilePath = $storedPath;
            $suratFilename = $originalName;
            $suratUrl = $storedPath;
        } else {
            $suratFilename = $request->input('surat_peminjaman_name', $request->input('surat_peminjaman'));
            $suratUrl = $request->input('surat_url', $suratFilename);
        }

        $isExternal = $this->determineIsExternal($request);
        $applicantType = $isExternal ? 'external' : 'internal';
        $defaultPihak = $isExternal ? 'Eksternal (Madrasah/KUA/Lainnya)' : 'Internal Kemenag Sleman';
        $pihakPemohon = $request->input('pihak_pemohon', $defaultPihak);
        if ($isExternal && (! str_contains(strtolower($pihakPemohon), 'eksternal') && ! str_contains(strtolower($pihakPemohon), 'external'))) {
            $pihakPemohon = 'Eksternal (Madrasah/KUA/Lainnya)';
        }

        try {
            $result = $this->bookingService->createPeminjaman(
                $validated,
                $itemsPayload,
                $suratFilename,
                $suratUrl,
                [
                    'applicant_type' => $applicantType,
                    'pihak_pemohon' => $pihakPemohon,
                    'nomor_hp' => $request->input('nomor_hp', '-'),
                    'penanggung_jawab' => $request->input('penanggung_jawab', $validated['nama_peminjam']),
                    'jumlah_peserta' => (int) $request->input('jumlah_peserta', 1),
                ]
            );

            if (! $result['success']) {
                $this->cleanupUploadedFile($uploadedFilePath);

                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'conflicts' => $result['conflicts'] ?? [],
                    'conflicting_date' => $result['conflicting_date'] ?? null,
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dikirim',
                'data' => $result['peminjaman'],
            ], 201);
        } catch (QueryException $e) {
            $this->cleanupUploadedFile($uploadedFilePath);
            Log::error('Database QueryException during peminjaman submission: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kendala pada database saat menyimpan data pengajuan. Pastikan seluruh isian telah sesuai ketentuan.',
            ], 422);
        } catch (\Throwable $e) {
            $this->cleanupUploadedFile($uploadedFilePath);
            Log::error('Unexpected error during peminjaman submission: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memproses pengajuan. Silakan coba beberapa saat lagi.',
            ], 500);
        }
    }

    /**
     * Tentukan apakah permohonan merupakan pengajuan lama/legacy (tanpa informasi jenis pemohon).
     */
    protected function isLegacyRequest(Request $request): bool
    {
        return ! $request->has('applicant_type') && ! $request->has('pihak_pemohon');
    }

    /**
     * Tentukan apakah permohonan berasal dari pemohon eksternal.
     */
    protected function determineIsExternal(Request $request): bool
    {
        if ($this->isLegacyRequest($request)) {
            return false;
        }
        $applicantType = $request->input('applicant_type');
        if ($applicantType === 'external') {
            return true;
        }
        if ($applicantType === 'internal') {
            return false;
        }
        $pihak = $request->input('pihak_pemohon');
        if ($pihak && (str_contains(strtolower($pihak), 'eksternal') || str_contains(strtolower($pihak), 'external'))) {
            return true;
        }

        return false;
    }

    /**
     * Tentukan apakah permohonan secara eksplisit dideklarasikan sebagai internal.
     */
    protected function determineIsInternalExplicit(Request $request): bool
    {
        if ($this->isLegacyRequest($request)) {
            return false;
        }
        $applicantType = $request->input('applicant_type');
        if ($applicantType === 'internal') {
            return true;
        }
        $pihak = $request->input('pihak_pemohon');
        if ($pihak && str_contains(strtolower($pihak), 'internal')) {
            return true;
        }

        return false;
    }

    /**
     * Normalisasi payload selected_items (string JSON atau array).
     */
    protected function normalizeSelectedItemsInput(Request $request): void
    {
        if ($request->has('selected_items') && is_string($request->input('selected_items'))) {
            $decoded = json_decode($request->input('selected_items'), true);
            if (is_array($decoded)) {
                $request->merge(['selected_items' => $decoded]);
            }
        } elseif (! $request->has('selected_items') && $request->has('items')) {
            $rawItems = $request->input('items');
            if (is_string($rawItems)) {
                $decoded = json_decode($rawItems, true);
                if (is_array($decoded)) {
                    $rawItems = $decoded;
                }
            }
            if (is_array($rawItems)) {
                $request->merge(['selected_items' => $rawItems]);
            }
        }
    }

    /**
     * Bentuk Validator untuk method store termasuk validasi jenis pemohon, surat permohonan, batas item, dan pengulangan.
     */
    protected function makeStoreValidator(Request $request): \Illuminate\Contracts\Validation\Validator
    {
        $isExternal = $this->determineIsExternal($request);
        $isInternalExplicit = $this->determineIsInternalExplicit($request);

        $rules = [
            'applicant_type' => 'nullable|string|in:internal,external',
            'pihak_pemohon' => 'nullable|string|max:100',
            'nama_peminjam' => 'required|string|max:150',
            'unit_kerja' => 'required|string|max:150',
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'keperluan' => 'required|string',
            'surat_peminjaman_name' => 'nullable|string|max:255',
            'surat_file' => 'nullable|file|mimes:pdf|max:1024',
            'selected_items' => 'required|array|min:1',
            'nomor_hp' => ($isExternal || $isInternalExplicit) ? 'required|string|max:30' : 'nullable|string|max:30',
            'is_recurring' => 'nullable|boolean',
            'recurring_frequency' => 'nullable|string|in:weekly',
            'recurring_end_date' => 'nullable|date',
        ];

        if ($isInternalExplicit) {
            $rules['nip'] = 'required|string|max:50';
        } else {
            $rules['nip'] = 'nullable|string|max:50';
        }

        $messages = [
            'nip.required' => 'Nomor Induk Pegawai (NIP) wajib diisi untuk pemohon internal Kemenag Sleman.',
            'nama_peminjam.required' => 'Nama lengkap peminjam wajib diisi.',
            'unit_kerja.required' => 'Asal instansi / unit kerja wajib diisi.',
            'nomor_hp.required' => 'Nomor WhatsApp / HP aktif wajib diisi.',
            'selected_items.required' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selected_items.min' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selesai.after' => 'Waktu selesai peminjaman harus setelah waktu mulai.',
            'surat_file.file' => 'Berkas surat permohonan harus berupa file yang valid.',
            'surat_file.mimes' => 'Format berkas surat permohonan harus berupa dokumen PDF (.pdf).',
            'surat_file.max' => 'Ukuran berkas surat permohonan maksimal 1 MB (1.048.576 byte).',
        ];

        $validator = Validator::make($request->all(), $rules, $messages);

        $validator->after(function ($v) use ($request, $isExternal) {
            $this->validateSuratFileIntegrity($v, $request);
            $this->validateSelectedItemsStock($v, $request);
            $this->validateApplicantItemLimitsAndSurat($v, $request, $isExternal);

            if ($request->boolean('is_recurring')) {
                if (! $request->filled('recurring_end_date')) {
                    $v->errors()->add('recurring_end_date', 'Tanggal akhir pengulangan wajib diisi jika peminjaman berulang diaktifkan.');
                } else {
                    $tglMulai = substr((string) $request->input('mulai'), 0, 10);
                    $endDate = (string) $request->input('recurring_end_date');
                    if ($endDate < $tglMulai) {
                        $v->errors()->add('recurring_end_date', 'Tanggal akhir pengulangan tidak boleh lebih awal dari tanggal mulai peminjaman.');
                    }
                }
            }

            if ($request->filled('mulai') && $request->filled('selesai') && $request->filled('selected_items')) {
                $opResult = $this->bookingService->validateOperationalRules(
                    (string) $request->input('mulai'),
                    (string) $request->input('selesai'),
                    $this->aggregateItemsPayload($request->input('selected_items', [])),
                    $isExternal
                );
                if (! $opResult['valid']) {
                    $v->errors()->add('selected_items', $opResult['message'] ?? 'Permohonan melanggar aturan operasional sarana prasarana.');
                }
            }
        });

        return $validator;
    }

    /**
     * Validasi batasan kuota item per kategori dan kewajiban surat berdasarkan jenis pemohon.
     */
    protected function validateApplicantItemLimitsAndSurat($validator, Request $request, bool $isExternal): void
    {
        if ($this->isLegacyRequest($request)) {
            return;
        }

        $selectedItems = $request->input('selected_items');
        if (! is_array($selectedItems)) {
            return;
        }

        $roomCount = 0;
        $vehicleCount = 0;
        $equipmentCount = 0;

        foreach ($selectedItems as $selected) {
            if (! is_array($selected)) {
                continue;
            }
            $itemId = $selected['item']['id'] ?? $selected['item_id'] ?? null;
            $jumlah = max(1, (int) ($selected['jumlah'] ?? 1));

            if (! $itemId || ! is_numeric($itemId)) {
                continue;
            }

            $itemModel = ItemJenis::find((int) $itemId);
            if (! $itemModel) {
                continue;
            }

            if ((int) $itemModel->id_jenis === 1) {
                $roomCount += $jumlah;

                if ($isExternal) {
                    $nameLower = strtolower($itemModel->nama);
                    $regId = $itemModel->registration_id ?? '';
                    $isAula3 = str_contains($nameLower, 'aula lantai 3') ||
                               str_contains($nameLower, 'sasana budhaya') ||
                               $regId === 'RNG-AULA-02' ||
                               ((int) $itemModel->id === 2 && str_contains($nameLower, 'aula'));

                    if (! $isAula3) {
                        $validator->errors()->add('selected_items', 'Pemohon eksternal hanya dapat mengajukan peminjaman Aula Lantai 3.');
                    }
                }
            } elseif ((int) $itemModel->id_jenis === 2) {
                $vehicleCount += $jumlah;

                if ($isExternal) {
                    $validator->errors()->add('selected_items', 'Pemohon eksternal tidak diperbolehkan meminjam kendaraan dinas.');
                }
            } else {
                $equipmentCount += $jumlah;

                if ($isExternal) {
                    $validator->errors()->add('selected_items', 'Pemohon eksternal tidak diperbolehkan meminjam peralatan atau perlengkapan dinas.');
                }
            }
        }

        // 1. Batasan kuantitas untuk pemohon eksternal:
        if ($isExternal && $roomCount > 1) {
            $validator->errors()->add('selected_items', 'Pemohon eksternal hanya diperbolehkan memilih maksimal 1 unit Aula Lantai 3.');
        }

        // 2. Validasi kewajiban upload surat permohonan:
        // Internal: Surat TIDAK WAJIB untuk semua kategori (ruangan, kendaraan, maupun peralatan).
        // Eksternal: Surat WAJIB.
        $suratRequired = $isExternal;

        if ($suratRequired) {
            $hasUploadedFile = $request->hasFile('surat_file') && $request->file('surat_file')->isValid();
            $hasExistingSurat = $request->filled('surat_url') || $request->filled('surat_peminjaman') || $request->filled('surat_peminjaman_name');

            if (! $hasUploadedFile && ! $hasExistingSurat) {
                $validator->errors()->add('surat_file', 'Pemohon eksternal wajib mengunggah surat permohonan peminjaman resmi (format PDF, maks. 1 MB).');
            }
        }
    }

    /**
     * Validasi biner integritas file PDF (magic header %PDF- dan ukuran riil <= 1 MiB).
     */
    protected function validateSuratFileIntegrity($validator, Request $request): void
    {
        if (! $request->hasFile('surat_file')) {
            return;
        }

        $file = $request->file('surat_file');
        if (! $file) {
            return;
        }

        if (! $file->isValid()) {
            $validator->errors()->add('surat_file', 'Unggahan berkas surat gagal atau berkas rusak.');

            return;
        }

        if ($file->getSize() > 1048576) {
            $validator->errors()->add('surat_file', 'Ukuran berkas surat permohonan melebihi batas maksimal 1 MB (1.048.576 byte).');

            return;
        }

        $realPath = $file->getRealPath();
        if ($realPath && file_exists($realPath)) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $realPath);
            finfo_close($finfo);

            if (! in_array($mime, ['application/pdf', 'application/x-pdf', 'application/acrobat'])) {
                $validator->errors()->add('surat_file', 'Format berkas surat tidak sah. Berkas harus berupa dokumen PDF yang sebenarnya.');

                return;
            }

            $handle = @fopen($realPath, 'rb');
            if ($handle) {
                $header = fread($handle, 1024);
                fclose($handle);
                if (! str_contains($header, '%PDF-')) {
                    $validator->errors()->add('surat_file', 'Struktur berkas tidak valid sebagai dokumen PDF.');
                }
            }
        }
    }

    /**
     * Validasi ketersediaan stok master sarana prasarana.
     */
    protected function validateSelectedItemsStock($validator, Request $request): void
    {
        $selectedItems = $request->input('selected_items');
        if (! is_array($selectedItems)) {
            return;
        }

        $itemTotals = [];
        foreach ($selectedItems as $index => $selected) {
            if (! is_array($selected)) {
                $validator->errors()->add("selected_items.{$index}", 'Format data item ke-'.($index + 1).' tidak valid.');

                continue;
            }

            $itemId = $selected['item']['id'] ?? $selected['item_id'] ?? null;
            $jumlah = $selected['jumlah'] ?? 1;

            if (empty($itemId) || ! is_numeric($itemId)) {
                $validator->errors()->add("selected_items.{$index}.item_id", 'ID item pada baris ke-'.($index + 1).' wajib diisi.');

                continue;
            }

            $exists = ItemJenis::where('id', (int) $itemId)->exists();
            if (! $exists) {
                $validator->errors()->add("selected_items.{$index}.item_id", "Item dengan ID {$itemId} pada baris ke-".($index + 1).' tidak ditemukan dalam master sarana prasarana.');
            }

            if (! is_numeric($jumlah) || (int) $jumlah < 1) {
                $validator->errors()->add("selected_items.{$index}.jumlah", 'Jumlah peminjaman pada baris ke-'.($index + 1).' minimal 1 unit.');
            } else {
                $idInt = (int) $itemId;
                $itemTotals[$idInt] = ($itemTotals[$idInt] ?? 0) + (int) $jumlah;
            }
        }

        foreach ($itemTotals as $id => $totalQty) {
            $itemModel = ItemJenis::find($id);
            if ($itemModel && $totalQty > $itemModel->quantity) {
                $validator->errors()->add('selected_items', "Total jumlah yang diminta untuk {$itemModel->nama} ({$totalQty} unit) melebihi kapasitas/stok yang tersedia ({$itemModel->quantity} unit).");
            }
        }
    }

    /**
     * Gabungkan item IDs yang sama dan akumulasi jumlahnya.
     */
    protected function aggregateItemsPayload(array $rawItems): array
    {
        $aggregated = [];
        foreach ($rawItems as $item) {
            $itemId = (int) ($item['item']['id'] ?? $item['item_id'] ?? 0);
            $jumlah = max(1, (int) ($item['jumlah'] ?? 1));

            if ($itemId <= 0) {
                continue;
            }

            if (! isset($aggregated[$itemId])) {
                $aggregated[$itemId] = [
                    'item_id' => $itemId,
                    'jumlah' => 0,
                ];
            }
            $aggregated[$itemId]['jumlah'] += $jumlah;
        }

        return array_values($aggregated);
    }

    /**
     * Hapus file upload lokal jika transaksi gagal untuk mencegah orphan files.
     */
    protected function cleanupUploadedFile(?string $path): void
    {
        if ($path && Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
    }

    /**
     * Konfigurasi jam operasional dan hari libur nasional resmi untuk sinkronisasi frontend.
     */
    public function getOperationalRules(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'operating_hours' => [
                'vehicle_and_equipment' => [
                    'monday_to_thursday' => ['start' => '07:30', 'end' => '16:00'],
                    'friday' => ['start' => '07:30', 'end' => '16:30'],
                    'allow_weekend' => false,
                    'allow_holiday' => false,
                ],
                'room' => [
                    'allow_weekend_internal' => true,
                    'allow_weekend_external' => true,
                    'allow_holiday' => true,
                ],
            ],
            'holidays_2026' => config('holidays.2026', []),
        ]);
    }
}
