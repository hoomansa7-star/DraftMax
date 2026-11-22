import { RotateCcw, X } from 'lucide-react';

interface UndoToastProps {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-3 left-3 md:left-auto md:right-6 md:min-w-[320px] md:max-w-md z-50 flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-zinc-900/85 dark:bg-white/85 backdrop-blur-xl text-white dark:text-zinc-900 shadow-xl border border-white/20 dark:border-white/70"
    >
      <span className="text-xs sm:text-sm font-medium truncate">{message}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-zinc-950 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>بازگردانی</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="بستن اعلان"
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
