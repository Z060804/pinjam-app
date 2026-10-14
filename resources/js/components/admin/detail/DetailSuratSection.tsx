import React, { useState } from 'react';
import axios from 'axios';
import { FileText, ExternalLink } from 'lucide-react';
import { getAdminToken } from '../../../services/adminApi';

interface DetailSuratSectionProps {
  id: string;
  suratUrl?: string | null;
  suratPeminjaman?: string | null;
}

export const DetailSuratSection: React.FC<DetailSuratSectionProps> = ({
  id,
  suratUrl,
  suratPeminjaman,
}) => {
  const [openingSurat, setOpeningSurat] = useState(false);

  const handleOpenSurat = async () => {
    if (!suratUrl) return;
    if (suratUrl.startsWith('http')) {
      window.open(suratUrl, '_blank');
      return;
    }
    setOpeningSurat(true);
    try {
      const token = getAdminToken();
      const res = await axios.get(`/api/peminjaman/${encodeURIComponent(id)}/surat`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      });
      const contentType = res.headers['content-type'];
      const blobType = typeof contentType === 'string' ? contentType : 'application/pdf';
      const fileBlob = new Blob([res.data], { type: blobType });
      const fileBlobUrl = window.URL.createObjectURL(fileBlob);
      window.open(fileBlobUrl, '_blank');
    } catch {
      alert('Gagal membuka berkas surat: akses ditolak atau berkas tidak ditemukan.');
    } finally {
      setOpeningSurat(false);
    }
  };

  if (suratUrl || suratPeminjaman) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-3">
        <FileText className="w-5 h-5 text-[#009966] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">
            {suratPeminjaman ?? suratUrl}
          </p>
          <p className="text-[10px] text-slate-500">Berkas Surat Permohonan Dinas Terlampir</p>
        </div>
        <button
          type="button"
          disabled={openingSurat}
          onClick={handleOpenSurat}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-[#009966] text-white hover:bg-[#008055] rounded-lg transition cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {openingSurat ? 'Membuka...' : 'Buka & Cek Surat'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-xs">
      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
      <span>Surat Permohonan Tidak Dilampirkan</span>
    </div>
  );
};
