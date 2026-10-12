import React from 'react';
import { MasterPeminjaman } from '../../types';
import { X, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface EventDetailModalProps {
  event: MasterPeminjaman | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const tglMulai = (event.tgl_mulai || event.mulai || '').substring(0, 10);
  const tglSelesai = (event.tgl_selesai || event.selesai || tglMulai).substring(0, 10);
  const isMultiDay = tglMulai && tglSelesai && tglMulai !== tglSelesai;

  const waktuMulai = event.waktu_mulai || (event.mulai?.includes(' ') ? event.mulai.split(' ')[1].substring(0, 5) : '08:00');
  const waktuSelesai = event.waktu_selesai || (event.selesai?.includes(' ') ? event.selesai.split(' ')[1].substring(0, 5) : '16:00');

  const itemName = event.item_dipinjam || event.ruangan || 'Sarana Prasarana';
  const kegiatanName = event.kegiatan || event.keperluan || 'Agenda Kegiatan';
  const pemohon = event.nama_pemohon || event.nama_peminjam;
  const unit = event.unit_pemohon || event.unit_kerja;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
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

        {/* Content matching screenshot #3 */}
        <div className="py-5 space-y-4">
          {/* RUANGAN / ITEM PINJAMAN */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {event.jenis === 'kendaraan' ? 'KENDARAAN' : event.jenis === 'perlengkapan' ? 'PERLENGKAPAN' : 'RUANGAN / ITEM'}
            </p>
            <p className="text-sm font-bold text-slate-800">
              {itemName}
            </p>
          </div>

          {/* PEMOHON & INSTANSI */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              PEMOHON &amp; INSTANSI
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {pemohon} {unit ? `(${unit})` : ''}
            </p>
          </div>

          {/* TANGGAL */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TANGGAL
            </p>
            <p className="text-sm font-bold text-slate-800">
              {isMultiDay
                ? `${formatDate(tglMulai)} s.d. ${formatDate(tglSelesai)}`
                : formatDate(tglMulai)}
            </p>
            {isMultiDay && (
              <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Peminjaman multi-hari (habis pada {formatDate(tglSelesai)})
              </span>
            )}
          </div>

          {/* WAKTU */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              WAKTU
            </p>
            <p className="text-sm font-bold text-slate-800">
              {waktuMulai} – {waktuSelesai} WIB
            </p>
          </div>

          {/* STATUS */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              STATUS
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {event.status || 'Disetujui'}
            </span>
          </div>
        </div>

        {/* Footer with green Tutup button matching screenshot #3 */}
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
