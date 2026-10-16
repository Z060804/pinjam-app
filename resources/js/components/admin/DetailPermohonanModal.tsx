import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Ban, AlertTriangle } from 'lucide-react';
import { Permohonan } from '../../types/admin';
import { updateStatusPermohonan } from '../../services/adminApi';
import { STATUS_CONFIG } from './statusConfig';
import { DetailTrackingIdBadge } from './detail/DetailTrackingIdBadge';
import { DetailBorrowerSection } from './detail/DetailBorrowerSection';
import { DetailScheduleSection } from './detail/DetailScheduleSection';
import { DetailSuratSection } from './detail/DetailSuratSection';

interface DetailPermohonanModalProps {
  permohonan: Permohonan;
  onClose: () => void;
  onStatusUpdated: (id: string, newStatus: Permohonan['status']) => void;
}

export const DetailPermohonanModal: React.FC<DetailPermohonanModalProps> = ({
  permohonan,
  onClose,
  onStatusUpdated,
}) => {
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const cfg = STATUS_CONFIG[permohonan.status];
  const StatusIcon = cfg.icon;

  const handleChangeStatus = async (status: Permohonan['status']) => {
    setUpdating(true);
    setStatusError(null);
    try {
      await updateStatusPermohonan(permohonan.id, status);
      onStatusUpdated(permohonan.id, status);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal memperbarui status di server database.';
      setStatusError(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-[#009966] uppercase tracking-wider mb-0.5">Detail Permohonan</p>
            <h2 className="text-lg font-extrabold text-slate-900">{permohonan.kegiatan}</h2>
          </div>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DetailTrackingIdBadge id={permohonan.id} />

        <div className="px-6 py-4 space-y-5">
          {statusError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pembaruan Status Gagal</p>
                <p className="leading-relaxed font-medium">{statusError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>

            {permohonan.status === 'Menunggu Persetujuan' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Disetujui')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Setujui
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Tidak Disetujui')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Tolak
                </button>
              </div>
            )}
            {(permohonan.status === 'Disetujui' || permohonan.status === 'Tidak Disetujui') && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleChangeStatus('Dibatalkan')}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                Batalkan
              </button>
            )}
          </div>

          <DetailBorrowerSection permohonan={permohonan} />
          <DetailScheduleSection permohonan={permohonan} />
          {(() => {
            const isExternal = permohonan.applicant_type === 'external' || (permohonan.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
            const isRoomOnly = (permohonan.jenis === 'ruangan' || (permohonan.kategori_list?.length === 1 && permohonan.kategori_list[0] === 'ruangan')) && !permohonan.items?.some(it => it.kategori && it.kategori !== 'ruangan');
            const isSuratOptional = !isExternal && isRoomOnly;
            return (
              <DetailSuratSection
                id={permohonan.id}
                suratUrl={permohonan.surat_url}
                suratPeminjaman={permohonan.surat_peminjaman}
                isOptional={isSuratOptional}
              />
            );
          })()}
        </div>

        <div className="px-6 pb-6">
          <button
            id="modal-tutup-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
