import fs from 'node:fs';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        {
            name: 'clean-stale-hot',
            buildStart() {
                if (fs.existsSync('public/hot')) {
                    try {
                        fs.unlinkSync('public/hot');
                    } catch {}
                }
            },
        },
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/admin.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600, 700],
                }),
            ],
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
