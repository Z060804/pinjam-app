import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ActiveTab } from '../../types';

interface HeroSectionProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  return (
    <section className="py-12 sm:py-16 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#009966] text-xs font-bold tracking-wider uppercase mb-6 border border-emerald-100">
        <Sparkles className="w-3.5 h-3.5" />
        Layanan Peminjaman Terpadu
      </div>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Satu layanan, semua kebutuhan peminjaman.
      </h1>
      <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        Temukan ruangan, kendaraan, dan alat untuk menunjang kegiatan Anda. Periksa ketersediaan,
        ajukan kebutuhan dalam satu permohonan, dan pantau prosesnya dengan mudah.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('ajukan')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#009966] text-white font-semibold text-sm shadow-md shadow-emerald-700/20 hover:bg-[#008055] transition-all cursor-pointer active:scale-95"
        >
          Ajukan Peminjaman
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('ketersediaan')}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold text-sm border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          Cek Ketersediaan
        </button>
      </div>
    </section>
  );
};
