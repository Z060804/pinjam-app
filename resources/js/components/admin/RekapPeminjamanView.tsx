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

import { groupPermohonanForRekap } from '../../utils/rekapGrouping';

export const RekapPeminjamanView: React.FC = () => {
  const [list, setList] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<'tabel' | 'kalender'>('tabel');
  const [activeTab, setActiveTab] = useState<RekapStatusFilter>('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPermohonan, setSelectedPermohonan] = useState<Permohonan | null>(null);
  const [jenisFilter, setJenisFilter] = useState<'Semua' | Permohonan['jenis']>('Semua');
  const [applicantFilter, setApplicantFilter] = useState<'Semua' | 'internal' | 'external'>('Semua');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPermohonan();
      setList(data);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Gagal memuat data rekap dari server.';
      setErrorMessage(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdated = () => {
    loadData();
  };

  const resetFilter = () => {
    setDateFrom('');
    setDateTo('');
    setActiveTab('Semua');
    setJenisFilter('Semua');
    setApplicantFilter('Semua');
  };

  // Group recurring series into 1 single row for the rekap table
  const groupedList = React.useMemo(() => groupPermohonanForRekap(list), [list]);

  // Filtered mempertahankan urutan kronologis stabil dari groupedList
  const filtered = React.useMemo(() => {
    return groupedList.filter((p) => {
      const matchStatus =
        activeTab === 'Semua' ||
        p.status === activeTab ||
        Boolean(p.recurring_schedules && p.recurring_schedules.some((s) => s.status === activeTab));

      const matchJenis =
        jenisFilter === 'Semua' ||
        p.jenis === jenisFilter ||
        Boolean(p.kategori_list?.includes(jenisFilter)) ||
        (jenisFilter === 'kombinasi' && (Boolean(p.is_multi_item) || (p.kategori_list ? p.kategori_list.length > 1 : false))) ||
        Boolean(p.items?.some((it) => it.kategori === jenisFilter));

      const isExternal = p.applicant_type === 'external' || (p.pihak_pemohon?.toLowerCase().includes('eksternal') ?? false);
      const matchApplicant =
        applicantFilter === 'Semua' ||
        (applicantFilter === 'external' ? isExternal : !isExternal);

      const matchFrom = !dateFrom || (p.tgl_selesai ?? p.tgl_mulai) >= dateFrom;
      const matchTo = !dateTo || p.tgl_mulai <= dateTo;
      return matchStatus && matchJenis && matchApplicant && matchFrom && matchTo;
    });
  }, [groupedList, activeTab, jenisFilter, applicantFilter, dateFrom, dateTo]);

  const counts = {
    total: groupedList.length,
    menunggu: groupedList.filter((p) => p.status === 'Menunggu Persetujuan').length,
    disetujui: groupedList.filter((p) => p.status === 'Disetujui').length,
    ditolak: groupedList.filter((p) => p.status === 'Tidak Disetujui').length,
    dibatalkan: groupedList.filter((p) => p.status === 'Dibatalkan').length,
  };

  // Kalender menggunakan data per-sesi individual (Disetujui dan Dibatalkan agar status pembatalan tampil jelas)
  const calendarList = list.filter((p) => p.status === 'Disetujui' || p.status === 'Dibatalkan');
  const approvedEvents: MasterPeminjaman[] = calendarList.map((p) => ({
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

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div>
            <p className="text-xs font-bold text-rose-900">Gagal Memuat Data Rekap Server</p>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition"
          >
            Muat Ulang
          </button>
        </div>
      )}

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
              {calendarList.filter((p) => p.status === 'Disetujui').length} Jadwal Aktif
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
            applicantFilter={applicantFilter}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onJenisFilterChange={setJenisFilter}
            onApplicantFilterChange={setApplicantFilter}
            onReset={resetFilter}
          />
          <RekapTable
            list={groupedList}
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
