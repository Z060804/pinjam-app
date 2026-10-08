import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Search, ArrowRight } from 'lucide-react';

interface SuccessModalProps {
  idPeminjaman: string;
  onTrack: (id: string) => void;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ idPeminjaman, onTrack, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(idPeminjaman);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#009966] flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Permohonan Berhasil Dikirim!</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Permohonan peminjaman Anda telah tercatat dalam sistem SIMPRU Kemenag Sleman dan sedang
          menunggu verifikasi petugas.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">ID Peminjaman</span>
            <span className="font-mono text-sm font-bold text-slate-900">{idPeminjaman}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onTrack(idPeminjaman)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#009966] hover:bg-[#008055] transition-all cursor-pointer shadow-xs"
          >
            <Search className="w-4 h-4" />
            Lacak Status Permohonan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
