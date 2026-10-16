export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_NAMES_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function extractDateParts(dateStr: string): { date: string; time: string } {
  if (!dateStr) return { date: '', time: '' };
  
  if (dateStr.includes('T')) {
    const [d, t] = dateStr.split('T');
    return { date: d, time: (t || '').substring(0, 5) };
  }
  
  const [d, t] = dateStr.split(' ');
  return { date: d || '', time: (t || '').substring(0, 5) };
}

export function formatDateDisplay(dateStr: string): string {
  const { date } = extractDateParts(dateStr);
  if (!date) return '-';
  
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  
  const monthName = MONTH_NAMES_SHORT_ID[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

export function formatTimeDisplay(dateStr: string): string {
  const { time } = extractDateParts(dateStr);
  return time || '';
}

export function formatDateTimeDisplay(dateStr: string): string {
  const { date, time } = extractDateParts(dateStr);
  if (!date) return '-';
  const formattedDate = formatDateDisplay(date);
  return time ? `${formattedDate}, ${time} WIB` : formattedDate;
}

export function formatTimeRangeDisplay(mulaiStr: string, selesaiStr: string): string {
  const m = extractDateParts(mulaiStr);
  const s = extractDateParts(selesaiStr);
  
  if (!m.date) return '-';
  
  if (m.date === s.date) {
    return `${formatDateDisplay(m.date)} (${m.time} - ${s.time} WIB)`;
  }
  
  return `${formatDateDisplay(m.date)} ${m.time} s/d ${formatDateDisplay(s.date)} ${s.time} WIB`;
}

export function buildDateTimeString(date: string, time: string): string {
  if (!date) return '';
  const cleanTime = (time || '08:00').substring(0, 5);
  return `${date}T${cleanTime}`;
}

export function isDateTimeRangeValid(mulaiStr: string, selesaiStr: string): boolean {
  if (!mulaiStr || !selesaiStr) return false;
  const m = extractDateParts(mulaiStr);
  const s = extractDateParts(selesaiStr);

  if (!m.date || !s.date || !m.time || !s.time) return false;

  if (m.date < s.date) {
    return true;
  }

  if (m.date === s.date) {
    return m.time < s.time;
  }

  return false;
}
