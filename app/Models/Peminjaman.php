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
        'id',
        'id_peminjaman',
        'tgl_pengajuan',
        'nip',
        'nama_pemohon',
        'nama_peminjam',
        'unit_pemohon',
        'unit_kerja',
        'pihak_pemohon',
        'nomor_hp',
        'penanggung_jawab',
        'jumlah_peserta',
        'tgl_mulai',
        'tgl_selesai',
        'waktu_mulai',
        'waktu_selesai',
        'mulai',
        'selesai',
        'keperluan',
        'surat_url',
        'surat_peminjaman',
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

    protected static function booted()
    {
        static::saving(function ($model) {
            $id = $model->attributes['id'] ?? $model->attributes['id_peminjaman'] ?? null;
            if ($id) {
                $model->attributes['id'] = $id;
                $model->attributes['id_peminjaman'] = $id;
            }

            $nama = $model->attributes['nama_pemohon'] ?? $model->attributes['nama_peminjam'] ?? null;
            if ($nama) {
                $model->attributes['nama_pemohon'] = $nama;
                $model->attributes['nama_peminjam'] = $nama;
            }

            $unit = $model->attributes['unit_pemohon'] ?? $model->attributes['unit_kerja'] ?? null;
            if ($unit) {
                $model->attributes['unit_pemohon'] = $unit;
                $model->attributes['unit_kerja'] = $unit;
            }

            $surat = $model->attributes['surat_url'] ?? $model->attributes['surat_peminjaman'] ?? null;
            if ($surat) {
                $model->attributes['surat_url'] = $surat;
                $model->attributes['surat_peminjaman'] = $surat;
            }

            if (empty($model->attributes['mulai']) && !empty($model->attributes['tgl_mulai'])) {
                $wkt = $model->attributes['waktu_mulai'] ?? '08:00';
                $model->attributes['mulai'] = $model->attributes['tgl_mulai'] . ' ' . (strlen($wkt) === 5 ? $wkt . ':00' : $wkt);
            }

            if (empty($model->attributes['selesai']) && !empty($model->attributes['tgl_selesai'])) {
                $wkt = $model->attributes['waktu_selesai'] ?? '16:00';
                $model->attributes['selesai'] = $model->attributes['tgl_selesai'] . ' ' . (strlen($wkt) === 5 ? $wkt . ':00' : $wkt);
            }

            if (empty($model->attributes['tgl_mulai']) && !empty($model->attributes['mulai'])) {
                $model->attributes['tgl_mulai'] = substr($model->attributes['mulai'], 0, 10);
                $model->attributes['waktu_mulai'] = substr($model->attributes['mulai'], 11, 5) ?: '08:00';
            }

            if (empty($model->attributes['tgl_selesai']) && !empty($model->attributes['selesai'])) {
                $model->attributes['tgl_selesai'] = substr($model->attributes['selesai'], 0, 10);
                $model->attributes['waktu_selesai'] = substr($model->attributes['selesai'], 11, 5) ?: '16:00';
            }
        });
    }

    // Accessors & Mutators for compatibility between schema variants
    public function getIdAttribute()
    {
        return $this->attributes['id_peminjaman'] ?? $this->attributes['id'] ?? null;
    }

    public function setIdAttribute($value)
    {
        $this->attributes['id'] = $value;
        $this->attributes['id_peminjaman'] = $value;
    }

    public function getIdPeminjamanAttribute()
    {
        return $this->attributes['id_peminjaman'] ?? $this->attributes['id'] ?? null;
    }

    public function setIdPeminjamanAttribute($value)
    {
        $this->attributes['id'] = $value;
        $this->attributes['id_peminjaman'] = $value;
    }

    public function getNamaPeminjamAttribute()
    {
        return $this->attributes['nama_peminjam'] ?? $this->attributes['nama_pemohon'] ?? null;
    }

    public function setNamaPeminjamAttribute($value)
    {
        $this->attributes['nama_peminjam'] = $value;
        $this->attributes['nama_pemohon'] = $value;
    }

    public function getNamaPemohonAttribute()
    {
        return $this->attributes['nama_pemohon'] ?? $this->attributes['nama_peminjam'] ?? null;
    }

    public function setNamaPemohonAttribute($value)
    {
        $this->attributes['nama_pemohon'] = $value;
        $this->attributes['nama_peminjam'] = $value;
    }

    public function getUnitKerjaAttribute()
    {
        return $this->attributes['unit_kerja'] ?? $this->attributes['unit_pemohon'] ?? null;
    }

    public function setUnitKerjaAttribute($value)
    {
        $this->attributes['unit_kerja'] = $value;
        $this->attributes['unit_pemohon'] = $value;
    }

    public function getUnitPemohonAttribute()
    {
        return $this->attributes['unit_pemohon'] ?? $this->attributes['unit_kerja'] ?? null;
    }

    public function setUnitPemohonAttribute($value)
    {
        $this->attributes['unit_pemohon'] = $value;
        $this->attributes['unit_kerja'] = $value;
    }

    public function getSuratPeminjamanAttribute()
    {
        return $this->attributes['surat_peminjaman'] ?? $this->attributes['surat_url'] ?? null;
    }

    public function setSuratPeminjamanAttribute($value)
    {
        $this->attributes['surat_peminjaman'] = $value;
        $this->attributes['surat_url'] = $value;
    }

    public function getSuratUrlAttribute()
    {
        return $this->attributes['surat_url'] ?? $this->attributes['surat_peminjaman'] ?? null;
    }

    public function setSuratUrlAttribute($value)
    {
        $this->attributes['surat_url'] = $value;
        $this->attributes['surat_peminjaman'] = $value;
    }

    public function getMulaiAttribute()
    {
        if (isset($this->attributes['mulai'])) {
            return $this->attributes['mulai'];
        }
        $tgl = $this->attributes['tgl_mulai'] ?? '';
        $wkt = $this->attributes['waktu_mulai'] ?? '08:00';
        return trim("{$tgl} {$wkt}");
    }

    public function getSelesaiAttribute()
    {
        if (isset($this->attributes['selesai'])) {
            return $this->attributes['selesai'];
        }
        $tgl = $this->attributes['tgl_selesai'] ?? '';
        $wkt = $this->attributes['waktu_selesai'] ?? '16:00';
        return trim("{$tgl} {$wkt}");
    }

    public function items(): HasMany
    {
        return $this->hasMany(PeminjamanItem::class, 'peminjaman_id', 'id_peminjaman');
    }

    public function itemPeminjaman(): HasMany
    {
        return $this->hasMany(ItemPeminjaman::class, 'id_peminjaman', 'id_peminjaman');
    }
}
