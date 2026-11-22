import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  addDaysToIsoDate,
  formatJalaliFull,
  getDaysInJalaliMonth,
  getPersianWeekdayIndex,
  getTodayIsoDate,
  isoToJalali,
  JALALI_MONTH_NAMES,
  jalaliToIso,
  PERSIAN_WEEKDAYS_SHORT,
  toPersianDigits,
} from '../utils/jalali';

interface JalaliDatePickerProps {
  value: string | null;
  onChange: (isoDate: string | null) => void;
  label?: string;
}

export function JalaliDatePicker({ value, onChange, label = 'تاریخ سررسید (شمسی)' }: JalaliDatePickerProps) {
  const todayIso = getTodayIsoDate();
  const initialJ = isoToJalali(value ?? todayIso) ?? { jy: 1405, jm: 8, jd: 23 };

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialJ.jy);
  const [viewMonth, setViewMonth] = useState(initialJ.jm);

  const openPicker = () => {
    const targetJ = isoToJalali(value ?? todayIso) ?? initialJ;
    setViewYear(targetJ.jy);
    setViewMonth(targetJ.jm);
    setIsOpen((prev) => !prev);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const firstWeekday = getPersianWeekdayIndex(viewYear, viewMonth, 1);
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayJ = isoToJalali(todayIso);
  const selectedJ = value ? isoToJalali(value) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onChange(todayIso);
              setIsOpen(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(addDaysToIsoDate(todayIso, 1));
              setIsOpen(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            فردا
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          aria-expanded={isOpen}
          className="flex-1 min-h-[44px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#131720] text-sm text-zinc-800 dark:text-zinc-100 hover:border-emerald-500/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{value ? formatJalaliFull(value) : 'بدون تاریخ سررسید'}</span>
          </span>
          <span className="text-xs text-zinc-400">{isOpen ? 'بستن' : 'انتخاب'}</span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            aria-label="حذف تاریخ سررسید"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700/80 text-zinc-500 hover:text-red-500 hover:border-red-500/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#161B26] space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="ماه قبل"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {JALALI_MONTH_NAMES[viewMonth - 1]} {toPersianDigits(viewYear)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="ماه بعد"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {PERSIAN_WEEKDAYS_SHORT.map((dayName) => (
              <div key={dayName} className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 py-1">
                {dayName}
              </div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty_${idx}`} />;
              }
              const isSelected =
                selectedJ?.jy === viewYear && selectedJ?.jm === viewMonth && selectedJ?.jd === day;
              const isToday =
                todayJ?.jy === viewYear && todayJ?.jm === viewMonth && todayJ?.jd === day;

              return (
                <button
                  key={`day_${day}`}
                  type="button"
                  onClick={() => {
                    onChange(jalaliToIso(viewYear, viewMonth, day));
                    setIsOpen(false);
                  }}
                  className={`min-h-[42px] sm:min-h-[36px] rounded-lg text-xs font-medium tabular-nums transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-semibold'
                      : isToday
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/40'
                        : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
