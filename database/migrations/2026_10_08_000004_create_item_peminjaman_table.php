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
        if (!Schema::hasTable('item_peminjaman')) {
            Schema::create('item_peminjaman', function (Blueprint $table) {
                $table->id();
                $table->string('id_peminjaman', 50);
                $table->foreignId('item_id')->constrained('item_jenis')->cascadeOnDelete();
                $table->integer('jumlah');
                $table->timestamps();

                $table->foreign('id_peminjaman')
                      ->references('id_peminjaman')
                      ->on('peminjaman')
                      ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_peminjaman');
    }
};
