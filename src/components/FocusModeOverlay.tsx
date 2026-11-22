import { useState } from 'react';
import { Check, CheckCircle2, MessageSquareText, X } from 'lucide-react';
import { TaskItem } from '../types/task';
import { toPersianDigits } from '../utils/jalali';
import { getNextStep, getTaskProgress } from '../utils/taskLogic';

interface FocusModeOverlayProps {
  task: TaskItem | null;
  onClose: () => void;
  onCompleteNextStep: (taskId: string) => void;
  onUpdateNote: (taskId: string, note: string) => void;
}

export function FocusModeOverlay({
  task,
  onClose,
  onCompleteNextStep,
  onUpdateNote,
}: FocusModeOverlayProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  if (!task) return null;

  const nextStep = getNextStep(task);
  const progress = getTaskProgress(task);
  const currentStepNumber = Math.min(progress.doneCount + 1, Math.max(progress.totalCount, 1));

  const startEditingNote = () => {
    setNoteDraft(task.note);
    setEditingNote(true);
  };

  const saveNote = () => {
    onUpdateNote(task.id, noteDraft.trim());
    setEditingNote(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`حالت تمرکز: ${task.title}`}
      className="fixed inset-0 z-50 bg-zinc-50 dark:bg-[#080B10] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-8"
    >
      {/* Top Bar */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">حالت تمرکز</div>
          <h2 className="text-sm sm:text-base font-semibold truncate text-zinc-800 dark:text-zinc-200">
            {task.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="خروج از حالت تمرکز"
          className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>

      {/* Center Focal Area */}
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center text-center py-8 px-2">
        {nextStep ? (
          <div key={nextStep.id} className="animate-step-enter w-full space-y-6">
            <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              قدم {toPersianDigits(currentStepNumber)} از {toPersianDigits(progress.totalCount)}
            </div>

            <p className="text-2xl sm:text-4xl font-bold leading-relaxed text-zinc-900 dark:text-zinc-50 text-balance">
              {nextStep.text}
            </p>

            {/* Progress thin bar */}
            <div className="max-w-xs mx-auto h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Quick Where I left off note */}
            <div className="pt-2">
              {editingNote ? (
                <div className="max-w-md mx-auto space-y-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNote();
                      if (e.key === 'Escape') setEditingNote(false);
                    }}
                    autoFocus
                    placeholder="یادداشت کوتاه از آخرین وضعیت..."
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-emerald-500 bg-white dark:bg-[#131720] text-sm text-center"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={saveNote}
                      className="min-h-[36px] px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium"
                    >
                      ذخیره
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNote(false)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs text-zinc-500"
                    >
                      لغو
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditingNote}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <MessageSquareText className="w-4 h-4 shrink-0" />
                  <span>{task.note || 'ثبت یادداشت «کجا ماندم؟»'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div key="focus-complete" className="animate-step-enter space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              همه قدم‌های این کار انجام شد!
            </h3>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              کار «{task.title}» به بخش انجام‌شده‌ها منتقل شد.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Giant Primary CTA */}
      <div className="max-w-md w-full mx-auto pb-2">
        {nextStep ? (
          <button
            type="button"
            onClick={() => onCompleteNextStep(task.id)}
            className="w-full min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-base sm:text-lg font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/25 transition-all"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>انجام شد، قدم بعدی</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[56px] rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-base font-bold flex items-center justify-center transition-opacity hover:opacity-90"
          >
            بازگشت به لیست کارها
          </button>
        )}
      </div>
    </div>
  );
}
