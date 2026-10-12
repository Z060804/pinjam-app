import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalIcon,
  RotateCcw,
  FileText,
  Eye,
  ChevronDown,
  Table,
} from 'lucide-react';
import { Permohonan, RekapStatusFilter } from '../../types/admin';
import { MasterPeminjaman } from '../../types';
import { getPermohonan } from '../../services/adminApi';
import { DetailPermohonanModal } from './DetailPermohonanModal';
import { CalendarContainer } from '../calendar/CalendarContainer';
import { STATUS_CONFIG, STATUS_TABS } from './statusConfig';
import { formatDate } from '../../utils/format';

const JENIS_LABELS: Record<Permohonan['jenis'], string> = {
  ruangan: 'Ruangan',
  kendaraan: 'Kendaraan',
  perlengkapan: 'Perlengkapan',
};

export const RekapPeminjamanView: React.FC = () => {
  const [list, setList] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<'tabel' | 'kalender'>('tabel');
  const [activeTab, setActiveTab] = useState<RekapStatusFilter>('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPermohonan, setSelectedPermohonan] = useState<Permohonan | null>(null);
  const [jenisFilter, setJenisFilter] = useState<'Semua' | 'ruangan' | 'kendaraan' | 'perlengkapan'>('Semua');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPermohonan();
      setList(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdated = (id: string, newStatus: Permohonan['status']) => {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    setSelectedPermohonan((prev) => (prev?.id === id ? { ...prev, status: newStatus } : prev));
  };

  const resetFilter = () => {
    setDateFrom('');
    setDateTo('');
    setActiveTab('Semua');
    setJenisFilter('Semua');
  };

  const filtered = list.filter((p) => {
    const matchStatus = activeTab === 'Semua' || p.status === activeTab;
    const matchJenis = jenisFilter === 'Semua' || p.jenis === jenisFilter;
    const matchFrom = !dateFrom || p.tgl_mulai >= dateFrom;
    const matchTo = !dateTo || p.tgl_mulai <= dateTo;

    return matchStatus && matchJenis && matchFrom && matchTo;
  });

  const counts = {
    total: list.length,
    menunggu: list.filter((p) => p.status === 'Menunggu Persetujuan').length,
    disetujui: list.filter((p) => p.status === 'Disetujui').length,
    ditolak: list.filter((p) => p.status === 'Tidak Disetujui').length,
    dibatalkan: list.filter((p) => p.status === 'Dibatalkan').length,
  };

  const approvedList = list.filter((p) => p.status === 'Disetujui');

  // Kalender customer bertipe MasterPeminjaman, admin bertipe Permohonan.
  // Dipetakan eksplisit di sini supaya TypeScript tetap memeriksa bentuknya.
  const approvedEvents: MasterPeminjaman[] = approvedList.map((p) => ({
    ...p,
    id_peminjaman: p.id,
    nama_peminjam: p.nama_pemohon,
    unit_kerja: p.unit_pemohon,
    mulai: `${p.tgl_mulai} ${p.waktu_mulai}`,
    selesai: `${p.tgl_selesai} ${p.waktu_selesai}`,
    keperluan: p.kegiatan,
    surat_peminjaman: p.surat_url,
    petugas: null,
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#009966] uppercase tracking-widest">Rekap Administrasi</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Rekap Peminjaman</h1>
          <p className="text-sm text-[#009966] mt-1">
            Tinjau riwayat peminjaman berdasarkan periode, jenis item, status, dan pantau jadwal peminjaman di kalender.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs">
            <button
              id="admin-view-table-btn"
              type="button"
              onClick={() => setAdminViewMode('tabel')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminViewMode === 'tabel'
                  ? 'bg-[#009966] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              id="admin-view-calendar-btn"
              type="button"
              onClick={() => setAdminViewMode('kalender')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminViewMode === 'kalender'
                  ? 'bg-[#009966] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalIcon className="w-3.5 h-3.5" />
              Kalender ({counts.disetujui})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <span className="text-xl font-extrabold text-slate-900">{counts.total}</span>
            <span className="text-[11px] font-semibold text-slate-400 leading-tight">Total<br />Pengajuan</span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Menunggu', count: counts.menunggu, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Disetujui', count: counts.disetujui, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Ditolak', count: counts.ditolak, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Dibatalkan', count: counts.dibatalkan, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.count}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {adminViewMode === 'kalender' ? (
        <section className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Agenda Kalender Peminjaman Disetujui</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau jadwal &amp; tanggal habis peminjaman ruangan, kendaraan, dan perlengkapan secara visual.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
              {approvedList.length} Jadwal Aktif
            </span>
          </div>
          <CalendarContainer events={approvedEvents} />
        </section>
      ) : (
        <>
          {/* Filters (Cuma ada Dari Tanggal, Sampai Tanggal, Jenis, dan Reset) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Date from */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Dari Tanggal
                </label>
                <div className="relative">
                  <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="rekap-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
                  />
                </div>
              </div>
              {/* Date to */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Sampai Tanggal
                </label>
                <div className="relative">
                  <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="rekap-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
                  />
                </div>
              </div>
              {/* Jenis filter */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Jenis
                </label>
                <div className="relative">
                  <select
                    id="rekap-jenis-filter"
                    value={jenisFilter}
                    onChange={(e) => setJenisFilter(e.target.value as typeof jenisFilter)}
                    className="w-full appearance-none px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition"
                  >
                    <option value="Semua">Semua Jenis</option>
                    <option value="ruangan">Ruangan</option>
                    <option value="kendaraan">Kendaraan</option>
                    <option value="perlengkapan">Perlengkapan</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {/* Reset */}
              <button
                id="rekap-reset-btn"
                type="button"
                onClick={resetFilter}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Status tab filter */}
            <div className="flex overflow-x-auto border-b border-slate-100 px-4 pt-4 gap-1 pb-0 scrollbar-hide">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  id={`rekap-tab-${tab.replace(/\s/g, '-')}`}
                  type="button"
                  onClick={() => setActiveTab(tab)}
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

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  Tidak ada data peminjaman yang sesuai filter.
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
                      <th className="text-left px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Surat Permohonan</th>
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
                          {/* Jadwal Peminjaman */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-800">{formatDate(p.tgl_mulai)}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.waktu_mulai} – {p.waktu_selesai}
                            </div>
                            {p.tgl_selesai !== p.tgl_mulai && (
                              <div className="text-[10px] text-slate-400">s.d. {formatDate(p.tgl_selesai)}</div>
                            )}
                          </td>
                          {/* Nama Peminjam */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-800">{p.nama_pemohon}</div>
                            <div className="text-[10px] text-slate-400">{p.nomor_hp || '-'}</div>
                          </td>
                          {/* Jenis Layanan */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {JENIS_LABELS[p.jenis]}
                            </span>
                          </td>
                          {/* Unit Kerja */}
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600 max-w-[130px] truncate">{p.unit_pemohon}</div>
                          </td>
                          {/* Keperluan */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-[#009966] max-w-[160px] truncate">{p.kegiatan}</div>
                          </td>
                          {/* Item Dipinjam */}
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600 max-w-[130px] truncate">{p.item_dipinjam}</div>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          {/* Surat Permohonan */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.surat_url ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 text-[10px] font-bold text-[#009966] hover:underline cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Lihat Surat
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300">Tidak ada</span>
                            )}
                          </td>
                          {/* Aksi */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              id={`rekap-detail-btn-${p.id}`}
                              type="button"
                              onClick={() => setSelectedPermohonan(p)}
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

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              Menampilkan {filtered.length} dari {list.length} data.
            </div>
          </div>
        </>
      )}

      {/* Detail modal */}
      {selectedPermohonan && (
        <DetailPermohonanModal
          permohonan={selectedPermohonan}
          onClose={() => setSelectedPermohonan(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};
