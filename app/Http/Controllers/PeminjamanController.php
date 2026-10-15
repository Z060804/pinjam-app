<?php

namespace App\Http\Controllers;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
     */
    public function checkConflict(Request $request): JsonResponse
    {
        $request->validate([
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:item_jenis,id',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        $aggregated = $this->aggregateItemsPayload($request->input('items'));

        $conflicts = $this->bookingService->detectConflicts(
            $request->input('mulai'),
            $request->input('selesai'),
            $aggregated
        );

        if (!empty($conflicts)) {
            return response()->json([
                'success' => false,
                'has_conflict' => true,
                'message' => 'Terdapat bentrok jadwal pada item yang dipilih.',
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
            $safeName = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $originalName);
            $storedPath = $file->storeAs('surat', $safeName, 'local');
            $uploadedFilePath = $storedPath;
            $suratFilename = $originalName;
            $suratUrl = $storedPath;
        }

        try {
            $result = $this->bookingService->createPeminjaman(
                $validated,
                $itemsPayload,
                $suratFilename,
                $suratUrl,
                [
                    'pihak_pemohon' => $request->input('pihak_pemohon', 'Internal Kemenag Sleman'),
                    'nomor_hp' => $request->input('nomor_hp', '-'),
                    'penanggung_jawab' => $request->input('penanggung_jawab', $validated['nama_peminjam']),
                    'jumlah_peserta' => (int) $request->input('jumlah_peserta', 1),
                ]
            );

            if (!$result['success']) {
                $this->cleanupUploadedFile($uploadedFilePath);
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'conflicts' => $result['conflicts'],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dikirim',
                'data' => $result['peminjaman'],
            ], 201);
        } catch (\Throwable $e) {
            $this->cleanupUploadedFile($uploadedFilePath);
            throw $e;
        }
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
        } elseif (!$request->has('selected_items') && $request->has('items')) {
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
     * Bentuk Validator untuk method store termasuk validasi integritas file PDF dan stok item.
     */
    protected function makeStoreValidator(Request $request): \Illuminate\Contracts\Validation\Validator
    {
        $validator = Validator::make($request->all(), [
            'nip' => 'nullable|string|max:50',
            'nama_peminjam' => 'required|string|max:150',
            'unit_kerja' => 'required|string|max:150',
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'keperluan' => 'required|string',
            'surat_peminjaman_name' => 'nullable|string|max:255',
            'surat_file' => 'nullable|file|mimes:pdf|max:1024',
            'selected_items' => 'required|array|min:1',
            'nomor_hp' => 'nullable|string|max:30',
            'pihak_pemohon' => 'nullable|string|max:100',
        ], [
            'selected_items.required' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selected_items.min' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selesai.after' => 'Waktu selesai peminjaman harus setelah waktu mulai.',
            'surat_file.file' => 'Berkas surat permohonan harus berupa file yang valid.',
            'surat_file.mimes' => 'Format berkas surat permohonan harus berupa dokumen PDF (.pdf).',
            'surat_file.max' => 'Ukuran berkas surat permohonan maksimal 1 MB (1.048.576 byte).',
        ]);

        $validator->after(function ($v) use ($request) {
            $this->validateSuratFileIntegrity($v, $request);
            $this->validateSelectedItemsStock($v, $request);
        });

        return $validator;
    }

    /**
     * Validasi biner integritas file PDF (magic header %PDF- dan ukuran riil <= 1 MiB).
     */
    protected function validateSuratFileIntegrity($validator, Request $request): void
    {
        if (!$request->hasFile('surat_file')) {
            return;
        }

        $file = $request->file('surat_file');
        if (!$file) {
            return;
        }

        if (!$file->isValid()) {
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

            if (!in_array($mime, ['application/pdf', 'application/x-pdf', 'application/acrobat'])) {
                $validator->errors()->add('surat_file', 'Format berkas surat tidak sah. Berkas harus berupa dokumen PDF yang sebenarnya.');
                return;
            }

            $handle = @fopen($realPath, 'rb');
            if ($handle) {
                $header = fread($handle, 1024);
                fclose($handle);
                if (!str_contains($header, '%PDF-')) {
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
        if (!is_array($selectedItems)) {
            return;
        }

        $itemTotals = [];
        foreach ($selectedItems as $index => $selected) {
            if (!is_array($selected)) {
                $validator->errors()->add("selected_items.{$index}", 'Format data item ke-' . ($index + 1) . ' tidak valid.');
                continue;
            }

            $itemId = $selected['item']['id'] ?? $selected['item_id'] ?? null;
            $jumlah = $selected['jumlah'] ?? 1;

            if (empty($itemId) || !is_numeric($itemId)) {
                $validator->errors()->add("selected_items.{$index}.item_id", 'ID item pada baris ke-' . ($index + 1) . ' wajib diisi.');
                continue;
            }

            $exists = ItemJenis::where('id', (int) $itemId)->exists();
            if (!$exists) {
                $validator->errors()->add("selected_items.{$index}.item_id", "Item dengan ID {$itemId} pada baris ke-" . ($index + 1) . ' tidak ditemukan dalam master sarana prasarana.');
            }

            if (!is_numeric($jumlah) || (int) $jumlah < 1) {
                $validator->errors()->add("selected_items.{$index}.jumlah", 'Jumlah peminjaman pada baris ke-' . ($index + 1) . ' minimal 1 unit.');
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

            if (!isset($aggregated[$itemId])) {
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
}
