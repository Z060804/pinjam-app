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
        // 1. Master Jenis
        if (!Schema::hasTable('master_jenis')) {
            Schema::create('master_jenis', function (Blueprint $table) {
                $table->id();
                $table->string('nama');
                $table->timestamps();
            });
        }

        // 2. Item Jenis
        if (!Schema::hasTable('item_jenis')) {
            Schema::create('item_jenis', function (Blueprint $table) {
                $table->id();
                $table->foreignId('id_jenis')->constrained('master_jenis')->cascadeOnDelete();
                $table->string('nama');
                $table->boolean('is_active')->default(true);
                $table->string('registration_id')->nullable();
                $table->integer('quantity')->default(1);
                $table->integer('kapasitas')->nullable();
                $table->text('fasilitas')->nullable();
                $table->text('keterangan')->nullable();
                $table->string('image_url')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('item_jenis', function (Blueprint $table) {
                if (!Schema::hasColumn('item_jenis', 'kapasitas')) {
                    $table->integer('kapasitas')->nullable();
                }
                if (!Schema::hasColumn('item_jenis', 'fasilitas')) {
                    $table->text('fasilitas')->nullable();
                }
            });
        }

        // 3. Peminjaman
        if (!Schema::hasTable('peminjaman')) {
            Schema::create('peminjaman', function (Blueprint $table) {
                $table->string('id_peminjaman', 50)->primary();
                $table->string('id', 50)->nullable();
                $table->date('tgl_pengajuan');
                $table->string('nip')->nullable();
                $table->string('nama_pemohon')->nullable();
                $table->string('nama_peminjam')->nullable();
                $table->string('unit_pemohon')->nullable();
                $table->string('unit_kerja')->nullable();
                $table->string('pihak_pemohon')->nullable()->default('Internal Kemenag Sleman');
                $table->string('nomor_hp')->nullable();
                $table->string('penanggung_jawab')->nullable();
                $table->integer('jumlah_peserta')->default(1);
                $table->date('tgl_mulai')->nullable();
                $table->date('tgl_selesai')->nullable();
                $table->string('waktu_mulai')->nullable()->default('08:00');
                $table->string('waktu_selesai')->nullable()->default('16:00');
                $table->dateTime('mulai')->nullable();
                $table->dateTime('selesai')->nullable();
                $table->text('keperluan');
                $table->string('surat_url')->nullable();
                $table->string('surat_peminjaman')->nullable();
                $table->string('status')->default('Menunggu Persetujuan');
                $table->string('petugas')->nullable();
                $table->text('catatan_admin')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('peminjaman', function (Blueprint $table) {
                if (!Schema::hasColumn('peminjaman', 'id')) {
                    $table->string('id', 50)->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'id_peminjaman')) {
                    $table->string('id_peminjaman', 50)->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'nama_pemohon')) {
                    $table->string('nama_pemohon')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'nama_peminjam')) {
                    $table->string('nama_peminjam')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'unit_pemohon')) {
                    $table->string('unit_pemohon')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'unit_kerja')) {
                    $table->string('unit_kerja')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'mulai')) {
                    $table->dateTime('mulai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'selesai')) {
                    $table->dateTime('selesai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'pihak_pemohon')) {
                    $table->string('pihak_pemohon')->nullable()->default('Internal Kemenag Sleman');
                }
                if (!Schema::hasColumn('peminjaman', 'nomor_hp')) {
                    $table->string('nomor_hp')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'penanggung_jawab')) {
                    $table->string('penanggung_jawab')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'jumlah_peserta')) {
                    $table->integer('jumlah_peserta')->nullable()->default(1);
                }
                if (!Schema::hasColumn('peminjaman', 'tgl_mulai')) {
                    $table->date('tgl_mulai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'tgl_selesai')) {
                    $table->date('tgl_selesai')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'waktu_mulai')) {
                    $table->string('waktu_mulai')->nullable()->default('08:00');
                }
                if (!Schema::hasColumn('peminjaman', 'waktu_selesai')) {
                    $table->string('waktu_selesai')->nullable()->default('16:00');
                }
                if (!Schema::hasColumn('peminjaman', 'surat_url')) {
                    $table->string('surat_url')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'surat_peminjaman')) {
                    $table->string('surat_peminjaman')->nullable();
                }
                if (!Schema::hasColumn('peminjaman', 'catatan_admin')) {
                    $table->text('catatan_admin')->nullable();
                }
            });
        }

        // 4. Peminjaman Items
        if (!Schema::hasTable('peminjaman_items')) {
            Schema::create('peminjaman_items', function (Blueprint $table) {
                $table->id();
                $table->string('peminjaman_id')->nullable();
                $table->foreignId('item_id')->constrained('item_jenis')->cascadeOnDelete();
                $table->integer('jumlah')->default(1);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('peminjaman_items');
    }
};
