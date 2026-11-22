export type CategorySpectrum =
  | 'cyan'
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'crimson'
  | 'indigo'
  | 'fuchsia'
  | 'teal';

export const CATEGORY_SPECTRUM_OPTIONS: Array<{ id: CategorySpectrum; label: string }> = [
  { id: 'cyan', label: 'آبی فیروزه‌ای' },
  { id: 'violet', label: 'بنفش ارغوانی' },
  { id: 'amber', label: 'طلایی کهربایی' },
  { id: 'emerald', label: 'سبز زمردی' },
  { id: 'crimson', label: 'مرجانی سرخ' },
  { id: 'indigo', label: 'نیلی آبی' },
  { id: 'fuchsia', label: 'سرخابی' },
  { id: 'teal', label: 'سبزآبی لیمویی' },
];

const SPECTRUM_POOL: CategorySpectrum[] = CATEGORY_SPECTRUM_OPTIONS.map((o) => o.id);
const SPECTRUM_SET = new Set<string>(SPECTRUM_POOL);

const ID_TO_SPECTRUM: Record<string, CategorySpectrum> = {
  cat_dilan: 'cyan',
  cat_gaming: 'violet',
  cat_claim: 'amber',
  cat_routine: 'emerald',
  cat_sport: 'crimson',
  cat_program: 'indigo',
};

const NAME_TO_SPECTRUM: Record<string, CategorySpectrum> = {
  dilan: 'cyan',
  gaming: 'violet',
  'ادعا کلیم': 'amber',
  روتین: 'emerald',
  ورزش: 'crimson',
  برنامه: 'indigo',
};

const CUSTOM_RGB_ID_REGEX = /^cat_rgb_([a-z]+)_/;

export function getCategorySpectrum(categoryId: string, categoryName?: string): CategorySpectrum {
  if (ID_TO_SPECTRUM[categoryId]) {
    return ID_TO_SPECTRUM[categoryId];
  }

  const customMatch = CUSTOM_RGB_ID_REGEX.exec(categoryId);
  if (customMatch && SPECTRUM_SET.has(customMatch[1])) {
    return customMatch[1] as CategorySpectrum;
  }

  const normalizedName = (categoryName ?? '').trim().toLowerCase();
  if (normalizedName && NAME_TO_SPECTRUM[normalizedName]) {
    return NAME_TO_SPECTRUM[normalizedName];
  }

  const seed = `${categoryId}:${normalizedName}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return SPECTRUM_POOL[hash % SPECTRUM_POOL.length];
}

export function getCategorySpectrumClass(categoryId: string, categoryName?: string): string {
  return `cat-rgb-${getCategorySpectrum(categoryId, categoryName)}`;
}

export function pickNextSpectrum(existingCount: number): CategorySpectrum {
  return SPECTRUM_POOL[existingCount % SPECTRUM_POOL.length];
}
