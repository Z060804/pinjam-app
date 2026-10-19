import React, { useState } from 'react';
import { Clock, Copy, Check, Search, ArrowRight, Repeat } from 'lucide-react';
import { copyTextToClipboard } from '../../utils/clipboard';
import { formatDateIndonesianWithDay } from '../../utils/date';

interface SuccessModalProps {
  idPeminjaman: string;
  status?: string;
  isRecurring?: boolean;
  recurringFrequency?: string | null;
  recurringEndDate?: string | null;
  recurringSchedules?: Array<{
    id_peminjaman: string;
    tgl_mulai: string;
    waktu_mulai: string;
    waktu_selesai: string;
    status: string;
  }>;
  onTrack: (id: string) => void;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  idPeminjaman,
  status = 'Menunggu Persetujuan',
  isRecurring = false,
  recurringFrequency,
  recurringEndDate,
  recurringSchedules = [],
  onTrack,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    const success = await copyTextToClipboard(idPeminjaman);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3.5 border border-amber-200 shadow-xs">
          <Clock className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">Permohonan Berhasil Dikirim</h3>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
          <Clock className="w-3.5 h-3.5" />
          Status: {status}
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Permohonan telah tercatat dan sedang menunggu pemeriksaan admin. Simpan nomor pemesanan di bawah ini untuk memantau status secara berkala.
        </p>

        {/* Box Nomor Pemesanan Resmi dari Backend */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Nomor Pemesanan
            </span>
            <span className="font-mono text-sm font-extrabold text-slate-900">{idPeminjaman}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>

        {/* Rincian Peminjaman Berulang jika Ada */}
        {isRecurring && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 mb-5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-[#009966]" />
                Peminjaman Berulang Mingguan
              </span>
              {recurringSchedules.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {recurringSchedules.length} Jadwal Terdaftar
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-700">
              Permohonan induk: <strong>{idPeminjaman}</strong>. Seluruh tanggal pertemuan tercatat dalam sistem dan menunggu verifikasi admin secara serentak.
            </p>
            {recurringSchedules.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-emerald-200/60 text-xs">
                {recurringSchedules.map((s, idx) => (
                  <div key={s.id_peminjaman} className="flex items-center justify-between text-[11px] text-slate-700">
                    <span>
                      {idx + 1}. {formatDateIndonesianWithDay(s.tgl_mulai)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{s.id_peminjaman}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onTrack(idPeminjaman)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#009966] hover:bg-[#008055] transition-all cursor-pointer shadow-xs"
          >
            <Search className="w-4 h-4" />
            Lacak Status Permohonan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
