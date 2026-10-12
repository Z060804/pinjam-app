<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterJenis extends Model
{
    use HasFactory;

    protected $table = 'master_jenis';

    protected $fillable = [
        'nama',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ItemJenis::class, 'id_jenis');
    }
}
