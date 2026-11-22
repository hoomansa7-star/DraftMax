export interface JalaliDate {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const PERSIAN_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Converts a Gregorian date (year, month 1..12, day 1..31) to Jalali (Persian) date.
 * Uses the standard Borkowski / jalaali-js integer algorithm.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    gdm[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

/**
 * Converts a Jalali date (jy, jm 1..12, jd 1..31) to Gregorian date.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  const jy1 = jy + 1595;
  let days =
    -355668 +
    365 * jy1 +
    Math.floor(jy1 / 33) * 8 +
    Math.floor(((jy1 % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gm = 0;
  for (gm = 1; gm <= 12 && gd > salA[gm]; gm++) {
    gd -= salA[gm];
  }

  return { gy, gm, gd };
}

export function isJalaliLeapYear(jy: number): boolean {
  const { gy, gm, gd } = jalaliToGregorian(jy, 12, 30);
  const check = gregorianToJalali(gy, gm, gd);
  return check.jy === jy && check.jm === 12 && check.jd === 30;
}

export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function getTodayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function isoToJalali(isoDate: string): JalaliDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);
  return gregorianToJalali(gy, gm, gd);
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return `${String(gy).padStart(4, '0')}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function formatJalaliFull(isoDate: string, includeYear = true): string {
  const j = isoToJalali(isoDate);
  if (!j) return '';
  const monthName = JALALI_MONTH_NAMES[j.jm - 1] ?? '';
  const dayStr = toPersianDigits(j.jd);
  const yearStr = toPersianDigits(j.jy);
  return includeYear ? `${dayStr} ${monthName} ${yearStr}` : `${dayStr} ${monthName}`;
}

export function formatJalaliRelative(isoDate: string, todayIso: string = getTodayIsoDate()): string {
  if (isoDate === todayIso) return 'امروز';
  if (isoDate === addDaysToIsoDate(todayIso, 1)) return 'فردا';
  if (isoDate === addDaysToIsoDate(todayIso, -1)) return 'دیروز';

  const jTarget = isoToJalali(isoDate);
  const jToday = isoToJalali(todayIso);
  if (!jTarget || !jToday) return '';

  return formatJalaliFull(isoDate, jTarget.jy !== jToday.jy);
}

export function isDateOverdue(
  dueDate: string | null,
  completed: boolean,
  todayIso: string = getTodayIsoDate()
): boolean {
  if (!dueDate || completed) return false;
  return dueDate < todayIso;
}

/**
 * Returns 0 for Saturday (شنبه) ... 6 for Friday (جمعه), matching Persian week layout.
 */
export function getPersianWeekdayIndex(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const jsDay = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0=Sun .. 6=Sat
  return (jsDay + 1) % 7; // Sat=0, Sun=1, ..., Fri=6
}
