<?php

use App\Http\Controllers\SimpruController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for SIMPRU (Peminjaman Ruangan & Sarpras Kemenag Sleman)
|--------------------------------------------------------------------------
*/

// Master Categories & Items
Route::get('/master/jenis', [SimpruController::class, 'getMasterJenis']);
Route::get('/item/jenis', [SimpruController::class, 'getItemJenis']);

// Admin Item Management
Route::post('/item/jenis', [SimpruController::class, 'storeItem']);
Route::put('/item/jenis/{id}', [SimpruController::class, 'updateItem']);
Route::patch('/item/jenis/{id}', [SimpruController::class, 'updateItem']);
Route::delete('/item/jenis/{id}', [SimpruController::class, 'deleteItem']);

// Peminjaman (Customer submission & tracking, Admin Rekap, Agenda Kalender)
Route::get('/peminjaman', [SimpruController::class, 'getAllPeminjaman']);
Route::get('/master/peminjaman', [SimpruController::class, 'getAllPeminjaman']);
Route::get('/peminjaman/{id}', [SimpruController::class, 'getPeminjamanById']);
Route::post('/peminjaman', [SimpruController::class, 'storePeminjaman']);
Route::patch('/peminjaman/{id}/status', [SimpruController::class, 'updateStatus']);
