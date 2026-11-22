import { memo, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react';
import { CategoryItem, TaskItem } from '../types/task';
import { getCategorySpectrumClass } from '../utils/categoryTheme';
import { formatJalaliRelative, isDateOverdue } from '../utils/jalali';
import { PRIORITY_LABELS } from '../utils/taskLogic';

interface TaskCardProps {
  task: TaskItem;
  categoryName: string;
  categories?: CategoryItem[];
  onToggleComplete: (taskId: string) => void;
  onToggleToday: (taskId: string) => void;
  onUpdateTitle: (taskId: string, title: string) => void;
  onUpdateBody: (taskId: string, body: string) => void;
  onOpenDetail: (taskId: string) => void;
  onRestoreTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function getTaskBodyText(task: TaskItem): string {
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

export const TaskCard = memo(function TaskCard({
  task,
  categoryName,
  onToggleComplete,
  onToggleToday,
  onUpdateTitle,
  onUpdateBody,
  onOpenDetail,
  onRestoreTask,
  onDeleteTask,
}: TaskCardProps) {
  const initialBody = getTaskBodyText(task);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [bodyDraft, setBodyDraft] = useState(initialBody);
  const [isBodyFocused, setIsBodyFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastCommittedBodyRef = useRef(initialBody);
  const latestBodyDraftRef = useRef(initialBody);

  const overdue = isDateOverdue(task.dueDate, task.completed);
  const catSpectrumClass = getCategorySpectrumClass(task.categoryId, categoryName);

  // Sync external updates (e.g. cloud sync or modal edit) when not actively editing
  useEffect(() => {
    if (!editingTitle) {
      setTitleDraft(task.title);
    }
  }, [task.title, editingTitle]);

  useEffect(() => {
    const nextExternalBody = getTaskBodyText(task);
    lastCommittedBodyRef.current = nextExternalBody;
    if (!isBodyFocused) {
      setBodyDraft(nextExternalBody);
      latestBodyDraftRef.current = nextExternalBody;
    }
  }, [task.description, task.note, task.steps, isBodyFocused]);

  // Adjust textarea height on focus or input change without layout-thrashing on initial mount
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !isBodyFocused) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 44)}px`;
  }, [bodyDraft, isBodyFocused]);

  // Cleanup debounce timer on unmount and flush unsaved changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTitle(task.id, trimmed);
    } else {
      setTitleDraft(task.title);
    }
    setEditingTitle(false);
  };

  const commitBody = (value: string) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (value !== lastCommittedBodyRef.current) {
      lastCommittedBodyRef.current = value;
      onUpdateBody(task.id, value);
    }
  };

  const handleBodyChange = (nextVal: string) => {
    setBodyDraft(nextVal);
    latestBodyDraftRef.current = nextVal;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      if (latestBodyDraftRef.current !== lastCommittedBodyRef.current) {
        lastCommittedBodyRef.current = latestBodyDraftRef.current;
        onUpdateBody(task.id, latestBodyDraftRef.current);
      }
    }, 550);
  };

  const priorityColorClass =
    task.priority === 'high'
      ? 'text-amber-600 dark:text-amber-400 font-medium'
      : 'text-zinc-500 dark:text-zinc-400';

  return (
    <article
      data-testid={`task-card-${task.id}`}
      className={`${catSpectrumClass} liquid-glass-card group relative overflow-hidden rounded-3xl border transition-all p-4 sm:p-5 flex flex-col justify-between gap-3 ${
        overdue ? 'border-red-500/50 dark:border-red-500/45' : 'cat-rgb-card'
      }`}
    >
      <div className="cat-rgb-bar h-1 w-full absolute top-0 inset-x-0 opacity-85" aria-hidden="true" />

      <div className="space-y-2.5 pt-0.5">
        {/* Top Row: Category RGB Chip + Metadata + Minimal Quick Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="cat-rgb-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
              <span className="cat-rgb-dot w-2 h-2 rounded-full shrink-0" aria-hidden="true" />
              <span>{categoryName}</span>
            </span>

            {task.priority === 'high' && (
              <span className={priorityColorClass}>اولویت {PRIORITY_LABELS[task.priority]}</span>
            )}

            {task.dueDate && (
              <>
                {task.priority === 'high' && <span aria-hidden="true">·</span>}
                <span
                  className={`inline-flex items-center gap-1 tabular-nums ${
                    overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
                  }`}
                >
                  {overdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>
                    {overdue
                      ? `عقب‌افتاده (${formatJalaliRelative(task.dueDate)})`
                      : formatJalaliRelative(task.dueDate)}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 -mt-1.5 -ml-1.5">
            {!task.completed && (
              <button
                type="button"
                onClick={() => onToggleToday(task.id)}
                aria-pressed={task.isToday}
                aria-label={
                  task.isToday ? `حذف «${task.title}» از امروز` : `افزودن «${task.title}» به امروز`
                }
                title={task.isToday ? 'حذف از برنامه امروز' : 'انتخاب برای امروز'}
                className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-xl transition-colors ${
                  task.isToday
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <Sun className="w-[18px] h-[18px]" fill={task.isToday ? 'currentColor' : 'none'} />
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              aria-pressed={task.completed}
              aria-label={
                task.completed ? `بازگردانی «${task.title}»` : `تکمیل «${task.title}»`
              }
              title={task.completed ? 'بازگردانی به کارهای فعال' : 'انجام شد'}
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-xl transition-colors ${
                task.completed
                  ? 'text-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/25'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Check className="w-[19px] h-[19px]" strokeWidth={2.25} />
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(task.id)}
              aria-label={`تنظیمات و دسته‌بندی «${task.title}»`}
              title="دسته‌بندی، تاریخ و حذف"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
            >
              <SlidersHorizontal className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>

        {/* Title (Click to edit inline) */}
        <div>
          {editingTitle ? (
            <input
              type="text"
              dir="rtl"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTitle();
                }
                if (e.key === 'Escape') {
                  setTitleDraft(task.title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              aria-label="ویرایش عنوان"
              className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border border-emerald-500/50 bg-zinc-50 dark:bg-[#0B0E14] text-base sm:text-lg font-bold text-right text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(task.title);
                setEditingTitle(true);
              }}
              aria-label={`ویرایش تیتر «${task.title}»`}
              className="w-full min-h-[40px] text-right rounded-lg px-1 py-1 hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] transition-colors cursor-text focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <h2
                className={`text-base sm:text-lg font-bold leading-snug text-right ${
                  task.completed
                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {task.title}
              </h2>
            </button>
          )}
        </div>

        {/* Direct Click-to-Write Text Area right underneath the title */}
        <textarea
          ref={textareaRef}
          dir="rtl"
          rows={2}
          maxLength={2000}
          value={bodyDraft}
          onFocus={() => setIsBodyFocused(true)}
          onChange={(e) => handleBodyChange(e.target.value)}
          onBlur={() => {
            setIsBodyFocused(false);
            commitBody(latestBodyDraftRef.current);
          }}
          placeholder="اینجا کلیک کنید و بنویسید..."
          aria-label={`متن زیر تیتر «${task.title}»`}
          className={`w-full resize-none overflow-hidden rounded-2xl border px-2.5 py-2 text-base sm:text-sm leading-relaxed text-right transition-colors focus:outline-none ${
            isBodyFocused
              ? 'border-emerald-500/45 bg-white/55 dark:bg-black/35 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent bg-transparent hover:bg-white/35 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300'
          } placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
        />
      </div>

      {/* Done card actions */}
      {task.completed && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onRestoreTask(task.id)}
            className="min-h-[44px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی به کارها</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            aria-label={`حذف «${task.title}»`}
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </article>
  );
});
