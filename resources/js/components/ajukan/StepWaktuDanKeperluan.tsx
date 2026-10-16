import React from 'react';
import { Calendar, FileText, AlertCircle } from 'lucide-react';
import { TimePicker24 } from '../common/TimePicker24';
import { extractDateParts, buildDateTimeString, isDateTimeRangeValid } from '../../utils/date';

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
  const startParts = extractDateParts(mulai);
  const endParts = extractDateParts(selesai);

  const startDate = startParts.date;
  const startTime = startParts.time || '08:00';

  const endDate = endParts.date || startDate;
  const endTime = endParts.time || '15:00';

  const isInvalidRange = Boolean(mulai && selesai && !isDateTimeRangeValid(mulai, selesai));

  const handleDateChange = (type: 'start' | 'end', newDate: string) => {
    if (type === 'start') {
      const updatedMulai = buildDateTimeString(newDate, startTime);
      onChangeField('mulai', updatedMulai);

      // Jika tanggal selesai belum ada atau mendahului tanggal mulai baru, sesuaikan tanggal selesai
      if (!endDate || endDate < newDate) {
        const updatedSelesai = buildDateTimeString(newDate, endTime);
        onChangeField('selesai', updatedSelesai);
      }
    } else {
      const updatedSelesai = buildDateTimeString(newDate, endTime);
      onChangeField('selesai', updatedSelesai);
    }
  };

  const handleTimeChange = (type: 'start' | 'end', newTime: string) => {
    if (type === 'start') {
      const updatedMulai = buildDateTimeString(startDate, newTime);
      onChangeField('mulai', updatedMulai);
    } else {
      const updatedSelesai = buildDateTimeString(endDate || startDate, newTime);
      onChangeField('selesai', updatedSelesai);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">3. Jadwal &amp; Keperluan Peminjaman</h3>
        <p className="text-xs text-slate-500">
          Tentukan rentang tanggal dan jam pelaksanaan kegiatan dinas secara tepat.
        </p>
      </div>

      {/* Bagian Pemilihan Tanggal (Tetap Menggunakan Kalender Standar Sistem yang Sudah Ada) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="tanggal-mulai-input" className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Mulai Pelaksanaan *
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="tanggal-mulai-input"
              type="date"
              required
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966] transition cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tanggal-selesai-input" className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Selesai Pelaksanaan *
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="tanggal-selesai-input"
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966] transition cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Bagian Pemilihan Waktu (Format 24 Jam Minimalis dengan Pemilih Jam & Menit Terpisah) */}
      <div className="space-y-1.5 pt-1">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Pilih Waktu</h4>
          <p className="text-xs text-slate-500">
            Tentukan jam mulai dan jam selesai (format 24 jam).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <TimePicker24
            id="jam-mulai-picker"
            label="Jam Mulai *"
            popupTitle="Pilih jam mulai"
            value={startTime}
            onChange={(val) => handleTimeChange('start', val)}
          />

          <TimePicker24
            id="jam-selesai-picker"
            label="Jam Selesai *"
            popupTitle="Pilih jam selesai"
            value={endTime}
            alignRight
            isInvalid={isInvalidRange}
            onChange={(val) => handleTimeChange('end', val)}
          />
        </div>
      </div>

      {/* Pesan Validasi Rentang Waktu Tidak Valid */}
      {isInvalidRange && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Waktu selesai harus lebih akhir dari waktu mulai pelaksanaan.</span>
        </div>
      )}

      {/* Rincian Keperluan / Agenda Kegiatan (Tetap Dipertahankan) */}
      <div>
        <label htmlFor="keperluan-textarea" className="block text-xs font-semibold text-slate-700 mb-1">
          Rincian Keperluan / Agenda Kegiatan *
        </label>
        <div className="relative">
          <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <textarea
            id="keperluan-textarea"
            required
            rows={3}
            value={keperluan}
            onChange={(e) => onChangeField('keperluan', e.target.value)}
            placeholder="Jelaskan nama kegiatan, peserta yang hadir, dan tujuan peminjaman secara jelas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966] transition"
          />
        </div>
      </div>
    </div>
  );
};
