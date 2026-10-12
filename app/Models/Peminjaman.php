<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Peminjaman extends Model
{
    protected $table = 'peminjaman';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tgl_pengajuan',
        'nip',
        'nama_pemohon',
        'unit_pemohon',
        'pihak_pemohon',
        'nomor_hp',
        'penanggung_jawab',
        'jumlah_peserta',
        'tgl_mulai',
        'tgl_selesai',
        'waktu_mulai',
        'waktu_selesai',
        'keperluan',
        'surat_url',
        'status',
        'petugas',
        'catatan_admin',
    ];

    protected $casts = [
        'tgl_pengajuan' => 'date:Y-m-d',
        'tgl_mulai' => 'date:Y-m-d',
        'tgl_selesai' => 'date:Y-m-d',
        'jumlah_peserta' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PeminjamanItem::class, 'peminjaman_id');
    }
}
