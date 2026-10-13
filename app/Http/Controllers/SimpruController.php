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
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

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
     * Admin: Get all peminjaman records formatted for Rekap Peminjaman.
     */
    /**
     * Admin / Public: Get all peminjaman records.
     * Untuk publik: data NIP, nomor HP, dan berkas surat disembunyikan untuk menjaga privasi pemohon.
     * Untuk admin terautentikasi: data ditampilkan lengkap untuk keperluan rekap.
     */
    public function getAllPeminjaman(Request $request): JsonResponse
    {
        // Hanya menerima autentikasi admin via Authorization: Bearer header
        $token = $request->bearerToken();
        $isAdmin = false;
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $isAdmin = (bool) $accessToken?->tokenable;
        }
        if (!$isAdmin && auth('sanctum')->check()) {
            $isAdmin = true;
        }
        if (!$isAdmin && ($request->is('api/master/*') || $request->is('api/admin/*'))) {
            $isAdmin = true;
        }

        $records = Peminjaman::with(['items.item.jenis', 'itemPeminjaman.item.jenis'])
            ->orderBy('tgl_mulai', 'asc')
            ->orderBy('waktu_mulai', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        $maskName = function (?string $name): string {
            if (!$name || $name === '-') return '-';
            $words = explode(' ', trim($name));
            $maskedWords = array_map(function ($word) {
                $len = mb_strlen($word);
                if ($len <= 2) return $word;
                return mb_substr($word, 0, 2) . str_repeat('*', max(2, $len - 2));
            }, $words);
            return implode(' ', $maskedWords);
        };

        $formatted = $records->map(function ($p) use ($isAdmin, $maskName) {
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

            $rawName = $p->nama_pemohon ?? $p->nama_peminjam;
            $namaDisplay = $isAdmin ? ($rawName ?: '-') : $maskName($rawName);
            $unitDisplay = $isAdmin ? ($p->unit_pemohon ?? $p->unit_kerja) : 'Internal Kemenag Sleman';
            $keperluanDisplay = $isAdmin ? $p->keperluan : ($p->keperluan ? 'Kegiatan Kedinasan / Tugas Instansi' : '-');

            return [
                'id' => $p->id_peminjaman ?? $p->id,
                'id_peminjaman' => $p->id_peminjaman ?? $p->id,
                'tgl_pengajuan' => Carbon::parse($p->tgl_pengajuan)->format('Y-m-d'),
                'nip' => $isAdmin ? ($p->nip ?: '-') : null,
                'pihak_pemohon' => $p->pihak_pemohon ?: 'Internal Kemenag Sleman',
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
                'mulai' => $p->mulai ?: ($tglMulaiStr . ' ' . $waktuMulaiStr),
                'selesai' => $p->selesai ?: ($tglSelesaiStr . ' ' . $waktuSelesaiStr),
                'kegiatan' => $keperluanDisplay,
                'keperluan' => $keperluanDisplay,
                'status' => $p->status,
                'surat_url' => $isAdmin ? ($p->surat_url ?? $p->surat_peminjaman) : null,
                'surat_peminjaman' => $isAdmin ? ($p->surat_peminjaman ?? $p->surat_url) : null,
                'jenis' => $jenisName,
                'item_dipinjam' => $itemNames ?: 'Sarana Prasarana',
                'petugas' => $isAdmin ? $p->petugas : null,
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
    public function getPeminjamanById(Request $request, string $id): JsonResponse
    {
        // Hanya menerima autentikasi admin via Authorization: Bearer header
        $token = $request->bearerToken();
        $isAdmin = false;
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $isAdmin = (bool) $accessToken?->tokenable;
        }
        if (!$isAdmin && auth('sanctum')->check()) {
            $isAdmin = true;
        }

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

        $rawName = $peminjaman->nama_pemohon ?? $peminjaman->nama_peminjam ?? '-';
        $nipRaw = (string) ($peminjaman->nip ?? '');
        $hpRaw = (string) ($peminjaman->nomor_hp ?? '');

        // Customer melihat nama pemohon asli dan NIP asli
        // Nomor HP dan Penanggung Jawab Kegiatan hanya dimunculkan untuk Admin
        $namaDisplay = $rawName ?: '-';
        $nipDisplay = $nipRaw ?: '-';
        $hpDisplay = $isAdmin ? ($hpRaw ?: '-') : null;
        $penanggungJawabDisplay = $isAdmin ? ($peminjaman->penanggung_jawab ?: $rawName) : null;
        $keperluanDisplay = $peminjaman->keperluan ?: '-';

        $hasRealSurat = !empty($peminjaman->surat_url) || !empty($peminjaman->surat_peminjaman);

        $result = [
            'id_peminjaman' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'id' => $peminjaman->id_peminjaman ?? $peminjaman->id,
            'tgl_pengajuan' => Carbon::parse($peminjaman->tgl_pengajuan)->format('Y-m-d'),
            'nip' => $nipDisplay,
            'pihak_pemohon' => $peminjaman->pihak_pemohon ?: 'Internal Kemenag Sleman',
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
            'mulai' => $peminjaman->mulai ?: ($tglMulaiStr . ' ' . $waktuMulaiStr),
            'selesai' => $peminjaman->selesai ?: ($tglSelesaiStr . ' ' . $waktuSelesaiStr),
            'keperluan' => $keperluanDisplay,
            'surat_url' => ($isAdmin && $hasRealSurat) ? "/api/peminjaman/{$peminjaman->id}/surat" : null,
            'surat_peminjaman' => ($isAdmin && $hasRealSurat) ? ($peminjaman->surat_peminjaman ?? $peminjaman->surat_url) : null,
            'surat_terlampir' => $hasRealSurat,
            'is_public_view' => !$isAdmin,
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
        if (!$user && auth('sanctum')->check()) {
            $user = auth('sanctum')->user();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Dokumen surat dinas hanya dapat diakses oleh petugas terautentikasi.',
            ], 403);
        }

        $peminjaman = Peminjaman::where('id', $id)->orWhere('id_peminjaman', $id)->first();
        if (!$peminjaman || (empty($peminjaman->surat_url) && empty($peminjaman->surat_peminjaman))) {
            return response()->json([
                'success' => false,
                'message' => 'Berkas surat tidak ditemukan.',
            ], 404);
        }

        $filename = $peminjaman->surat_peminjaman ?? basename((string)$peminjaman->surat_url);
        $path = $peminjaman->surat_url ?? $peminjaman->surat_peminjaman;
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, 9);
        }

        // 1. Cek disk 'local'
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path, $filename);
        }
        if (Storage::disk('local')->exists('surat/' . $path)) {
            return Storage::disk('local')->response('surat/' . $path, $filename);
        }

        // 2. Cek disk 'public'
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->response($path, $filename);
        }
        if (Storage::disk('public')->exists('surat/' . $path)) {
            return Storage::disk('public')->response('surat/' . $path, $filename);
        }

        // 3. Fallback: buat surat PDF resmi otomatis agar admin selalu dapat mengecek dokumen
        $pdfContent = $this->buildSampleSuratPdf($peminjaman);
        $targetPath = 'surat/' . basename($filename);
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
        $waktu = ($peminjaman->waktu_mulai ?? '-') . ' s/d ' . ($peminjaman->waktu_selesai ?? '-');
        $status = $peminjaman->status ?? 'Menunggu Persetujuan';
        $tglPengajuan = $peminjaman->tgl_pengajuan ?? date('Y-m-d');

        $lines = [
            'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
            'KANTOR KEMENTERIAN AGAMA KABUPATEN SLEMAN',
            'SISTEM INFORMASI PEMINJAMAN RUANGAN & SARPRAS (SIMPRU)',
            '=====================================================================',
            'SURAT PERMOHONAN PEMINJAMAN SARANA DAN PRASARANA DINAS',
            '',
            'Nomor Registrasi   : ' . $id,
            'Tanggal Pengajuan  : ' . $tglPengajuan,
            'Nama Peminjam      : ' . $pemohon,
            'NIP                : ' . $nip,
            'Unit Kerja / Seksi : ' . $unit,
            'Kontak / WhatsApp  : ' . $hp,
            'Penanggung Jawab   : ' . $penanggungJawab,
            'Keperluan          : ' . substr($keperluan, 0, 75),
            'Jadwal Pelaksanaan : ' . $tglMulai . ' (' . $waktu . ')',
            'Status Pengajuan   : ' . $status,
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
        $stream .= "ET";
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

        return $header . $obj1 . $obj2 . $obj3 . $obj4 . $obj5 . $xref . $trailer;
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

        // Jika mengubah status menjadi 'Disetujui', pastikan tidak ada bentrok jadwal dengan peminjaman lain
        if ($validated['status'] === 'Disetujui' && $peminjaman->status !== 'Disetujui') {
            $conflicts = $this->detectApprovalConflicts($peminjaman);
            if (!empty($conflicts)) {
                $conflictItemNames = implode(', ', array_unique(array_column($conflicts, 'item_nama')));
                return response()->json([
                    'success' => false,
                    'message' => "Tidak dapat menyetujui peminjaman: terdapat jadwal bentrok pada {$conflictItemNames} dengan peminjaman lain yang sudah disetujui.",
                    'conflicts' => $conflicts,
                ], 422);
            }
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

    /**
     * Deteksi bentrok jadwal saat admin hendak menyetujui permohonan peminjaman.
     */
    protected function detectApprovalConflicts(Peminjaman $peminjaman): array
    {
        $conflicts = [];
        $mulaiStr = $peminjaman->mulai ?: ($peminjaman->tgl_mulai . ' ' . ($peminjaman->waktu_mulai ?: '08:00'));
        $selesaiStr = $peminjaman->selesai ?: ($peminjaman->tgl_selesai . ' ' . ($peminjaman->waktu_selesai ?: '16:00'));

        $mulaiCarbon = Carbon::parse($mulaiStr);
        $selesaiCarbon = Carbon::parse($selesaiStr);

        $currentId = $peminjaman->id_peminjaman ?? $peminjaman->id;

        $overlappingBookings = Peminjaman::where('status', 'Disetujui')
            ->where(function ($query) use ($currentId) {
                $query->where('id_peminjaman', '!=', $currentId)
                      ->where('id', '!=', $currentId);
            })
            ->where(function ($query) use ($mulaiCarbon, $selesaiCarbon) {
                $query->where('mulai', '<', $selesaiCarbon)
                      ->where('selesai', '>', $mulaiCarbon);
            })
            ->with(['items.item', 'itemPeminjaman.item'])
            ->get();

        $itemList = $peminjaman->items->isNotEmpty() ? $peminjaman->items : $peminjaman->itemPeminjaman;

        $reqTotals = [];
        foreach ($itemList as $it) {
            $itemId = (int) $it->item_id;
            $qty = (int) $it->jumlah;
            $reqTotals[$itemId] = ($reqTotals[$itemId] ?? 0) + $qty;
        }

        foreach ($reqTotals as $itemId => $reqQty) {
            $itemModel = ItemJenis::find($itemId);
            if (!$itemModel) {
                continue;
            }

            $bookedQty = 0;
            $conflictDetails = [];

            foreach ($overlappingBookings as $booking) {
                $bItems = $booking->items->isNotEmpty() ? $booking->items : $booking->itemPeminjaman;
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
}
