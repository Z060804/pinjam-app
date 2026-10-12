<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeminjamanItem extends Model
{
    protected $table = 'peminjaman_items';

    protected $fillable = [
        'peminjaman_id',
        'item_id',
        'jumlah',
    ];

    protected $casts = [
        'jumlah' => 'integer',
    ];

    public function peminjaman(): BelongsTo
    {
        return $this->belongsTo(Peminjaman::class, 'peminjaman_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(ItemJenis::class, 'item_id');
    }
}
