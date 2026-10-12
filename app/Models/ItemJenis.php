<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemJenis extends Model
{
    use HasFactory;

    protected $table = 'item_jenis';

    protected $fillable = [
        'id_jenis',
        'nama',
        'is_active',
        'registration_id',
        'quantity',
        'kapasitas',
        'fasilitas',
        'keterangan',
        'image_url',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'quantity' => 'integer',
        'kapasitas' => 'integer',
    ];

    public function jenis(): BelongsTo
    {
        return $this->belongsTo(MasterJenis::class, 'id_jenis');
    }

    public function peminjamanItems(): HasMany
    {
        return $this->hasMany(PeminjamanItem::class, 'item_id');
    }

    public function itemPeminjaman(): HasMany
    {
        return $this->hasMany(ItemPeminjaman::class, 'item_id');
    }
}
