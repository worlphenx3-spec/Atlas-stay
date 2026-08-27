import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toISODate, isToday, isSameDay, addDays } from '@/lib/utils';
import type { BookedRange } from '@/lib/types';

interface CalendarProps {
  checkIn: string | null;
  checkOut: string | null;
  bookedRanges: BookedRange[];
  onChange: (checkIn: string | null, checkOut: string | null) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Calendar({ checkIn, checkOut, bookedRanges, onChange }: CalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const ciDate = checkIn ? new Date(checkIn + 'T00:00:00') : null;
  const coDate = checkOut ? new Date(checkOut + 'T00:00:00') : null;

  function isDateBooked(d: Date): boolean {
    return bookedRanges.some((r) => {
      const start = new Date(r.check_in + 'T00:00:00');
      const end = new Date(r.check_out + 'T00:00:00');
      return d >= start && d < end;
    });
  }

  function isInRange(d: Date): boolean {
    if (!ciDate || !coDate) return false;
    return d > ciDate && d < coDate;
  }

  function handleDayClick(d: Date) {
    if (isDateBooked(d) || d < today) return;

    if (!ciDate || (ciDate && coDate)) {
      onChange(toISODate(d), null);
      return;
    }

    if (d <= ciDate) {
      onChange(toISODate(d), null);
      return;
    }

    // Check no booked dates between ci and d
    let cursor = addDays(ciDate!, 1);
    while (cursor <= d) {
      if (isDateBooked(cursor)) {
        onChange(toISODate(d), null);
        return;
      }
      cursor = addDays(cursor, 1);
    }
    onChange(toISODate(ciDate!), toISODate(d));
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-sm font-semibold text-white">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-white/40 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;

          const booked = isDateBooked(d);
          const past = d < today;
          const disabled = booked || past;
          const isCheckIn = ciDate && isSameDay(d, ciDate);
          const isCheckOut = coDate && isSameDay(d, coDate);
          const isMiddle = isInRange(d);
          const todayHighlight = isToday(d);

          return (
            <button
              key={i}
              onClick={() => handleDayClick(d)}
              disabled={disabled}
              className={`
                calendar-day relative aspect-square rounded-lg text-sm flex items-center justify-center
                ${disabled ? 'cursor-not-allowed line-through text-white/20' : 'hover:ring-2 hover:ring-emerald-400/50 cursor-pointer'}
                ${isCheckIn ? 'bg-emerald-500 text-white font-semibold' : ''}
                ${isCheckOut ? 'bg-emerald-500 text-white font-semibold' : ''}
                ${isMiddle ? 'bg-emerald-500/20 text-emerald-300' : ''}
                ${!isCheckIn && !isCheckOut && !isMiddle && !disabled ? 'text-white/80' : ''}
                ${todayHighlight && !isCheckIn && !isCheckOut ? 'ring-1 ring-white/30' : ''}
              `}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/20" />
          <span>In range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white/10 line-through" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
