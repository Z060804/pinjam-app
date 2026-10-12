<?php

namespace Database\Seeders;

use App\Models\ItemJenis;
use App\Models\MasterJenis;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use Illuminate\Database\Seeder;

class SimpruSeeder extends Seeder
{
    /**
     * Seed initial clean data into database.
     */
    public function run(): void
    {
        // 1. Master Jenis
        $ruanganJenis = MasterJenis::updateOrCreate(['id' => 1], ['nama' => 'Ruangan']);
        $kendaraanJenis = MasterJenis::updateOrCreate(['id' => 2], ['nama' => 'Kendaraan']);
        $perlengkapanJenis = MasterJenis::updateOrCreate(['id' => 3], ['nama' => 'Perlengkapan']);

        // 2. Item Jenis
        $items = [
            // Ruangan
            [
                'id' => 1,
                'id_jenis' => 1,
                'nama' => 'Smartroom Balai Nikah & Manasik',
                'is_active' => true,
                'registration_id' => 'RNG-SR-01',
                'quantity' => 1,
                'kapasitas' => 30,
                'fasilitas' => 'AC, Proyektor, Sound System, WiFi',
                'keterangan' => 'Kapasitas 30 orang, Interactive Flat Panel, Video Conference Camera, AC',
                'image_url' => 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 2,
                'id_jenis' => 1,
                'nama' => 'Aula Lantai 3 (Sasana Budhaya)',
                'is_active' => true,
                'registration_id' => 'RNG-AULA-02',
                'quantity' => 1,
                'kapasitas' => 150,
                'fasilitas' => 'AC Standing, Panggung, Sound System, Podium',
                'keterangan' => 'Kapasitas 150 orang, Panggung, Sound System Lengkap, AC Standing',
                'image_url' => 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 3,
                'id_jenis' => 1,
                'nama' => 'Ruang Rapat Lt. 2',
                'is_active' => true,
                'registration_id' => 'RNG-LT2-03',
                'quantity' => 1,
                'kapasitas' => 40,
                'fasilitas' => 'AC, Whiteboard, Smart TV 75", Sound System',
                'keterangan' => 'Kapasitas 40 orang, dilengkapi AC, Whiteboard, Sound System, dan Smart TV 75 inch',
                'image_url' => 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 4,
                'id_jenis' => 1,
                'nama' => 'Ruang Multimedia',
                'is_active' => true,
                'registration_id' => 'RNG-MM-04',
                'quantity' => 1,
                'kapasitas' => 30,
                'fasilitas' => 'PC All-in-One, Proyektor Audio, Mixer & Mic Wireless',
                'keterangan' => 'Kapasitas 30 orang, dilengkapi PC All-in-One, Proyektor Audio, Mixer & Mic Wireless',
                'image_url' => 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
            ],
            // Kendaraan
            [
                'id' => 5,
                'id_jenis' => 2,
                'nama' => 'Toyota Innova Zenix Operasional',
                'is_active' => true,
                'registration_id' => 'AB 1024 BP',
                'quantity' => 1,
                'kapasitas' => 7,
                'fasilitas' => 'Transmisi Otomatis, AC Dingin, Audio, BBM Pertamax',
                'keterangan' => 'Transmisi otomatis, BBM Pertamax, peruntukan dinas luar kota',
                'image_url' => 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 6,
                'id_jenis' => 2,
                'nama' => 'Toyota Avanza Veloz Dinas',
                'is_active' => true,
                'registration_id' => 'AB 1450 CP',
                'quantity' => 1,
                'kapasitas' => 7,
                'fasilitas' => 'Transmisi Manual, AC Dingin',
                'keterangan' => 'Transmisi manual, peruntukan mobilitas kedinasan lokal Sleman',
                'image_url' => 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 7,
                'id_jenis' => 2,
                'nama' => 'Isuzu Elf Microbus Dinas',
                'is_active' => true,
                'registration_id' => 'AB 7001 ZP',
                'quantity' => 1,
                'kapasitas' => 16,
                'fasilitas' => 'AC Ducting, Audio, Kapasitas 16 Penumpang',
                'keterangan' => 'Kapasitas 16 penumpang, AC Ducting, peruntukan rombongan dinas instansi',
                'image_url' => 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
            ],
            // Perlengkapan
            [
                'id' => 8,
                'id_jenis' => 3,
                'nama' => 'Laptop ASUS ExpertBook B1',
                'is_active' => true,
                'registration_id' => 'BMN-312-0081',
                'quantity' => 4,
                'kapasitas' => null,
                'fasilitas' => 'Intel Core i5, RAM 16GB, SSD 512GB, Windows 11 Pro',
                'keterangan' => 'Intel Core i5, RAM 16GB, SSD 512GB, Windows 11 Pro, Office Resmi',
                'image_url' => 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 9,
                'id_jenis' => 3,
                'nama' => 'Proyektor Epson EB-X500',
                'is_active' => true,
                'registration_id' => 'BMN-312-0104',
                'quantity' => 3,
                'kapasitas' => null,
                'fasilitas' => '3600 ANSI Lumens, Port HDMI, Kabel 10m + Tripod Screen',
                'keterangan' => 'HDMI, Brightness 3600 ANSI lumens, termasuk kabel 10m dan tripod screen',
                'image_url' => 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 10,
                'id_jenis' => 3,
                'nama' => 'Wireless Portable Sound System Hardwell',
                'is_active' => true,
                'registration_id' => 'BMN-312-0145',
                'quantity' => 2,
                'kapasitas' => null,
                'fasilitas' => 'Speaker 12", 2 Mic Wireless Handheld, Bluetooth',
                'keterangan' => 'Speaker 12 inch, 2 Mic Wireless Handheld, Bluetooth, Baterai tahan 5 jam',
                'image_url' => 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'id' => 11,
                'id_jenis' => 3,
                'nama' => 'Kamera Mirrorless Sony Alpha A6400',
                'is_active' => true,
                'registration_id' => 'BMN-312-0219',
                'quantity' => 1,
                'kapasitas' => null,
                'fasilitas' => 'Lensa 16-50mm, 2 Baterai Cadangan, SD Card 64GB, Tripod',
                'keterangan' => 'Lensa 16-50mm, 2 baterai cadangan, SD Card 64GB, Tripod lipat',
                'image_url' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
            ],
        ];

        foreach ($items as $item) {
            ItemJenis::updateOrCreate(['id' => $item['id']], $item);
        }

        // 3. Clean initial Peminjaman (official test data only)
        $loans = [
            [
                'id' => 'PMJ-202610-001',
                'tgl_pengajuan' => '2026-10-01',
                'nip' => '198504122010011003',
                'nama_pemohon' => 'Drs. H. Ahmad Fauzi, M.Ag.',
                'unit_pemohon' => 'Seksi Pendidikan Madrasah (Penma)',
                'pihak_pemohon' => 'Internal Kemenag Sleman',
                'nomor_hp' => '081234567890',
                'penanggung_jawab' => 'Drs. H. Ahmad Fauzi',
                'jumlah_peserta' => 40,
                'tgl_mulai' => '2026-10-05',
                'tgl_selesai' => '2026-10-05',
                'waktu_mulai' => '08:00',
                'waktu_selesai' => '14:00',
                'keperluan' => 'Rakor Persiapan Asesmen Madrasah se-Kabupaten Sleman',
                'surat_url' => 'surat_penma_001.pdf',
                'status' => 'Disetujui',
                'petugas' => 'Admin SiRuang',
                'items' => [
                    ['item_id' => 3, 'jumlah' => 1],
                    ['item_id' => 9, 'jumlah' => 1],
                ],
            ],
            [
                'id' => 'PMJ-202610-002',
                'tgl_pengajuan' => '2026-10-04',
                'nip' => '199002152014022001',
                'nama_pemohon' => 'Siti Nurhaliza, S.H.I.',
                'unit_pemohon' => 'Seksi Bimbingan Masyarakat Islam (Bimas Islam)',
                'pihak_pemohon' => 'Internal Kemenag Sleman',
                'nomor_hp' => '089912345678',
                'penanggung_jawab' => 'Siti Nurhaliza',
                'jumlah_peserta' => 20,
                'tgl_mulai' => '2026-10-07',
                'tgl_selesai' => '2026-10-07',
                'waktu_mulai' => '09:30',
                'waktu_selesai' => '16:00',
                'keperluan' => 'Monitoring dan Pembinaan Pengantin Baru KUA Sleman Barat',
                'surat_url' => 'surat_bimas_014.pdf',
                'status' => 'Disetujui',
                'petugas' => 'Admin SiRuang',
                'items' => [
                    ['item_id' => 6, 'jumlah' => 1],
                ],
            ],
            [
                'id' => 'PMJ-202610-003',
                'tgl_pengajuan' => '2026-10-06',
                'nip' => '197908232006041005',
                'nama_pemohon' => 'Bambang Sudarsono, S.Pd.I.',
                'unit_pemohon' => 'Penyelenggara Zakat dan Wakaf (Gara Zawa)',
                'pihak_pemohon' => 'Internal Kemenag Sleman',
                'nomor_hp' => '087654321098',
                'penanggung_jawab' => 'Bambang Sudarsono',
                'jumlah_peserta' => 35,
                'tgl_mulai' => '2026-10-12',
                'tgl_selesai' => '2026-10-12',
                'waktu_mulai' => '08:30',
                'waktu_selesai' => '12:00',
                'keperluan' => 'Sosialisasi Percepatan Sertifikasi Tanah Wakaf Rumah Ibadah',
                'surat_url' => 'surat_zawa_009.pdf',
                'status' => 'Disetujui',
                'petugas' => 'Admin SiRuang',
                'items' => [
                    ['item_id' => 4, 'jumlah' => 1],
                    ['item_id' => 8, 'jumlah' => 2],
                ],
            ],
            [
                'id' => 'PMJ-202610-004',
                'tgl_pengajuan' => '2026-10-07',
                'nip' => '199205102019031002',
                'nama_pemohon' => 'Rizki Pratama, M.Si.',
                'unit_pemohon' => 'Subbag Tata Usaha - Kehumasan',
                'pihak_pemohon' => 'Internal Kemenag Sleman',
                'nomor_hp' => '082134567890',
                'penanggung_jawab' => 'Rizki Pratama',
                'jumlah_peserta' => 30,
                'tgl_mulai' => '2026-10-15',
                'tgl_selesai' => '2026-10-16',
                'waktu_mulai' => '08:00',
                'waktu_selesai' => '16:00',
                'keperluan' => 'Pelatihan Kehumasan dan Pengelolaan Media Sosial Kemenag Sleman',
                'surat_url' => 'surat_tu_humas_003.pdf',
                'status' => 'Menunggu Persetujuan',
                'petugas' => null,
                'items' => [
                    ['item_id' => 1, 'jumlah' => 1],
                    ['item_id' => 11, 'jumlah' => 1],
                ],
            ],
            [
                'id' => 'PMJ-202610-005',
                'tgl_pengajuan' => '2026-10-08',
                'nip' => '198711042011012008',
                'nama_pemohon' => 'Tri Wahyuni, S.Ag.',
                'unit_pemohon' => 'Seksi Pendidikan Agama Islam (PAIS)',
                'pihak_pemohon' => 'Internal Kemenag Sleman',
                'nomor_hp' => '085678901234',
                'penanggung_jawab' => 'Tri Wahyuni',
                'jumlah_peserta' => 60,
                'tgl_mulai' => '2026-10-20',
                'tgl_selesai' => '2026-10-20',
                'waktu_mulai' => '09:00',
                'waktu_selesai' => '13:00',
                'keperluan' => 'Workshop Implementasi Kurikulum Merdeka Guru PAI Sleman',
                'surat_url' => 'surat_pais_021.pdf',
                'status' => 'Disetujui',
                'petugas' => 'Admin SiRuang',
                'items' => [
                    ['item_id' => 2, 'jumlah' => 1],
                    ['item_id' => 10, 'jumlah' => 1],
                ],
            ],
        ];

        foreach ($loans as $loanData) {
            $itemsData = $loanData['items'];
            unset($loanData['items']);

            $peminjaman = Peminjaman::updateOrCreate(['id' => $loanData['id']], $loanData);

            PeminjamanItem::where('peminjaman_id', $peminjaman->id)->delete();
            foreach ($itemsData as $it) {
                PeminjamanItem::create([
                    'peminjaman_id' => $peminjaman->id,
                    'item_id' => $it['item_id'],
                    'jumlah' => $it['jumlah'],
                ]);
            }
        }
    }
}
