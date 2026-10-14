import React, { useState } from 'react';
import { Hash, Check, Copy } from 'lucide-react';
import { copyTextToClipboard } from '../../../utils/clipboard';

interface DetailTrackingIdBadgeProps {
  id: string;
}

export const DetailTrackingIdBadge: React.FC<DetailTrackingIdBadgeProps> = ({ id }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    const success = await copyTextToClipboard(id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-6 mt-4 p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[#008055]">
          <Hash className="w-3.5 h-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider block">
            Nomor ID Pemesanan / Kode Pelacakan
          </span>
        </div>
        <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 tracking-wide select-all mt-0.5 block">
          {id}
        </span>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Berikan nomor ID ini kepada customer bila mereka lupa ID untuk melacak status di SIMPRU.
        </p>
      </div>
      <button
        id="btn-copy-id-detail"
        type="button"
        onClick={handleCopyId}
        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs ${
          copied
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-[#009966]'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Tersalin!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Salin ID</span>
          </>
        )}
      </button>
    </div>
  );
};
