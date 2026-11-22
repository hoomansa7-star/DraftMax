import { useState } from 'react';
import { User } from 'firebase/auth';
import { ChevronDown, LogIn, Moon, Plus, SlidersHorizontal, Sun } from 'lucide-react';
import { ActiveTab, ThemeMode } from '../types/task';
import { MAX_GOOGLE_ACCOUNTS, SavedGoogleAccount } from '../utils/accountsStore';
import { toPersianDigits } from '../utils/jalali';

interface HeaderBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  counts: {
    active: number;
    today: number;
    done: number;
  };
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenQuickAdd: () => void;
  onOpenAccounts: () => void;
  savedAccounts: SavedGoogleAccount[];
  user: User | null;
  authLoading: boolean;
  authPending?: boolean;
  onSignIn: () => void;
}

export function HeaderBar({
  activeTab,
  onSelectTab,
  counts,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenQuickAdd,
  onOpenAccounts,
  savedAccounts,
  user,
  authLoading,
  authPending = false,
  onSignIn,
}: HeaderBarProps) {
  const [avatarError, setAvatarError] = useState(false);

  const tabs: Array<{ id: ActiveTab; label: string; count: number }> = [
    { id: 'active', label: 'همه کارها', count: counts.active },
    { id: 'today', label: 'امروز', count: counts.today },
    { id: 'done', label: 'انجام‌شده', count: counts.done },
  ];

  const activeSaved = savedAccounts.find((a) => user && a.uid === user.uid) ?? null;
  const displayName = user?.displayName || activeSaved?.displayName || user?.email || 'حساب من';
  const photoURL = user?.photoURL || activeSaved?.photoURL || '';
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'ک';

  return (
    <header className="liquid-glass-bar sticky top-0 z-30 h-13 md:h-16 pt-[env(safe-area-inset-top)] border-b">
      <div className="max-w-5xl mx-auto h-full px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 md:gap-8">
        {/* Zone 1: Brand Title */}
        <h1
          dir="ltr"
          className="text-base md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap shrink-0"
        >
          DraftMax
        </h1>

        {/* Zone 2: Desktop Navigation Tabs */}
        <nav aria-label="تب‌های اصلی" className="hidden md:flex items-center gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1.5 text-sm whitespace-nowrap shrink-0 transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {toPersianDigits(tab.count)}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {user || savedAccounts.length > 0 ? (
            <button
              type="button"
              onClick={onOpenAccounts}
              aria-label={`جابه‌جایی حساب کاربری (${toPersianDigits(savedAccounts.length)} از ${toPersianDigits(MAX_GOOGLE_ACCOUNTS)})`}
              title={user?.email || 'مدیریت حساب‌های گوگل'}
              className="liquid-glass-control min-h-[44px] sm:min-h-[40px] px-2 sm:px-2.5 flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-white/60 dark:border-white/15 hover:border-emerald-500/50 transition-colors whitespace-nowrap shrink-0"
            >
              {photoURL && !avatarError ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {userInitial}
                </span>
              )}
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 max-w-[76px] sm:max-w-[115px] truncate">
                {displayName.split(' ')[0]}
              </span>
              {savedAccounts.length > 1 && (
                <span className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(savedAccounts.length)}/{toPersianDigits(MAX_GOOGLE_ACCOUNTS)}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            </button>
          ) : authPending ? (
            <div
              aria-hidden="true"
              className="h-[44px] sm:h-[40px] w-24 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse shrink-0"
            />
          ) : (
            <button
              type="button"
              disabled={authLoading}
              onClick={onSignIn}
              aria-label="ورود با حساب گوگل برای همگام‌سازی"
              className="liquid-glass-control min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-white/60 dark:border-white/15 hover:border-emerald-500/60 text-xs font-medium text-zinc-800 dark:text-zinc-100 whitespace-nowrap shrink-0 disabled:opacity-50 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{authLoading ? 'در حال ورود...' : 'ورود با گوگل'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="تنظیمات، دسته‌ها و پشتیبان‌گیری"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 transition-colors"
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="hidden md:inline-flex min-h-[40px] items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>کار جدید</span>
          </button>
        </div>
      </div>
    </header>
  );
}
