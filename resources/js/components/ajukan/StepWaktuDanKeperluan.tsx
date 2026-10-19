import React from 'react';
import { Calendar, FileText, AlertCircle, Repeat, ChevronDown, CheckCircle2 } from 'lucide-react';
import { TimePicker24 } from '../common/TimePicker24';
import {
  extractDateParts,
  buildDateTimeString,
  isDateTimeRangeValid,
  generateWeeklyDates,
  formatDateIndonesianWithDay,
} from '../../utils/date';

interface StepWaktuDanKeperluanProps {
  mulai: string;
  selesai: string;
  keperluan: string;
  onChangeField: (field: 'mulai' | 'selesai' | 'keperluan', value: string) => void;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringEndDate?: string;
  onChangeRecurring?: (isRecurring: boolean, frequency: string, endDate: string) => void;
}

export const StepWaktuDanKeperluan: React.FC<StepWaktuDanKeperluanProps> = ({
  mulai,
  selesai,
  keperluan,
  onChangeField,
  isRecurring = false,
  recurringFrequency = 'weekly',
  recurringEndDate = '',
  onChangeRecurring,
}) => {
  const startParts = extractDateParts(mulai);
  const endParts = extractDateParts(selesai);

  const startDate = startParts.date;
  const startTime = startParts.time || '08:00';

  const endDate = endParts.date || startDate;
  const endTime = endParts.time || '16:00';

  const isInvalidRange = Boolean(mulai && selesai && !isDateTimeRangeValid(mulai, selesai));

  const handleDateChange = (type: 'start' | 'end', newDate: string) => {
    if (type === 'start') {
      const updatedMulai = buildDateTimeString(newDate, startTime);
      onChangeField('mulai', updatedMulai);

      if (isRecurring) {
        // Pada peminjaman berulang, tanggal selesai tiap sesi berada di hari yang sama dengan tanggal mulai
        const updatedSelesai = buildDateTimeString(newDate, endTime);
        onChangeField('selesai', updatedSelesai);

        // Sesuaikan tanggal akhir pengulangan jika kosong atau mendahului tanggal mulai baru
        const updatedRecurringEndDate = (!recurringEndDate || recurringEndDate < newDate || recurringEndDate === startDate)
          ? newDate
          : recurringEndDate;
        onChangeRecurring?.(true, recurringFrequency, updatedRecurringEndDate);
      } else {
        if (!endDate || endDate < newDate) {
          const updatedSelesai = buildDateTimeString(newDate, endTime);
          onChangeField('selesai', updatedSelesai);
        }
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

  const handleToggleRecurring = (checked: boolean) => {
    if (checked) {
      const initialEndDate = (endDate && endDate >= startDate) ? endDate : startDate;
      const updatedSelesai = buildDateTimeString(startDate, endTime);
      onChangeField('selesai', updatedSelesai);
      onChangeRecurring?.(true, 'weekly', initialEndDate);
    } else {
      onChangeRecurring?.(false, 'weekly', '');
    }
  };

  // Kalkulasi pratinjau tanggal pengulangan mingguan
  const isEndBeforeStart = Boolean(isRecurring && recurringEndDate && recurringEndDate < startDate);
  const weeklyDates = isRecurring && recurringEndDate && !isEndBeforeStart
    ? generateWeeklyDates(startDate, recurringEndDate)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">3. Jadwal &amp; Keperluan Peminjaman</h3>
        <p className="text-xs text-slate-500">
          Tentukan rentang tanggal dan jam pelaksanaan kegiatan dinas secara tepat.
        </p>
      </div>

      {/* Bagian Pemilihan Tanggal (Kalender Standar Sistem yang Konsisten WIB) */}
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

      {/* Rincian Keperluan / Agenda Kegiatan */}
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

      {/* Panel Peminjaman Berulang (Sesuai Desain SiRuang yang Menyatu dengan SIMPRU) */}
      <div className="mt-5 pt-4 border-t border-slate-200/90 space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all">
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <input
                id="checkbox-peminjaman-berulang"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => handleToggleRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#009966] focus:ring-[#009966] accent-[#009966] cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="checkbox-peminjaman-berulang"
                className="text-sm font-bold text-slate-900 cursor-pointer flex items-center gap-1.5"
              >
                <Repeat className="w-4 h-4 text-[#009966]" />
                Peminjaman Berulang
              </label>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Aktifkan jika ruangan akan digunakan secara rutin, misalnya untuk kegiatan mingguan.
              </p>
            </div>
          </div>

          {/* Opsi Pengulangan Tambahan saat Checkbox Aktif */}
          {isRecurring && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="frekuensi-peminjaman-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Frekuensi Peminjaman
                  </label>
                  <div className="relative">
                    <select
                      id="frekuensi-peminjaman-select"
                      value={recurringFrequency}
                      onChange={(e) => onChangeRecurring?.(isRecurring, e.target.value, recurringEndDate)}
                      className="w-full appearance-none px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966] cursor-pointer"
                    >
                      <option value="weekly">Setiap Minggu</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="berulang-sampai-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Berulang Sampai *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="berulang-sampai-input"
                      type="date"
                      required={isRecurring}
                      min={startDate}
                      value={recurringEndDate}
                      onChange={(e) => onChangeRecurring?.(isRecurring, recurringFrequency, e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 transition cursor-pointer ${
                        isEndBeforeStart
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[#009966] focus:ring-[#009966]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Peringatan jika tanggal akhir pengulangan sebelum tanggal mulai */}
              {isEndBeforeStart && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Tanggal akhir pengulangan tidak boleh lebih awal dari tanggal mulai peminjaman.</span>
                </div>
              )}

              {/* Pratinjau Jadwal Peminjaman Mingguan */}
              {weeklyDates.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#009966]" />
                      Pratinjau Jadwal Peminjaman
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Total {weeklyDates.length} Pertemuan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Jadwal akan diajukan otomatis setiap 7 hari pada jam yang sama ({startTime} &ndash; {endTime} WIB):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 max-h-48 overflow-y-auto pr-1">
                    {weeklyDates.map((dStr, idx) => (
                      <li key={dStr} className="py-0.5">
                        <span className="font-semibold text-slate-800">{formatDateIndonesianWithDay(dStr)}</span>
                        {idx === 0 && <span className="ml-1.5 text-[10px] text-[#009966] font-bold">(Jadwal Pertama)</span>}
                      </li>
                    ))}
                  </ol>
                  {weeklyDates.length === 1 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      💡 <strong>Petunjuk:</strong> Saat ini baru 1 pertemuan terjadwal. Anda dapat memperpanjang rentang pengulangan dengan memilih tanggal batas akhir pada kolom <em>"Berulang Sampai"</em> di atas.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 text-center text-xs text-slate-500">
                  Pilih rentang tanggal yang valid untuk melihat pratinjau jadwal pengulangan mingguan.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
