<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemPeminjaman extends Model
{
    use HasFactory;

    protected $table = 'item_peminjaman';

    protected $fillable = [
        'id_peminjaman',
        'item_id',
        'jumlah',
    ];

    protected $casts = [
        'jumlah' => 'integer',
    ];

    public function peminjaman(): BelongsTo
    {
        return $this->belongsTo(Peminjaman::class, 'id_peminjaman', 'id_peminjaman');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(ItemJenis::class, 'item_id');
    }
}
