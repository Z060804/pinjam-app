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
        if (Schema::hasTable('peminjaman')) {
            Schema::table('peminjaman', function (Blueprint $table) {
                if (! Schema::hasColumn('peminjaman', 'booking_type')) {
                    $table->string('booking_type', 20)->default('single')->after('is_recurring');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('peminjaman')) {
            Schema::table('peminjaman', function (Blueprint $table) {
                if (Schema::hasColumn('peminjaman', 'booking_type')) {
                    $table->dropColumn('booking_type');
                }
            });
        }
    }
};
