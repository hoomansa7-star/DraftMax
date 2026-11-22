import { useState } from 'react';
import { Check, RotateCcw, Sun, Trash2, X } from 'lucide-react';
import { CategoryItem, Priority, TaskItem } from '../types/task';
import { CategorySpectrum, getCategorySpectrumClass } from '../utils/categoryTheme';
import { JalaliDatePicker } from './JalaliDatePicker';
import { CustomCategoryForm } from './RgbSpectrumPicker';

interface TaskDetailSheetProps {
  task: TaskItem | null;
  categories: CategoryItem[];
  onClose: () => void;
  onUpdateTask: (updated: TaskItem) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRestoreTask: (taskId: string) => void;
  onAddCategory: (name: string, spectrum?: CategorySpectrum) => CategoryItem | null;
}

function getBodyText(task: TaskItem): string {
  if (task.description && task.note && task.description !== task.note) {
    return `${task.description}\n${task.note}`;
  }
  if (task.description) return task.description;
  if (task.note) return task.note;
  if (task.steps.length > 0) {
    return task.steps.map((s) => s.text).join('\n');
  }
  return '';
}

export function TaskDetailSheet({
  task,
  categories,
  onClose,
  onUpdateTask,
  onToggleComplete,
  onDeleteTask,
  onRestoreTask,
  onAddCategory,
}: TaskDetailSheetProps) {
  const [creatingCat, setCreatingCat] = useState(false);

  if (!task) return null;

  const handleFieldChange = <K extends keyof TaskItem>(key: K, value: TaskItem[K]) => {
    onUpdateTask({ ...task, [key]: value });
  };

  const bodyText = getBodyText(task);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`ویرایش: ${task.title}`}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-sheet w-full md:max-w-xl rounded-t-3xl md:rounded-3xl border max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            ویرایش و تنظیمات
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن جزئیات کار"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          {/* Title & Body */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="detail-title" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                تیتر
              </label>
              <input
                id="detail-title"
                type="text"
                dir="rtl"
                maxLength={300}
                value={task.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#0B0E14] text-base font-bold text-right text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="detail-body" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                متن زیر تیتر
              </label>
              <textarea
                id="detail-body"
                dir="rtl"
                rows={5}
                maxLength={2000}
                value={bodyText}
                onChange={(e) =>
                  onUpdateTask({
                    ...task,
                    description: e.target.value,
                    note: '',
                    steps: [],
                  })
                }
                placeholder="متن خود را اینجا بنویسید..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm leading-relaxed text-right text-zinc-800 dark:text-zinc-200 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          {/* Metadata Controls: Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="detail-category" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  دسته‌بندی
                </label>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const activeCat = categories.find((c) => c.id === task.categoryId);
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
                id="detail-category"
                value={task.categoryId}
                onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">اولویت</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-800">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleFieldChange('priority', p)}
                    className={`min-h-[38px] sm:min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                      task.priority === p
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400'
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
                    handleFieldChange('categoryId', created.id);
                  }
                  setCreatingCat(false);
                }}
                onCancel={() => setCreatingCat(false)}
              />
            </div>
          )}

          <JalaliDatePicker
            value={task.dueDate}
            onChange={(iso) => handleFieldChange('dueDate', iso)}
          />

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleFieldChange('isToday', !task.isToday)}
              aria-pressed={task.isToday}
              className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-colors ${
                task.isToday
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Sun className="w-4 h-4" fill={task.isToday ? 'currentColor' : 'none'} />
              <span>{task.isToday ? 'در برنامه امروز است' : 'افزودن به امروز'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleComplete(task.id);
                onClose();
              }}
              className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-colors ${
                task.completed
                  ? 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{task.completed ? 'بازگردانی به فعال‌ها' : 'علامت به عنوان انجام‌شده'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-[#0E121A]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onDeleteTask(task.id);
                onClose();
              }}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>

            {task.completed && (
              <button
                type="button"
                onClick={() => {
                  onRestoreTask(task.id);
                  onClose();
                }}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بازگردانی</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
