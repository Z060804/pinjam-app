/**
 * Helper format tanggal bersama untuk komponen admin.
 */
export function formatDate(
  d?: string | null,
  month: 'short' | 'long' = 'long',
): string {
  if (!d) return '-';

  // Backend mengirim 'YYYY-MM-DD'. Kalau ada bagian jam, ambil tanggalnya saja.
  const datePart = d.split(' ')[0].split('T')[0];
  const [y, m, day] = datePart.split('-').map(Number);

  // Dijumlahkan sebagai komponen lokal (bukan new Date(string)) supaya tidak
  // bergeser sehari pada zona waktu di barat UTC.
  if (!y || !m || !day) return d;

  return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month,
    year: 'numeric',
  });
}
