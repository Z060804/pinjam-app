import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

interface NotFoundViewProps {
  homePath?: string;
  portalLabel?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  homePath = '/',
  portalLabel = 'Beranda SIMPRU',
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#009966] mx-auto flex items-center justify-center border border-emerald-100 shadow-sm">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-extrabold text-[#009966] uppercase tracking-widest block">
            404 &bull; Halaman Tidak Ditemukan
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Alamat URL Tidak Sesuai
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Halaman yang Anda tuju tidak ditemukan atau telah dipindahkan ke rute layanan lain.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#009966] text-white text-xs font-bold hover:bg-[#008055] transition cursor-pointer shadow-md shadow-emerald-700/20"
          >
            <Home className="w-4 h-4" />
            Ke {portalLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
