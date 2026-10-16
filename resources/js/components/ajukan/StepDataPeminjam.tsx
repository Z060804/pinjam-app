import React from 'react';
import { User, CreditCard, Building, Phone, AlertTriangle } from 'lucide-react';

interface StepDataPeminjamProps {
  applicantType: 'internal' | 'external';
  nip: string;
  namaPeminjam: string;
  unitKerja: string;
  nomorHp?: string;
  onChangeApplicantType: (type: 'internal' | 'external') => void;
  onChangeField: (field: 'nip' | 'nama_peminjam' | 'unit_kerja' | 'nomor_hp', value: string) => void;
  roomCount?: number;
  vehicleCount?: number;
}

export const StepDataPeminjam: React.FC<StepDataPeminjamProps> = ({
  applicantType,
  nip,
  namaPeminjam,
  unitKerja,
  nomorHp = '',
  onChangeApplicantType,
  onChangeField,
  roomCount = 0,
  vehicleCount = 0,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">2. Identitas Pemohon Peminjaman</h3>
        <p className="text-xs text-slate-500">
          Pilih jenis pemohon dan lengkapi data identitas yang diperlukan untuk pengajuan peminjaman.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Pilihan Jenis Pemohon */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Jenis Pemohon *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                applicantType === 'internal'
                  ? 'border-[#009966] bg-emerald-50/50 shadow-xs ring-1 ring-[#009966]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applicant_type"
                value="internal"
                checked={applicantType === 'internal'}
                onChange={() => onChangeApplicantType('internal')}
                className="mt-0.5 text-[#009966] focus:ring-[#009966]"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800">Internal Kemenag Sleman</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Pegawai Kankemenag Sleman (wajib mengisi NIP resmi)
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                applicantType === 'external'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="applicant_type"
                value="external"
                checked={applicantType === 'external'}
                onChange={() => onChangeApplicantType('external')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800">Eksternal (Madrasah/KUA/Lainnya)</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Madrasah, KUA, atau instansi pemohon luar (tanpa NIP, wajib surat resmi)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Peringatan jika kuota eksternal terlampaui */}
        {applicantType === 'external' && (roomCount > 1 || vehicleCount > 1) && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Peringatan Kuota Eksternal:</strong> Keranjang Anda memuat{' '}
              {roomCount > 1 ? `${roomCount} ruangan` : ''}
              {roomCount > 1 && vehicleCount > 1 ? ' dan ' : ''}
              {vehicleCount > 1 ? `${vehicleCount} kendaraan` : ''}. Pemohon eksternal dibatasi maksimal 1 ruangan dan 1 kendaraan. Silakan kurangi item di keranjang sebelum melanjutkan.
            </p>
          </div>
        )}

        {/* NIP - Hanya ditampilkan dan wajib untuk pemohon Internal */}
        {applicantType === 'internal' && (
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
        )}

        {/* Nama Lengkap Peminjam - Wajib untuk kedua jenis pemohon */}
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

        {/* Asal Instansi / Unit Kerja - Wajib untuk kedua jenis pemohon */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Asal Instansi / Unit Kerja *
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={unitKerja}
              onChange={(e) => onChangeField('unit_kerja', e.target.value)}
              placeholder={
                applicantType === 'internal'
                  ? 'Contoh: Seksi Pendidikan Madrasah, KUA, atau unit kerja Kemenag'
                  : 'Contoh: MTs Negeri ..., MI ..., KUA ..., atau instansi asal'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>

        {/* Nomor WhatsApp / HP Aktif - Wajib untuk kedua jenis pemohon */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nomor WhatsApp / HP Aktif *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={nomorHp}
              onChange={(e) => onChangeField('nomor_hp', e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
