import React from 'react';
import { UploadCloud, FileCheck, CheckCircle } from 'lucide-react';

interface StepUnggahSuratProps {
  suratName: string;
  onFileChange: (fileName: string) => void;
  nip: string;
  namaPeminjam: string;
  mulai: string;
  selesai: string;
}

export const StepUnggahSurat: React.FC<StepUnggahSuratProps> = ({
  suratName,
  onFileChange,
  nip,
  namaPeminjam,
  mulai,
  selesai,
}) => {
  const handleDummyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file.name);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">4. Unggah Surat Permohonan &amp; Konfirmasi</h3>
        <p className="text-xs text-slate-500">
          Lampirkan surat permohonan dinas bertanda tangan pimpinan unit kerja (format PDF).
        </p>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700 mb-1">
          Pilih file surat permohonan peminjaman
        </p>
        <p className="text-[11px] text-slate-400 mb-3">Format PDF, DOC, atau Scan (Maks. 5 MB)</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs">
          <span>Telusuri Dokumen</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.png"
            onChange={handleDummyUpload}
            className="hidden"
          />
        </label>
        {suratName && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-medium">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>{suratName}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
          <CheckCircle className="w-4 h-4 text-[#009966]" />
          Ringkasan Pemohon
        </div>
        <p><strong>Nama:</strong> {namaPeminjam || '-'} (NIP. {nip || '-'})</p>
        <p><strong>Rentang Waktu:</strong> {mulai || '-'} s/d {selesai || '-'}</p>
      </div>
    </div>
  );
};
