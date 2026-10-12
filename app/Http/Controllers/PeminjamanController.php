<?php

namespace App\Http\Controllers;

use App\Models\MasterJenis;
use App\Models\ItemJenis;
use App\Models\Peminjaman;
use App\Models\ItemPeminjaman;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $conflicts = $this->detectConflicts(
            $request->input('mulai'),
            $request->input('selesai'),
            $request->input('items')
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
        $validated = $request->validate([
            'nip' => 'nullable|string|max:50',
            'nama_peminjam' => 'required|string|max:150',
            'unit_kerja' => 'required|string|max:150',
            'mulai' => 'required|date',
            'selesai' => 'required|date|after:mulai',
            'keperluan' => 'required|string',
            'surat_peminjaman_name' => 'nullable|string|max:255',
            'selected_items' => 'required|array|min:1',
            'selected_items.*.item.id' => 'nullable|integer',
            'selected_items.*.item_id' => 'nullable|integer',
            'selected_items.*.jumlah' => 'nullable|integer',
            'nomor_hp' => 'nullable|string|max:30',
            'pihak_pemohon' => 'nullable|string|max:100',
        ]);

        $itemsPayload = array_map(function ($selected) {
            $itemId = $selected['item']['id'] ?? $selected['item_id'] ?? null;
            $jumlah = (int) ($selected['jumlah'] ?? 1);
            return [
                'item_id' => (int) $itemId,
                'jumlah' => max(1, $jumlah),
            ];
        }, $validated['selected_items']);

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

        return DB::transaction(function () use ($validated, $itemsPayload, $request) {
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
                'surat_peminjaman' => $validated['surat_peminjaman_name'] ?? 'surat_permohonan.pdf',
                'surat_url' => $validated['surat_peminjaman_name'] ?? 'surat_permohonan.pdf',
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
