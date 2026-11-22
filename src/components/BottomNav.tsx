import { CheckSquare, Layers, Sun } from 'lucide-react';
import { ActiveTab } from '../types/task';
import { toPersianDigits } from '../utils/jalali';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  counts: {
    active: number;
    today: number;
    done: number;
  };
}

export function BottomNav({ activeTab, onSelectTab, counts }: BottomNavProps) {
  const items: Array<{ id: ActiveTab; label: string; count: number; Icon: typeof Layers }> = [
    { id: 'active', label: 'همه کارها', count: counts.active, Icon: Layers },
    { id: 'today', label: 'امروز', count: counts.today, Icon: Sun },
    { id: 'done', label: 'انجام‌شده', count: counts.done, Icon: CheckSquare },
  ];

  return (
    <nav
      aria-label="ناوبری پایین"
      className="liquid-glass-bar md:hidden fixed bottom-0 left-0 right-0 z-30 min-h-[58px] pb-[env(safe-area-inset-bottom)] border-t grid grid-cols-3"
    >
      {items.map(({ id, label, count, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTab(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative min-h-[54px] flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-emerald-500" aria-hidden="true" />
            )}
            <div className="flex items-center gap-1.5">
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[11px] tabular-nums">{toPersianDigits(count)}</span>
            </div>
            <span className="text-[11px] whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
