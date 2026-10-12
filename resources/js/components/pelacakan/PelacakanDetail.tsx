import React from 'react';
import { PeminjamanFull } from '../../types';
import { BadgeStatus } from '../common/BadgeStatus';
import { TimelineStatus } from './TimelineStatus';
import { User, Building, Calendar, FileText, ShieldCheck, Layers } from 'lucide-react';
import { formatDateTimeDisplay } from '../../utils/date';

interface PelacakanDetailProps {
  data: PeminjamanFull;
}

export const PelacakanDetail: React.FC<PelacakanDetailProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-mono text-slate-400 block uppercase">ID Registrasi</span>
          <h3 className="text-xl font-mono font-bold text-slate-900">{data.id_peminjaman}</h3>
        </div>
        <div className="flex items-center gap-2">
          <BadgeStatus status={data.status} />
        </div>
      </div>

      <TimelineStatus status={data.status} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Data Peminjam</span>
          </div>
          <p className="text-slate-900 font-semibold">{data.nama_peminjam}</p>
          <p className="text-slate-500">NIP: {data.nip}</p>
          <div className="flex items-center gap-1.5 text-slate-600 pt-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>{data.unit_kerja}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Jadwal &amp; Keperluan</span>
          </div>
          <p className="text-slate-700">
            Mulai: <strong className="text-slate-900">{formatDateTimeDisplay(data.mulai)}</strong>
          </p>
          <p className="text-slate-700">
            Selesai: <strong className="text-slate-900">{formatDateTimeDisplay(data.selesai)}</strong>
          </p>
          <p className="text-slate-600 italic">"{data.keperluan}"</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Daftar Item yang Dipinjam ({(data.items || []).length})
          </h4>
        </div>
        <div className="space-y-2">
          {(data.items || []).map((pi) => (
            <div
              key={pi.id}
              className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block">{pi.item?.nama || `Item #${pi.item_id}`}</span>
                {pi.item?.registration_id && (
                  <span className="text-[10px] font-mono text-slate-500">{pi.item.registration_id}</span>
                )}
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                {pi.jumlah} unit
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Surat: <strong className="text-slate-700">{data.surat_peminjaman || '-'}</strong></span>
        </div>
        {data.petugas && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Petugas Verifikator: <strong className="text-slate-700">{data.petugas}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
