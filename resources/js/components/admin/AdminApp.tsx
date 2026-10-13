import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminNavbar } from './AdminNavbar';
import { RekapPeminjamanView } from './RekapPeminjamanView';
import { DataRuanganView } from './DataRuanganView';
import { DataKendaraanView } from './DataKendaraanView';
import { DataPerlengkapanView } from './DataPerlengkapanView';
import { getAdminSession, getAdminToken, adminLogout } from '../../services/adminApi';
import { AdminActiveTab } from '../../types/admin';

export const AdminApp: React.FC = () => {
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminActiveTab>('rekap');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // Check existing session and valid Sanctum token
    const existing = getAdminSession();
    const token = getAdminToken();
    if (existing && token) {
      setSession(existing);
    } else {
      adminLogout();
      setSession(null);
    }
    setBooting(false);
  }, []);

  const handleLoginSuccess = () => {
    setSession(getAdminSession());
  };

  const handleLogout = () => {
    adminLogout();
    setSession(null);
    setActiveTab('rekap');
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <AdminNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        adminName={session.name}
        adminEmail={session.email}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'rekap' && <RekapPeminjamanView />}
        {activeTab === 'ruangan' && <DataRuanganView />}
        {activeTab === 'kendaraan' && <DataKendaraanView />}
        {activeTab === 'perlengkapan' && <DataPerlengkapanView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/90 bg-white pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
            {/* Col 1: Brand & Desc */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">SIMPRU</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
                Sistem Informasi Peminjaman Ruangan Kementerian Agama Kabupaten Sleman.
              </p>
            </div>

            {/* Col 2: Layanan Admin */}
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Layanan</h4>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('rekap'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-[#009966] transition cursor-pointer text-left"
                  >
                    Rekap Peminjaman
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('ruangan'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-[#009966] transition cursor-pointer text-left"
                  >
                    Data Ruangan
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('kendaraan'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-[#009966] transition cursor-pointer text-left"
                  >
                    Data Kendaraan
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('perlengkapan'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-[#009966] transition cursor-pointer text-left"
                  >
                    Data Perlengkapan
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Informasi Admin */}
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Informasi</h4>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
                Panel administrasi SIMPRU untuk verifikasi permohonan peminjaman dan pengelolaan sarana prasarana.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-6">
            <p className="text-xs text-slate-400 text-center font-normal">
              &copy; 2026 SIMPRU &mdash; Peminjaman Ruangan Kementerian Agama Kabupaten Sleman
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminApp;
