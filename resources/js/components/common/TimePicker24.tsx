import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';

export interface TimePicker24Props {
  id?: string;
  label: string;
  popupTitle?: string;
  value: string; // Format "HH:mm" (24-jam)
  onChange: (time: string) => void;
  isInvalid?: boolean;
  disabled?: boolean;
  alignRight?: boolean;
}

// 24 Jam (00 - 23)
export const HOURS_24: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// 60 Menit (00 - 59)
export const MINUTES_60: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const ITEM_HEIGHT = 40; // 36px item + 4px gap

export const TimePicker24: React.FC<TimePicker24Props> = ({
  id,
  label,
  popupTitle,
  value,
  onChange,
  isInvalid = false,
  disabled = false,
  alignRight = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const minutesContainerRef = useRef<HTMLDivElement>(null);

  // Ekstrak jam dan menit dari nilai saat ini (format 24-jam: HH:mm)
  const [currentHour, currentMinute] = (value || '').includes(':')
    ? value.split(':')
    : ['', ''];

  const selectedHour = currentHour || '08';
  const selectedMinute = currentMinute || '00';

  // Fungsi helper scroll container ke item yang dipilih agar berada di tengah
  const scrollColumnTo = useCallback((container: HTMLElement | null, index: number, smooth = false) => {
    if (!container) return;
    const containerHeight = container.clientHeight || 208;
    const targetTop = Math.max(0, index * ITEM_HEIGHT - containerHeight / 2 + ITEM_HEIGHT / 2);
    if (smooth) {
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    } else {
      container.scrollTop = targetTop;
    }
  }, []);

  // Saat popup dibuka, gulir kolom jam dan menit ke nilai yang sedang aktif
  useEffect(() => {
    if (isOpen) {
      const hourIndex = Math.max(0, HOURS_24.indexOf(selectedHour));
      const minIndex = Math.max(0, MINUTES_60.indexOf(selectedMinute));

      // Gunakan setTimeout kecil untuk memastikan DOM sudah ter-render sempurna
      const timer = setTimeout(() => {
        scrollColumnTo(hoursContainerRef.current, hourIndex, false);
        scrollColumnTo(minutesContainerRef.current, minIndex, false);
      }, 30);

      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute, scrollColumnTo]);

  // Tutup popup saat klik di luar komponen atau tekan tombol Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectHour = (h: string, index: number) => {
    onChange(`${h}:${selectedMinute}`);
    scrollColumnTo(hoursContainerRef.current, index, true);
  };

  const handleSelectMinute = (m: string, index: number) => {
    onChange(`${selectedHour}:${m}`);
    scrollColumnTo(minutesContainerRef.current, index, true);
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </label>

      {/* Trigger Button Input */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
          isOpen
            ? 'border-[#009966] ring-2 ring-[#009966]/20 bg-white text-slate-900'
            : isInvalid
            ? 'border-rose-400 bg-rose-50/40 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 shrink-0 ${isOpen ? 'text-[#009966]' : 'text-slate-400'}`} />
          <span className={value ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
            {value ? `${value} WIB` : 'Pilih jam'}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#009966] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Vertical Scroll Picker Popup */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={popupTitle || 'Pilih waktu 24 jam'}
          className={`absolute mt-1.5 z-40 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-100 ${
            alignRight ? 'sm:right-0 sm:left-auto left-0' : 'left-0'
          }`}
        >
          {/* Header Popup */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div>
              <h5 className="text-sm font-extrabold text-slate-900 tracking-tight">
                {popupTitle || `Pilih ${label.replace('*', '').trim()}`}
              </h5>
              <p className="text-[11px] text-slate-400">Gulir dan pilih jam serta menit.</p>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#009966] border border-emerald-200 shadow-2xs">
                {selectedHour}:{selectedMinute} WIB
              </span>
            </div>
          </div>

          {/* Kolom Vertical Scroll Picker Berdampingan (Jam & Menit) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            {/* Kolom JAM (00 - 23) */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200/60 mb-1">
                JAM (00 - 23)
              </span>
              <div
                ref={hoursContainerRef}
                className="h-52 overflow-y-auto scroll-smooth overscroll-contain snap-y snap-proximity py-1 pr-1 space-y-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {HOURS_24.map((h, idx) => {
                  const isSelected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleSelectHour(h, idx)}
                      className={`w-full h-9 flex items-center justify-center text-sm rounded-lg transition-all cursor-pointer snap-center ${
                        isSelected
                          ? 'bg-[#009966] text-white font-bold shadow-xs'
                          : 'text-slate-600 font-semibold hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kolom MENIT (00 - 59) */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200/60 mb-1">
                MENIT (00 - 59)
              </span>
              <div
                ref={minutesContainerRef}
                className="h-52 overflow-y-auto scroll-smooth overscroll-contain snap-y snap-proximity py-1 pr-1 space-y-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {MINUTES_60.map((m, idx) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleSelectMinute(m, idx)}
                      className={`w-full h-9 flex items-center justify-center text-sm rounded-lg transition-all cursor-pointer snap-center ${
                        isSelected
                          ? 'bg-[#009966] text-white font-bold shadow-xs'
                          : 'text-slate-600 font-semibold hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Aksi */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Format 24 Jam
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#009966] text-white text-xs font-bold hover:bg-[#008055] transition cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
