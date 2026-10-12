<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Peminjaman extends Model
{
    use HasFactory;

    protected $table = 'peminjaman';
    protected $primaryKey = 'id_peminjaman';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id_peminjaman',
        'tgl_pengajuan',
        'nip',
        'nama_peminjam',
        'unit_kerja',
        'mulai',
        'selesai',
        'keperluan',
        'surat_peminjaman',
        'status',
        'petugas',
    ];

    protected $casts = [
        'tgl_pengajuan' => 'date',
        'mulai' => 'datetime',
        'selesai' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ItemPeminjaman::class, 'id_peminjaman', 'id_peminjaman');
    }
}
