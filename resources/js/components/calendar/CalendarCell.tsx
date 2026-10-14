import React from 'react';
import { MasterPeminjaman } from '../../types';

interface CalendarCellProps {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string;
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
}

export const CalendarCell: React.FC<CalendarCellProps> = ({
  dayNumber,
  isCurrentMonth,
  isToday,
  dateString,
  events,
  onSelectEvent,
}) => {
  const getBadgeColor = (ev: MasterPeminjaman): string => {
    const jenis = (ev.jenis ?? '').toLowerCase();
    if (jenis === 'kendaraan') {
      return 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100';
    }
    if (jenis === 'perlengkapan') {
      return 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
  };

  const getTimeLabel = (ev: MasterPeminjaman): string => {
    if (ev.waktu_mulai) return ev.waktu_mulai.substring(0, 5);
    if (ev.mulai && ev.mulai.includes(' ')) {
      return ev.mulai.split(' ')[1].substring(0, 5);
    }
    return '';
  };

  const getEventTitle = (ev: MasterPeminjaman): string => {
    return ev.item_dipinjam ?? ev.ruangan ?? ev.kegiatan ?? ev.keperluan ?? 'Peminjaman';
  };

  const getRangeIndicator = (ev: MasterPeminjaman): string | null => {
    const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
    const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 10);
    if (!start || !end || start === end) return null;

    if (dateString === start) return 'Mulai';
    if (dateString === end) return 'Habis';
    return 'Pinjam';
  };

  return (
    <div
      className={`min-h-[110px] sm:min-h-[120px] p-1.5 border-b border-r border-slate-200 flex flex-col transition-colors ${
        isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span
          className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
            isToday
              ? 'bg-[#009966] text-white shadow-xs'
              : isCurrentMonth
              ? 'text-slate-800'
              : 'text-slate-400'
          }`}
        >
          {dayNumber}
        </span>
        {events.length > 2 && (
          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
            +{events.length - 2}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 2).map((ev) => {
          const time = getTimeLabel(ev);
          const title = getEventTitle(ev);
          const rangeInd = getRangeIndicator(ev);
          const colorClass = getBadgeColor(ev);
          const kegiatan = ev.kegiatan ?? ev.keperluan;
          const peminjam = ev.nama_pemohon ?? ev.nama_peminjam;

          return (
            <button
              key={`${ev.id ?? ev.id_peminjaman}-${dateString}`}
              type="button"
              onClick={() => onSelectEvent(ev)}
              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] truncate border cursor-pointer transition-all shadow-2xs block leading-tight ${colorClass}`}
              title={`${title} - ${kegiatan} (${peminjam})`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold truncate">{title}</span>
                {rangeInd && (
                  <span className="text-[9px] font-extrabold px-1 rounded bg-black/10 shrink-0">
                    {rangeInd}
                  </span>
                )}
              </div>
              <div className="text-[10px] opacity-75 truncate mt-0.5">
                {time && <span className="font-semibold mr-1">{time}</span>}
                <span>{kegiatan}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
