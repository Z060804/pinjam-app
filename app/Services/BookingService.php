<?php

namespace App\Services;

use App\Models\ItemJenis;
use App\Models\ItemPeminjaman;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BookingService
{
    /**
     * Map kategori ID master_jenis ke slug kategori standar.
     */
    public const CATEGORY_MAP = [
        1 => 'ruangan',
        2 => 'kendaraan',
        3 => 'perlengkapan',
    ];

    /**
     * Kunci baris master item_jenis secara konsisten terurut ascending untuk mencegah race condition & deadlock.
     */
    public function lockItemsForUpdate(array $itemIds): Collection
    {
        $filteredIds = array_values(array_unique(array_filter(array_map('intval', $itemIds), fn ($id) => $id > 0)));
        sort($filteredIds);

        if (empty($filteredIds)) {
            return collect();
        }

        return ItemJenis::whereIn('id', $filteredIds)
            ->orderBy('id', 'asc')
            ->lockForUpdate()
            ->get();
    }

    /**
     * Serialisasi penomoran urut ID bulanan via baris anchor master_jenis.
     */
    public function lockSequenceAnchor(): void
    {
        if (Schema::hasTable('master_jenis')) {
            DB::table('master_jenis')->where('id', 1)->lockForUpdate()->first();
        }
    }

    /**
     * Periksa bentrok jadwal peminjaman terhadap peminjaman berstatus 'Disetujui'.
     * Menggunakan rumus interval overlap: mulai < request_selesai AND selesai > request_mulai
     */
    public function detectConflicts(string $mulai, string $selesai, array $items, ?string $excludePeminjamanId = null): array
    {
        $conflicts = [];
        $mulaiCarbon = Carbon::parse($mulai);
        $selesaiCarbon = Carbon::parse($selesai);

        $query = Peminjaman::where('status', 'Disetujui');

        if ($excludePeminjamanId) {
            $query->where(function ($q) use ($excludePeminjamanId) {
                $q->where('id_peminjaman', '!=', $excludePeminjamanId)
                    ->where('id', '!=', $excludePeminjamanId);
            });
        }

        $query->where(function ($q) use ($mulaiCarbon, $selesaiCarbon) {
            $q->where(function ($sub) use ($mulaiCarbon, $selesaiCarbon) {
                $sub->where('mulai', '<', $selesaiCarbon)
                    ->where('selesai', '>', $mulaiCarbon);
            })->orWhere(function ($sub) use ($mulaiCarbon, $selesaiCarbon) {
                $sub->whereNull('mulai')
                    ->where('tgl_mulai', '<=', $selesaiCarbon->toDateString())
                    ->where('tgl_selesai', '>=', $mulaiCarbon->toDateString());
            });
        });

        $overlappingBookings = $query->with(['items.item', 'itemPeminjaman.item'])->get();

        foreach ($items as $reqItem) {
            $itemId = (int) ($reqItem['item_id'] ?? $reqItem['item']['id'] ?? 0);
            $reqQty = max(1, (int) ($reqItem['jumlah'] ?? 1));

            $itemModel = ItemJenis::find($itemId);
            if (! $itemModel) {
                continue;
            }

            $bookedQty = 0;
            $conflictDetails = [];

            foreach ($overlappingBookings as $booking) {
                $bItems = $this->consolidateItems($booking);
                foreach ($bItems as $bookedItem) {
                    if ((int) $bookedItem->item_id === $itemId) {
                        $bookedQty += (int) $bookedItem->jumlah;
                        $conflictDetails[] = [
                            'peminjaman_id' => $booking->id_peminjaman ?? $booking->id,
                            'peminjam' => $booking->nama_peminjam ?? $booking->nama_pemohon,
                            'mulai' => (string) $booking->mulai,
                            'selesai' => (string) $booking->selesai,
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

    /**
     * Buat peminjaman baru di dalam transaksi database atomik dengan penguncian dan pencegahan race condition.
     */
    public function createPeminjaman(
        array $validated,
        array $itemsPayload,
        ?string $suratFilename = null,
        ?string $suratUrl = null,
        array $additionalData = []
    ): array {
        return DB::transaction(function () use ($validated, $itemsPayload, $suratFilename, $suratUrl, $additionalData) {
            $itemIds = array_values(array_unique(array_column($itemsPayload, 'item_id')));
            $this->lockItemsForUpdate($itemIds);
            $this->lockSequenceAnchor();

            $conflicts = $this->detectConflicts($validated['mulai'], $validated['selesai'], $itemsPayload);
            if (! empty($conflicts)) {
                $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));

                return [
                    'success' => false,
                    'message' => "Jadwal bentrok: {$conflictItemNames} sudah dipinjam pada rentang waktu yang sama.",
                    'conflicts' => $conflicts,
                ];
            }

            $now = Carbon::now();
            $newId = $this->generateNextId($now);

            $applicantType = $additionalData['applicant_type'] ?? $validated['applicant_type'] ?? null;
            $pihakPemohonInput = $additionalData['pihak_pemohon'] ?? $validated['pihak_pemohon'] ?? null;
            $isExternal = ($applicantType === 'external') || ($pihakPemohonInput && (str_contains(strtolower($pihakPemohonInput), 'eksternal') || str_contains(strtolower($pihakPemohonInput), 'external')));
            $pihakPemohon = $isExternal ? ($pihakPemohonInput ?: 'Eksternal (Madrasah/KUA/Lainnya)') : ($pihakPemohonInput ?: 'Internal Kemenag Sleman');
            $nipToStore = $isExternal ? null : (! empty($validated['nip']) ? $validated['nip'] : null);

            $peminjaman = Peminjaman::create([
                'id_peminjaman' => $newId,
                'id' => $newId,
                'tgl_pengajuan' => $now->toDateString(),
                'nip' => $nipToStore,
                'nama_peminjam' => $validated['nama_peminjam'],
                'nama_pemohon' => $validated['nama_peminjam'],
                'unit_kerja' => $validated['unit_kerja'],
                'unit_pemohon' => $validated['unit_kerja'],
                'pihak_pemohon' => $pihakPemohon,
                'nomor_hp' => $additionalData['nomor_hp'] ?? '-',
                'penanggung_jawab' => $additionalData['penanggung_jawab'] ?? $validated['nama_peminjam'],
                'jumlah_peserta' => (int) ($additionalData['jumlah_peserta'] ?? 1),
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
                if (Schema::hasTable('item_peminjaman')) {
                    ItemPeminjaman::create([
                        'id_peminjaman' => $newId,
                        'item_id' => $item['item_id'],
                        'jumlah' => $item['jumlah'],
                    ]);
                }

                if (Schema::hasTable('peminjaman_items')) {
                    PeminjamanItem::create([
                        'peminjaman_id' => $newId,
                        'item_id' => $item['item_id'],
                        'jumlah' => $item['jumlah'],
                    ]);
                }
            }

            return [
                'success' => true,
                'peminjaman' => $peminjaman->load(['items.item.jenis', 'itemPeminjaman.item.jenis']),
            ];
        });
    }

    /**
     * Persetujuan peminjaman oleh admin dengan validasi ulang konflik ketersediaan & row lock.
     */
    public function approvePeminjaman(Peminjaman $peminjaman, ?string $petugas = null): array
    {
        $itemList = $this->consolidateItems($peminjaman);
        $itemIds = $itemList->pluck('item_id')->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->unique()->values()->all();

        $this->lockItemsForUpdate($itemIds);

        $mulaiStr = $peminjaman->mulai ?: ($peminjaman->tgl_mulai.' '.($peminjaman->waktu_mulai ?: '08:00'));
        $selesaiStr = $peminjaman->selesai ?: ($peminjaman->tgl_selesai.' '.($peminjaman->waktu_selesai ?: '16:00'));

        $itemsPayload = $itemList->map(fn ($it) => [
            'item_id' => (int) $it->item_id,
            'jumlah' => (int) $it->jumlah,
        ])->all();

        $conflicts = $this->detectConflicts(
            $mulaiStr,
            $selesaiStr,
            $itemsPayload,
            $peminjaman->id_peminjaman ?? $peminjaman->id
        );

        if (! empty($conflicts)) {
            $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));

            return [
                'success' => false,
                'message' => "Tidak dapat menyetujui peminjaman: terdapat jadwal bentrok pada {$conflictItemNames} dengan peminjaman lain yang sudah disetujui.",
                'conflicts' => $conflicts,
            ];
        }

        $peminjaman->status = 'Disetujui';
        $peminjaman->petugas = $petugas ?: 'Admin SiRuang';
        $peminjaman->save();

        return [
            'success' => true,
            'peminjaman' => $peminjaman,
        ];
    }

    /**
     * Ambil daftar item gabungan unik dari items dan itemPeminjaman (menjamin kompatibilitas historis).
     */
    public function consolidateItems(Peminjaman $peminjaman): Collection
    {
        $allItems = $peminjaman->items->concat($peminjaman->itemPeminjaman)->filter(fn ($it) => ! empty($it->item_id));

        return $allItems->unique(fn ($it) => (int) $it->item_id)->values();
    }

    /**
     * Resolusi kategori dan label jenis untuk pengajuan (mendukung multi-item kombinasi).
     */
    public function resolveCategoryMetadata(Collection $itemList): array
    {
        $kategoriList = $itemList
            ->map(fn ($pi) => self::CATEGORY_MAP[$pi->item?->id_jenis] ?? strtolower($pi->item?->jenis?->nama ?? 'ruangan'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $isMulti = count($kategoriList) > 1;
        $jenisName = $isMulti ? 'kombinasi' : ($kategoriList[0] ?? 'ruangan');

        return [
            'kategori_list' => $kategoriList,
            'is_multi_item' => $isMulti,
            'jenis' => $jenisName,
        ];
    }

    /**
     * Generate ID peminjaman berikutnya dengan format PMJ-YYYYMM-XXX secara aman.
     */
    protected function generateNextId(Carbon $now): string
    {
        $prefix = 'PMJ-'.$now->format('Ym').'-';

        $records = Peminjaman::where('id_peminjaman', 'like', $prefix.'%')
            ->orWhere('id', 'like', $prefix.'%')
            ->lockForUpdate()
            ->get(['id_peminjaman', 'id']);

        $lastSeq = 0;
        foreach ($records as $r) {
            $seqId = $r->id_peminjaman ?: $r->id;
            if ($seqId && str_starts_with($seqId, $prefix)) {
                $num = (int) substr($seqId, strlen($prefix));
                if ($num > $lastSeq) {
                    $lastSeq = $num;
                }
            }
        }

        do {
            $lastSeq++;
            $newId = $prefix.str_pad((string) $lastSeq, 3, '0', STR_PAD_LEFT);
        } while (Peminjaman::where('id_peminjaman', $newId)->orWhere('id', $newId)->exists());

        return $newId;
    }
}
