import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalIcon, Table } from 'lucide-react';
import { Permohonan, RekapStatusFilter } from '../../types/admin';
import { MasterPeminjaman } from '../../types';
import { getPermohonan } from '../../services/adminApi';
import { DetailPermohonanModal } from './DetailPermohonanModal';
import { CalendarContainer } from '../calendar/CalendarContainer';
import { RekapStatsCards } from './rekap/RekapStatsCards';
import { RekapFilterBar } from './rekap/RekapFilterBar';
import { RekapTable } from './rekap/RekapTable';

export const RekapPeminjamanView: React.FC = () => {
  const [list, setList] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<'tabel' | 'kalender'>('tabel');
  const [activeTab, setActiveTab] = useState<RekapStatusFilter>('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPermohonan, setSelectedPermohonan] = useState<Permohonan | null>(null);
  const [jenisFilter, setJenisFilter] = useState<'Semua' | Permohonan['jenis']>('Semua');

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

  const filtered = list
    .filter((p) => {
      const matchStatus = activeTab === 'Semua' || p.status === activeTab;
      const matchJenis = jenisFilter === 'Semua' || p.jenis === jenisFilter;
      const matchFrom = !dateFrom || p.tgl_mulai >= dateFrom;
      const matchTo = !dateTo || p.tgl_mulai <= dateTo;
      return matchStatus && matchJenis && matchFrom && matchTo;
    })
    .sort((a, b) => {
      const dateA = a.tgl_mulai ?? '';
      const dateB = b.tgl_mulai ?? '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.waktu_mulai ?? '').localeCompare(b.waktu_mulai ?? '');
    });

  const counts = {
    total: list.length,
    menunggu: list.filter((p) => p.status === 'Menunggu Persetujuan').length,
    disetujui: list.filter((p) => p.status === 'Disetujui').length,
    ditolak: list.filter((p) => p.status === 'Tidak Disetujui').length,
    dibatalkan: list.filter((p) => p.status === 'Dibatalkan').length,
  };

  const approvedList = list.filter((p) => p.status === 'Disetujui');
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#009966] uppercase tracking-widest">Rekap Administrasi</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Rekap Peminjaman</h1>
          <p className="text-sm text-[#009966] mt-1">
            Tinjau riwayat peminjaman berdasarkan periode, jenis item, status, dan pantau jadwal di kalender.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs">
            <button
              id="admin-view-table-btn"
              type="button"
              onClick={() => setAdminViewMode('tabel')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminViewMode === 'tabel' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                adminViewMode === 'kalender' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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

      <RekapStatsCards counts={counts} />

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
          <RekapFilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            jenisFilter={jenisFilter}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onJenisFilterChange={setJenisFilter}
            onReset={resetFilter}
          />
          <RekapTable
            list={list}
            filtered={filtered}
            loading={loading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectPermohonan={setSelectedPermohonan}
          />
        </>
      )}

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
