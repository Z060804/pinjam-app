<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PeminjamanController;

Route::get('/master/jenis', [PeminjamanController::class, 'getMasterJenis']);
Route::get('/item/jenis', [PeminjamanController::class, 'getItemJenis']);
Route::get('/master/peminjaman', [PeminjamanController::class, 'getAllPeminjaman']);
Route::get('/item/peminjaman', [PeminjamanController::class, 'getItemPeminjaman']);
Route::get('/peminjaman/{id}', [PeminjamanController::class, 'getPeminjamanById']);
Route::post('/check-conflict', [PeminjamanController::class, 'checkConflict']);
Route::post('/peminjaman', [PeminjamanController::class, 'store']);
