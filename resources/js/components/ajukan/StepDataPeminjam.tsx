import React from 'react';
import { User, CreditCard, Building } from 'lucide-react';

interface StepDataPeminjamProps {
  nip: string;
  namaPeminjam: string;
  unitKerja: string;
  onChangeField: (field: 'nip' | 'nama_peminjam' | 'unit_kerja', value: string) => void;
}

export const StepDataPeminjam: React.FC<StepDataPeminjamProps> = ({
  nip,
  namaPeminjam,
  unitKerja,
  onChangeField,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">2. Identitas Pemohon Peminjaman</h3>
        <p className="text-xs text-slate-500">
          Masukkan NIP resmi, nama lengkap berserta gelar, dan unit kerja di Kemenag Sleman.
        </p>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nomor Induk Pegawai (NIP) *
          </label>
          <div className="relative">
            <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={nip}
              onChange={(e) => onChangeField('nip', e.target.value)}
              placeholder="Contoh: 198504122010011003"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Lengkap Peminjam *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={namaPeminjam}
              onChange={(e) => onChangeField('nama_peminjam', e.target.value)}
              placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Ag."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Unit Kerja / Seksi / KUA *
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={unitKerja}
              onChange={(e) => onChangeField('unit_kerja', e.target.value)}
              placeholder="Contoh: Seksi Pendidikan Madrasah (Penma)"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
