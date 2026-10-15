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
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Daftar Sarana Prasarana Dipinjam ({permohonan.items?.length ?? 1} Item)
        </p>
        {permohonan.items && permohonan.items.length > 0 ? (
          <div className="space-y-1.5">
            {permohonan.items.map((it, idx) => {
              const kat = it.kategori ?? (it.id_jenis === 1 ? 'ruangan' : it.id_jenis === 2 ? 'kendaraan' : 'perlengkapan');
              return (
                <div
                  key={it.id ?? idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                        kat === 'ruangan'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : kat === 'kendaraan'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {kat}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{it.nama}</span>
                    {it.registration_id && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">({it.registration_id})</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                    {it.jumlah} Unit
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700">{permohonan.item_dipinjam}</p>
        )}
      </div>
    </div>
  );
};
