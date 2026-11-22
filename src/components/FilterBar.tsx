import { memo, useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { CategoryItem, FilterState, Priority } from '../types/task';
import { CategorySpectrum, getCategorySpectrumClass } from '../utils/categoryTheme';
import { CustomCategoryModal } from './RgbSpectrumPicker';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  categories: CategoryItem[];
  onAddCategory: (name: string, spectrum?: CategorySpectrum) => CategoryItem | null;
  onReorderCategories: (fromIndex: number, toIndex: number) => void;
}

export const FilterBar = memo(function FilterBar({
  filters,
  onChange,
  categories,
  onAddCategory,
  onReorderCategories,
}: FilterBarProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchDraft(val);
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      onChange({ ...filters, search: val });
    }, 120);
  };

  const handleClearSearch = () => {
    setSearchDraft('');
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChange({ ...filters, search: '' });
  };
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const onReorderRef = useRef(onReorderCategories);
  onReorderRef.current = onReorderCategories;

  touchDragIndexRef.current = touchDragIndex;
  dropIndexRef.current = dropIndex;

  const hasFilters =
    filters.search.trim().length > 0 || filters.categoryId !== 'all' || filters.priority !== 'all';

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (touchDragIndex === null) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const chip = el?.closest<HTMLElement>('[data-category-index]');
      if (chip) {
        const idx = Number(chip.dataset.categoryIndex);
        if (Number.isInteger(idx) && idx >= 0) {
          dropIndexRef.current = idx;
          setDropIndex(idx);
        }
      }
    };

    const finishTouchDrag = () => {
      const from = touchDragIndexRef.current;
      const to = dropIndexRef.current;
      if (from !== null && to !== null && from !== to) {
        onReorderRef.current(from, to);
      }
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 250);
      setTouchDragIndex(null);
      setDropIndex(null);
      touchStartPosRef.current = null;
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', finishTouchDrag);
    window.addEventListener('touchcancel', finishTouchDrag);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', finishTouchDrag);
      window.removeEventListener('touchcancel', finishTouchDrag);
    };
  }, [touchDragIndex]);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  const activeDragIndex = dragIndex ?? touchDragIndex;

  return (
    <section aria-label="جستجو و فیلتر کارها" className="space-y-2.5">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="جستجو در عنوان کارها..."
            aria-label="جستجو در عنوان کارها"
            className="liquid-glass-control w-full min-h-[44px] pr-10 pl-9 py-2 rounded-2xl border border-white/60 dark:border-white/15 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
          {searchDraft.length > 0 && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="پاک کردن متن جستجو"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.priority}
            onChange={(e) => onChange({ ...filters, priority: e.target.value as Priority | 'all' })}
            aria-label="فیلتر بر اساس اولویت"
            className="liquid-glass-control flex-1 sm:flex-initial min-h-[44px] px-3 py-2 rounded-2xl border border-white/60 dark:border-white/15 text-base sm:text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="high">اولویت فوری</option>
            <option value="medium">اولویت متوسط</option>
            <option value="low">اولویت عادی</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => onChange({ search: '', categoryId: 'all', priority: 'all' })}
              aria-label="پاک کردن همه فیلترها"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
            >
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* RGB Category Filter Strip (drag & drop reorderable) */}
      <div
        role="group"
        aria-label="فیلتر بر اساس دسته‌بندی"
        className="-mx-3 sm:mx-0 px-3 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
      >
        <button
          type="button"
          onClick={() => onChange({ ...filters, categoryId: 'all' })}
          aria-pressed={filters.categoryId === 'all'}
          className={`min-h-[42px] sm:min-h-[38px] px-3.5 py-1.5 rounded-2xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            filters.categoryId === 'all'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
              : 'liquid-glass-control border-white/60 dark:border-white/15 text-zinc-700 dark:text-zinc-300 hover:border-white dark:hover:border-white/25'
          }`}
        >
          همه دسته‌ها
        </button>

        {categories.map((cat, index) => {
          const isSelected = filters.categoryId === cat.id;
          const spectrumClass = getCategorySpectrumClass(cat.id, cat.name);
          const isDragged = activeDragIndex === index;
          const isDropTarget =
            activeDragIndex !== null && dropIndex === index && activeDragIndex !== index;

          return (
            <button
              key={cat.id}
              type="button"
              data-category-id={cat.id}
              data-category-index={index}
              draggable
              title="برای فیلتر کلیک کنید یا برای جابه‌جایی بکشید"
              onDragStart={(e) => {
                setDragIndex(index);
                setDropIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dropIndex !== index) {
                  setDropIndex(index);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragIndex !== null && dropIndex !== index) {
                  setDropIndex(index);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rawFrom = e.dataTransfer.getData('text/plain');
                const from = dragIndex !== null ? dragIndex : Number(rawFrom);
                if (Number.isInteger(from) && from >= 0 && from !== index) {
                  onReorderCategories(from, index);
                }
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (!touch) return;
                clearLongPressTimer();
                touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
                longPressTimerRef.current = window.setTimeout(() => {
                  setTouchDragIndex(index);
                  setDropIndex(index);
                  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate(12);
                  }
                }, 220);
              }}
              onTouchMove={(e) => {
                if (touchDragIndexRef.current !== null || !touchStartPosRef.current) return;
                const touch = e.touches[0];
                if (!touch) return;
                const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
                const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
                if (dx > 8 || dy > 8) {
                  clearLongPressTimer();
                }
              }}
              onTouchEnd={() => {
                clearLongPressTimer();
              }}
              onTouchCancel={() => {
                clearLongPressTimer();
              }}
              onClick={() => {
                if (suppressNextClickRef.current) return;
                onChange({
                  ...filters,
                  categoryId: isSelected ? 'all' : cat.id,
                });
              }}
              aria-pressed={isSelected}
              className={`${spectrumClass} min-h-[42px] sm:min-h-[38px] px-3.5 sm:px-3 py-1.5 rounded-2xl border text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 transition-all select-none cursor-grab active:cursor-grabbing ${
                isSelected
                  ? 'cat-rgb-chip-active'
                  : 'cat-rgb-chip liquid-glass-control text-zinc-700 dark:text-zinc-200'
              } ${isDragged ? 'opacity-45 scale-95' : ''} ${
                isDropTarget
                  ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-[#0B0E14] scale-[1.03]'
                  : ''
              }`}
            >
              <span className="cat-rgb-dot w-2.5 h-2.5 rounded-full shrink-0" aria-hidden="true" />
              <span>{cat.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          aria-label="ساخت دسته‌بندی دلخواه جدید"
          className="min-h-[42px] sm:min-h-[38px] px-3.5 sm:px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 bg-transparent text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>دسته جدید</span>
        </button>
      </div>

      <CustomCategoryModal
        isOpen={createModalOpen}
        existingCategories={categories}
        onClose={() => setCreateModalOpen(false)}
        onCreateCategory={(name, spectrum) => {
          onAddCategory(name, spectrum);
        }}
      />
    </section>
  );
});
