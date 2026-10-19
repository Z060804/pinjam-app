import React from 'react';
import { MasterPeminjaman } from '../../types';
import { CheckCircle2, Repeat, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface EventDetailBodyProps {
  event: MasterPeminjaman;
}

export const EventDetailBody: React.FC<EventDetailBodyProps> = ({ event }) => {
  const tglMulai = (event.tgl_mulai ?? event.mulai ?? '').substring(0, 10);
  const tglSelesai = (event.tgl_selesai ?? event.selesai ?? tglMulai).substring(0, 10);
  const isMultiDay = Boolean(tglMulai && tglSelesai && tglMulai !== tglSelesai && !event.is_recurring);

  const waktuMulai = event.waktu_mulai ?? (event.mulai?.includes(' ') ? event.mulai.split(' ')[1].substring(0, 5) : '08:00');
  const waktuSelesai = event.waktu_selesai ?? (event.selesai?.includes(' ') ? event.selesai.split(' ')[1].substring(0, 5) : '16:00');

  const itemName = event.item_dipinjam ?? event.ruangan ?? 'Sarana Prasarana';
  const pemohon = event.nama_pemohon ?? event.nama_peminjam;
  const unit = event.unit_pemohon ?? event.unit_kerja;
  const isExternal = event.applicant_type === 'external' || (event.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
  const labelKategori = event.jenis === 'kendaraan' ? 'KENDARAAN' : event.jenis === 'perlengkapan' ? 'PERLENGKAPAN' : event.jenis === 'kombinasi' ? 'MULTI-ITEM (LINTAS KATEGORI)' : 'RUANGAN / ITEM';

  return (
    <div className="py-5 space-y-4">
      {/* Penanda Visual Peminjaman Berulang jika Berlaku */}
      {event.is_recurring && (
        <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Repeat className="w-3.5 h-3.5 text-blue-600" />
              Peminjaman Berulang
            </span>
            {event.session_label && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-900 border border-blue-300">
                {event.session_label}
              </span>
            )}
          </div>
          {event.next_session_date && (
            <p className="text-[11px] text-blue-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Jadwal sesi berikutnya: <strong>{formatDate(event.next_session_date)}</strong>
            </p>
          )}
          {event.parent_id && (
            <p className="text-[10px] font-mono text-blue-600">
              Registrasi Induk: {event.parent_registration_id ?? event.parent_id}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{labelKategori}</p>
        <p className="text-sm font-bold text-slate-800">{itemName}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">PEMOHON &amp; ASAL INSTANSI</p>
        <div className="flex items-center gap-2 mb-1">
          {isExternal ? (
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              Eksternal
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Internal Kemenag Sleman
            </span>
          )}
        </div>
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
