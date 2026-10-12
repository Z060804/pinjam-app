import React from 'react';
import { ActiveTab } from '../../types';

interface FooterProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (tab: ActiveTab) => {
    if (onNavigate) {
      onNavigate(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto border-t border-slate-200/90 bg-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top 3-column row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
          {/* Column 1: SIMPRU Brand & About */}
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">SIMPRU</h3>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
              Sistem Informasi Peminjaman Ruangan Kementerian Agama Kabupaten Sleman.
            </p>
          </div>

          {/* Column 2: Layanan */}
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Layanan</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('ketersediaan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Ketersediaan Ruangan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('ajukan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Ajukan Permohonan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('pelacakan')}
                  className="hover:text-[#009966] transition cursor-pointer text-left"
                >
                  Pelacakan Peminjaman
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Informasi */}
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Informasi</h4>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
              Gunakan SIMPRU untuk melihat jadwal dan mengajukan peminjaman ruangan.
            </p>
          </div>
        </div>

        {/* Divider line */}
        <div className="border-t border-slate-200/80 pt-6">
          <p className="text-xs text-slate-400 text-center font-normal">
            &copy; 2026 SIMPRU &mdash; Peminjaman Ruangan Kementerian Agama Kabupaten Sleman
          </p>
        </div>
      </div>
    </footer>
  );
};
