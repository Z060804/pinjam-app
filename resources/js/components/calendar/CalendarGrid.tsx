import React from 'react';
import { MasterPeminjaman } from '../../types';
import { CalendarCell } from './CalendarCell';

interface CalendarGridProps {
  currentDate: Date;
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
}

function toYMD(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  events,
  onSelectEvent,
}) => {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  // Generate cells (trailing prev month, current month, leading next month)
  const cells: Array<{ dayNumber: number; isCurrentMonth: boolean; dateString: string; isToday: boolean }> = [];

  // Trailing previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = toYMD(year, month - 1, day);
    cells.push({ dayNumber: day, isCurrentMonth: false, dateString: dateStr, isToday: false });
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = toYMD(year, month, day);
    const isToday = isThisMonth && today.getDate() === day;
    cells.push({ dayNumber: day, isCurrentMonth: true, dateString: dateStr, isToday });
  }

  // Leading next month days to complete 35 or 42 grid cells
  const targetTotal = cells.length > 35 ? 42 : 35;
  const remaining = targetTotal - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const dateStr = toYMD(year, month + 1, day);
    cells.push({ dayNumber: day, isCurrentMonth: false, dateString: dateStr, isToday: false });
  }

  // Robust date-range check for each cell:
  // For recurring bookings, each individual session is stored on its specific occurrence date.
  // For normal multi-day bookings (peminjaman biasa multihari):
  // According to SIMPRU business rules: only show on start date (Mulai) and end date (Habis).
  // Intermediate dates appear empty for this booking.
  const getEventsForDate = (cellDateStr: string): MasterPeminjaman[] => {
    return events.filter((ev) => {
      const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
      const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 10);
      if (!start) return false;

      if (start === end) {
        return cellDateStr === start;
      }

      // Normal multi-day booking: show on start date and end date only!
      return cellDateStr === start || cellDateStr === end;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center">
            {dayLabels.map((lbl) => (
              <div key={lbl} className="py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                {lbl}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-t-0">
            {cells.map((cell, idx) => (
              <CalendarCell
                key={`${cell.dateString}-${idx}`}
                dayNumber={cell.dayNumber}
                isCurrentMonth={cell.isCurrentMonth}
                isToday={cell.isToday}
                dateString={cell.dateString}
                events={getEventsForDate(cell.dateString)}
                onSelectEvent={onSelectEvent}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
