import React from 'react';
import { MasterPeminjaman } from '../../types';
import { CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface EventDetailBodyProps {
  event: MasterPeminjaman;
}

export const EventDetailBody: React.FC<EventDetailBodyProps> = ({ event }) => {
  const tglMulai = (event.tgl_mulai ?? event.mulai ?? '').substring(0, 10);
  const tglSelesai = (event.tgl_selesai ?? event.selesai ?? tglMulai).substring(0, 10);
  const isMultiDay = Boolean(tglMulai && tglSelesai && tglMulai !== tglSelesai);

  const waktuMulai = event.waktu_mulai ?? (event.mulai?.includes(' ') ? event.mulai.split(' ')[1].substring(0, 5) : '08:00');
  const waktuSelesai = event.waktu_selesai ?? (event.selesai?.includes(' ') ? event.selesai.split(' ')[1].substring(0, 5) : '16:00');

  const itemName = event.item_dipinjam ?? event.ruangan ?? 'Sarana Prasarana';
  const pemohon = event.nama_pemohon ?? event.nama_peminjam;
  const unit = event.unit_pemohon ?? event.unit_kerja;
  const labelKategori = event.jenis === 'kendaraan' ? 'KENDARAAN' : event.jenis === 'perlengkapan' ? 'PERLENGKAPAN' : 'RUANGAN / ITEM';

  return (
    <div className="py-5 space-y-4">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{labelKategori}</p>
        <p className="text-sm font-bold text-slate-800">{itemName}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">PEMOHON &amp; INSTANSI</p>
        <p className="text-sm font-semibold text-slate-700">{pemohon} {unit ? `(${unit})` : ''}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">TANGGAL</p>
        <p className="text-sm font-bold text-slate-800">
          {isMultiDay ? `${formatDate(tglMulai)} s.d. ${formatDate(tglSelesai)}` : formatDate(tglMulai)}
        </p>
        {isMultiDay && (
          <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            Peminjaman multi-hari (habis pada {formatDate(tglSelesai)})
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">WAKTU</p>
        <p className="text-sm font-bold text-slate-800">{waktuMulai} – {waktuSelesai} WIB</p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">STATUS</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {event.status ?? 'Disetujui'}
        </span>
      </div>
    </div>
  );
};
