import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCategorySpectrum,
  getCategorySpectrumClass,
  pickNextSpectrum,
} from './categoryTheme';

test('getCategorySpectrum assigns distinct RGB spectrums to all 6 default categories', () => {
  const defaults = [
    ['cat_dilan', 'Dilan'],
    ['cat_gaming', 'Gaming'],
    ['cat_claim', 'ادعا کلیم'],
    ['cat_routine', 'روتین'],
    ['cat_sport', 'ورزش'],
    ['cat_program', 'برنامه'],
  ] as const;

  const spectrums = defaults.map(([id, name]) => getCategorySpectrum(id, name));
  assert.equal(new Set(spectrums).size, 6);
  assert.equal(getCategorySpectrumClass('cat_dilan', 'Dilan'), 'cat-rgb-cyan');
  assert.equal(getCategorySpectrumClass('cat_program', 'برنامه'), 'cat-rgb-indigo');
});

test('getCategorySpectrum reads chosen RGB spectrum from custom category ID', () => {
  assert.equal(getCategorySpectrum('cat_rgb_fuchsia_12345', 'سفر'), 'fuchsia');
  assert.equal(getCategorySpectrum('cat_rgb_crimson_abc', 'پروژه'), 'crimson');
  assert.equal(getCategorySpectrumClass('cat_rgb_teal_xyz', 'کتاب'), 'cat-rgb-teal');
});

test('getCategorySpectrum is deterministic for legacy custom categories', () => {
  const first = getCategorySpectrum('cat_custom_xyz', 'موسیقی');
  const second = getCategorySpectrum('cat_custom_xyz', 'موسیقی');
  assert.equal(first, second);
  assert.equal(pickNextSpectrum(0), 'cyan');
  assert.equal(pickNextSpectrum(7), 'teal');
});
