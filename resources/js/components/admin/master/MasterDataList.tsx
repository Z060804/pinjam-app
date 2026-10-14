import React from 'react';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';

interface MasterDataListProps<T extends { id: number; nama: string; is_active: boolean }> {
  list: T[];
  loading: boolean;
  entityKey: string;
  entityName: string;
  listTitle: string;
  listDesc: string;
  itemIcon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
  renderItemBadges?: (item: T) => React.ReactNode;
  renderItemMeta: (item: T) => React.ReactNode;
  onEdit: (item: T) => void;
  onDelete: (id: number) => void;
}

export function MasterDataList<T extends { id: number; nama: string; is_active: boolean }>({
  list,
  loading,
  entityKey,
  entityName,
  listTitle,
  listDesc,
  itemIcon: ItemIcon,
  iconBgClass,
  iconColorClass,
  renderItemBadges,
  renderItemMeta,
  onEdit,
  onDelete,
}: MasterDataListProps<T>) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{listTitle}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{listDesc}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {list.length} Item
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 flex flex-col items-center justify-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">Data tidak ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Belum ada {entityName.toLowerCase()} terdaftar.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {list.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition">
              <div className={`w-10 h-10 rounded-xl ${iconBgClass} border flex items-center justify-center shrink-0`}>
                <ItemIcon className={`w-5 h-5 ${iconColorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">{item.nama}</span>
                  {renderItemBadges && renderItemBadges(item)}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                  {renderItemMeta(item)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id={`${entityKey}-edit-${item.id}`}
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#009966] hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  id={`${entityKey}-delete-${item.id}`}
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
