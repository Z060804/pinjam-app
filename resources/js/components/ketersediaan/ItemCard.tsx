import React from 'react';
import { ItemJenis } from '../../types';
import { CheckCircle2, ArrowRight, Package } from 'lucide-react';

interface ItemCardProps {
  item: ItemJenis;
  onBookItem: (item: ItemJenis) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onBookItem }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {item.image_url ? (
          <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
            <img
              src={item.image_url}
              alt={item.nama}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#009966] border border-emerald-200/80 shadow-xs backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersedia
              </span>
            </div>
            {item.registration_id && (
              <div className="absolute bottom-3 right-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-900/80 text-white backdrop-blur-xs">
                  {item.registration_id}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-28 w-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Package className="w-8 h-8" />
          </div>
        )}

        <div className="p-5">
          <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-[#009966] transition-colors">
            {item.nama}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {item.keterangan || 'Tidak ada keterangan khusus.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
              Kapasitas / Stok: {item.quantity}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 border-t border-slate-100 mt-auto">
        <button
          type="button"
          onClick={() => onBookItem(item)}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#009966] hover:bg-[#008055] transition-all cursor-pointer shadow-xs active:scale-98"
        >
          Ajukan Peminjaman
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
