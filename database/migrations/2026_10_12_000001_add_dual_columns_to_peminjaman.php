<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('peminjaman')) {
            Schema::table('peminjaman', function (Blueprint $table) {
                if (!Schema::hasColumn('peminjaman', 'id_peminjaman')) {
                    $table->string('id_peminjaman', 50)->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'nama_peminjam')) {
                    $table->string('nama_peminjam', 150)->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'unit_kerja')) {
                    $table->string('unit_kerja', 150)->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'mulai')) {
                    $table->dateTime('mulai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'selesai')) {
                    $table->dateTime('selesai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'surat_peminjaman')) {
                    $table->string('surat_peminjaman', 255)->nullable();
                }
            });

            // Backfill existing rows
            try {
                DB::statement("UPDATE peminjaman SET 
                    id_peminjaman = COALESCE(id_peminjaman, id),
                    nama_peminjam = COALESCE(nama_peminjam, nama_pemohon),
                    unit_kerja = COALESCE(unit_kerja, unit_pemohon),
                    mulai = COALESCE(mulai, tgl_mulai || ' ' || waktu_mulai || ':00'),
                    selesai = COALESCE(selesai, tgl_selesai || ' ' || waktu_selesai || ':00'),
                    surat_peminjaman = COALESCE(surat_peminjaman, surat_url)
                ");
                DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS idx_peminjaman_id_peminjaman ON peminjaman(id_peminjaman);");
            } catch (\Throwable $e) {
                // Ignore if update fails
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down needed
    }
};
