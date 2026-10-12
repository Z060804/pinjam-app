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
        Schema::create('item_jenis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_jenis')->constrained('master_jenis')->cascadeOnDelete();
            $table->string('nama', 150);
            $table->boolean('is_active')->default(true);
            $table->string('registration_id', 100)->nullable();
            $table->integer('quantity')->default(1);
            $table->string('image_url', 255)->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_jenis');
    }
};
