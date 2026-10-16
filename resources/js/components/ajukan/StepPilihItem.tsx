import React, { useState } from 'react';
import { ItemJenis, CartItem, MasterJenis } from '../../types';
import { Plus, Check, Search, AlertCircle } from 'lucide-react';

interface StepPilihItemProps {
  items: ItemJenis[];
  categories: MasterJenis[];
  selectedItems: CartItem[];
  applicantType?: 'internal' | 'external';
  onToggleItem: (item: ItemJenis, jumlah: number) => void;
}

export const StepPilihItem: React.FC<StepPilihItemProps> = ({
  items,
  categories,
  selectedItems,
  applicantType = 'internal',
  onToggleItem,
}) => {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = items.filter((item) => {
    const matchCat = activeCategory ? item.id_jenis === activeCategory : true;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.nama.toLowerCase().includes(q) ||
      (item.keterangan?.toLowerCase() ?? '').includes(q);
    return matchCat && matchSearch && item.is_active;
  });

  const isSelected = (itemId: number): boolean => {
    return selectedItems.some((c) => c.item.id === itemId);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">1. Pilih Sumber Daya yang Dibutuhkan</h3>
        <p className="text-xs text-slate-500">
          Anda dapat memilih sarana prasarana yang diperlukan. {applicantType === 'external' ? 'Pemohon eksternal dibatasi maksimal 1 ruangan dan 1 kendaraan.' : 'Pemohon internal dapat mengajukan beberapa item.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeCategory === null ? 'bg-[#009966] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activeCategory === c.id ? 'bg-[#009966] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {c.nama}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari item..."
            className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#009966]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600">Data tidak ditemukan</p>
            <p className="text-[11px] text-slate-400">Tidak ada item yang sesuai dengan filter atau kata kunci.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const selected = isSelected(item.id);
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  selected
                    ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.nama}</span>
                    {item.registration_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {item.registration_id}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.keterangan}</p>
                  <span className="text-[10px] text-emerald-700 font-medium">Stok: {item.quantity} unit</span>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleItem(item, 1)}
                  className={`p-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                    selected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-[#009966] hover:bg-emerald-100'
                  }`}
                >
                  {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
