import React from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import { Permohonan, RekapStatusFilter } from '../../../types/admin';
import { STATUS_CONFIG, STATUS_TABS } from '../statusConfig';
import { formatDate } from '../../../utils/format';

const JENIS_LABELS: Record<string, string> = {
  ruangan: 'Ruangan',
  kendaraan: 'Kendaraan',
  perlengkapan: 'Perlengkapan',
  kombinasi: 'Multi-Item',
};

interface RekapTableProps {
  list: Permohonan[];
  filtered: Permohonan[];
  loading: boolean;
  activeTab: RekapStatusFilter;
  onTabChange: (tab: RekapStatusFilter) => void;
  onSelectPermohonan: (p: Permohonan) => void;
}

export const RekapTable: React.FC<RekapTableProps> = ({
  list,
  filtered,
  loading,
  activeTab,
  onTabChange,
  onSelectPermohonan,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="flex overflow-x-auto border-b border-slate-100 px-4 pt-4 gap-1 pb-0 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            id={`rekap-tab-${tab.replace(/\s/g, '-')}`}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`px-3.5 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === tab
                ? 'text-[#009966] border-[#009966] bg-emerald-50'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab === 'Semua' ? `Semua (${list.length})` : tab}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 text-slate-500 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Data tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Tidak ada data peminjaman yang sesuai kriteria filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jadwal Peminjaman</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Nama Peminjam</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jenis Layanan</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Unit Kerja</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Keperluan</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Item Dipinjam</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const cfg = STATUS_CONFIG[p.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/60 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">{formatDate(p.tgl_mulai)}</div>
                      <div className="text-[10px] text-slate-400">{p.waktu_mulai} – {p.waktu_selesai}</div>
                      {p.tgl_selesai !== p.tgl_mulai && (
                        <div className="text-[10px] text-slate-400">s.d. {formatDate(p.tgl_selesai)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-800">{p.nama_pemohon}</div>
                      <div className="text-[10px] text-slate-400">{p.nomor_hp ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.kategori_list && p.kategori_list.length > 1 ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            Multi-Item ({p.kategori_list.length} Kategori)
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.kategori_list.map((k) => (
                              <span
                                key={k}
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  k === 'ruangan'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : k === 'kendaraan'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {JENIS_LABELS[p.jenis] ?? (p.jenis ? p.jenis.charAt(0).toUpperCase() + p.jenis.slice(1) : 'Ruangan')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 max-w-[130px] truncate">{p.unit_pemohon}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-[#009966] max-w-[160px] truncate">{p.kegiatan}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 max-w-[160px] truncate" title={p.item_dipinjam}>
                        {p.item_dipinjam}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        id={`rekap-detail-btn-${p.id}`}
                        type="button"
                        onClick={() => onSelectPermohonan(p)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
        Menampilkan {filtered.length} dari {list.length} data.
      </div>
    </div>
  );
};
