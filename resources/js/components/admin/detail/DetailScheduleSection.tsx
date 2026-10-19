import React from 'react';
import { Permohonan } from '../../../types/admin';
import { formatDate } from '../../../utils/format';
import { Repeat, Ban } from 'lucide-react';

interface DetailScheduleSectionProps {
  permohonan: Permohonan;
  onCancelSession?: (sessionId: string, sessionDate: string, sessionNumber: number) => void;
  onCancelSeries?: () => void;
  updating?: boolean;
}

export const DetailScheduleSection: React.FC<DetailScheduleSectionProps> = ({
  permohonan,
  onCancelSession,
  onCancelSeries,
  updating = false,
}) => {
  const isRecurring = Boolean(permohonan.is_recurring || permohonan.parent_id);
  const totalSessions = permohonan.total_sessions || permohonan.recurring_schedules?.length || 1;
  const hasActiveSessions = permohonan.recurring_schedules?.some((s) => s.status !== 'Dibatalkan');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
          Jadwal &amp; Waktu Pelaksanaan
        </h3>
        {isRecurring && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Repeat className="w-3 h-3" />
            Peminjaman Berulang — {totalSessions} Sesi
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tanggal Mulai</p>
          <p className="text-sm font-bold text-slate-800">{formatDate(permohonan.tgl_mulai)}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Mulai</p>
          <p className="text-sm font-bold text-slate-800">{permohonan.waktu_mulai} WIB</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
            {isRecurring ? 'Berulang Sampai' : 'Tanggal Selesai'}
          </p>
          <p className="text-sm font-bold text-slate-800">
            {formatDate(permohonan.recurring_end_date ?? permohonan.tgl_selesai)}
          </p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Selesai</p>
          <p className="text-sm font-bold text-slate-800">{permohonan.waktu_selesai} WIB</p>
        </div>
      </div>

      {isRecurring && permohonan.recurring_schedules && permohonan.recurring_schedules.length > 0 && (
        <div className="mt-4 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-blue-600" />
                Peminjaman Berulang — {totalSessions} Sesi
              </p>
              <p className="text-[10px] text-blue-700/80 mt-0.5">
                Setiap sesi dapat dibatalkan secara terpisah tanpa mengganggu jadwal lainnya.
              </p>
            </div>
            {permohonan.next_session_date && (
              <span className="text-[10px] font-semibold text-blue-700 bg-white/90 px-2 py-0.5 rounded-md border border-blue-100 shadow-2xs">
                Sesi Berikutnya: {formatDate(permohonan.next_session_date)}
              </span>
            )}
          </div>

          <div className="overflow-x-auto bg-white rounded-xl border border-blue-100 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Sesi</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permohonan.recurring_schedules.map((s, idx) => {
                  const sessionNum = s.session_number ?? idx + 1;
                  const sessionId = s.id_peminjaman || s.id || '';
                  const sessionDateStr = formatDate(s.tgl_mulai || s.mulai);
                  const isCancelled = s.status === 'Dibatalkan';

                  return (
                    <tr
                      key={sessionId || idx}
                      className={`hover:bg-slate-50/60 transition ${
                        isCancelled ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {sessionNum} dari {totalSessions}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {sessionDateStr}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {s.waktu_mulai} – {s.waktu_selesai} WIB
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.status === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : s.status === 'Dibatalkan'
                              ? 'bg-slate-200 text-slate-600 border border-slate-300'
                              : s.status === 'Tidak Disetujui'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {!isCancelled && onCancelSession ? (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => onCancelSession(sessionId, sessionDateStr, sessionNum)}
                            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                            title={`Batalkan hanya sesi ${sessionNum} (${sessionDateStr})`}
                          >
                            Batalkan Jadwal
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Telah Dibatalkan
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {onCancelSeries && hasActiveSessions && (
            <div className="pt-1 flex items-center justify-between border-t border-blue-100/60">
              <span className="text-[10px] text-slate-500">
                Perlu membatalkan semua tanggal pertemuan sekaligus?
              </span>
              <button
                type="button"
                disabled={updating}
                onClick={onCancelSeries}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Ban className="w-3.5 h-3.5" />
                Batalkan Seluruh Rangkaian
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
