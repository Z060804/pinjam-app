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
        // 1. Master Jenis (Kategori: Ruangan, Kendaraan, Perlengkapan)
        Schema::create('master_jenis', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->timestamps();
        });

        // 2. Item Jenis (Barang / Sarana Prasarana)
        Schema::create('item_jenis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_jenis')->constrained('master_jenis')->cascadeOnDelete();
            $table->string('nama');
            $table->boolean('is_active')->default(true);
            $table->string('registration_id')->nullable(); // BMN / Nopol / Kode Ruangan
            $table->integer('quantity')->default(1);
            $table->integer('kapasitas')->nullable();
            $table->text('fasilitas')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('image_url')->nullable();
            $table->timestamps();
        });

        // 3. Peminjaman (Data Pokok Permohonan Peminjaman)
        Schema::create('peminjaman', function (Blueprint $table) {
            $table->string('id')->primary(); // Kode tiket: PMJ-YYYYMM-XXX
            $table->date('tgl_pengajuan');
            $table->string('nip')->nullable();
            $table->string('nama_pemohon');
            $table->string('unit_pemohon');
            $table->string('pihak_pemohon')->default('Internal Kemenag Sleman');
            $table->string('nomor_hp')->nullable();
            $table->string('penanggung_jawab')->nullable();
            $table->integer('jumlah_peserta')->default(1);
            $table->date('tgl_mulai');
            $table->date('tgl_selesai');
            $table->string('waktu_mulai')->default('08:00');
            $table->string('waktu_selesai')->default('16:00');
            $table->text('keperluan');
            $table->string('surat_url')->nullable();
            $table->string('status')->default('Menunggu Persetujuan'); // Menunggu Persetujuan, Disetujui, Tidak Disetujui, Dibatalkan
            $table->string('petugas')->nullable();
            $table->text('catatan_admin')->nullable();
            $table->timestamps();
        });

        // 4. Peminjaman Items (Item-item yang dipinjam dalam satu permohonan)
        Schema::create('peminjaman_items', function (Blueprint $table) {
            $table->id();
            $table->string('peminjaman_id');
            $table->foreign('peminjaman_id')->references('id')->on('peminjaman')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('item_jenis')->cascadeOnDelete();
            $table->integer('jumlah')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('peminjaman_items');
        Schema::dropIfExists('peminjaman');
        Schema::dropIfExists('item_jenis');
        Schema::dropIfExists('master_jenis');
    }
};
