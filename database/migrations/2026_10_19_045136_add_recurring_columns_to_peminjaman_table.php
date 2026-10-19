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
                if (! Schema::hasColumn('peminjaman', 'parent_id')) {
                    $table->string('parent_id', 50)->nullable()->index()->after('id_peminjaman');
                }
                if (! Schema::hasColumn('peminjaman', 'is_recurring')) {
                    $table->boolean('is_recurring')->default(false)->after('status');
                }
                if (! Schema::hasColumn('peminjaman', 'recurring_frequency')) {
                    $table->string('recurring_frequency', 50)->nullable()->after('is_recurring');
                }
                if (! Schema::hasColumn('peminjaman', 'recurring_end_date')) {
                    $table->date('recurring_end_date')->nullable()->after('recurring_frequency');
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
                if (Schema::hasColumn('peminjaman', 'recurring_end_date')) {
                    $table->dropColumn('recurring_end_date');
                }
                if (Schema::hasColumn('peminjaman', 'recurring_frequency')) {
                    $table->dropColumn('recurring_frequency');
                }
                if (Schema::hasColumn('peminjaman', 'is_recurring')) {
                    $table->dropColumn('is_recurring');
                }
                if (Schema::hasColumn('peminjaman', 'parent_id')) {
                    $table->dropColumn('parent_id');
                }
            });
        }
    }
};
