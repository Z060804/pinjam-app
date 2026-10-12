<?php

namespace App\Http\Controllers;

use App\Models\ItemJenis;
use App\Models\MasterJenis;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SimpruController extends Controller
{
    /**
     * Get all master categories (Ruangan, Kendaraan, Perlengkapan).
     */
    public function getMasterJenis(): JsonResponse
    {
        $categories = MasterJenis::all();
        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Get items (can be filtered by id_jenis).
     */
    public function getItemJenis(Request $request): JsonResponse
    {
        $query = ItemJenis::query();
        if ($request->has('id_jenis') && $request->id_jenis) {
            $query->where('id_jenis', $request->id_jenis);
        }

        $items = $query->orderBy('id')->get();
        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Admin: add new item (ruangan / kendaraan / perlengkapan).
     */
    public function storeItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_jenis' => 'required|integer|exists:master_jenis,id',
            'nama' => 'required|string|max:255',
            'kapasitas' => 'nullable|integer',
            'fasilitas' => 'nullable|string',
            'registration_id' => 'nullable|string|max:100',
            'quantity' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'image_url' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $item = ItemJenis::create([
            'id_jenis' => $validated['id_jenis'],
            'nama' => $validated['nama'],
            'kapasitas' => $validated['kapasitas'] ?? null,
            'fasilitas' => $validated['fasilitas'] ?? null,
            'registration_id' => $validated['registration_id'] ?? null,
            'quantity' => $validated['quantity'] ?? 1,
            'keterangan' => $validated['keterangan'] ?? null,
            'image_url' => $validated['image_url'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item berhasil ditambahkan',
            'data' => $item,
        ], 201);
    }

    /**
     * Admin: update item (ruangan / kendaraan / perlengkapan).
     */
    public function updateItem(Request $request, int $id): JsonResponse
    {
        $item = ItemJenis::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:255',
            'kapasitas' => 'nullable|integer',
            'fasilitas' => 'nullable|string',
            'registration_id' => 'nullable|string|max:100',
            'quantity' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'image_url' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Item berhasil diperbarui',
            'data' => $item,
        ]);
    }

    /**
     * Admin: delete item.
     *
     * Item yang sudah pernah dipinjam tidak dihapus, karena relasi
     * peminjaman_items memakai cascadeOnDelete — menghapusnya akan ikut
     * menghapus baris riwayat peminjaman tanpa peringatan apa pun.
     */
    public function deleteItem(int $id): JsonResponse
    {
        $item = ItemJenis::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan'], 404);
        }

        if ($item->peminjamanItems()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Item tidak bisa dihapus karena sudah pernah dipinjam. Nonaktifkan saja statusnya.',
            ], 409);
        }

        $item->delete();
        return response()->json(['success' => true, 'message' => 'Item berhasil dihapus']);
    }

    /**
     * Admin: Get all peminjaman records formatted for Rekap Peminjaman.
     */
    public function getAllPeminjaman(): JsonResponse
    {
        $records = Peminjaman::with(['items.item.jenis', 'itemPeminjaman.item.jenis'])
            ->orderBy('created_at', 'desc')
            ->get();

        $formatted = $records->map(function ($p) {
            $itemList = $p->items->isNotEmpty() ? $p->items : $p->itemPeminjaman;

            $jenisIds = $itemList
                ->map(fn ($pi) => $pi->item?->id_jenis)
                ->filter()
                ->unique();

            $jenisName = match (true) {
                $jenisIds->contains(1) => 'ruangan',
                $jenisIds->contains(2) => 'kendaraan',
                $jenisIds->contains(3) => 'perlengkapan',
                default => 'ruangan',
            };

            $itemNames = $itemList->map(function ($pi) {
                return ($pi->item?->nama ?? 'Item') . ($pi->jumlah > 1 ? " ({$pi->jumlah})" : '');
            })->join(', ');

            $tglMulaiStr = $p->tgl_mulai ? Carbon::parse($p->tgl_mulai)->format('Y-m-d') : ($p->mulai ? substr((string)$p->mulai, 0, 10) : date('Y-m-d'));
            $tglSelesaiStr = $p->tgl_selesai ? Carbon::parse($p->tgl_selesai)->format('Y-m-d') : ($p->selesai ? substr((string)$p->selesai, 0, 10) : $tglMulaiStr);
            $waktuMulaiStr = $p->waktu_mulai ?: (strlen((string)$p->mulai) >= 16 ? substr((string)$p->mulai, 11, 5) : '08:00');
            $waktuSelesaiStr = $p->waktu_selesai ?: (strlen((string)$p->selesai) >= 16 ? substr((string)$p->selesai, 11, 5) : '16:00');

            return [
                'id' => $p->id_peminjaman ?? $p->id,
                'id_peminjaman' => $p->id_peminjaman ?? $p->id,
                'tgl_pengajuan' => Carbon::parse($p->tgl_pengajuan)->format('Y-m-d'),
                'nip' => $p->nip ?: '-',
                'pihak_pemohon' => $p->pihak_pemohon ?: 'Internal Kemenag Sleman',
                'unit_pemohon' => $p->unit_pemohon ?? $p->unit_kerja,
                'unit_kerja' => $p->unit_kerja ?? $p->unit_pemohon,
                'nama_pemohon' => $p->nama_pemohon ?? $p->nama_peminjam,
                'nama_peminjam' => $p->nama_peminjam ?? $p->nama_pemohon,
                'nomor_hp' => $p->nomor_hp ?: '-',
                'penanggung_jawab' => $p->penanggung_jawab ?: ($p->nama_pemohon ?? $p->nama_peminjam),
                'jumlah_peserta' => $p->jumlah_peserta ?: 1,
                'ruangan' => $itemNames ?: 'Sarana Prasarana',
                'tgl_mulai' => $tglMulaiStr,
                'tgl_selesai' => $tglSelesaiStr,
                'waktu_mulai' => $waktuMulaiStr,
                'waktu_selesai' => $waktuSelesaiStr,
                'mulai' => $p->mulai ?: ($tglMulaiStr . ' ' . $waktuMulaiStr),
                'selesai' => $p->selesai ?: ($tglSelesaiStr . ' ' . $waktuSelesaiStr),
                'kegiatan' => $p->keperluan,
                'keperluan' => $p->keperluan,
                'status' => $p->status,
                'surat_url' => $p->surat_url ?? $p->surat_peminjaman,
                'surat_peminjaman' => $p->surat_peminjaman ?? $p->surat_url,
                'jenis' => $jenisName,
                'item_dipinjam' => $itemNames ?: 'Sarana Prasarana',
                'petugas' => $p->petugas,
                'items' => $itemList->map(fn($it) => [
                    'id' => $it->id,
                    'item_id' => $it->item_id,
                    'jumlah' => $it->jumlah,
                    'nama' => $it->item?->nama,
                    'registration_id' => $it->item?->registration_id,
                ]),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Customer / Admin: Get single peminjaman by ID (tracking).
     */
    public function getPeminjamanById(string $id): JsonResponse
    {
        $peminjaman = Peminjaman::with(['items.item.jenis', 'itemPeminjaman.item.jenis'])
            ->where('id', $id)
            ->orWhere('id_peminjaman', $id)
            ->first();

        if (!$peminjaman) {
            return response()->json([
                'success' => false,
                'message' => 'Data peminjaman tidak ditemukan',
            ], 404);
        }

        $itemList = $peminjaman->items->isNotEmpty() ? $peminjaman->items : $peminjaman->itemPeminjaman;

        $jenisIds = $itemList
            ->map(fn ($pi) => $pi->item?->id_jenis)
            ->filter()
            ->unique();

        $jenisName = match (true) {
            $jenisIds->contains(1) => 'ruangan',
            $jenisIds->contains(2) => 'kendaraan',
            $jenisIds->contains(3) => 'perlengkapan',
            default => 'ruangan',
        };

        $itemNames = $itemList->map(function ($pi) {
            return ($pi->item?->nama ?? 'Item') . ($pi->jumlah > 1 ? " ({$pi->jumlah})" : '');
        })->join(', ');

        $tglMulaiStr = $peminjaman->tgl_mulai ? Carbon::parse($peminjaman->tgl_mulai)->format('Y-m-d') : ($peminjaman->mulai ? substr((string)$peminjaman->mulai, 0, 10) : date('Y-m-d'));
        $tglSelesaiStr = $peminjaman->tgl_selesai ? Carbon::parse($peminjaman->tgl_selesai)->format('Y-m-d') : ($peminjaman->selesai ? substr((string)$peminjaman->selesai, 0, 10) : $tglMulaiStr);
        $waktuMulaiStr = $peminjaman->waktu_mulai ?: (strlen((string)$peminjaman->mulai) >= 16 ? substr((string)$peminjaman->mulai, 11, 5) : '08:00');
        $waktuSelesaiStr = $peminjaman->waktu_selesai ?: (strlen((string)$peminjaman->selesai) >= 16 ? substr((string)$peminjaman->selesai, 11, 5) : '16:00');

        $result = [
            'id_peminjaman' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'id' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'tgl_pengajuan' => Carbon::parse($peminjaman->tgl_pengajuan)->format('Y-m-d'),
            'nip' => $peminjaman->nip ?: '-',
            'nama_pemohon' => $peminjaman->nama_pemohon ?? $peminjaman->nama_peminjam,
            'nama_peminjam' => $peminjaman->nama_peminjam ?? $peminjaman->nama_pemohon,
            'unit_pemohon' => $peminjaman->unit_pemohon ?? $peminjaman->unit_kerja,
            'unit_kerja' => $peminjaman->unit_kerja ?? $peminjaman->unit_pemohon,
            'pihak_pemohon' => $peminjaman->pihak_pemohon ?: 'Internal Kemenag Sleman',
            'nomor_hp' => $peminjaman->nomor_hp ?: '-',
            'penanggung_jawab' => $peminjaman->penanggung_jawab ?: ($peminjaman->nama_pemohon ?? $peminjaman->nama_peminjam),
            'jumlah_peserta' => $peminjaman->jumlah_peserta ?: 1,
            'tgl_mulai' => $tglMulaiStr,
            'tgl_selesai' => $tglSelesaiStr,
            'waktu_mulai' => $waktuMulaiStr,
            'waktu_selesai' => $waktuSelesaiStr,
            'mulai' => $peminjaman->mulai ?: ($tglMulaiStr . ' ' . $waktuMulaiStr),
            'selesai' => $peminjaman->selesai ?: ($tglSelesaiStr . ' ' . $waktuSelesaiStr),
            'keperluan' => $peminjaman->keperluan,
            'surat_url' => $peminjaman->surat_url ?? $peminjaman->surat_peminjaman,
            'surat_peminjaman' => $peminjaman->surat_peminjaman ?? $peminjaman->surat_url,
            'status' => $peminjaman->status,
            'petugas' => $peminjaman->petugas,
            'jenis' => $jenisName,
            'item_dipinjam' => $itemNames ?: 'Sarana Prasarana',
            'ruangan' => $itemNames ?: 'Sarana Prasarana',
            'items' => $itemList->map(fn($it) => [
                'id' => $it->id,
                'id_peminjaman' => $peminjaman->id_peminjaman ?? $peminjaman->id,
                'item_id' => $it->item_id,
                'jumlah' => $it->jumlah,
                'item' => $it->item,
            ]),
        ];

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Customer: Submit new loan application (stores into database).
     */
    public function storePeminjaman(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nip' => 'nullable|string|max:50',
            'nama_peminjam' => 'required|string|max:255',
            'unit_kerja' => 'required|string|max:255',
            'mulai' => 'required|string',
            'selesai' => 'required|string',
            'keperluan' => 'required|string',
            'surat_peminjaman_name' => 'nullable|string|max:255',
            'selected_items' => 'required|array|min:1',
            'nomor_hp' => 'nullable|string|max:30',
            'pihak_pemohon' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($validated) {
            $now = Carbon::now();
            $prefix = 'PMJ-' . $now->format('Ym');

            // Nomor urut diambil dari sequence TERBESAR (bukan count() + 1 yang rentan
            // tabrakan ID jika ada data yang terhapus). Ditambah loop verifikasi exists()
            // untuk menjamin ID selalu unik dan tidak akan pernah bentrok.
            $lastSeq = (int) (Peminjaman::where('id', 'like', "{$prefix}-%")
                ->lockForUpdate()
                ->pluck('id')
                ->map(fn ($id) => (int) substr($id, strlen($prefix) + 1))
                ->max() ?? 0);

            do {
                $lastSeq++;
                $newId = sprintf('%s-%03d', $prefix, $lastSeq);
            } while (Peminjaman::where('id', $newId)->exists());

            // Extract dates and times
            $mulaiStr = str_replace('T', ' ', $validated['mulai']);
            $selesaiStr = str_replace('T', ' ', $validated['selesai']);

            $tglMulai = substr($mulaiStr, 0, 10);
            $waktuMulai = strlen($mulaiStr) >= 16 ? substr($mulaiStr, 11, 5) : '08:00';

            $tglSelesai = substr($selesaiStr, 0, 10);
            $waktuSelesai = strlen($selesaiStr) >= 16 ? substr($selesaiStr, 11, 5) : '16:00';

            $peminjaman = Peminjaman::create([
                'id' => $newId,
                'tgl_pengajuan' => $now->toDateString(),
                'nip' => $validated['nip'] ?? null,
                'nama_pemohon' => $validated['nama_peminjam'],
                'unit_pemohon' => $validated['unit_kerja'],
                'pihak_pemohon' => $validated['pihak_pemohon'] ?? 'Internal Kemenag Sleman',
                'nomor_hp' => $validated['nomor_hp'] ?? null,
                'penanggung_jawab' => $validated['nama_peminjam'],
                'jumlah_peserta' => 1,
                'tgl_mulai' => $tglMulai,
                'tgl_selesai' => $tglSelesai,
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
                'keperluan' => $validated['keperluan'],
                'surat_url' => $validated['surat_peminjaman_name'] ?? 'surat_permohonan.pdf',
                'status' => 'Menunggu Persetujuan',
                'petugas' => null,
            ]);

            // Insert items dan deteksi kategori seluruh item yang dipinjam
            $itemIds = [];
            foreach ($validated['selected_items'] as $itemData) {
                // Mendukung baik nested payload ['item' => ['id' => ...]] maupun flat ['item_id' => ...]
                $itemRef = is_array($itemData['item'] ?? null) ? $itemData['item'] : $itemData;
                $itemId = is_array($itemRef) ? ($itemRef['id'] ?? $itemRef['item_id'] ?? null) : null;
                $qty = max(1, (int) ($itemData['jumlah'] ?? $itemRef['jumlah'] ?? 1));

                if ($itemId) {
                    $itemIds[] = $itemId;
                    PeminjamanItem::create([
                        'peminjaman_id' => $newId,
                        'item_id' => $itemId,
                        'jumlah' => $qty,
                    ]);
                }
            }

            // Tentukan label jenis utama berdasarkan seluruh item yang dipinjam (ruangan > kendaraan > perlengkapan)
            // bukan hanya membaca dari item pertama yang berada di keranjang.
            $jenisIds = ItemJenis::whereIn('id', $itemIds)->pluck('id_jenis');
            $primaryJenis = match (true) {
                $jenisIds->contains(1) => 'ruangan',
                $jenisIds->contains(2) => 'kendaraan',
                $jenisIds->contains(3) => 'perlengkapan',
                default => 'ruangan',
            };

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil disimpan ke database',
                'data' => [
                    'id_peminjaman' => $newId,
                    'status' => 'Menunggu Persetujuan',
                    'jenis' => $primaryJenis,
                ],
            ], 201);
        });
    }

    /**
     * Admin: Update loan approval status.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Menunggu Persetujuan,Disetujui,Tidak Disetujui,Dibatalkan',
            'petugas' => 'nullable|string|max:100',
        ]);

        $peminjaman = Peminjaman::where('id', $id)->orWhere('id_peminjaman', $id)->first();
        if (!$peminjaman) {
            return response()->json(['success' => false, 'message' => 'Peminjaman tidak ditemukan'], 404);
        }

        $peminjaman->status = $validated['status'];
        if (isset($validated['petugas'])) {
            $peminjaman->petugas = $validated['petugas'];
        } elseif ($validated['status'] === 'Disetujui') {
            $peminjaman->petugas = 'Admin SiRuang';
        }
        $peminjaman->save();

        return response()->json([
            'success' => true,
            'message' => 'Status peminjaman berhasil diperbarui',
            'data' => $peminjaman,
        ]);
    }
}
