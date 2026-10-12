import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Ban, FileText, ExternalLink, Copy, Check, Hash } from 'lucide-react';
import { Permohonan } from '../../types/admin';
import { updateStatusPermohonan } from '../../services/adminApi';
import { STATUS_CONFIG } from './statusConfig';
import { formatDate } from '../../utils/format';

import { copyTextToClipboard } from '../../utils/clipboard';

interface DetailPermohonanModalProps {
  permohonan: Permohonan;
  onClose: () => void;
  onStatusUpdated: (id: string, newStatus: Permohonan['status']) => void;
}

export const DetailPermohonanModal: React.FC<DetailPermohonanModalProps> = ({
  permohonan,
  onClose,
  onStatusUpdated,
}) => {
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[permohonan.status];
  const StatusIcon = cfg.icon;

  const handleCopyId = async () => {
    const success = await copyTextToClipboard(permohonan.id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeStatus = async (status: Permohonan['status']) => {
    setUpdating(true);
    try {
      await updateStatusPermohonan(permohonan.id, status);
      onStatusUpdated(permohonan.id, status);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-[#009966] uppercase tracking-wider mb-0.5">Detail Permohonan</p>
            <h2 className="text-lg font-extrabold text-slate-900">{permohonan.kegiatan}</h2>
          </div>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight ID Pemesanan / Kode Pelacakan (Fitur jika customer lupa ID) */}
        <div className="mx-6 mt-4 p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[#008055]">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                Nomor ID Pemesanan / Kode Pelacakan
              </span>
            </div>
            <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 tracking-wide select-all mt-0.5 block">
              {permohonan.id}
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

        <div className="px-6 py-4 space-y-5">
          {/* Status badge + action */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>

            {/* Status update buttons */}
            {permohonan.status === 'Menunggu Persetujuan' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Disetujui')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Setujui
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleChangeStatus('Tidak Disetujui')}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Tolak
                </button>
              </div>
            )}
            {(permohonan.status === 'Disetujui' || permohonan.status === 'Tidak Disetujui') && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleChangeStatus('Dibatalkan')}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                Batalkan
              </button>
            )}
          </div>

          {/* Data Peminjam */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">Identitas &amp; Data Peminjam</h3>
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
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Nomor WhatsApp / HP</p>
                <p className="text-sm font-semibold text-slate-700">{permohonan.nomor_hp || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Penanggung Jawab Kegiatan</p>
                <p className="text-sm font-semibold text-slate-700">{permohonan.penanggung_jawab || '-'}</p>
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

          {/* Jadwal Peminjaman */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">Jadwal &amp; Waktu Pelaksanaan</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tanggal Mulai</p>
                <p className="text-sm font-bold text-slate-800">{formatDate(permohonan.tgl_mulai)}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Mulai</p>
                <p className="text-sm font-bold text-slate-800">{permohonan.waktu_mulai}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tanggal Selesai</p>
                <p className="text-sm font-bold text-slate-800">{formatDate(permohonan.tgl_selesai)}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Waktu Selesai</p>
                <p className="text-sm font-bold text-slate-800">{permohonan.waktu_selesai}</p>
              </div>
            </div>
          </div>

          {/* Surat Permohonan */}
          {permohonan.surat_url && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-3">
              <FileText className="w-5 h-5 text-[#009966] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{permohonan.surat_url}</p>
                <p className="text-[10px] text-slate-400">Surat Permohonan Dinas</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-bold text-[#009966] hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            id="modal-tutup-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
