import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-slate-800">
          SIMPRU &bull; Kementerian Agama Kabupaten Sleman
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Layanan peminjaman ruangan, kendaraan, dan alat terpadu.
        </p>
        <p className="mt-2 text-[11px] text-slate-400">
          Jl. Dr. Radjimin, Sucen, Triharjo, Kec. Sleman, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55514
        </p>
      </div>
    </footer>
  );
};
