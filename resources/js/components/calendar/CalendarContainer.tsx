import React, { useState } from 'react';
import { MasterPeminjaman } from '../../types';
import { CalendarGrid } from './CalendarGrid';
import { AgendaListView } from './AgendaListView';
import { EventDetailModal } from './EventDetailModal';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, List } from 'lucide-react';

interface CalendarContainerProps {
  events: MasterPeminjaman[];
}

export const CalendarContainer: React.FC<CalendarContainerProps> = ({ events }) => {
  // Default to October 2026 matching current active period
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 1));
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<MasterPeminjaman | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 1));
  };

  // Filter events active within this month for the agenda view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const currentMonthEvents = events.filter((ev) => {
    const start = (ev.tgl_mulai || ev.mulai || '').substring(0, 7);
    const end = (ev.tgl_selesai || ev.selesai || start).substring(0, 7);
    return monthPrefix >= start && monthPrefix <= end;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 cursor-pointer border-r border-slate-200 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
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
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              viewMode === 'calendar' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalIcon className="w-3.5 h-3.5" />
            Kalender
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              viewMode === 'agenda' ? 'bg-[#009966] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Daftar
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onSelectEvent={setSelectedEvent}
        />
      ) : (
        <AgendaListView
          events={currentMonthEvents.length > 0 ? currentMonthEvents : events}
          onSelectEvent={setSelectedEvent}
        />
      )}

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
