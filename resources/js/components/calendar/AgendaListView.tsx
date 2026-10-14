import React from 'react';
import { MasterPeminjaman } from '../../types';
import { Clock, Calendar as CalIcon, ChevronRight } from 'lucide-react';
import { BadgeStatus } from '../common/BadgeStatus';
import { formatDate } from '../../utils/format';

interface AgendaListViewProps {
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({ events, onSelectEvent }) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-500 shadow-xs">
        <CalIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Tidak ada jadwal peminjaman disetujui pada periode ini.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Pengajuan peminjaman yang disetujui akan otomatis tampil di sini.
        </p>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => {
    const dateA = a.tgl_mulai ?? a.mulai ?? '';
    const dateB = b.tgl_mulai ?? b.mulai ?? '';
    return dateA.localeCompare(dateB);
  });

  return (
    <div className="space-y-3">
      {sorted.map((ev) => {
        const tglMulai = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
        const tglSelesai = (ev.tgl_selesai ?? ev.selesai ?? tglMulai).substring(0, 10);
        const isMultiDay = Boolean(tglMulai && tglSelesai && tglMulai !== tglSelesai);
        const waktuMulai = ev.waktu_mulai ?? (ev.mulai?.includes(' ') ? ev.mulai.split(' ')[1].substring(0, 5) : '08:00');
        const waktuSelesai = ev.waktu_selesai ?? (ev.selesai?.includes(' ') ? ev.selesai.split(' ')[1].substring(0, 5) : '16:00');
        const itemName = ev.item_dipinjam ?? ev.ruangan ?? 'Sarana Prasarana';
        const pemohon = ev.nama_pemohon ?? ev.nama_peminjam;
        const unit = ev.unit_pemohon ?? ev.unit_kerja;
        const idTiket = ev.id ?? ev.id_peminjaman;

        return (
          <div
            key={idTiket}
            onClick={() => onSelectEvent(ev)}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {idTiket}
                </span>
                <BadgeStatus status={ev.status} />
                {ev.jenis && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                    {ev.jenis}
                  </span>
                )}
              </div>
              <h4 className="text-base font-extrabold text-slate-900 truncate">
                {ev.kegiatan ?? ev.keperluan}
              </h4>
              <p className="text-xs text-[#009966] font-semibold">
                Item: {itemName}
              </p>
              <p className="text-xs text-slate-500">
                Pemohon: <span className="font-semibold text-slate-700">{pemohon}</span> &bull; {unit}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-right">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 justify-end">
                  <CalIcon className="w-3.5 h-3.5 text-[#009966]" />
                  <span>
                    {isMultiDay
                      ? `${formatDate(tglMulai, 'short')} – ${formatDate(tglSelesai, 'short')}`
                      : formatDate(tglMulai, 'short')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-1 justify-end">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{waktuMulai} – {waktuSelesai} WIB</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
