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
     * Hitung jadwal berulang mingguan berdasarkan tanggal mulai, jam, dan batas tanggal akhir (WIB).
     */
    public function generateWeeklySchedules(string $mulai, string $selesai, string $recurringEndDate): array
    {
        $tglMulai = substr($mulai, 0, 10);
        $waktuMulai = strlen($mulai) >= 16 ? substr($mulai, 11, 5) : '08:00';
        $tglSelesai = substr($selesai, 0, 10);
        $waktuSelesai = strlen($selesai) >= 16 ? substr($selesai, 11, 5) : '16:00';

        $startDate = Carbon::parse($tglMulai)->startOfDay();
        $endDate = Carbon::parse($recurringEndDate)->startOfDay();

        if ($endDate->lt($startDate)) {
            return [];
        }

        $schedules = [];
        $curr = $startDate->copy();
        $count = 0;

        while ($curr->lte($endDate) && $count < 52) {
            $currDateStr = $curr->toDateString();
            $sMulai = $currDateStr.' '.(strlen($waktuMulai) === 5 ? $waktuMulai.':00' : $waktuMulai);
            $sSelesai = $currDateStr.' '.(strlen($waktuSelesai) === 5 ? $waktuSelesai.':00' : $waktuSelesai);

            $schedules[] = [
                'index' => $count + 1,
                'date' => $currDateStr,
                'mulai' => $sMulai,
                'selesai' => $sSelesai,
                'tgl_mulai' => $currDateStr,
                'tgl_selesai' => $currDateStr,
            ];

            $curr->addDays(7);
            $count++;
        }

        return $schedules;
    }

    /**
     * Buat peminjaman baru di dalam transaksi database atomik dengan penguncian dan pencegahan race condition.
     * Mendukung peminjaman berulang mingguan dengan pembuatan jadwal berulang terhubung ke permohonan induk.
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

            $isRecurring = (bool) ($validated['is_recurring'] ?? false);
            $recurringFrequency = $validated['recurring_frequency'] ?? 'weekly';
            $recurringEndDate = $validated['recurring_end_date'] ?? null;

            $schedules = [];
            if ($isRecurring && $recurringEndDate) {
                $schedules = $this->generateWeeklySchedules(
                    $validated['mulai'],
                    $validated['selesai'],
                    $recurringEndDate
                );

                if (empty($schedules)) {
                    return [
                        'success' => false,
                        'message' => 'Tanggal akhir pengulangan tidak boleh lebih awal dari tanggal mulai peminjaman.',
                        'conflicts' => [],
                    ];
                }
            } else {
                $tglMulai = substr($validated['mulai'], 0, 10);
                $tglSelesai = substr($validated['selesai'], 0, 10);
                $schedules = [
                    [
                        'index' => 1,
                        'date' => $tglMulai,
                        'mulai' => $validated['mulai'],
                        'selesai' => $validated['selesai'],
                        'tgl_mulai' => $tglMulai,
                        'tgl_selesai' => $tglSelesai,
                    ],
                ];
            }

            // Validasi ketersediaan untuk setiap jadwal yang dihasilkan
            foreach ($schedules as $sched) {
                $conflicts = $this->detectConflicts($sched['mulai'], $sched['selesai'], $itemsPayload);
                if (! empty($conflicts)) {
                    $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                    $dateLabel = Carbon::parse($sched['date'])->translatedFormat('d F Y');

                    return [
                        'success' => false,
                        'message' => "Jadwal bentrok pada {$dateLabel}: {$conflictItemNames} sudah dipinjam pada rentang waktu yang sama.",
                        'conflicts' => $conflicts,
                        'conflicting_date' => $sched['date'],
                    ];
                }
            }

            $now = Carbon::now();
            $parentNewId = $this->generateNextId($now);

            $applicantType = $additionalData['applicant_type'] ?? $validated['applicant_type'] ?? null;
            $pihakPemohonInput = $additionalData['pihak_pemohon'] ?? $validated['pihak_pemohon'] ?? null;
            $isExternal = ($applicantType === 'external') || ($pihakPemohonInput && (str_contains(strtolower($pihakPemohonInput), 'eksternal') || str_contains(strtolower($pihakPemohonInput), 'external')));
            $pihakPemohon = $isExternal ? ($pihakPemohonInput ?: 'Eksternal (Madrasah/KUA/Lainnya)') : ($pihakPemohonInput ?: 'Internal Kemenag Sleman');
            $nipToStore = $isExternal ? null : (! empty($validated['nip']) ? $validated['nip'] : null);

            $firstSched = $schedules[0];
            $waktuMulai = strlen($firstSched['mulai']) >= 16 ? substr($firstSched['mulai'], 11, 5) : '08:00';
            $waktuSelesai = strlen($firstSched['selesai']) >= 16 ? substr($firstSched['selesai'], 11, 5) : '16:00';

            $peminjaman = Peminjaman::create([
                'id_peminjaman' => $parentNewId,
                'id' => $parentNewId,
                'parent_id' => null,
                'is_recurring' => $isRecurring,
                'recurring_frequency' => $isRecurring ? $recurringFrequency : null,
                'recurring_end_date' => $isRecurring ? $recurringEndDate : null,
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
                'mulai' => $firstSched['mulai'],
                'selesai' => $firstSched['selesai'],
                'tgl_mulai' => $firstSched['tgl_mulai'],
                'tgl_selesai' => $firstSched['tgl_selesai'],
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
                'keperluan' => $validated['keperluan'],
                'surat_peminjaman' => $suratFilename,
                'surat_url' => $suratUrl,
                'status' => 'Menunggu Persetujuan',
                'petugas' => null,
            ]);

            foreach ($itemsPayload as $item) {
                if (Schema::hasTable('item_peminjaman')) {
                    ItemPeminjaman::create([
                        'id_peminjaman' => $parentNewId,
                        'item_id' => $item['item_id'],
                        'jumlah' => $item['jumlah'],
                    ]);
                }

                if (Schema::hasTable('peminjaman_items')) {
                    PeminjamanItem::create([
                        'peminjaman_id' => $parentNewId,
                        'item_id' => $item['item_id'],
                        'jumlah' => $item['jumlah'],
                    ]);
                }
            }

            // Jika permohonan berulang, buat jadwal turunan untuk pertemuan ke-2 sampai selesai
            if ($isRecurring && count($schedules) > 1) {
                for ($i = 1; $i < count($schedules); $i++) {
                    $childSched = $schedules[$i];
                    $childId = $this->generateNextId($now);
                    $cWaktuMulai = strlen($childSched['mulai']) >= 16 ? substr($childSched['mulai'], 11, 5) : $waktuMulai;
                    $cWaktuSelesai = strlen($childSched['selesai']) >= 16 ? substr($childSched['selesai'], 11, 5) : $waktuSelesai;

                    Peminjaman::create([
                        'id_peminjaman' => $childId,
                        'id' => $childId,
                        'parent_id' => $parentNewId,
                        'is_recurring' => true,
                        'recurring_frequency' => $recurringFrequency,
                        'recurring_end_date' => $recurringEndDate,
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
                        'mulai' => $childSched['mulai'],
                        'selesai' => $childSched['selesai'],
                        'tgl_mulai' => $childSched['tgl_mulai'],
                        'tgl_selesai' => $childSched['tgl_selesai'],
                        'waktu_mulai' => $cWaktuMulai,
                        'waktu_selesai' => $cWaktuSelesai,
                        'keperluan' => $validated['keperluan'],
                        'surat_peminjaman' => $suratFilename,
                        'surat_url' => $suratUrl,
                        'status' => 'Menunggu Persetujuan',
                        'petugas' => null,
                    ]);

                    foreach ($itemsPayload as $item) {
                        if (Schema::hasTable('item_peminjaman')) {
                            ItemPeminjaman::create([
                                'id_peminjaman' => $childId,
                                'item_id' => $item['item_id'],
                                'jumlah' => $item['jumlah'],
                            ]);
                        }

                        if (Schema::hasTable('peminjaman_items')) {
                            PeminjamanItem::create([
                                'peminjaman_id' => $childId,
                                'item_id' => $item['item_id'],
                                'jumlah' => $item['jumlah'],
                            ]);
                        }
                    }
                }
            }

            return [
                'success' => true,
                'peminjaman' => $peminjaman->load(['items.item.jenis', 'itemPeminjaman.item.jenis', 'recurringSchedules']),
            ];
        });
    }

    /**
     * Persetujuan peminjaman oleh admin dengan validasi ulang konflik ketersediaan & row lock.
     * Otomatis memvalidasi dan menyetujui seluruh jadwal jika merupakan seri peminjaman berulang.
     */
    public function approvePeminjaman(Peminjaman $peminjaman, ?string $petugas = null): array
    {
        $root = $peminjaman->parent_id
            ? (Peminjaman::where('id_peminjaman', $peminjaman->parent_id)->orWhere('id', $peminjaman->parent_id)->first() ?: $peminjaman)
            : $peminjaman;

        $allToApprove = collect([$root]);
        if ($root->is_recurring && $root->recurringSchedules()->exists()) {
            $allToApprove = $allToApprove->concat($root->recurringSchedules);
        }
        $allToApprove = $allToApprove->filter(fn ($rec) => $rec->status !== 'Dibatalkan');

        foreach ($allToApprove as $rec) {
            $itemList = $this->consolidateItems($rec);
            $itemIds = $itemList->pluck('item_id')->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->unique()->values()->all();

            $this->lockItemsForUpdate($itemIds);

            $mulaiStr = $rec->mulai ?: ($rec->tgl_mulai.' '.($rec->waktu_mulai ?: '08:00'));
            $selesaiStr = $rec->selesai ?: ($rec->tgl_selesai.' '.($rec->waktu_selesai ?: '16:00'));

            $itemsPayload = $itemList->map(fn ($it) => [
                'item_id' => (int) $it->item_id,
                'jumlah' => (int) $it->jumlah,
            ])->all();

            $conflicts = $this->detectConflicts(
                $mulaiStr,
                $selesaiStr,
                $itemsPayload,
                $rec->id_peminjaman ?? $rec->id
            );

            if (! empty($conflicts)) {
                $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                $dateLabel = Carbon::parse($rec->tgl_mulai)->translatedFormat('d F Y');

                return [
                    'success' => false,
                    'message' => "Tidak dapat menyetujui peminjaman: terdapat jadwal bentrok pada tanggal {$dateLabel} untuk {$conflictItemNames} dengan peminjaman lain yang sudah disetujui.",
                    'conflicts' => $conflicts,
                ];
            }
        }

        foreach ($allToApprove as $rec) {
            $rec->status = 'Disetujui';
            $rec->petugas = $petugas ?: 'Admin SIMPRU';
            $rec->save();
        }

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
