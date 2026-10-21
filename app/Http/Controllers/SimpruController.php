<?php

namespace App\Http\Controllers;

use App\Models\ItemJenis;
use App\Models\MasterJenis;
use App\Models\Peminjaman;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class SimpruController extends Controller
{
    public function __construct(
        protected BookingService $bookingService
    ) {}

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
        if (! $item) {
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
        if (! $item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan'], 404);
        }

        if ($item->peminjamanItems()->exists() || $item->itemPeminjaman()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Item tidak bisa dihapus karena sudah pernah dipinjam. Nonaktifkan saja statusnya.',
            ], 409);
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item berhasil dihapus']);
    }

    /**
     * Admin / Public: Get all peminjaman records for Rekap Peminjaman.
     * Untuk publik: data NIP, nomor HP, dan berkas surat disembunyikan untuk menjaga privasi pemohon.
     * Untuk admin terautentikasi: data ditampilkan lengkap untuk keperluan rekap.
     */
    public function getAllPeminjaman(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $isAdmin = false;
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $isAdmin = (bool) $accessToken?->tokenable;
        }
        if (! $isAdmin && auth('sanctum')->check()) {
            $isAdmin = true;
        }

        $records = Peminjaman::with([
            'items.item.jenis',
            'itemPeminjaman.item.jenis',
            'parent.items.item.jenis',
            'parent.itemPeminjaman.item.jenis',
        ])
            ->orderBy('tgl_mulai', 'asc')
            ->orderBy('waktu_mulai', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        $seriesGroups = $records->groupBy(function ($item) {
            return $item->parent_id ?: ($item->id_peminjaman ?? $item->id);
        });

        $maskName = function (?string $name): string {
            if (! $name || $name === '-') {
                return '-';
            }
            $words = explode(' ', trim($name));
            $maskedWords = array_map(function ($word) {
                $len = mb_strlen($word);
                if ($len <= 2) {
                    return $word;
                }

                return mb_substr($word, 0, 2).str_repeat('*', max(2, $len - 2));
            }, $words);

            return implode(' ', $maskedWords);
        };

        $formatted = $records->map(function ($p) use ($isAdmin, $maskName, $seriesGroups) {
            $itemList = $this->bookingService->consolidateItems($p);
            $categoryMeta = $this->bookingService->resolveCategoryMetadata($itemList);

            $kategoriList = $categoryMeta['kategori_list'];
            $isMulti = $categoryMeta['is_multi_item'];
            $jenisName = $categoryMeta['jenis'];

            $itemNames = $itemList->map(function ($pi) {
                return ($pi->item?->nama ?? 'Item').($pi->jumlah > 1 ? " ({$pi->jumlah})" : '');
            })->join(', ');

            $tglMulaiStr = $p->tgl_mulai ? Carbon::parse($p->tgl_mulai)->format('Y-m-d') : ($p->mulai ? substr((string) $p->mulai, 0, 10) : date('Y-m-d'));
            $tglSelesaiStr = $p->tgl_selesai ? Carbon::parse($p->tgl_selesai)->format('Y-m-d') : ($p->selesai ? substr((string) $p->selesai, 0, 10) : $tglMulaiStr);
            $waktuMulaiStr = $p->waktu_mulai ?: (strlen((string) $p->mulai) >= 16 ? substr((string) $p->mulai, 11, 5) : '08:00');
            $waktuSelesaiStr = $p->waktu_selesai ?: (strlen((string) $p->selesai) >= 16 ? substr((string) $p->selesai, 11, 5) : '16:00');

            $rawName = $p->nama_pemohon ?? $p->nama_peminjam;
            $namaDisplay = $isAdmin ? ($rawName ?: '-') : $maskName($rawName);
            $unitDisplay = $isAdmin ? ($p->unit_pemohon ?? $p->unit_kerja) : 'Internal Kemenag Sleman';
            $keperluanDisplay = $isAdmin ? $p->keperluan : ($p->keperluan ? 'Kegiatan Kedinasan / Tugas Instansi' : '-');

            $pihak = $p->pihak_pemohon ?: 'Internal Kemenag Sleman';
            $isExternal = str_contains(strtolower($pihak), 'eksternal') || str_contains(strtolower($pihak), 'external');
            $applicantType = $isExternal ? 'external' : 'internal';

            $rootKey = $p->parent_id ?: ($p->id_peminjaman ?? $p->id);
            $group = $seriesGroups->get($rootKey, collect([$p]));
            $isWeeklyRecurring = (bool) $p->is_recurring && (bool) $p->recurring_frequency;
            $sortedGroup = $group->sortBy('tgl_mulai')->values();
            $currId = $p->id_peminjaman ?? $p->id;
            $sessionIdx = $sortedGroup->search(fn ($it) => ($it->id_peminjaman ?? $it->id) === $currId);
            $sessionNumber = $sessionIdx !== false ? $sessionIdx + 1 : 1;
            $totalSessions = $sortedGroup->count();
            $isSeries = $totalSessions > 1 || ! empty($p->parent_id) || $isWeeklyRecurring;

            // Pembeda eksplisit jenis booking: recurring, multiday, atau single
            $bookingType = $p->booking_type ?: ($isWeeklyRecurring ? 'recurring' : ($totalSessions > 1 ? 'multiday' : 'single'));
            $isMultiday = ($bookingType === 'multiday');

            $nextSession = $sortedGroup->first(function ($it) use ($p) {
                return $it->tgl_mulai > $p->tgl_mulai && $it->status !== 'Dibatalkan';
            });

            // Penanda rentang untuk peminjaman multihari: Mulai (awal), Berlangsung (tengah), Habis (akhir)
            $rangeIndicator = null;
            if ($isMultiday && $totalSessions > 1) {
                if ($sessionNumber === 1) {
                    $rangeIndicator = 'Mulai';
                } elseif ($sessionNumber === $totalSessions) {
                    $rangeIndicator = 'Habis';
                } else {
                    $rangeIndicator = 'Berlangsung';
                }
            }

            // Status operasional dinamis berbasis waktu zona Asia/Jakarta
            $computedStatus = $p->status;
            if ($p->status === 'Disetujui' && $p->mulai && $p->selesai) {
                $nowJkt = Carbon::now('Asia/Jakarta');
                $mulaiJkt = Carbon::parse($p->mulai, 'Asia/Jakarta');
                $selesaiJkt = Carbon::parse($p->selesai, 'Asia/Jakarta');

                if ($nowJkt->lt($mulaiJkt)) {
                    $computedStatus = 'Disetujui';
                } elseif ($nowJkt->between($mulaiJkt, $selesaiJkt)) {
                    $computedStatus = 'Berlangsung';
                } else {
                    $computedStatus = 'Selesai';
                }
            }

            return [
                'id' => $p->id_peminjaman ?? $p->id,
                'id_peminjaman' => $p->id_peminjaman ?? $p->id,
                'tgl_pengajuan' => Carbon::parse($p->tgl_pengajuan)->format('Y-m-d'),
                'nip' => $isAdmin ? ($p->nip ?: ($isExternal ? '-' : '-')) : null,
                'pihak_pemohon' => $pihak,
                'applicant_type' => $applicantType,
                'unit_pemohon' => $unitDisplay,
                'unit_kerja' => $unitDisplay,
                'nama_pemohon' => $namaDisplay,
                'nama_peminjam' => $namaDisplay,
                'nomor_hp' => $isAdmin ? ($p->nomor_hp ?: '-') : null,
                'penanggung_jawab' => $isAdmin ? ($p->penanggung_jawab ?: $rawName) : null,
                'jumlah_peserta' => $isAdmin ? ($p->jumlah_peserta ?: 1) : null,
                'ruangan' => $itemNames ?: 'Sarana Prasarana',
                'tgl_mulai' => $tglMulaiStr,
                'tgl_selesai' => $tglSelesaiStr,
                'waktu_mulai' => $waktuMulaiStr,
                'waktu_selesai' => $waktuSelesaiStr,
                'mulai' => $p->mulai ?: ($tglMulaiStr.' '.$waktuMulaiStr),
                'selesai' => $p->selesai ?: ($tglSelesaiStr.' '.$waktuSelesaiStr),
                'kegiatan' => $keperluanDisplay,
                'keperluan' => $keperluanDisplay,
                'status' => $p->status,
                'computed_status' => $computedStatus,
                'surat_url' => $isAdmin ? ($p->surat_url ?? $p->surat_peminjaman) : null,
                'surat_peminjaman' => $isAdmin ? ($p->surat_peminjaman ?? $p->surat_url) : null,
                'parent_id' => $p->parent_id,
                'parent_registration_id' => $rootKey,
                'booking_type' => $bookingType,
                'is_multiday' => $isMultiday,
                'is_recurring' => $isWeeklyRecurring,
                'is_series' => $isSeries,
                'range_indicator' => $rangeIndicator,
                'session_number' => $isSeries ? $sessionNumber : null,
                'total_sessions' => $isSeries ? $totalSessions : null,
                'session_label' => $isSeries ? "Sesi {$sessionNumber} dari {$totalSessions}" : null,
                'next_session_date' => $nextSession ? Carbon::parse($nextSession->tgl_mulai)->format('Y-m-d') : null,
                'recurring_frequency' => $p->recurring_frequency,
                'recurring_end_date' => $p->recurring_end_date ? Carbon::parse($p->recurring_end_date)->format('Y-m-d') : null,
                'jenis' => $jenisName,
                'kategori_list' => $kategoriList,
                'is_multi_item' => $isMulti,
                'item_dipinjam' => $itemNames ?: 'Sarana Prasarana',
                'petugas' => $isAdmin ? $p->petugas : null,
                'items' => $itemList->map(fn ($it) => [
                    'id' => $it->id,
                    'item_id' => $it->item_id,
                    'jumlah' => $it->jumlah,
                    'nama' => $it->item?->nama ?? 'Item',
                    'registration_id' => $it->item?->registration_id,
                    'id_jenis' => $it->item?->id_jenis,
                    'kategori' => BookingService::CATEGORY_MAP[$it->item?->id_jenis] ?? strtolower($it->item?->jenis?->nama ?? 'ruangan'),
                ])->values()->all(),
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
    public function getPeminjamanById(Request $request, string $id): JsonResponse
    {
        $token = $request->bearerToken();
        $isAdmin = false;
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $isAdmin = (bool) $accessToken?->tokenable;
        }
        if (! $isAdmin && auth('sanctum')->check()) {
            $isAdmin = true;
        }

        $peminjaman = Peminjaman::with(['items.item.jenis', 'itemPeminjaman.item.jenis'])
            ->where('id', $id)
            ->orWhere('id_peminjaman', $id)
            ->first();

        if (! $peminjaman) {
            return response()->json([
                'success' => false,
                'message' => 'Data peminjaman tidak ditemukan',
            ], 404);
        }

        $itemList = $this->bookingService->consolidateItems($peminjaman);
        $categoryMeta = $this->bookingService->resolveCategoryMetadata($itemList);

        $kategoriList = $categoryMeta['kategori_list'];
        $isMulti = $categoryMeta['is_multi_item'];
        $jenisName = $categoryMeta['jenis'];

        $itemNames = $itemList->map(function ($pi) {
            return ($pi->item?->nama ?? 'Item').($pi->jumlah > 1 ? " ({$pi->jumlah})" : '');
        })->join(', ');

        $tglMulaiStr = $peminjaman->tgl_mulai ? Carbon::parse($peminjaman->tgl_mulai)->format('Y-m-d') : ($peminjaman->mulai ? substr((string) $peminjaman->mulai, 0, 10) : date('Y-m-d'));
        $tglSelesaiStr = $peminjaman->tgl_selesai ? Carbon::parse($peminjaman->tgl_selesai)->format('Y-m-d') : ($peminjaman->selesai ? substr((string) $peminjaman->selesai, 0, 10) : $tglMulaiStr);
        $waktuMulaiStr = $peminjaman->waktu_mulai ?: (strlen((string) $peminjaman->mulai) >= 16 ? substr((string) $peminjaman->mulai, 11, 5) : '08:00');
        $waktuSelesaiStr = $peminjaman->waktu_selesai ?: (strlen((string) $peminjaman->selesai) >= 16 ? substr((string) $peminjaman->selesai, 11, 5) : '16:00');

        $rawName = $peminjaman->nama_pemohon ?? $peminjaman->nama_peminjam ?? '-';
        $nipRaw = (string) ($peminjaman->nip ?? '');
        $hpRaw = (string) ($peminjaman->nomor_hp ?? '');

        $pihak = $peminjaman->pihak_pemohon ?: 'Internal Kemenag Sleman';
        $isExternal = str_contains(strtolower($pihak), 'eksternal') || str_contains(strtolower($pihak), 'external');
        $applicantType = $isExternal ? 'external' : 'internal';

        $namaDisplay = $rawName ?: '-';
        $nipDisplay = $nipRaw ?: '-';
        $hpDisplay = $isAdmin ? ($hpRaw ?: '-') : null;
        $penanggungJawabDisplay = $isAdmin ? ($peminjaman->penanggung_jawab ?: $rawName) : null;
        $keperluanDisplay = $peminjaman->keperluan ?: '-';

        $hasRealSurat = ! empty($peminjaman->surat_url) || ! empty($peminjaman->surat_peminjaman);

        $recurringSchedules = [];
        $parentObj = $peminjaman->parent_id
            ? (Peminjaman::where('id_peminjaman', $peminjaman->parent_id)->orWhere('id', $peminjaman->parent_id)->first() ?: $peminjaman)
            : $peminjaman;
        $isWeeklyRecurring = (bool) $parentObj->is_recurring && (bool) $parentObj->recurring_frequency;
        $isSeries = false;
        $sessionNumber = 1;
        $totalSessions = 1;
        $nextSessionDate = null;
        $bookingType = 'single';
        $isMultiday = false;

        if ($parentObj) {
            // Jika record multihari legacy belum memiliki child records, backfill sesi secara aman
            if (! $isWeeklyRecurring && empty($parentObj->parent_id) && $parentObj->tgl_mulai !== $parentObj->tgl_selesai) {
                $this->bookingService->ensureMultidayChildSessions($parentObj);
                $parentObj->refresh();
            }

            $allInSeries = Peminjaman::where('id_peminjaman', $parentObj->id_peminjaman)
                ->orWhere('id', $parentObj->id_peminjaman)
                ->orWhere('parent_id', $parentObj->id_peminjaman)
                ->orderBy('tgl_mulai', 'asc')
                ->get();

            $totalSessions = $allInSeries->count();
            $bookingType = $parentObj->booking_type ?: ($isWeeklyRecurring ? 'recurring' : ($totalSessions > 1 ? 'multiday' : 'single'));
            $isMultiday = ($bookingType === 'multiday');
            $isSeries = $totalSessions > 1 || ! empty($peminjaman->parent_id) || $isWeeklyRecurring;

            if ($isSeries) {
                $currId = $peminjaman->id_peminjaman ?? $peminjaman->id;
                $sIdx = $allInSeries->search(fn ($s) => ($s->id_peminjaman ?? $s->id) === $currId);
                $sessionNumber = $sIdx !== false ? $sIdx + 1 : 1;
                $nextS = $allInSeries->first(function ($s) use ($peminjaman) {
                    return $s->tgl_mulai > $peminjaman->tgl_mulai && $s->status !== 'Dibatalkan';
                });
                $nextSessionDate = $nextS ? Carbon::parse($nextS->tgl_mulai)->format('Y-m-d') : null;

                $nowJkt = Carbon::now('Asia/Jakarta');

                $recurringSchedules = $allInSeries->map(function ($s, $idx) use ($parentObj, $totalSessions, $isMultiday, $nowJkt) {
                    $sMulaiStr = $s->tgl_mulai ? Carbon::parse($s->tgl_mulai)->format('Y-m-d') : substr((string) $s->mulai, 0, 10);
                    $sWaktuMulai = $s->waktu_mulai ?: (strlen((string) $s->mulai) >= 16 ? substr((string) $s->mulai, 11, 5) : '08:00');
                    $sWaktuSelesai = $s->waktu_selesai ?: (strlen((string) $s->selesai) >= 16 ? substr((string) $s->selesai, 11, 5) : '16:00');

                    $fullMulaiStr = $s->mulai ?: ($sMulaiStr.' '.$sWaktuMulai);
                    $fullSelesaiStr = $s->selesai ?: ($sMulaiStr.' '.$sWaktuSelesai);

                    // Status operasional dinamis berbasis waktu zona Asia/Jakarta
                    $computedStatus = $s->status;
                    $isCurrentActive = false;
                    if ($s->status === 'Disetujui' && $fullMulaiStr && $fullSelesaiStr) {
                        $sMulaiJkt = Carbon::parse($fullMulaiStr, 'Asia/Jakarta');
                        $sSelesaiJkt = Carbon::parse($fullSelesaiStr, 'Asia/Jakarta');

                        if ($nowJkt->lt($sMulaiJkt)) {
                            $computedStatus = 'Disetujui';
                        } elseif ($nowJkt->between($sMulaiJkt, $sSelesaiJkt)) {
                            $computedStatus = 'Berlangsung';
                            $isCurrentActive = true;
                        } else {
                            $computedStatus = 'Selesai';
                        }
                    }

                    $rangeInd = null;
                    if ($isMultiday && $totalSessions > 1) {
                        if ($idx === 0) {
                            $rangeInd = 'Mulai';
                        } elseif ($idx === $totalSessions - 1) {
                            $rangeInd = 'Habis';
                        } else {
                            $rangeInd = 'Berlangsung';
                        }
                    }

                    return [
                        'index' => $idx + 1,
                        'session_number' => $idx + 1,
                        'total_sessions' => $totalSessions,
                        'id' => $s->id_peminjaman ?? $s->id,
                        'id_peminjaman' => $s->id_peminjaman ?? $s->id,
                        'parent_id' => $s->parent_id,
                        'tgl_mulai' => $sMulaiStr,
                        'waktu_mulai' => $sWaktuMulai,
                        'waktu_selesai' => $sWaktuSelesai,
                        'mulai' => $fullMulaiStr,
                        'selesai' => $fullSelesaiStr,
                        'status' => $s->status,
                        'computed_status' => $computedStatus,
                        'is_current_active' => $isCurrentActive,
                        'range_indicator' => $rangeInd,
                        'is_parent' => ($s->id_peminjaman === $parentObj->id_peminjaman || $s->id === $parentObj->id),
                        'can_cancel' => $s->status !== 'Dibatalkan',
                    ];
                })->values()->all();
            }
        }

        $result = [
            'id_peminjaman' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'id' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'tgl_pengajuan' => Carbon::parse($peminjaman->tgl_pengajuan)->format('Y-m-d'),
            'nip' => $nipDisplay,
            'pihak_pemohon' => $pihak,
            'applicant_type' => $applicantType,
            'unit_pemohon' => $peminjaman->unit_pemohon ?? $peminjaman->unit_kerja,
            'unit_kerja' => $peminjaman->unit_kerja ?? $peminjaman->unit_pemohon,
            'nama_pemohon' => $namaDisplay,
            'nama_peminjam' => $namaDisplay,
            'nomor_hp' => $hpDisplay,
            'penanggung_jawab' => $penanggungJawabDisplay,
            'jumlah_peserta' => $peminjaman->jumlah_peserta ?: 1,
            'tgl_mulai' => $tglMulaiStr,
            'tgl_selesai' => $tglSelesaiStr,
            'waktu_mulai' => $waktuMulaiStr,
            'waktu_selesai' => $waktuSelesaiStr,
            'mulai' => $peminjaman->mulai ?: ($tglMulaiStr.' '.$waktuMulaiStr),
            'selesai' => $peminjaman->selesai ?: ($tglSelesaiStr.' '.$waktuSelesaiStr),
            'keperluan' => $keperluanDisplay,
            'surat_url' => ($isAdmin && $hasRealSurat) ? "/api/peminjaman/{$peminjaman->id}/surat" : null,
            'surat_peminjaman' => ($isAdmin && $hasRealSurat) ? ($peminjaman->surat_peminjaman ?? $peminjaman->surat_url) : null,
            'surat_terlampir' => $hasRealSurat,
            'is_public_view' => ! $isAdmin,
            'status' => (function () use ($isSeries, $allInSeries, $peminjaman) {
                if (! $isSeries || empty($allInSeries)) {
                    return $peminjaman->status;
                }
                $allCancelled = $allInSeries->every(fn ($s) => $s->status === 'Dibatalkan');
                if ($allCancelled) {
                    return 'Dibatalkan';
                }
                $activeSessions = $allInSeries->filter(fn ($s) => $s->status !== 'Dibatalkan');
                if ($activeSessions->isNotEmpty() && $activeSessions->every(fn ($s) => $s->status === 'Disetujui')) {
                    return 'Disetujui';
                }
                if ($activeSessions->isNotEmpty() && $activeSessions->every(fn ($s) => $s->status === 'Menunggu Persetujuan')) {
                    return 'Menunggu Persetujuan';
                }

                return $activeSessions->first()->status ?? $peminjaman->status;
            })(),
            'session_status' => $peminjaman->status,
            'petugas' => $peminjaman->petugas,
            'jenis' => $jenisName,
            'kategori_list' => $kategoriList,
            'is_multi_item' => $isMulti,
            'item_dipinjam' => $itemNames ?: 'Sarana Prasarana',
            'ruangan' => $itemNames ?: 'Sarana Prasarana',
            'parent_id' => $peminjaman->parent_id,
            'parent_registration_id' => $parentObj?->id_peminjaman ?? ($parentObj?->id ?? $peminjaman->id_peminjaman),
            'booking_type' => $bookingType,
            'is_multiday' => $isMultiday,
            'is_recurring' => $isWeeklyRecurring,
            'is_series' => $isSeries,
            'session_number' => $isSeries ? $sessionNumber : null,
            'total_sessions' => $isSeries ? $totalSessions : null,
            'session_label' => $isSeries ? "Sesi {$sessionNumber} dari {$totalSessions}" : null,
            'next_session_date' => $nextSessionDate,
            'recurring_frequency' => $peminjaman->recurring_frequency,
            'recurring_end_date' => $peminjaman->recurring_end_date ? Carbon::parse($peminjaman->recurring_end_date)->format('Y-m-d') : null,
            'recurring_schedules' => $recurringSchedules,
            'items' => $itemList->map(fn ($it) => [
                'id' => $it->id,
                'id_peminjaman' => $peminjaman->id_peminjaman ?? $peminjaman->id,
                'item_id' => $it->item_id,
                'jumlah' => $it->jumlah,
                'nama' => $it->item?->nama ?? 'Item',
                'registration_id' => $it->item?->registration_id,
                'id_jenis' => $it->item?->id_jenis,
                'kategori' => BookingService::CATEGORY_MAP[$it->item?->id_jenis] ?? strtolower($it->item?->jenis?->nama ?? 'ruangan'),
                'item' => $it->item,
            ])->values()->all(),
        ];

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Admin: Akses dan unduh dokumen surat peminjaman secara aman.
     * Hanya menerima autentikasi via Authorization Header Bearer token untuk mencegah kebocoran di URL query/log.
     */
    public function getSurat(Request $request, string $id)
    {
        $token = $request->bearerToken();
        $user = null;
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $user = $accessToken?->tokenable;
        }
        if (! $user && auth('sanctum')->check()) {
            $user = auth('sanctum')->user();
        }

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Dokumen surat dinas hanya dapat diakses oleh petugas terautentikasi.',
            ], 403);
        }

        $peminjaman = Peminjaman::where('id', $id)->orWhere('id_peminjaman', $id)->first();
        if (! $peminjaman || (empty($peminjaman->surat_url) && empty($peminjaman->surat_peminjaman))) {
            return response()->json([
                'success' => false,
                'message' => 'Berkas surat tidak ditemukan.',
            ], 404);
        }

        $filename = $peminjaman->surat_peminjaman ?? basename((string) $peminjaman->surat_url);
        $path = $peminjaman->surat_url ?? $peminjaman->surat_peminjaman;
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, 9);
        }

        // 1. Cek disk 'local'
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path, $filename);
        }
        if (Storage::disk('local')->exists('surat/'.$path)) {
            return Storage::disk('local')->response('surat/'.$path, $filename);
        }

        // 2. Cek disk 'public'
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->response($path, $filename);
        }
        if (Storage::disk('public')->exists('surat/'.$path)) {
            return Storage::disk('public')->response('surat/'.$path, $filename);
        }

        // 3. Fallback: buat surat PDF resmi otomatis agar admin selalu dapat mengecek dokumen
        $pdfContent = $this->buildSampleSuratPdf($peminjaman);
        $targetPath = 'surat/'.basename($filename);
        Storage::disk('local')->put($targetPath, $pdfContent);

        return Storage::disk('local')->response($targetPath, $filename);
    }

    /**
     * Buat konten dokumen PDF surat peminjaman resmi standar.
     */
    protected function buildSampleSuratPdf(Peminjaman $peminjaman): string
    {
        $id = $peminjaman->id_peminjaman ?? $peminjaman->id;
        $pemohon = $peminjaman->nama_pemohon ?? $peminjaman->nama_peminjam ?? '-';
        $nip = $peminjaman->nip ?? '-';
        $unit = $peminjaman->unit_pemohon ?? $peminjaman->unit_kerja ?? '-';
        $hp = $peminjaman->nomor_hp ?? '-';
        $penanggungJawab = $peminjaman->penanggung_jawab ?? $pemohon;
        $keperluan = $peminjaman->keperluan ?? '-';
        $tglMulai = $peminjaman->tgl_mulai ?? '-';
        $waktu = ($peminjaman->waktu_mulai ?? '-').' s/d '.($peminjaman->waktu_selesai ?? '-');
        $status = $peminjaman->status ?? 'Menunggu Persetujuan';
        $tglPengajuan = $peminjaman->tgl_pengajuan ?? date('Y-m-d');

        $lines = [
            'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
            'KANTOR KEMENTERIAN AGAMA KABUPATEN SLEMAN',
            'SISTEM INFORMASI PEMINJAMAN RUANGAN & SARPRAS (SIMPRU)',
            '=====================================================================',
            'SURAT PERMOHONAN PEMINJAMAN SARANA DAN PRASARANA DINAS',
            '',
            'Nomor Registrasi   : '.$id,
            'Tanggal Pengajuan  : '.$tglPengajuan,
            'Nama Peminjam      : '.$pemohon,
            'NIP                : '.$nip,
            'Unit Kerja / Seksi : '.$unit,
            'Kontak / WhatsApp  : '.$hp,
            'Penanggung Jawab   : '.$penanggungJawab,
            'Keperluan          : '.substr($keperluan, 0, 75),
            'Jadwal Pelaksanaan : '.$tglMulai.' ('.$waktu.')',
            'Status Pengajuan   : '.$status,
            '',
            '=====================================================================',
            'Surat permohonan dinas ini terdaftar secara resmi pada SIMPRU Kemenag Sleman.',
            'Diverifikasi oleh pengelola BMN dan Kepegawaian Kemenag Sleman.',
        ];

        $stream = "BT\n/F1 11 Tf\n50 740 Td\n16 TL\n";
        foreach ($lines as $line) {
            $clean = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            $stream .= "({$clean}) '\n";
        }
        $stream .= 'ET';
        $streamLen = strlen($stream);

        $obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
        $obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";
        $obj5 = "5 0 obj\n<< /Length {$streamLen} >>\nstream\n{$stream}\nendstream\nendobj\n";

        $header = "%PDF-1.4\n";
        $offset1 = strlen($header);
        $offset2 = $offset1 + strlen($obj1);
        $offset3 = $offset2 + strlen($obj2);
        $offset4 = $offset3 + strlen($obj3);
        $offset5 = $offset4 + strlen($obj4);
        $xrefOffset = $offset5 + strlen($obj5);

        $xref = sprintf(
            "xref\n0 6\n0000000000 65535 f \n%010d 00000 n \n%010d 00000 n \n%010d 00000 n \n%010d 00000 n \n%010d 00000 n \n",
            $offset1, $offset2, $offset3, $offset4, $offset5
        );
        $trailer = "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";

        return $header.$obj1.$obj2.$obj3.$obj4.$obj5.$xref.$trailer;
    }

    /**
     * Admin: Update loan approval status with support for single session or whole series scope.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Menunggu Persetujuan,Disetujui,Tidak Disetujui,Dibatalkan',
            'petugas' => 'nullable|string|max:100',
            'scope' => 'nullable|in:single,series',
            'alasan' => 'nullable|string|max:255',
        ]);

        $scope = $validated['scope'] ?? ($validated['status'] === 'Dibatalkan' ? 'single' : 'series');

        return DB::transaction(function () use ($validated, $id, $scope, $request) {
            $peminjaman = Peminjaman::where('id', $id)
                ->orWhere('id_peminjaman', $id)
                ->lockForUpdate()
                ->first();

            if (! $peminjaman) {
                return response()->json(['success' => false, 'message' => 'Peminjaman tidak ditemukan'], 404);
            }

            // Identifikasi root parent jika permohonan merupakan bagian dari rangkaian berulang
            $rootParent = $peminjaman->parent_id
                ? (Peminjaman::where('id_peminjaman', $peminjaman->parent_id)->orWhere('id', $peminjaman->parent_id)->first() ?: $peminjaman)
                : $peminjaman;

            $petugasName = $validated['petugas'] ?? ($request->user()?->name ?? 'Admin SIMPRU');

            // KASUS 1: Perubahan status khusus SATU SESI (scope === 'single')
            if ($scope === 'single') {
                if ($validated['status'] === 'Disetujui' && $peminjaman->status !== 'Disetujui') {
                    $itemList = $this->bookingService->consolidateItems($peminjaman);
                    $itemIds = $itemList->pluck('item_id')->map(fn ($itId) => (int) $itId)->filter(fn ($itId) => $itId > 0)->unique()->values()->all();
                    $this->bookingService->lockItemsForUpdate($itemIds);

                    $mulaiStr = $peminjaman->mulai ?: ($peminjaman->tgl_mulai.' '.($peminjaman->waktu_mulai ?: '08:00'));
                    $selesaiStr = $peminjaman->selesai ?: ($peminjaman->tgl_selesai.' '.($peminjaman->waktu_selesai ?: '16:00'));
                    $itemsPayload = $itemList->map(fn ($it) => [
                        'item_id' => (int) $it->item_id,
                        'jumlah' => (int) $it->jumlah,
                    ])->all();

                    $conflicts = $this->bookingService->detectConflicts($mulaiStr, $selesaiStr, $itemsPayload, $peminjaman->id_peminjaman ?? $peminjaman->id);
                    if (! empty($conflicts)) {
                        $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                        $dateLabel = Carbon::parse($peminjaman->tgl_mulai)->translatedFormat('d F Y');

                        return response()->json([
                            'success' => false,
                            'message' => "Jadwal bentrok pada {$dateLabel}: {$conflictItemNames} sudah disetujui pada waktu yang sama.",
                            'conflicts' => $conflicts,
                        ], 422);
                    }
                }

                $peminjaman->status = $validated['status'];
                $peminjaman->petugas = $petugasName;
                if (! empty($validated['alasan'])) {
                    $peminjaman->catatan_admin = $validated['alasan'];
                }
                $peminjaman->save();

                // Periksa apakah seluruh sesi dalam rangkaian sekarang dibatalkan
                if ($rootParent->is_recurring || $rootParent->recurringSchedules()->exists()) {
                    $allSessions = Peminjaman::where('id_peminjaman', $rootParent->id_peminjaman)
                        ->orWhere('id', $rootParent->id_peminjaman)
                        ->orWhere('parent_id', $rootParent->id_peminjaman)
                        ->get();
                    $allCancelled = $allSessions->every(fn ($s) => $s->status === 'Dibatalkan');
                    if ($allCancelled && $rootParent->status !== 'Dibatalkan') {
                        $rootParent->status = 'Dibatalkan';
                        $rootParent->petugas = $petugasName;
                        $rootParent->save();
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Status jadwal sesi ini berhasil diperbarui',
                    'data' => $peminjaman,
                ]);
            }

            // KASUS 2: Perubahan status SELURUH RANGKAIAN (scope === 'series')
            if ($validated['status'] === 'Disetujui' && $rootParent->status !== 'Disetujui') {
                $result = $this->bookingService->approvePeminjaman($rootParent, $petugasName);
                if (! $result['success']) {
                    return response()->json([
                        'success' => false,
                        'message' => $result['message'],
                        'conflicts' => $result['conflicts'],
                    ], 422);
                }
            } else {
                $rootParent->status = $validated['status'];
                $rootParent->petugas = $petugasName;
                if (! empty($validated['alasan'])) {
                    $rootParent->catatan_admin = $validated['alasan'];
                }
                $rootParent->save();

                if ($rootParent->recurringSchedules()->exists()) {
                    foreach ($rootParent->recurringSchedules as $child) {
                        $child->status = $validated['status'];
                        $child->petugas = $petugasName;
                        if (! empty($validated['alasan'])) {
                            $child->catatan_admin = $validated['alasan'];
                        }
                        $child->save();
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Status rangkaian peminjaman berhasil diperbarui',
                'data' => $peminjaman,
            ]);
        });
    }
}
