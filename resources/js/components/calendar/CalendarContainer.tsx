import React, { useState } from 'react';
import { MasterPeminjaman } from '../../types';
import { CalendarGrid } from './CalendarGrid';
import { AgendaListView } from './AgendaListView';
import { EventDetailModal } from './EventDetailModal';
import { CalendarToolbar } from './CalendarToolbar';

interface CalendarContainerProps {
  events: MasterPeminjaman[];
}

export const CalendarContainer: React.FC<CalendarContainerProps> = ({ events }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 1));
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<MasterPeminjaman | null>(null);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const currentMonthEvents = events.filter((ev) => {
    const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 7);
    const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 7);
    return monthPrefix >= start && monthPrefix <= end;
  });

  return (
    <div className="space-y-4">
      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        onToday={() => setCurrentDate(new Date(2026, 9, 1))}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onViewModeChange={setViewMode}
      />

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
