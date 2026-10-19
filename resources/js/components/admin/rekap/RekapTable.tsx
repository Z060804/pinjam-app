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

      {/* Mobile Card View (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Data tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Tidak ada data peminjaman yang sesuai kriteria filter.</p>
          </div>
        ) : (
          filtered.map((p) => {
            const cfg = STATUS_CONFIG[p.status];
            const StatusIcon = cfg.icon;
            const isExternal = p.applicant_type === 'external' || (p.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
            return (
              <div key={`m-${p.id}`} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {p.is_recurring ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {formatDate(p.tgl_mulai)} – {formatDate(p.tgl_selesai)}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Peminjaman Berulang
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {p.recurring_frequency || 'Setiap Minggu'} • {p.waktu_mulai} – {p.waktu_selesai} WIB ({p.total_sessions} Sesi)
                        </p>
                        {Boolean(p.cancelled_sessions_count && p.cancelled_sessions_count > 0) && (
                          <span className="text-[10px] text-amber-700 font-medium block">
                            {p.status_summary}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-slate-900">{formatDate(p.tgl_mulai)}</span>
                        <p className="text-[11px] text-slate-500">
                          {p.waktu_mulai} – {p.waktu_selesai} WIB
                          {p.tgl_selesai !== p.tgl_mulai && ` s.d. ${formatDate(p.tgl_selesai)}`}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} shrink-0`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Peminjam</span>
                    <span className="font-bold text-slate-800 truncate block">{p.nama_pemohon}</span>
                    <span className="text-[10px] text-slate-400">{isExternal ? 'Eksternal' : 'Internal'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Unit / Instansi</span>
                    <span className="text-slate-700 truncate block">{p.unit_pemohon}</span>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">Item & Keperluan</span>
                  <p className="font-semibold text-slate-800 truncate">{p.item_dipinjam}</p>
                  <p className="text-[#009966] text-[11px] truncate">{p.kegiatan}</p>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    id={`rekap-detail-btn-m-${p.id}`}
                    type="button"
                    onClick={() => onSelectPermohonan(p)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail Permohonan
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop / Tablet Table View (>= md): fits 100% width with NO horizontal scroll */}
      <div className="hidden md:block">
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
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="w-[19%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Jadwal</th>
                <th className="w-[15%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Peminjam</th>
                <th className="w-[10%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Layanan</th>
                <th className="w-[13%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Unit Kerja</th>
                <th className="w-[15%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Keperluan</th>
                <th className="w-[10%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Item</th>
                <th className="w-[9%] text-left px-3 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="w-[9%] text-center px-2 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const cfg = STATUS_CONFIG[p.status];
                const StatusIcon = cfg.icon;
                const isExternal = p.applicant_type === 'external' || (p.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/60 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="px-3 py-2.5">
                      {p.is_recurring ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">
                              {formatDate(p.tgl_mulai)} – {formatDate(p.tgl_selesai)}
                            </span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Peminjaman Berulang
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {p.recurring_frequency || 'Setiap Minggu'} • {p.waktu_mulai} – {p.waktu_selesai} WIB
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.total_sessions ? `${p.total_sessions} Sesi` : (p.session_label ?? 'Berulang')}
                            </span>
                            {Boolean(p.cancelled_sessions_count && p.cancelled_sessions_count > 0) && (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                {p.status_summary ?? `${p.active_sessions_count} aktif, ${p.cancelled_sessions_count} dibatalkan`}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-slate-800">{formatDate(p.tgl_mulai)}</div>
                          <div className="text-[10px] text-slate-400">{p.waktu_mulai} – {p.waktu_selesai} WIB</div>
                          {p.tgl_selesai !== p.tgl_mulai && (
                            <div className="text-[10px] text-slate-400">s.d. {formatDate(p.tgl_selesai)}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 mb-0.5">
                        {isExternal ? (
                          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Eksternal
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Internal
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate" title={p.nama_pemohon}>{p.nama_pemohon}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.nomor_hp ?? '-'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.kategori_list && p.kategori_list.length > 1 ? (
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                          Multi ({p.kategori_list.length})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                          {JENIS_LABELS[p.jenis] ?? (p.jenis ? p.jenis.charAt(0).toUpperCase() + p.jenis.slice(1) : 'Ruangan')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-slate-600 truncate" title={p.unit_pemohon}>{p.unit_pemohon}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-semibold text-[#009966] truncate" title={p.kegiatan}>{p.kegiatan}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-slate-700 truncate" title={p.item_dipinjam}>
                        {p.item_dipinjam}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} truncate max-w-full`}>
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{cfg.label}</span>
                      </span>
                      {Boolean(p.is_recurring && p.cancelled_sessions_count && p.cancelled_sessions_count > 0 && p.status !== 'Dibatalkan') && (
                        <div className="text-[9px] text-amber-600 font-semibold mt-0.5 truncate">
                          {p.active_sessions_count}/{p.total_sessions} Sesi Aktif
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                      <button
                        id={`rekap-detail-btn-${p.id}`}
                        type="button"
                        onClick={() => onSelectPermohonan(p)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>Detail</span>
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
