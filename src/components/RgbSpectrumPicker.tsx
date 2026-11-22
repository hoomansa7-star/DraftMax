import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { CategoryItem } from '../types/task';
import {
  CATEGORY_SPECTRUM_OPTIONS,
  CategorySpectrum,
  pickNextSpectrum,
} from '../utils/categoryTheme';

interface RgbSpectrumPickerProps {
  value: CategorySpectrum;
  onChange: (spectrum: CategorySpectrum) => void;
}

export function RgbSpectrumPicker({ value, onChange }: RgbSpectrumPickerProps) {
  return (
    <div role="radiogroup" aria-label="انتخاب طیف رنگ RGB دسته" className="flex flex-wrap items-center gap-2">
      {CATEGORY_SPECTRUM_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.id)}
            className={`cat-rgb-${option.id} min-h-[42px] min-w-[42px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl border flex items-center justify-center transition-all ${
              selected
                ? 'cat-rgb-chip-active scale-105 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#131720] ring-current'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0E14] hover:scale-105'
            }`}
          >
            <span className="cat-rgb-dot w-4 h-4 rounded-full flex items-center justify-center">
              {selected && <Check className="w-2.5 h-2.5 text-white drop-shadow" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface CustomCategoryFormProps {
  existingCount: number;
  onSubmitCategory: (name: string, spectrum: CategorySpectrum) => void;
  onCancel?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function CustomCategoryForm({
  existingCount,
  onSubmitCategory,
  onCancel,
  submitLabel = 'ساخت دسته',
  autoFocus = false,
}: CustomCategoryFormProps) {
  const [name, setName] = useState('');
  const [spectrum, setSpectrum] = useState<CategorySpectrum>(() => pickNextSpectrum(existingCount));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('نام دسته‌بندی را وارد کنید.');
      return;
    }
    onSubmitCategory(trimmed, spectrum);
    setName('');
    setSpectrum(pickNextSpectrum(existingCount + 1));
    setError(null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          dir="rtl"
          maxLength={80}
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape' && onCancel) {
              e.stopPropagation();
              onCancel();
            }
          }}
          placeholder="نام دسته‌بندی دلخواه..."
          aria-label="نام دسته‌بندی دلخواه"
          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm text-right text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />

        <button
          type="button"
          onClick={() => handleSubmit()}
          className="min-h-[42px] px-3.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{submitLabel}</span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="انصراف از ساخت دسته"
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          طیف رنگ RGB:
        </span>
        <RgbSpectrumPicker value={spectrum} onChange={setSpectrum} />
      </div>

      {name.trim().length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>پیش‌نمایش:</span>
          <span
            className={`cat-rgb-${spectrum} cat-rgb-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold`}
          >
            <span className="cat-rgb-dot w-2 h-2 rounded-full shrink-0" aria-hidden="true" />
            <span>{name.trim()}</span>
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}

interface CustomCategoryModalProps {
  isOpen: boolean;
  existingCategories: CategoryItem[];
  onClose: () => void;
  onCreateCategory: (name: string, spectrum: CategorySpectrum) => void;
}

export function CustomCategoryModal({
  isOpen,
  existingCategories,
  onClose,
  onCreateCategory,
}: CustomCategoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ساخت دسته‌بندی دلخواه"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-sheet w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1" />
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            ساخت دسته‌بندی دلخواه
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره ساخت دسته"
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <CustomCategoryForm
          existingCount={existingCategories.length}
          autoFocus
          submitLabel="ساخت دسته"
          onSubmitCategory={(catName, spectrum) => {
            onCreateCategory(catName, spectrum);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
