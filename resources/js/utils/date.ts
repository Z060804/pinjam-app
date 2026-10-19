export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_NAMES_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const DAY_NAMES_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export function getTodayWIB(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function formatDateIndonesianWithDay(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const dayName = DAY_NAMES_ID[d.getDay()];
  const monthName = MONTH_NAMES_ID[month];
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function generateWeeklyDates(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr || endDateStr < startDateStr) return [];
  const dates: string[] = [];
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  const current = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  let count = 0;
  while (current <= end && count < 52) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
    count++;
  }
  return dates;
}

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
