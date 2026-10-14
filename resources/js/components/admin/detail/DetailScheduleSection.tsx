import React from 'react';
import { Permohonan } from '../../../types/admin';
import { formatDate } from '../../../utils/format';

interface DetailScheduleSectionProps {
  permohonan: Permohonan;
}

export const DetailScheduleSection: React.FC<DetailScheduleSectionProps> = ({ permohonan }) => {
  return (
    <div>
      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">
        Jadwal &amp; Waktu Pelaksanaan
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tanggal Mulai</p>
          <p className="text-sm font-bold text-slate-800">{formatDate(permohonan.tgl_mulai)}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Mulai</p>
          <p className="text-sm font-bold text-slate-800">{permohonan.waktu_mulai}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tanggal Selesai</p>
          <p className="text-sm font-bold text-slate-800">{formatDate(permohonan.tgl_selesai)}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Selesai</p>
          <p className="text-sm font-bold text-slate-800">{permohonan.waktu_selesai}</p>
        </div>
      </div>
    </div>
  );
};
