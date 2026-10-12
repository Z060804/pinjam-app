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
        if (!Schema::hasTable('peminjaman')) {
            Schema::create('peminjaman', function (Blueprint $table) {
                $table->string('id_peminjaman', 50)->primary();
                $table->date('tgl_pengajuan');
                $table->string('nip', 30);
                $table->string('nama_peminjam', 150);
                $table->string('unit_kerja', 150);
                $table->dateTime('mulai');
                $table->dateTime('selesai');
                $table->text('keperluan');
                $table->string('surat_peminjaman', 255)->nullable();
                $table->string('status', 30);
                $table->string('petugas', 150)->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('peminjaman');
    }
};
