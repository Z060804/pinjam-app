import React from 'react';
import { MasterPeminjaman } from '../../types';
import { CalendarCell } from './CalendarCell';

interface CalendarGridProps {
  currentDate: Date;
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
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

  // Generate cells (previous month trailing days, current month days, next month leading days)
  const cells: Array<{ dayNumber: number; isCurrentMonth: boolean; dateString: string; isToday: boolean }> = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ dayNumber: day, isCurrentMonth: false, dateString: dateStr, isToday: false });
  }

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isThisMonth && today.getDate() === day;
    cells.push({ dayNumber: day, isCurrentMonth: true, dateString: dateStr, isToday });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ dayNumber: day, isCurrentMonth: false, dateString: dateStr, isToday: false });
  }

  const getEventsForDate = (datePrefix: string): MasterPeminjaman[] => {
    return events.filter((ev) => ev.mulai.startsWith(datePrefix));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
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
            events={getEventsForDate(cell.dateString)}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </div>
  );
};
