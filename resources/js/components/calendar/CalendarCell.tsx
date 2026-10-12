import React from 'react';
import { MasterPeminjaman } from '../../types';
import { formatTimeDisplay } from '../../utils/date';

interface CalendarCellProps {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: MasterPeminjaman[];
  onSelectEvent: (event: MasterPeminjaman) => void;
}

export const CalendarCell: React.FC<CalendarCellProps> = ({
  dayNumber,
  isCurrentMonth,
  isToday,
  events,
  onSelectEvent,
}) => {
  const getPillColor = (index: number): string => {
    const colors = [
      'bg-amber-100 text-amber-900 border-amber-200',
      'bg-blue-100 text-blue-900 border-blue-200',
      'bg-purple-100 text-purple-900 border-purple-200',
      'bg-emerald-100 text-emerald-900 border-emerald-200',
    ];
    return colors[index % colors.length];
  };

  return (
    <div
      className={`min-h-[105px] p-1.5 border-b border-r border-slate-200 flex flex-col transition-colors ${
        isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
      }`}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <span
          className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
            isToday
              ? 'bg-[#009966] text-white shadow-xs'
              : isCurrentMonth
              ? 'text-slate-800'
              : 'text-slate-400'
          }`}
        >
          {dayNumber}
        </span>
        {events.length > 2 && (
          <span className="text-[10px] font-bold text-slate-500">+{events.length - 2}</span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 2).map((ev, idx) => {
          const time = formatTimeDisplay(ev.mulai);
          return (
            <button
              key={ev.id_peminjaman}
              type="button"
              onClick={() => onSelectEvent(ev)}
              className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate border cursor-pointer hover:opacity-90 block leading-tight ${getPillColor(
                idx
              )}`}
              title={`${ev.keperluan} (${ev.nama_peminjam})`}
            >
              {time && <span className="font-semibold mr-1">{time}</span>}
              <span>{ev.keperluan}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
