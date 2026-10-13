<?php

namespace App\Http\Controllers;

use App\Models\MasterJenis;
use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\ItemPeminjaman;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class PeminjamanController extends Controller
{
    public function getMasterJenis(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => MasterJenis::all(),
        ]);
    }

    public function getItemJenis(Request $request): JsonResponse
    {
        $query = ItemJenis::query();
        if ($request->has('id_jenis') && $request->filled('id_jenis')) {
            $query->where('id_jenis', $request->query('id_jenis'));
        }
        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function getAllPeminjaman(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Peminjaman::orderByDesc('tgl_pengajuan')->get(),
        ]);
    }

    public function getItemPeminjaman(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ItemPeminjaman::all(),
        ]);
    }

    public function getPeminjamanById(string $id): JsonResponse
    {
        $peminjaman = Peminjaman::with('items.item')->find(trim($id));
        if (!$peminjaman) {
            return response()->json([
                'success' => false,
                'message' => 'Peminjaman tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $peminjaman,
        ]);
    }

    public function checkConflict(Request $request): JsonResponse
    {
        $request->validate([
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:item_jenis,id',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        // Gabungkan jumlah item dengan ID yang sama sebelum pengecekan
        $aggregated = [];
        foreach ($request->input('items') as $item) {
            $id = (int) $item['item_id'];
            $qty = (int) $item['jumlah'];
            if (!isset($aggregated[$id])) {
                $aggregated[$id] = ['item_id' => $id, 'jumlah' => 0];
            }
            $aggregated[$id]['jumlah'] += $qty;
        }

        $conflicts = $this->detectConflicts(
            $request->input('mulai'),
            $request->input('selesai'),
            array_values($aggregated)
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

    public function store(Request $request): JsonResponse
    {
        // Mendukung selected_items dalam bentuk array atau JSON string (dari FormData upload berkas)
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

        $validator = Validator::make($request->all(), [
            'nip' => 'nullable|string|max:50',
            'nama_peminjam' => 'required|string|max:150',
            'unit_kerja' => 'required|string|max:150',
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'keperluan' => 'required|string',
            'surat_peminjaman_name' => 'nullable|string|max:255',
            'surat_file' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
            'selected_items' => 'required|array|min:1',
            'nomor_hp' => 'nullable|string|max:30',
            'pihak_pemohon' => 'nullable|string|max:100',
        ], [
            'selected_items.required' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selected_items.min' => 'Pilih minimal satu sarana atau prasarana untuk dipinjam.',
            'selesai.after' => 'Waktu selesai peminjaman harus setelah waktu mulai.',
            'surat_file.max' => 'Ukuran berkas surat maksimal 5 MB.',
            'surat_file.mimes' => 'Format berkas surat harus berupa PDF, DOC, DOCX, JPG, atau PNG.',
        ]);

        $validator->after(function ($validator) use ($request) {
            $selectedItems = $request->input('selected_items');
            if (!is_array($selectedItems)) {
                return;
            }

            $itemTotals = [];

            foreach ($selectedItems as $index => $selected) {
                if (!is_array($selected)) {
                    $validator->errors()->add("selected_items.{$index}", "Format data item ke-" . ($index + 1) . " tidak valid.");
                    continue;
                }

                $itemId = $selected['item']['id'] ?? $selected['item_id'] ?? null;
                $jumlah = $selected['jumlah'] ?? 1;

                if (empty($itemId) || !is_numeric($itemId)) {
                    $validator->errors()->add("selected_items.{$index}.item_id", "ID item pada baris ke-" . ($index + 1) . " wajib diisi.");
                    continue;
                }

                $exists = ItemJenis::where('id', (int) $itemId)->exists();
                if (!$exists) {
                    $validator->errors()->add("selected_items.{$index}.item_id", "Item dengan ID {$itemId} pada baris ke-" . ($index + 1) . " tidak ditemukan dalam master sarana prasarana.");
                }

                if (!is_numeric($jumlah) || (int) $jumlah < 1) {
                    $validator->errors()->add("selected_items.{$index}.jumlah", "Jumlah peminjaman pada baris ke-" . ($index + 1) . " minimal 1 unit.");
                } else {
                    $idInt = (int) $itemId;
                    $itemTotals[$idInt] = ($itemTotals[$idInt] ?? 0) + (int) $jumlah;
                }
            }

            // Validasi total stok: jika item yang sama dikirim beberapa kali atau jumlah melebihi kapasitas stok
            foreach ($itemTotals as $id => $totalQty) {
                $itemModel = ItemJenis::find($id);
                if ($itemModel && $totalQty > $itemModel->quantity) {
                    $validator->errors()->add("selected_items", "Total jumlah yang diminta untuk {$itemModel->nama} ({$totalQty} unit) melebihi kapasitas/stok yang tersedia ({$itemModel->quantity} unit).");
                }
            }
        });

        $validated = $validator->validate();

        // Gabungkan duplicate item IDs ke dalam satu baris payload
        $aggregatedPayload = [];
        foreach ($validated['selected_items'] as $selected) {
            $itemId = (int) ($selected['item']['id'] ?? $selected['item_id'] ?? 0);
            $jumlah = max(1, (int) ($selected['jumlah'] ?? 1));
            if (!isset($aggregatedPayload[$itemId])) {
                $aggregatedPayload[$itemId] = [
                    'item_id' => $itemId,
                    'jumlah' => 0,
                ];
            }
            $aggregatedPayload[$itemId]['jumlah'] += $jumlah;
        }
        $itemsPayload = array_values($aggregatedPayload);

        // Check for schedule conflict
        $conflicts = $this->detectConflicts($validated['mulai'], $validated['selesai'], $itemsPayload);
        if (!empty($conflicts)) {
            $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
            return response()->json([
                'success' => false,
                'message' => "Jadwal bentrok: {$conflictItemNames} sudah dipinjam pada rentang waktu yang sama.",
                'conflicts' => $conflicts,
            ], 422);
        }

        // Simpan file berkas surat jika ada yang diunggah secara nyata (ke disk private 'local')
        $suratFilename = null;
        $suratUrl = null;

        if ($request->hasFile('surat_file')) {
            $file = $request->file('surat_file');
            $originalName = $file->getClientOriginalName();
            $safeName = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $originalName);
            $storedPath = $file->storeAs('surat', $safeName, 'local');
            $suratFilename = $originalName;
            $suratUrl = $storedPath;
        }

        return DB::transaction(function () use ($validated, $itemsPayload, $request, $suratFilename, $suratUrl) {
            $now = Carbon::now();
            $prefix = 'PMJ-' . $now->format('Ym') . '-';

            $lastSeq = (int) (Peminjaman::where('id_peminjaman', 'like', $prefix . '%')
                ->orWhere('id', 'like', $prefix . '%')
                ->lockForUpdate()
                ->pluck('id_peminjaman')
                ->map(fn ($id) => (int) substr($id, strlen($prefix)))
                ->max() ?? 0);

            do {
                $lastSeq++;
                $newId = $prefix . str_pad((string)$lastSeq, 3, '0', STR_PAD_LEFT);
            } while (Peminjaman::where('id_peminjaman', $newId)->orWhere('id', $newId)->exists());

            $peminjaman = Peminjaman::create([
                'id_peminjaman' => $newId,
                'id' => $newId,
                'tgl_pengajuan' => $now->toDateString(),
                'nip' => $validated['nip'] ?? '-',
                'nama_peminjam' => $validated['nama_peminjam'],
                'nama_pemohon' => $validated['nama_peminjam'],
                'unit_kerja' => $validated['unit_kerja'],
                'unit_pemohon' => $validated['unit_kerja'],
                'pihak_pemohon' => $request->input('pihak_pemohon', 'Internal Kemenag Sleman'),
                'nomor_hp' => $request->input('nomor_hp', '-'),
                'penanggung_jawab' => $request->input('penanggung_jawab', $validated['nama_peminjam']),
                'jumlah_peserta' => (int) $request->input('jumlah_peserta', 1),
                'mulai' => $validated['mulai'],
                'selesai' => $validated['selesai'],
                'tgl_mulai' => substr($validated['mulai'], 0, 10),
                'tgl_selesai' => substr($validated['selesai'], 0, 10),
                'waktu_mulai' => strlen($validated['mulai']) >= 16 ? substr($validated['mulai'], 11, 5) : '08:00',
                'waktu_selesai' => strlen($validated['selesai']) >= 16 ? substr($validated['selesai'], 11, 5) : '16:00',
                'keperluan' => $validated['keperluan'],
                'surat_peminjaman' => $suratFilename,
                'surat_url' => $suratUrl,
                'status' => 'Menunggu Persetujuan',
                'petugas' => null,
            ]);

            foreach ($itemsPayload as $item) {
                ItemPeminjaman::create([
                    'id_peminjaman' => $newId,
                    'item_id' => $item['item_id'],
                    'jumlah' => $item['jumlah'],
                ]);

                if (\Illuminate\Support\Facades\Schema::hasTable('peminjaman_items')) {
                    \App\Models\PeminjamanItem::create([
                        'peminjaman_id' => $newId,
                        'item_id' => $item['item_id'],
                        'jumlah' => $item['jumlah'],
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dikirim',
                'data' => $peminjaman->load(['items.item', 'itemPeminjaman.item']),
            ], 201);
        });
    }

    private function detectConflicts(string $mulai, string $selesai, array $items): array
    {
        $conflicts = [];
        $mulaiCarbon = Carbon::parse($mulai);
        $selesaiCarbon = Carbon::parse($selesai);

        // Find existing approved bookings overlapping this interval
        $overlappingBookings = Peminjaman::where('status', 'Disetujui')
            ->where(function ($query) use ($mulaiCarbon, $selesaiCarbon) {
                $query->where('mulai', '<', $selesaiCarbon)
                      ->where('selesai', '>', $mulaiCarbon);
            })
            ->with(['items.item', 'itemPeminjaman.item'])
            ->get();

        foreach ($items as $reqItem) {
            $itemId = $reqItem['item_id'];
            $reqQty = (int) $reqItem['jumlah'];
            $itemModel = ItemJenis::find($itemId);
            if (!$itemModel) continue;

            $bookedQty = 0;
            $conflictDetails = [];

            foreach ($overlappingBookings as $booking) {
                $bItems = $booking->items->isNotEmpty() ? $booking->items : $booking->itemPeminjaman;
                foreach ($bItems as $bookedItem) {
                    if ($bookedItem->item_id === $itemId) {
                        $bookedQty += $bookedItem->jumlah;
                        $conflictDetails[] = [
                            'peminjaman_id' => $booking->id_peminjaman ?? $booking->id,
                            'peminjam' => $booking->nama_peminjam ?? $booking->nama_pemohon,
                            'mulai' => $booking->mulai instanceof Carbon ? $booking->mulai->toDateTimeString() : (string) $booking->mulai,
                            'selesai' => $booking->selesai instanceof Carbon ? $booking->selesai->toDateTimeString() : (string) $booking->selesai,
                            'keperluan' => $booking->keperluan,
                        ];
                    }
                }
            }

            if (($bookedQty + $reqQty) > $itemModel->quantity) {
                $conflicts[] = [
                    'item_id' => $itemId,
                    'item_nama' => $itemModel->nama,
                    'kapasitas_total' => $itemModel->quantity,
                    'sudah_dipinjam' => $bookedQty,
                    'diminta' => $reqQty,
                    'overlapping_bookings' => $conflictDetails,
                ];
            }
        }

        return $conflicts;
    }
}
