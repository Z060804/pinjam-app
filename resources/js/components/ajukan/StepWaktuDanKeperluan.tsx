import React from 'react';
import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react';

interface StepWaktuDanKeperluanProps {
  mulai: string;
  selesai: string;
  keperluan: string;
  onChangeField: (field: 'mulai' | 'selesai' | 'keperluan', value: string) => void;
}

export const StepWaktuDanKeperluan: React.FC<StepWaktuDanKeperluanProps> = ({
  mulai,
  selesai,
  keperluan,
  onChangeField,
}) => {
  const isInvalidRange = Boolean(mulai && selesai && new Date(selesai) <= new Date(mulai));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">3. Jadwal &amp; Keperluan Peminjaman</h3>
        <p className="text-xs text-slate-500">
          Tentukan rentang tanggal dan jam pelaksanaan kegiatan dinas secara tepat.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Waktu Mulai Peminjaman *
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="datetime-local"
              required
              value={mulai}
              onChange={(e) => onChangeField('mulai', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Waktu Selesai Peminjaman *
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="datetime-local"
              required
              value={selesai}
              onChange={(e) => onChangeField('selesai', e.target.value)}
              className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 ${
                isInvalidRange
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 focus:border-[#009966] focus:ring-[#009966]'
              }`}
            />
          </div>
        </div>
      </div>

      {isInvalidRange && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Waktu selesai harus lebih akhir dari waktu mulai pelaksanaan.</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Rincian Keperluan / Agenda Kegiatan *
        </label>
        <div className="relative">
          <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <textarea
            required
            rows={3}
            value={keperluan}
            onChange={(e) => onChangeField('keperluan', e.target.value)}
            placeholder="Jelaskan nama kegiatan, peserta yang hadir, dan tujuan peminjaman secara jelas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
          />
        </div>
      </div>
    </div>
  );
};
