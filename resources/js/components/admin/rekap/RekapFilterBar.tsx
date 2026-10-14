import React from 'react';
import { Calendar as CalIcon, RotateCcw, ChevronDown } from 'lucide-react';
import { Permohonan } from '../../../types/admin';

interface RekapFilterBarProps {
  dateFrom: string;
  dateTo: string;
  jenisFilter: 'Semua' | Permohonan['jenis'];
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onJenisFilterChange: (val: 'Semua' | Permohonan['jenis']) => void;
  onReset: () => void;
}

export const RekapFilterBar: React.FC<RekapFilterBarProps> = ({
  dateFrom,
  dateTo,
  jenisFilter,
  onDateFromChange,
  onDateToChange,
  onJenisFilterChange,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="rekap-date-from" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Dari Tanggal
          </label>
          <div className="relative">
            <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="rekap-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label htmlFor="rekap-date-to" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Sampai Tanggal
          </label>
          <div className="relative">
            <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="rekap-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label htmlFor="rekap-jenis-filter" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Jenis
          </label>
          <div className="relative">
            <select
              id="rekap-jenis-filter"
              value={jenisFilter}
              onChange={(e) => onJenisFilterChange(e.target.value as 'Semua' | Permohonan['jenis'])}
              className="w-full appearance-none px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
            >
              <option value="Semua">Semua Jenis</option>
              <option value="ruangan">Ruangan</option>
              <option value="kendaraan">Kendaraan</option>
              <option value="perlengkapan">Perlengkapan</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <button
          id="rekap-reset-btn"
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};
