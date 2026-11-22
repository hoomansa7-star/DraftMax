import { useState } from 'react';
import { Sun, X } from 'lucide-react';
import { CategoryItem, Priority, TaskItem } from '../types/task';
import { CategorySpectrum, getCategorySpectrumClass } from '../utils/categoryTheme';
import { createId } from '../utils/taskLogic';
import { JalaliDatePicker } from './JalaliDatePicker';
import { CustomCategoryForm } from './RgbSpectrumPicker';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  defaultToday?: boolean;
  onCreateTask: (task: TaskItem) => void;
  onAddCategory: (name: string, spectrum?: CategorySpectrum) => CategoryItem | null;
}

export function QuickAddSheet({
  isOpen,
  onClose,
  categories,
  defaultToday = false,
  onCreateTask,
  onAddCategory,
}: QuickAddSheetProps) {
  const [titleInput, setTitleInput] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'cat_dilan');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isToday, setIsToday] = useState(defaultToday);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setTitleInput('');
    setBodyText('');
    setCategoryId(categories[0]?.id ?? 'cat_dilan');
    setPriority('medium');
    setDueDate(null);
    setIsToday(defaultToday);
    setShowDatePicker(false);
    setCreatingCat(false);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = titleInput.trim();
    if (!finalTitle) {
      setErrorMsg('لطفاً تیتر را وارد کنید.');
      return;
    }

    const newTask: TaskItem = {
      id: createId('task'),
      title: finalTitle,
      description: bodyText,
      categoryId: categories.some((c) => c.id === categoryId)
        ? categoryId
        : (categories[0]?.id ?? 'cat_dilan'),
      priority,
      dueDate,
      steps: [],
      note: '',
      isToday,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    onCreateTask(newTask);
    resetAndClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="افزودن مورد جدید"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="liquid-glass-sheet w-full md:max-w-xl rounded-t-3xl md:rounded-3xl border max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">مورد جدید</h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="بستن پنجره کار جدید"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="quick-add-title" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              تیتر
            </label>
            <input
              id="quick-add-title"
              type="text"
              dir="rtl"
              maxLength={300}
              value={titleInput}
              onChange={(e) => {
                setTitleInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              autoFocus
              placeholder="مثلاً: کارهای امروز یا یادداشت..."
              className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm font-semibold text-right text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
            {errorMsg && <p className="text-xs text-red-500 font-medium">{errorMsg}</p>}
          </div>

          {/* Direct Freeform Text underneath title */}
          <div className="space-y-1.5">
            <label htmlFor="quick-add-body" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              متن زیر تیتر
            </label>
            <textarea
              id="quick-add-body"
              dir="rtl"
              rows={4}
              maxLength={2000}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="هر متنی می‌خواهید اینجا بنویسید..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm leading-relaxed text-right text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y"
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="quick-add-cat" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  دسته‌بندی
                </label>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const activeCat = categories.find((c) => c.id === categoryId) ?? categories[0];
                    if (!activeCat) return null;
                    return (
                      <span
                        className={`${getCategorySpectrumClass(activeCat.id, activeCat.name)} cat-rgb-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold`}
                      >
                        <span className="cat-rgb-dot w-1.5 h-1.5 rounded-full" aria-hidden="true" />
                        <span>{activeCat.name}</span>
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setCreatingCat((prev) => !prev)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-1"
                  >
                    {creatingCat ? 'بستن' : '+ دسته جدید'}
                  </button>
                </div>
              </div>
              <select
                id="quick-add-cat"
                value={
                  categories.some((c) => c.id === categoryId)
                    ? categoryId
                    : (categories[0]?.id ?? 'cat_dilan')
                }
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm text-zinc-900 dark:text-zinc-100"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">اولویت</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-800">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`min-h-[38px] sm:min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                      priority === p
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {p === 'high' ? 'فوری' : p === 'medium' ? 'متوسط' : 'عادی'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {creatingCat && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-zinc-50/80 dark:bg-[#0B0E14]">
              <CustomCategoryForm
                existingCount={categories.length}
                autoFocus
                submitLabel="ساخت و انتخاب"
                onSubmitCategory={(name, spectrum) => {
                  const created = onAddCategory(name, spectrum);
                  if (created) {
                    setCategoryId(created.id);
                  }
                  setCreatingCat(false);
                }}
                onCancel={() => setCreatingCat(false)}
              />
            </div>
          )}

          {/* Today Toggle + Optional Date */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsToday((v) => !v)}
              aria-pressed={isToday}
              className={`min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                isToday
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Sun className="w-4 h-4" fill={isToday ? 'currentColor' : 'none'} />
              <span>افزودن به امروز</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className="min-h-[40px] px-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {showDatePicker ? 'بستن تاریخ' : 'تاریخ یادآوری +'}
            </button>
          </div>

          {showDatePicker && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <JalaliDatePicker value={dueDate} onChange={setDueDate} />
            </div>
          )}

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
            >
              ثبت کار
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
