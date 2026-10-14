<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes for SIMPRU (Peminjaman Ruang, Kendaraan, dan Alat Terpadu)
|--------------------------------------------------------------------------
| Both public borrower portal and admin portal operate as SPAs.
| Direct URL visits and refreshes are directed to their corresponding
| Blade views, excluding any backend /api/... endpoints.
|--------------------------------------------------------------------------
*/

// Admin Portal routes – Serves resources/views/admin.blade.php
Route::get('/admin', function () {
    return view('admin');
});

Route::get('/admin/{any}', function () {
    return view('admin');
})->where('any', '.*');

// Borrower / Public Portal routes – Serves resources/views/welcome.blade.php
Route::get('/', function () {
    return view('welcome');
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!api|admin).*$');
