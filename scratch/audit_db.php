<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Peminjaman;
use Illuminate\Contracts\Console\Kernel;

echo "=== RECORD PMJ-202610-006 ===\n";
$p = Peminjaman::with(['items.item', 'itemPeminjaman.item'])->where('id_peminjaman', 'PMJ-202610-006')->first();
if ($p) {
    echo 'ID: '.$p->id_peminjaman."\n";
    echo 'Nama: '.$p->nama_peminjam."\n";
    echo 'Pihak: '.$p->pihak_pemohon."\n";
    echo 'Mulai: '.$p->mulai."\n";
    echo 'Selesai: '.$p->selesai."\n";
    echo 'Tgl Mulai: '.$p->tgl_mulai.' s/d '.$p->tgl_selesai."\n";
    echo 'Waktu: '.$p->waktu_mulai.' - '.$p->waktu_selesai."\n";
    echo 'Status: '.$p->status."\n";
    echo "Items: \n";
    foreach ($p->items as $it) {
        echo "  - ID {$it->item_id}: ".($it->item->nama ?? 'Unknown')." (Qty: {$it->jumlah})\n";
    }
}

echo "\n=== SUNDAY RECORDS IN DATABASE ===\n";
$all = Peminjaman::with(['items.item'])->get();
foreach ($all as $item) {
    $tglM = $item->tgl_mulai ?: substr($item->mulai, 0, 10);
    $tglS = $item->tgl_selesai ?: substr($item->selesai, 0, 10);
    $dayM = date('l', strtotime($tglM));
    $dayS = date('l', strtotime($tglS));
    if ($dayM === 'Sunday' || $dayS === 'Sunday') {
        echo "ID: {$item->id_peminjaman} | {$tglM} ({$dayM}) - {$tglS} ({$dayS}) | Status: {$item->status} | Pemohon: {$item->pihak_pemohon} | Items: ".$item->items->pluck('item.nama')->join(', ')."\n";
    }
}
