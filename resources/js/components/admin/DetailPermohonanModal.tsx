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
  const [currentPermohonan, setCurrentPermohonan] = useState<Permohonan>(permohonan);
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const cfg = STATUS_CONFIG[currentPermohonan.status];
  const StatusIcon = cfg.icon;

  const handleChangeStatus = async (status: Permohonan['status'], scope: 'single' | 'series' = 'series') => {
    setUpdating(true);
    setStatusError(null);
    try {
      await updateStatusPermohonan(currentPermohonan.id, status, scope);
      setCurrentPermohonan((prev) => ({
        ...prev,
        status,
        recurring_schedules: scope === 'series' && prev.recurring_schedules
          ? prev.recurring_schedules.map((s) => ({ ...s, status }))
          : prev.recurring_schedules,
      }));
      onStatusUpdated(currentPermohonan.id, status);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal memperbarui status di server database.';
      setStatusError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSingleSession = async (sessionId: string, sessionDate: string, sessionNumber: number) => {
    const confirmed = window.confirm(
      `Konfirmasi Pembatalan Jadwal:\nApakah Anda yakin ingin membatalkan jadwal Sesi ${sessionNumber} pada tanggal ${sessionDate}?\n\nJadwal sesi lain dalam rangkaian ini akan tetap aktif.`
    );
    if (!confirmed) return;

    setUpdating(true);
    setStatusError(null);
    try {
      await updateStatusPermohonan(sessionId, 'Dibatalkan', 'single');
      setCurrentPermohonan((prev) => {
        const updatedSchedules = (prev.recurring_schedules ?? []).map((s) =>
          (s.id_peminjaman === sessionId || s.id === sessionId) ? { ...s, status: 'Dibatalkan' } : s
        );
        const allCancelled = updatedSchedules.length > 0 && updatedSchedules.every((s) => s.status === 'Dibatalkan');
        return {
          ...prev,
          status: allCancelled ? 'Dibatalkan' : prev.status,
          recurring_schedules: updatedSchedules,
        };
      });
      onStatusUpdated(sessionId, 'Dibatalkan');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal membatalkan jadwal sesi ini.';
      setStatusError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const totalSessions = currentPermohonan.total_sessions || currentPermohonan.recurring_schedules?.length || 1;
  const isWeeklyRecurring = Boolean(currentPermohonan.is_recurring && currentPermohonan.recurring_frequency);
  const isMultiday = currentPermohonan.booking_type === 'multiday' || (!isWeeklyRecurring && (totalSessions > 1 || Boolean(currentPermohonan.parent_id)));
  const isSeries = Boolean(isWeeklyRecurring || isMultiday || totalSessions > 1 || currentPermohonan.parent_id);

  const handleCancelSeries = async () => {
    const total = totalSessions;
    const label = isMultiday ? 'seluruh pengajuan peminjaman multihari ini' : 'SELURUH rangkaian peminjaman berulang ini';
    const confirmed = window.confirm(
      `Konfirmasi Pembatalan:\nApakah Anda yakin ingin membatalkan ${label} (${total} sesi)?\n\nTindakan ini akan membatalkan semua sesi jadwal yang masih aktif.`
    );
    if (!confirmed) return;

    await handleChangeStatus('Dibatalkan', 'series');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-[#009966] uppercase tracking-wider mb-0.5">Detail Permohonan</p>
            <h2 className="text-lg font-extrabold text-slate-900">{currentPermohonan.kegiatan}</h2>
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

        <DetailTrackingIdBadge id={currentPermohonan.id} />

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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>

            {currentPermohonan.status === 'Menunggu Persetujuan' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Disetujui', 'series')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSeries ? 'Setujui Seluruh Jadwal' : 'Setujui'}
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Tidak Disetujui', 'series')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Tolak
                </button>
              </div>
            )}
            {(currentPermohonan.status === 'Disetujui' || currentPermohonan.status === 'Tidak Disetujui') && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Dibatalkan', isSeries ? 'series' : 'single')}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  {isMultiday ? 'Batalkan Seluruh Pengajuan' : isSeries ? 'Batalkan Seluruh Rangkaian' : 'Batalkan'}
                </button>
              </div>
            )}
          </div>

          <DetailBorrowerSection permohonan={currentPermohonan} />
          <DetailScheduleSection
            permohonan={currentPermohonan}
            onCancelSession={handleCancelSingleSession}
            onCancelSeries={handleCancelSeries}
            updating={updating}
          />
          {(() => {
            const isExternal = currentPermohonan.applicant_type === 'external' || (currentPermohonan.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
            const isSuratOptional = !isExternal;
            return (
              <DetailSuratSection
                id={currentPermohonan.id}
                suratUrl={currentPermohonan.surat_url}
                suratPeminjaman={currentPermohonan.surat_peminjaman}
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
