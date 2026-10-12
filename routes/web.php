<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Admin routes – React handles internal navigation
Route::get('/admin', function () {
    return view('admin');
});

Route::get('/admin/{any}', function () {
    return view('admin');
})->where('any', '.*');
