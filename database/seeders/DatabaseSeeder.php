<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (class_exists(SimpruSeeder::class)) {
            $this->call(SimpruSeeder::class);
        }
    }
}
