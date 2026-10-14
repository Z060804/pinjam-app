import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminActiveTab } from '../../types/admin';

interface AdminFooterProps {
  onSelectTab?: (tab: AdminActiveTab) => void;
}

const tabToAdminPath: Record<AdminActiveTab, string> = {
  rekap: '/admin/rekap',
  ruangan: '/admin/ruangan',
  kendaraan: '/admin/kendaraan',
  perlengkapan: '/admin/perlengkapan',
};

export const AdminFooter: React.FC<AdminFooterProps> = ({ onSelectTab }) => {
  const navigate = useNavigate();

  const navigateTab = (tab: AdminActiveTab) => {
    if (onSelectTab) onSelectTab(tab);
    navigate(tabToAdminPath[tab]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-auto border-t border-slate-200/90 bg-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">SIMPRU</h3>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
              Sistem Informasi Peminjaman Ruangan Kementerian Agama Kabupaten Sleman.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Layanan</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTab('rekap')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Rekap Peminjaman
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTab('ruangan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Data Ruangan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTab('kendaraan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Data Kendaraan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTab('perlengkapan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Data Perlengkapan
                </button>
              </li>
            </ul>
          </div>

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
  );
};
