import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatJalaliFull,
  formatJalaliRelative,
  getDaysInJalaliMonth,
  getPersianWeekdayIndex,
  gregorianToJalali,
  isDateOverdue,
  isJalaliLeapYear,
  jalaliToGregorian,
  jalaliToIso,
  toPersianDigits,
} from './jalali';

test('gregorianToJalali converts known dates accurately', () => {
  // Nowruz 1403: 2024-03-20 -> 1403-01-01
  assert.deepEqual(gregorianToJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });
  // 2026-11-14 -> 1405-08-23
  assert.deepEqual(gregorianToJalali(2026, 11, 14), { jy: 1405, jm: 8, jd: 23 });
});

test('jalaliToGregorian round-trips accurately', () => {
  const iso = jalaliToIso(1405, 8, 23);
  assert.equal(iso, '2026-11-14');
  assert.deepEqual(jalaliToGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 });
});

test('leap year and days in month behave properly', () => {
  assert.equal(isJalaliLeapYear(1403), true);
  assert.equal(getDaysInJalaliMonth(1403, 12), 30);
  assert.equal(isJalaliLeapYear(1404), false);
  assert.equal(getDaysInJalaliMonth(1404, 12), 29);
  assert.equal(getDaysInJalaliMonth(1405, 1), 31);
  assert.equal(getDaysInJalaliMonth(1405, 7), 30);
});

test('formats Jalali dates in Persian digits and relative labels', () => {
  assert.equal(toPersianDigits('1405/08/23'), '۱۴۰۵/۰۸/۲۳');
  assert.equal(formatJalaliFull('2026-11-14'), '۲۳ آبان ۱۴۰۵');
  assert.equal(formatJalaliRelative('2026-11-14', '2026-11-14'), 'امروز');
  assert.equal(formatJalaliRelative('2026-11-15', '2026-11-14'), 'فردا');
  assert.equal(formatJalaliRelative('2026-11-13', '2026-11-14'), 'دیروز');
  assert.equal(formatJalaliRelative('2026-11-18', '2026-11-14'), '۲۷ آبان');
});

test('overdue detection ignores completed tasks and future/today dates', () => {
  assert.equal(isDateOverdue('2026-11-13', false, '2026-11-14'), true);
  assert.equal(isDateOverdue('2026-11-14', false, '2026-11-14'), false);
  assert.equal(isDateOverdue('2026-11-15', false, '2026-11-14'), false);
  assert.equal(isDateOverdue('2026-11-10', true, '2026-11-14'), false);
  assert.equal(isDateOverdue(null, false, '2026-11-14'), false);
});

test('getPersianWeekdayIndex returns 0 for Saturday (شنبه)', () => {
  // 2026-11-14 is a Saturday -> 1405-08-23
  assert.equal(getPersianWeekdayIndex(1405, 8, 23), 0);
});
