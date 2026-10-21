<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('peminjaman') && Schema::hasColumn('peminjaman', 'nip')) {
            Schema::table('peminjaman', function (Blueprint $table) {
                $table->string('nip', 50)->nullable()->default(null)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('peminjaman') && Schema::hasColumn('peminjaman', 'nip')) {
            Schema::table('peminjaman', function (Blueprint $table) {
                $table->string('nip', 50)->nullable(false)->change();
            });
        }
    }
};
