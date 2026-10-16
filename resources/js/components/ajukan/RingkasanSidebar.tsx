import React from 'react';
import { CartItem } from '../../types';
import { Trash2, ShoppingBag, AlertCircle } from 'lucide-react';

interface RingkasanSidebarProps {
  selectedItems: CartItem[];
  applicantType?: 'internal' | 'external';
  onRemoveItem: (itemId: number) => void;
  onUpdateQty: (itemId: number, delta: number) => void;
}

export const RingkasanSidebar: React.FC<RingkasanSidebarProps> = ({
  selectedItems,
  applicantType = 'internal',
  onRemoveItem,
  onUpdateQty,
}) => {
  const totalItems = selectedItems.reduce((acc, curr) => acc + curr.jumlah, 0);

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#009966]" />
            <h4 className="text-sm font-bold text-slate-900">Item yang Dipilih</h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#009966]">
            {totalItems} Item
          </span>
        </div>

        {selectedItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <p className="text-xs font-medium">Belum ada item dipilih.</p>
            <p className="text-[11px] text-slate-400">
              Pilih item di Langkah 1 untuk menambahkannya ke permohonan.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {selectedItems.map((cart) => {
              const isRoomOrVehicle = cart.item.id_jenis === 1 || cart.item.id_jenis === 2;
              const isMaxForExternal = applicantType === 'external' && isRoomOrVehicle && cart.jumlah >= 1;
              return (
                <div
                  key={cart.item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-900">{cart.item.nama}</h5>
                    {cart.item.registration_id && (
                      <p className="text-[10px] font-mono text-slate-500">{cart.item.registration_id}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                      <span>Jumlah:</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(cart.item.id, -1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-slate-900">{cart.jumlah}</span>
                      <button
                        type="button"
                        disabled={isMaxForExternal}
                        onClick={() => !isMaxForExternal && onUpdateQty(cart.item.id, 1)}
                        className={`w-5 h-5 rounded border flex items-center justify-center font-bold text-slate-700 ${
                          isMaxForExternal
                            ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:bg-slate-100 cursor-pointer'
                        }`}
                        title={isMaxForExternal ? 'Maksimal 1 unit untuk pemohon eksternal' : 'Tambah'}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(cart.item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <p>
            Peminjaman jangka panjang kendaraan &amp; alat wajib melampirkan disposisi Kepala Kemenag Sleman.
          </p>
        </div>
      </div>
    </aside>
  );
};
