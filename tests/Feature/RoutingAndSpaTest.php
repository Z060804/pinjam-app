<?php

namespace Tests\Feature;

use Tests\TestCase;

class RoutingAndSpaTest extends TestCase
{
    /**
     * Test public customer portal routes serve welcome SPA view.
     */
    public function test_public_routes_serve_welcome_view(): void
    {
        $routes = [
            '/',
            '/ketersediaan',
            '/pengajuan',
            '/ajukan',
            '/pelacakan',
            '/pelacakan/PMJ-202610-001',
            '/ketersediaan?kategori=1',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertStatus(200);
            $response->assertViewIs('welcome');
            $response->assertSee('id="root"', false);
        }
    }

    /**
     * Test admin routes serve admin SPA view.
     */
    public function test_admin_routes_serve_admin_view(): void
    {
        $routes = [
            '/admin',
            '/admin/login',
            '/admin/rekap',
            '/admin/ruangan',
            '/admin/kendaraan',
            '/admin/perlengkapan',
            '/admin/master-data',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertStatus(200);
            $response->assertViewIs('admin');
            $response->assertSee('id="admin-root"', false);
        }
    }

    /**
     * Test that /api routes are NOT caught by the public fallback.
     */
    public function test_api_routes_are_not_caught_by_spa_fallback(): void
    {
        $response = $this->getJson('/api/nonexistent-route-xyz');
        $response->assertStatus(404);
        $this->assertStringNotContainsString('<div id="root">', (string) $response->getContent());
    }
}
