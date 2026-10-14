import React from 'react';
import { UploadCloud, FileCheck, CheckCircle, AlertTriangle, Trash2, FileText } from 'lucide-react';

export const MAX_SURAT_SIZE_BYTES = 1048576; // 1 MB (1.048.576 byte)

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface StepUnggahSuratProps {
  suratName: string;
  file?: File | null;
  fileError?: string | null;
  onFileChange?: (fileName: string) => void;
  onFileSelect?: (file: File | null) => void;
  onErrorChange?: (error: string | null) => void;
  nip: string;
  namaPeminjam: string;
  mulai: string;
  selesai: string;
}

export const StepUnggahSurat: React.FC<StepUnggahSuratProps> = ({
  suratName,
  file,
  fileError,
  onFileChange,
  onFileSelect,
  onErrorChange,
  nip,
  namaPeminjam,
  mulai,
  selesai,
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    // Reset file input value to allow selecting the same file again if needed
    e.target.value = '';

    if (!selectedFile) return;

    const fileNameLower = selectedFile.name.toLowerCase();
    const isPdfExt = fileNameLower.endsWith('.pdf');
    const isPdfMime = selectedFile.type === '' || selectedFile.type === 'application/pdf';

    // 1. Validasi ekstensi dan tipe file (wajib PDF)
    if (!isPdfExt || !isPdfMime) {
      onFileSelect?.(null);
      onFileChange?.('');
      onErrorChange?.('Format berkas tidak didukung. Surat permohonan wajib berformat PDF (.pdf).');
      return;
    }

    // 2. Validasi batas ukuran file maksimal 1 MB (1.048.576 byte)
    if (selectedFile.size > MAX_SURAT_SIZE_BYTES) {
      const formattedSize = formatFileSize(selectedFile.size);
      onFileSelect?.(null);
      onFileChange?.('');
      onErrorChange?.(`Ukuran berkas (${formattedSize}) melebihi batas maksimal 1 MB (1.048.576 byte).`);
      return;
    }

    // File lolos validasi frontend
    onErrorChange?.(null);
    onFileSelect?.(selectedFile);
    onFileChange?.(selectedFile.name);
  };

  const handleRemoveFile = () => {
    onFileSelect?.(null);
    onFileChange?.('');
    onErrorChange?.(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">4. Unggah Surat Permohonan &amp; Konfirmasi</h3>
        <p className="text-xs text-slate-500">
          Lampirkan surat permohonan dinas bertanda tangan pimpinan unit kerja dalam format PDF (opsional).
        </p>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700 mb-1">
          Pilih file surat permohonan peminjaman
        </p>
        <p className="text-[11px] text-slate-500 mb-3">
          Hanya format <strong className="text-emerald-700">PDF (.pdf)</strong> dengan ukuran maksimal <strong className="text-emerald-700">1 MB (1.048.576 byte)</strong>
        </p>
        
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>{suratName ? 'Ganti Dokumen PDF' : 'Telusuri Dokumen PDF'}</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Indikator File Valid */}
        {suratName && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-medium max-w-full">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-xs">{suratName}</span>
            {file && (
              <span className="text-emerald-600 font-sans text-[11px]">
                ({formatFileSize(file.size)})
              </span>
            )}
            <button
              type="button"
              onClick={handleRemoveFile}
              className="ml-1 p-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
              title="Hapus berkas terpilih"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pesan Error Validasi Frontend */}
        {fileError && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{fileError}</span>
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
