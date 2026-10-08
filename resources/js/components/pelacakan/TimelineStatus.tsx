import React from 'react';
import { STATUS_PEMINJAMAN } from '../../constants';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TimelineStatusProps {
  status: string;
}

export const TimelineStatus: React.FC<TimelineStatusProps> = ({ status }) => {
  const isRejected = status === STATUS_PEMINJAMAN.DITOLAK;
  const isApproved = status === STATUS_PEMINJAMAN.DISETUJUI || status === STATUS_PEMINJAMAN.SELESAI;
  const isFinished = status === STATUS_PEMINJAMAN.SELESAI;

  return (
    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 mb-6">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
        Status Alur Permohonan
      </h4>
      <div className="grid grid-cols-3 gap-2 text-center relative">
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">1. Diajukan</span>
          <span className="text-[10px] text-slate-500">Tercatat di sistem</span>
        </div>

        <div className="flex flex-col items-center">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 shadow-xs ${
              isApproved || isRejected
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 text-white animate-pulse'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">2. Verifikasi</span>
          <span className="text-[10px] text-slate-500">Pemeriksaan petugas</span>
        </div>

        <div className="flex flex-col items-center">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 shadow-xs ${
              isRejected
                ? 'bg-rose-600 text-white'
                : isApproved
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {isRejected ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <span className="text-[11px] font-bold text-slate-800">
            {isRejected ? '3. Ditolak' : isFinished ? '3. Selesai' : '3. Persetujuan'}
          </span>
          <span className="text-[10px] text-slate-500">
            {isRejected ? 'Tidak memenuhi syarat' : isApproved ? 'Izin diterbitkan' : 'Menunggu hasil'}
          </span>
        </div>
      </div>
    </div>
  );
};
