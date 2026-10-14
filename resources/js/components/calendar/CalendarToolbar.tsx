import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, List } from 'lucide-react';

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: 'calendar' | 'agenda';
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onViewModeChange: (mode: 'calendar' | 'agenda') => void;
}

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  currentDate,
  viewMode,
  onToday,
  onPrevMonth,
  onNextMonth,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
        >
          Today
        </button>
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1.5 hover:bg-slate-50 text-slate-600 cursor-pointer border-r border-slate-200 transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1.5 hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onViewModeChange('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            viewMode === 'calendar' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalIcon className="w-3.5 h-3.5" />
          Kalender
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('agenda')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            viewMode === 'agenda' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Daftar
        </button>
      </div>
    </div>
  );
};
