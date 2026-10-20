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
     * Menentukan sesi pemakaian aktif untuk peminjaman biasa (single day atau multihari).
     * Aturan SIMPRU:
     * - Peminjaman satu hari (tgl_mulai === tgl_selesai): 1 sesi pada tanggal tersebut.
     * - Peminjaman biasa multihari (tgl_mulai !== tgl_selesai): BUKAN satu blok pemakaian kontinu.
     *   Hanya tanggal mulai dan tanggal selesai yang menjadi sesi pemakaian aktif,
     *   keduanya menggunakan interval jam yang sama sesuai input form (waktu_mulai s/d waktu_selesai).
     *   Tanggal-tanggal di antara keduanya benar-benar kosong dan bebas dipesan.
     *
     * @return array<int, array{date: string, mulai: string, selesai: string, waktu_mulai: string, waktu_selesai: string}>
     */
    public function getEffectiveSessions(string $mulai, string $selesai): array
    {
        $m = Carbon::parse($mulai);
        $s = Carbon::parse($selesai);

        $startDate = $m->toDateString();
        $endDate = $s->toDateString();

        $waktuMulai = $m->format('H:i');
        $waktuSelesai = $s->format('H:i');

        if ($startDate === $endDate) {
            return [
                [
                    'date' => $startDate,
                    'mulai' => "{$startDate} {$waktuMulai}:00",
                    'selesai' => "{$startDate} {$waktuSelesai}:00",
                    'waktu_mulai' => $waktuMulai,
                    'waktu_selesai' => $waktuSelesai,
                ],
            ];
        }

        return [
            [
                'date' => $startDate,
                'mulai' => "{$startDate} {$waktuMulai}:00",
                'selesai' => "{$startDate} {$waktuSelesai}:00",
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
            ],
            [
                'date' => $endDate,
                'mulai' => "{$endDate} {$waktuMulai}:00",
                'selesai' => "{$endDate} {$waktuSelesai}:00",
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
            ],
        ];
    }

    /**
     * Ambil sesi aktif dari record peminjaman yang tersimpan di database.
     *
     * @return array<int, array{date: string, mulai: string, selesai: string, waktu_mulai: string, waktu_selesai: string}>
     */
    public function getBookingEffectiveSessions(Peminjaman $booking): array
    {
        $startDate = $booking->tgl_mulai ?: ($booking->mulai ? Carbon::parse($booking->mulai)->toDateString() : null);
        $endDate = $booking->tgl_selesai ?: ($booking->selesai ? Carbon::parse($booking->selesai)->toDateString() : $startDate);

        if (! $startDate) {
            return [];
        }

        $waktuMulai = $booking->waktu_mulai
            ?: ($booking->mulai ? Carbon::parse($booking->mulai)->format('H:i') : '08:00');
        $waktuSelesai = $booking->waktu_selesai
            ?: ($booking->selesai ? Carbon::parse($booking->selesai)->format('H:i') : '16:00');

        if (! $endDate || $startDate === $endDate) {
            return [
                [
                    'date' => $startDate,
                    'mulai' => "{$startDate} {$waktuMulai}:00",
                    'selesai' => "{$startDate} {$waktuSelesai}:00",
                    'waktu_mulai' => $waktuMulai,
                    'waktu_selesai' => $waktuSelesai,
                ],
            ];
        }

        // Peminjaman biasa multihari: hanya tanggal awal dan tanggal akhir yang menjadi sesi
        return [
            [
                'date' => $startDate,
                'mulai' => "{$startDate} {$waktuMulai}:00",
                'selesai' => "{$startDate} {$waktuSelesai}:00",
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
            ],
            [
                'date' => $endDate,
                'mulai' => "{$endDate} {$waktuMulai}:00",
                'selesai' => "{$endDate} {$waktuSelesai}:00",
                'waktu_mulai' => $waktuMulai,
                'waktu_selesai' => $waktuSelesai,
            ],
        ];
    }

    /**
     * Periksa bentrok jadwal peminjaman terhadap peminjaman berstatus 'Disetujui'.
     * Membandingkan identitas sumber daya, tanggal sesi aktual, dan interval jam aktual.
     * Batas jam yang bersentuhan (misal 08.00-10.00 vs 10.00-12.00) DIPERBOLEHKAN (tidak bentrok).
     */
    public function detectConflicts(string $mulai, string $selesai, array $items, ?string $excludePeminjamanId = null): array
    {
        $conflicts = [];
        $requestSessions = $this->getEffectiveSessions($mulai, $selesai);
        if (empty($requestSessions)) {
            return [];
        }

        $requestDates = array_column($requestSessions, 'date');
        $minDate = min($requestDates);
        $maxDate = max($requestDates);

        $query = Peminjaman::where('status', 'Disetujui');

        if ($excludePeminjamanId) {
            $query->where(function ($q) use ($excludePeminjamanId) {
                $q->where('id_peminjaman', '!=', $excludePeminjamanId)
                    ->where('id', '!=', $excludePeminjamanId);
            });
        }

        // Ambil kandidat peminjaman disetujui yang beririsan dengan rentang tanggal pengajuan
        $query->where(function ($q) use ($minDate, $maxDate) {
            $q->where(function ($sub) use ($minDate, $maxDate) {
                $sub->whereDate('mulai', '<=', $maxDate)
                    ->whereDate('selesai', '>=', $minDate);
            })->orWhere(function ($sub) use ($minDate, $maxDate) {
                $sub->where('tgl_mulai', '<=', $maxDate)
                    ->where('tgl_selesai', '>=', $minDate);
            });
        });

        $candidateBookings = $query->with(['items.item', 'itemPeminjaman.item'])->get();

        foreach ($items as $reqItem) {
            $itemId = (int) ($reqItem['item_id'] ?? $reqItem['item']['id'] ?? 0);
            $reqQty = max(1, (int) ($reqItem['jumlah'] ?? 1));

            $itemModel = ItemJenis::find($itemId);
            if (! $itemModel) {
                continue;
            }

            // Periksa setiap sesi aktif dari pengajuan baru
            foreach ($requestSessions as $rSession) {
                $bookedQtyOnSession = 0;
                $sessionConflicts = [];

                foreach ($candidateBookings as $booking) {
                    $bSessions = $this->getBookingEffectiveSessions($booking);
                    foreach ($bSessions as $bSession) {
                        // Harus pada tanggal yang sama persis
                        if ($bSession['date'] !== $rSession['date']) {
                            continue;
                        }

                        // Periksa tumpang tindih waktu: rMulai < bSelesai && rSelesai > bMulai
                        // Batas bersentuhan (misal 08:00-10:00 vs 10:00-12:00) TIDAK bentrok
                        $rStart = $rSession['waktu_mulai'];
                        $rEnd = $rSession['waktu_selesai'];
                        $bStart = $bSession['waktu_mulai'];
                        $bEnd = $bSession['waktu_selesai'];

                        if ($rStart < $bEnd && $rEnd > $bStart) {
                            $bItems = $this->consolidateItems($booking);
                            foreach ($bItems as $bookedItem) {
                                if ((int) $bookedItem->item_id === $itemId) {
                                    $bookedQtyOnSession += (int) $bookedItem->jumlah;
                                    $sessionConflicts[] = [
                                        'peminjaman_id' => $booking->id_peminjaman ?? $booking->id,
                                        'peminjam' => $booking->nama_peminjam ?? $booking->nama_pemohon,
                                        'date' => $bSession['date'],
                                        'mulai' => $bSession['mulai'],
                                        'selesai' => $bSession['selesai'],
                                        'waktu_mulai' => $bSession['waktu_mulai'],
                                        'waktu_selesai' => $bSession['waktu_selesai'],
                                        'keperluan' => $booking->keperluan,
                                        'jumlah' => (int) $bookedItem->jumlah,
                                    ];
                                }
                            }
                        }
                    }
                }

                if (($bookedQtyOnSession + $reqQty) > $itemModel->quantity) {
                    $conflicts[] = [
                        'item_id' => $itemId,
                        'item_nama' => $itemModel->nama,
                        'session_date' => $rSession['date'],
                        'session_waktu_mulai' => $rSession['waktu_mulai'],
                        'session_waktu_selesai' => $rSession['waktu_selesai'],
                        'kapasitas_total' => $itemModel->quantity,
                        'sudah_dipinjam' => $bookedQtyOnSession,
                        'diminta' => $reqQty,
                        'overlapping_bookings' => $sessionConflicts,
                    ];
                }
            }
        }

        return $conflicts;
    }

    /**
     * Validasi aturan hari operasional, jam kerja, dan hari libur nasional resmi 2026.
     * Aturan:
     * A. Ruangan:
     *    - Pemohon eksternal boleh meminjam ruangan pada Sabtu dan Minggu (Aula Lantai 3).
     *    - Tidak ada larangan akhir pekan maupun hari libur untuk ruangan.
     * B. Kendaraan dan Perlengkapan:
     *    - Jam operasional Senin–Kamis: 07.30–16.00 WIB.
     *    - Jam operasional Jumat: 07.30–16.30 WIB.
     *    - DILARANG dipesan pada Sabtu dan Minggu.
     *    - DILARANG dipesan pada Hari Libur Nasional resmi Indonesia tahun 2026.
     *    - Berlaku untuk pemohon internal maupun eksternal.
     *
     * @return array{valid: bool, message?: string}
     */
    public function validateOperationalRules(string $mulai, string $selesai, array $itemsPayload, bool $isExternal = false): array
    {
        $sessions = $this->getEffectiveSessions($mulai, $selesai);
        $holidays = config('holidays.2026', []);

        foreach ($itemsPayload as $item) {
            $itemId = (int) ($item['item_id'] ?? $item['item']['id'] ?? 0);
            if ($itemId <= 0) {
                continue;
            }

            $itemModel = ItemJenis::with('jenis')->find($itemId);
            if (! $itemModel) {
                continue;
            }

            $category = self::CATEGORY_MAP[$itemModel->id_jenis]
                ?? strtolower($itemModel->jenis?->nama ?? 'ruangan');

            // Aturan khusus Kendaraan dan Perlengkapan
            if (in_array($category, ['kendaraan', 'perlengkapan'])) {
                foreach ($sessions as $session) {
                    $dateStr = $session['date'];
                    $carbonDate = Carbon::parse($dateStr);
                    $dayOfWeek = $carbonDate->dayOfWeek; // 0 = Minggu, 6 = Sabtu
                    $dateFormatted = $carbonDate->translatedFormat('d F Y');

                    // 1. Larangan Akhir Pekan (Sabtu / Minggu)
                    if ($dayOfWeek === 0 || $dayOfWeek === 6) {
                        $dayName = $dayOfWeek === 0 ? 'Minggu' : 'Sabtu';

                        return [
                            'valid' => false,
                            'message' => "Kendaraan dan perlengkapan dinas ({$itemModel->nama}) tidak dapat dipinjam pada akhir pekan ({$dayName}, {$dateFormatted}). Layanan hanya tersedia pada hari kerja.",
                        ];
                    }

                    // 2. Larangan Hari Libur Nasional Resmi Indonesia 2026
                    if (isset($holidays[$dateStr])) {
                        $holidayName = $holidays[$dateStr];

                        return [
                            'valid' => false,
                            'message' => "Kendaraan dan perlengkapan dinas ({$itemModel->nama}) tidak dapat dipinjam pada hari libur nasional ({$holidayName}, {$dateFormatted}).",
                        ];
                    }

                    // 3. Batasan Jam Operasional
                    // Senin–Kamis: 07.30–16.00 WIB
                    // Jumat: 07.30–16.30 WIB
                    $waktuMulai = $session['waktu_mulai'];
                    $waktuSelesai = $session['waktu_selesai'];

                    if ($dayOfWeek >= 1 && $dayOfWeek <= 4) {
                        // Senin - Kamis
                        if ($waktuMulai < '07:30' || $waktuSelesai > '16:00') {
                            return [
                                'valid' => false,
                                'message' => "Jam operasional peminjaman {$category} ({$itemModel->nama}) pada hari Senin–Kamis adalah pukul 07.30–16.00 WIB (jadwal diajukan: {$waktuMulai}–{$waktuSelesai} WIB).",
                            ];
                        }
                    } elseif ($dayOfWeek === 5) {
                        // Jumat
                        if ($waktuMulai < '07:30' || $waktuSelesai > '16:30') {
                            return [
                                'valid' => false,
                                'message' => "Jam operasional peminjaman {$category} ({$itemModel->nama}) pada hari Jumat adalah pukul 07.30–16.30 WIB (jadwal diajukan: {$waktuMulai}–{$waktuSelesai} WIB).",
                            ];
                        }
                    }
                }
            }
        }

        return ['valid' => true];
    }

    /**
     * Format rentang waktu peminjaman untuk tampilan pesan bentrok yang informatif.
     */
    public function formatBookingTimeRange(?string $mulai, ?string $selesai): string
    {
        if (! $mulai || ! $selesai) {
            return '';
        }

        try {
            $m = Carbon::parse($mulai);
            $s = Carbon::parse($selesai);

            if ($m->toDateString() === $s->toDateString()) {
                return $m->translatedFormat('d F Y').' ('.$m->format('H:i').' - '.$s->format('H:i').' WIB)';
            }

            return $m->translatedFormat('d M Y H:i').' s/d '.$s->translatedFormat('d M Y H:i').' WIB';
        } catch (\Throwable) {
            return "{$mulai} s/d {$selesai}";
        }
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

            $applicantType = $additionalData['applicant_type'] ?? $validated['applicant_type'] ?? null;
            $pihakPemohonInput = $additionalData['pihak_pemohon'] ?? $validated['pihak_pemohon'] ?? null;
            $isExternal = ($applicantType === 'external') || ($pihakPemohonInput && (str_contains(strtolower($pihakPemohonInput), 'eksternal') || str_contains(strtolower($pihakPemohonInput), 'external')));

            // 1. Validasi aturan operasional (jam kerja, hari kerja, hari libur nasional 2026)
            foreach ($schedules as $sched) {
                $opResult = $this->validateOperationalRules($sched['mulai'], $sched['selesai'], $itemsPayload, $isExternal);
                if (! $opResult['valid']) {
                    return [
                        'success' => false,
                        'message' => $opResult['message'] ?? 'Permohonan melanggar aturan operasional sarana prasarana.',
                        'conflicts' => [],
                    ];
                }
            }

            // 2. Validasi ketersediaan dan bentrok jadwal untuk setiap jadwal yang dihasilkan
            foreach ($schedules as $sched) {
                $conflicts = $this->detectConflicts($sched['mulai'], $sched['selesai'], $itemsPayload);
                if (! empty($conflicts)) {
                    $firstConflict = $conflicts[0];
                    $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                    $dateLabel = Carbon::parse($firstConflict['session_date'] ?? $sched['date'])->translatedFormat('d F Y');
                    $reqTime = ($firstConflict['session_waktu_mulai'] ?? '').'-'.($firstConflict['session_waktu_selesai'] ?? '').' WIB';

                    $existingDetail = '';
                    if (! empty($firstConflict['overlapping_bookings'][0])) {
                        $firstOverlap = $firstConflict['overlapping_bookings'][0];
                        $oldTime = ($firstOverlap['waktu_mulai'] ?? '').'-'.($firstOverlap['waktu_selesai'] ?? '').' WIB';
                        $peminjamOld = $firstOverlap['peminjam'] ?? 'peminjam lain';
                        $existingDetail = " (jadwal lama: {$oldTime} oleh {$peminjamOld})";
                    }

                    return [
                        'success' => false,
                        'message' => "Jadwal bentrok pada {$dateLabel}: {$conflictItemNames} sudah dipinjam pada rentang waktu {$reqTime}{$existingDetail}.",
                        'conflicts' => $conflicts,
                        'conflicting_date' => $firstConflict['session_date'] ?? $sched['date'],
                    ];
                }
            }

            $now = Carbon::now();
            $parentNewId = $this->generateNextId($now);

            $applicantType = $additionalData['applicant_type'] ?? $validated['applicant_type'] ?? null;
            $pihakPemohonInput = $additionalData['pihak_pemohon'] ?? $validated['pihak_pemohon'] ?? null;
            $isExternal = ($applicantType === 'external') || ($pihakPemohonInput && (str_contains(strtolower($pihakPemohonInput), 'eksternal') || str_contains(strtolower($pihakPemohonInput), 'external')));
            $pihakPemohon = $isExternal ? ($pihakPemohonInput ?: 'Eksternal (Madrasah/KUA/Lainnya)') : ($pihakPemohonInput ?: 'Internal Kemenag Sleman');
            $nipRaw = isset($validated['nip']) ? trim((string) $validated['nip']) : null;
            $nipToStore = ($nipRaw !== '' && $nipRaw !== null) ? $nipRaw : null;

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
                $firstConflict = $conflicts[0];
                $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                $dateLabel = Carbon::parse($firstConflict['session_date'] ?? $rec->tgl_mulai)->translatedFormat('d F Y');
                $reqTime = ($firstConflict['session_waktu_mulai'] ?? '').'-'.($firstConflict['session_waktu_selesai'] ?? '').' WIB';

                $existingDetail = '';
                if (! empty($firstConflict['overlapping_bookings'][0])) {
                    $firstOverlap = $firstConflict['overlapping_bookings'][0];
                    $oldTime = ($firstOverlap['waktu_mulai'] ?? '').'-'.($firstOverlap['waktu_selesai'] ?? '').' WIB';
                    $peminjamOld = $firstOverlap['peminjam'] ?? 'peminjam lain';
                    $existingDetail = " (jadwal lama: {$oldTime} oleh {$peminjamOld})";
                }

                return [
                    'success' => false,
                    'message' => "Tidak dapat menyetujui peminjaman: terdapat jadwal bentrok pada tanggal {$dateLabel} untuk {$conflictItemNames} (jam {$reqTime}) dengan peminjaman lain yang sudah disetujui{$existingDetail}.",
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
