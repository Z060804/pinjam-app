import React from 'react';
import { Search } from 'lucide-react';

interface PelacakanSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectSample: (id: string) => void;
}

export const PelacakanSearch: React.FC<PelacakanSearchProps> = ({
  searchQuery,
  onSearchChange,
  onSelectSample,
}) => {
  const sampleIds = ['PMJ-202610-001', 'PMJ-202610-002', 'PMJ-202610-004'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
      <label className="block text-xs font-semibold text-slate-700">
        Masukkan ID Peminjaman Resmi
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Ketik ID Peminjaman (misal: PMJ-202610-001)..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
        <span className="text-[11px] font-medium">Contoh ID cepat:</span>
        {sampleIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectSample(id)}
            className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-[#009966] text-slate-700 border border-slate-200 cursor-pointer transition-colors"
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
};
