<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\PeminjamanController;
use App\Http\Controllers\SimpruController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for SIMPRU (Peminjaman Ruangan & Sarpras Kemenag Sleman)
|--------------------------------------------------------------------------
*/

// Admin Auth (Public Login)
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Master Categories & Items (Public Read)
Route::get('/master/jenis', [SimpruController::class, 'getMasterJenis']);
Route::get('/item/jenis', [SimpruController::class, 'getItemJenis']);

// Peminjaman (Public Customer submission & tracking, Agenda Kalender)
Route::get('/peminjaman', [SimpruController::class, 'getAllPeminjaman']);
Route::get('/item/peminjaman', [PeminjamanController::class, 'getItemPeminjaman']);
Route::get('/peminjaman/{id}', [SimpruController::class, 'getPeminjamanById']);
Route::get('/peminjaman/{id}/surat', [SimpruController::class, 'getSurat']);
Route::post('/peminjaman', [PeminjamanController::class, 'store']);

// Remote conflict check & operational rules (Public)
Route::post('/check-conflict', [PeminjamanController::class, 'checkConflict']);
Route::get('/operational-rules', [PeminjamanController::class, 'getOperationalRules']);

// Admin Protected Routes (Requires Bearer token from /api/admin/login)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    Route::get('/admin/me', [AdminAuthController::class, 'me']);

    // Admin Rekap Peminjaman
    Route::get('/master/peminjaman', [SimpruController::class, 'getAllPeminjaman']);
    Route::get('/admin/peminjaman', [SimpruController::class, 'getAllPeminjaman']);

    // Admin Item Management
    Route::post('/item/jenis', [SimpruController::class, 'storeItem']);
    Route::put('/item/jenis/{id}', [SimpruController::class, 'updateItem']);
    Route::patch('/item/jenis/{id}', [SimpruController::class, 'updateItem']);
    Route::delete('/item/jenis/{id}', [SimpruController::class, 'deleteItem']);

    // Admin Status Update
    Route::patch('/peminjaman/{id}/status', [SimpruController::class, 'updateStatus']);
});
