import React from 'react';
import { Permohonan } from '../../../types/admin';

interface DetailBorrowerSectionProps {
  permohonan: Permohonan;
}

export const DetailBorrowerSection: React.FC<DetailBorrowerSectionProps> = ({ permohonan }) => {
  return (
    <div>
      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">
        Identitas &amp; Data Peminjam
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Pihak Peminjam</p>
          <p className="text-sm font-bold text-slate-800">{permohonan.pihak_pemohon}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Unit Kerja / Seksi</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.unit_pemohon}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Nama Lengkap Peminjam</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.nama_pemohon}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">NIP Peminjam</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.nip ?? '-'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Nomor WhatsApp / HP</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.nomor_hp ?? '-'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Penanggung Jawab Kegiatan</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.penanggung_jawab ?? '-'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Estimasi Jumlah Peserta</p>
          <p className="text-sm font-semibold text-slate-700">{permohonan.jumlah_peserta} orang</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase">Item Dipinjam</p>
        <p className="text-sm font-semibold text-slate-700">{permohonan.item_dipinjam}</p>
      </div>
    </div>
  );
};
