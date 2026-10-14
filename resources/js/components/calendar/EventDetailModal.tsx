import React from 'react';
import { MasterPeminjaman } from '../../types';
import { X } from 'lucide-react';
import { EventDetailBody } from './EventDetailBody';

interface EventDetailModalProps {
  event: MasterPeminjaman | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const kegiatanName = event.kegiatan ?? event.keperluan ?? 'Agenda Kegiatan';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#009966] block mb-1">
              DETAIL JADWAL
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
              {kegiatanName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <EventDetailBody event={event} />

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#009966] hover:bg-[#008055] text-white rounded-xl text-sm font-bold cursor-pointer transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
