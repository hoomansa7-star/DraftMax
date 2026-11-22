import { Check, LogOut, Plus, Settings, UserPlus, X } from 'lucide-react';
import { AccountSlotId, MAX_GOOGLE_ACCOUNTS, SavedGoogleAccount } from '../utils/accountsStore';
import { toPersianDigits } from '../utils/jalali';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: SavedGoogleAccount[];
  activeSlotId: AccountSlotId;
  slotOnlineMap: Partial<Record<AccountSlotId, boolean>>;
  authLoading: boolean;
  authError: string | null;
  onSwitchAccount: (slotId: AccountSlotId) => void;
  onAddAccount: () => void;
  onRemoveAccount: (slotId: AccountSlotId) => void;
  onOpenSettings: () => void;
}

export function AccountSwitcherModal({
  isOpen,
  onClose,
  accounts,
  activeSlotId,
  slotOnlineMap,
  authLoading,
  authError,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
  onOpenSettings,
}: AccountSwitcherModalProps) {
  if (!isOpen) return null;

  const canAddMore = accounts.length < MAX_GOOGLE_ACCOUNTS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مدیریت و جابه‌جایی حساب‌های گوگل"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-sheet w-full md:max-w-md rounded-t-3xl md:rounded-3xl border max-h-[88dvh] flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 shrink-0" />

        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              حساب‌های گوگل
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {toPersianDigits(accounts.length)} از {toPersianDigits(MAX_GOOGLE_ACCOUNTS)} حساب متصل · هر حساب فضای جداگانه دارد
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره حساب‌ها"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5">
          {accounts.map((acc) => {
            const isActive = acc.slotId === activeSlotId;
            const isOnline = Boolean(slotOnlineMap[acc.slotId]);
            const initial = (acc.displayName || acc.email || 'ک').trim().charAt(0).toUpperCase();

            return (
              <div
                key={acc.slotId}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition-colors ${
                  isActive
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0E14]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSwitchAccount(acc.slotId);
                    onClose();
                  }}
                  className="flex-1 min-h-[48px] flex items-center gap-3 text-right min-w-0 px-1 rounded-xl touch-manipulation"
                >
                  {acc.photoURL ? (
                    <img
                      src={acc.photoURL}
                      alt={acc.displayName || acc.email}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {initial}
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {acc.displayName || 'کاربر گوگل'}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>فعال</span>
                        </span>
                      )}
                    </div>
                    <p dir="ltr" className="text-xs text-zinc-500 dark:text-zinc-400 truncate text-right">
                      {acc.email || (isOnline ? 'متصل' : 'نیاز به ورود مجدد')}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveAccount(acc.slotId)}
                  aria-label={`خروج از حساب ${acc.displayName || acc.email}`}
                  title="خروج از این حساب"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 transition-colors touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {authError && (
            <p className="text-xs font-medium px-3 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              {authError}
            </p>
          )}
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0E121A] space-y-2.5">
          {canAddMore ? (
            <button
              type="button"
              disabled={authLoading}
              onClick={() => {
                onAddAccount();
              }}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 transition-colors touch-manipulation"
            >
              {accounts.length === 0 ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {authLoading
                  ? 'در حال اتصال به گوگل...'
                  : accounts.length === 0
                    ? 'افزودن حساب گوگل'
                    : `افزودن اکانت گوگل جدید (${toPersianDigits(accounts.length)}/${toPersianDigits(MAX_GOOGLE_ACCOUNTS)})`}
              </span>
            </button>
          ) : (
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 py-1.5">
              حداکثر ۴ اکانت گوگل اضافه شده است. برای افزودن اکانت جدید، ابتدا یکی را خارج کنید.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#131720] text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation"
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات و دسته‌بندی‌ها</span>
          </button>
        </div>
      </div>
    </div>
  );
}
