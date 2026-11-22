import { CheckCircle2, ListTodo, Plus, Search, Sun } from 'lucide-react';
import { ActiveTab } from '../types/task';

interface EmptyStateProps {
  tab: ActiveTab;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onQuickAdd: () => void;
  onSwitchToActive: () => void;
}

export function EmptyState({
  tab,
  hasActiveFilters,
  onResetFilters,
  onQuickAdd,
  onSwitchToActive,
}: EmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-white/70 dark:border-white/15 liquid-glass-card">
        <Search className="w-10 h-10 mx-auto mb-3 text-zinc-400 dark:text-zinc-500" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
          کاری با این فیلترها پیدا نشد
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-5">
          جستجو یا دسته‌بندی را تغییر دهید تا دوباره همه کارها را ببینید.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          پاک کردن فیلترها
        </button>
      </div>
    );
  }

  if (tab === 'today') {
    return (
      <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-white/70 dark:border-white/15 liquid-glass-card">
        <Sun className="w-10 h-10 mx-auto mb-3 text-amber-500/80" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
          فهرست امروز هنوز خالی است
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-5">
          برای جلوگیری از شلوغی ذهن، ۳ تا ۵ کار را از لیست اصلی برای امروز انتخاب کنید.
        </p>
        <button
          type="button"
          onClick={onSwitchToActive}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          انتخاب از کارهای فعال
        </button>
      </div>
    );
  }

  if (tab === 'done') {
    return (
      <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-white/70 dark:border-white/15 liquid-glass-card">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500/80" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
          هنوز موردی تمام نشده است
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
          هر زمان تیک انجام کار را بزنید، به این بخش منتقل می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-white/70 dark:border-white/15 liquid-glass-card">
      <ListTodo className="w-10 h-10 mx-auto mb-3 text-emerald-500/80" />
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
        فهرست خالی است
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-5">
        اولین تیتر را بسازید و متن خود را راحت زیر آن بنویسید.
      </p>
      <button
        type="button"
        onClick={onQuickAdd}
        className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>افزودن اولین مورد</span>
      </button>
    </div>
  );
}
