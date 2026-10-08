import React from 'react';
import { MasterPeminjaman } from '../../types';
import { Clock, Calendar as CalIcon } from 'lucide-react';
import { BadgeStatus } from '../common/BadgeStatus';

interface AgendaListViewProps {
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({ events, onSelectEvent }) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <CalIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium">Tidak ada jadwal peminjaman disetujui pada periode ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <div
          key={ev.id_peminjaman}
          onClick={() => onSelectEvent(ev)}
          className="bg-white rounded-xl border border-slate-200/90 p-4 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">{ev.id_peminjaman}</span>
              <BadgeStatus status={ev.status} />
            </div>
            <h4 className="text-sm font-bold text-slate-900">{ev.keperluan}</h4>
            <p className="text-xs text-slate-500">
              {ev.nama_peminjam} &bull; {ev.unit_kerja}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {ev.mulai} s/d {ev.selesai.split(' ')[1] || ev.selesai}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
