import React from 'react';
import { MasterPeminjaman } from '../../types';
import { X, Calendar, Clock, User, Building, ShieldCheck, FileText } from 'lucide-react';
import { BadgeStatus } from '../common/BadgeStatus';

interface EventDetailModalProps {
  event: MasterPeminjaman | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-slate-500">{event.id_peminjaman}</span>
              <BadgeStatus status={event.status} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{event.keperluan}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3.5 text-sm">
          <div className="flex items-start gap-3 text-slate-700">
            <User className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">{event.nama_peminjam}</p>
              <p className="text-xs text-slate-500">NIP. {event.nip}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{event.unit_kerja}</span>
          </div>

          <div className="flex items-start gap-3 text-slate-700">
            <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Waktu Pelaksanaan</p>
              <p className="font-medium text-slate-800">
                {event.mulai} s/d {event.selesai}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs text-slate-500">
              Tanggal Pengajuan: <strong className="text-slate-700">{event.tgl_pengajuan}</strong>
            </span>
          </div>

          {event.surat_peminjaman && (
            <div className="flex items-center gap-3 text-slate-700">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-slate-600">
                Dokumen: <span className="font-mono text-emerald-700">{event.surat_peminjaman}</span>
              </span>
            </div>
          )}

          {event.petugas && (
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Diverifikasi oleh: <strong className="text-slate-700">{event.petugas}</strong></span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
