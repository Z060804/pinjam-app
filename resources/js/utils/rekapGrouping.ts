import { Permohonan } from '../types/admin';

/**
 * Mengelompokkan seluruh sesi peminjaman berulang menjadi SATU baris permohonan pada rekap admin.
 * Peminjaman biasa tetap dipertahankan sebagai baris tunggal secara normal.
 * Menggunakan relasi parent_id yang sebenarnya dari database, bukan sekadar mencocokkan nama atau kegiatan.
 */
export function groupPermohonanForRekap(records: Permohonan[]): Permohonan[] {
  if (!records || records.length === 0) return [];

  // Kelompokkan berdasarkan kunci identitas induk: parent_id ?: id
  const groups = new Map<string, Permohonan[]>();

  for (const record of records) {
    const rootKey = record.parent_id || record.id_peminjaman || record.id;
    if (!groups.has(rootKey)) {
      groups.set(rootKey, []);
    }
    groups.get(rootKey)!.push(record);
  }

  const result: Permohonan[] = [];

  for (const [rootKey, group] of groups.entries()) {
    // Periksa apakah kelompok ini merupakan peminjaman berulang
    const isRecurringGroup = group.some((r) => r.is_recurring) || group.length > 1;

    if (!isRecurringGroup) {
      // Peminjaman biasa (tunggal maupun multi-hari biasa): pertahankan apa adanya
      result.push(group[0]);
      continue;
    }

    // Urutkan sesi secara kronologis menaik (ascending) berdasarkan tanggal pelaksanaan
    const sorted = [...group].sort((a, b) => {
      const dateA = a.tgl_mulai || a.mulai || '';
      const dateB = b.tgl_mulai || b.mulai || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.waktu_mulai || '').localeCompare(b.waktu_mulai || '');
    });

    const firstSession = sorted[0];
    const lastSession = sorted[sorted.length - 1];
    const totalSessions = sorted.length;
    const activeSessions = sorted.filter((s) => s.status !== 'Dibatalkan');
    const cancelledCount = sorted.filter((s) => s.status === 'Dibatalkan').length;
    const activeCount = activeSessions.length;

    // Cari permohonan induk untuk referensi data pemohon, item, surat, dsb.
    const parentRecord = sorted.find((s) => !s.parent_id || s.id === rootKey || s.id_peminjaman === rootKey) || firstSession;

    // Tentukan status ringkasan operasional rangkaian
    let seriesStatus: Permohonan['status'];
    if (cancelledCount === totalSessions) {
      seriesStatus = 'Dibatalkan';
    } else if (sorted.every((s) => s.status === 'Tidak Disetujui')) {
      seriesStatus = 'Tidak Disetujui';
    } else if (activeSessions.length > 0 && activeSessions.every((s) => s.status === 'Disetujui')) {
      seriesStatus = 'Disetujui';
    } else if (activeSessions.length > 0 && activeSessions.every((s) => s.status === 'Menunggu Persetujuan')) {
      seriesStatus = 'Menunggu Persetujuan';
    } else if (activeSessions.length > 0) {
      seriesStatus = activeSessions[0].status;
    } else {
      seriesStatus = parentRecord.status;
    }

    const isWeekly = Boolean(parentRecord.is_recurring && parentRecord.booking_type !== 'multiday');
    const bookingType = parentRecord.booking_type || (isWeekly ? 'recurring' : (totalSessions > 1 ? 'multiday' : 'single'));
    const isMultiday = bookingType === 'multiday';

    // Susun daftar sesi lengkap untuk ditampilkan di modal detail
    const schedulesList = sorted.map((s, idx) => ({
      index: idx + 1,
      session_number: idx + 1,
      total_sessions: totalSessions,
      id: s.id,
      id_peminjaman: s.id_peminjaman || s.id,
      parent_id: s.parent_id,
      tgl_mulai: s.tgl_mulai,
      waktu_mulai: s.waktu_mulai,
      waktu_selesai: s.waktu_selesai,
      mulai: s.mulai,
      selesai: s.selesai,
      status: s.status,
      computed_status: s.computed_status || s.status,
      is_parent: !s.parent_id || s.id === rootKey || s.id_peminjaman === rootKey,
      can_cancel: s.status !== 'Dibatalkan',
    }));

    result.push({
      ...parentRecord,
      id: rootKey,
      id_peminjaman: rootKey,
      parent_id: null,
      parent_registration_id: rootKey,
      booking_type: bookingType,
      is_multiday: isMultiday,
      is_recurring: isWeekly,
      is_series: true,
      recurring_frequency: isWeekly ? (parentRecord.recurring_frequency || 'Setiap Minggu') : null,
      recurring_end_date: isWeekly ? (lastSession.tgl_mulai || lastSession.mulai) : null,
      // Tanggal awal dan akhir adalah rentang asli dari sesi pertama s/d sesi terakhir
      tgl_mulai: firstSession.tgl_mulai,
      tgl_selesai: lastSession.tgl_mulai,
      waktu_mulai: firstSession.waktu_mulai,
      waktu_selesai: firstSession.waktu_selesai,
      total_sessions: totalSessions,
      active_sessions_count: activeCount,
      cancelled_sessions_count: cancelledCount,
      session_label: `${totalSessions} Sesi`,
      status: seriesStatus,
      status_summary: cancelledCount > 0 ? `${activeCount} sesi aktif, ${cancelledCount} dibatalkan` : `${totalSessions} sesi aktif`,
      recurring_schedules: schedulesList,
    });
  }

  // Urutkan permohonan rekap secara kronologis menaik (ascending) berdasarkan tanggal awal jadwal (tgl_mulai)
  return result.sort(comparePermohonanChronological);
}

/**
 * Fungsi pembanding kronologis menaik (ascending) terpusat untuk permohonan rekap.
 * Mengurutkan berdasarkan tanggal awal pelaksanaan (tgl_mulai / mulai), jam mulai, dan ID.
 */
export function comparePermohonanChronological(a: Permohonan, b: Permohonan): number {
  const dateA = a.tgl_mulai || a.mulai || '';
  const dateB = b.tgl_mulai || b.mulai || '';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  const timeA = a.waktu_mulai || '';
  const timeB = b.waktu_mulai || '';
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  return String(a.id || '').localeCompare(String(b.id || ''));
}