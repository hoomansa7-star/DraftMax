import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Cloud,
  Download,
  GripVertical,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CategoryItem } from '../types/task';
import { AccountSlotId, MAX_GOOGLE_ACCOUNTS, SavedGoogleAccount } from '../utils/accountsStore';
import { CategorySpectrum, getCategorySpectrumClass } from '../utils/categoryTheme';
import { toPersianDigits } from '../utils/jalali';
import { CustomCategoryForm } from './RgbSpectrumPicker';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onAddCategory: (name: string, spectrum?: CategorySpectrum) => CategoryItem | null | void;
  onRenameCategory: (id: string, name: string) => void;
  onReorderCategories: (fromIndex: number, toIndex: number) => void;
  onDeleteCategory: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => { ok: boolean; message: string } | Promise<{ ok: boolean; message: string }>;
  sampleTaskCount: number;
  onClearSampleTasks: () => void;
  user: User | null;
  savedAccounts: SavedGoogleAccount[];
  activeSlotId: AccountSlotId;
  slotOnlineMap: Partial<Record<AccountSlotId, boolean>>;
  authLoading: boolean;
  authError: string | null;
  onSignIn: () => void;
  onAddAccount: () => void;
  onSwitchAccount: (slotId: AccountSlotId) => void;
  onRemoveAccount: (slotId: AccountSlotId) => void;
  localUnsyncedCount: number;
  onMergeLocalToCloud: () => void;
}

export function SettingsSheet({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onExportJson,
  onImportJson,
  sampleTaskCount,
  onClearSampleTasks,
  user,
  savedAccounts,
  activeSlotId,
  slotOnlineMap,
  authLoading,
  authError,
  onSignIn,
  onAddAccount,
  onSwitchAccount,
  onRemoveAccount,
  localUnsyncedCount,
  onMergeLocalToCloud,
}: SettingsSheetProps) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchDragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const onReorderRef = useRef(onReorderCategories);
  onReorderRef.current = onReorderCategories;
  touchDragIndexRef.current = touchDragIndex;
  dropIndexRef.current = dropIndex;

  useEffect(() => {
    if (touchDragIndex === null) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = el?.closest<HTMLElement>('[data-settings-cat-index]');
      if (row) {
        const idx = Number(row.dataset.settingsCatIndex);
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
      setTouchDragIndex(null);
      setDropIndex(null);
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

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await onImportJson(text);
    setImportFeedback(result);
    e.target.value = '';
  };

  const activeDragIndex = dragIndex ?? touchDragIndex;
  const canAddMoreAccounts = savedAccounts.length < MAX_GOOGLE_ACCOUNTS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تنظیمات، دسته‌بندی‌ها و پشتیبان‌گیری"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-sheet w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 shrink-0" />

        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            تنظیمات و حساب کاربری
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن تنظیمات"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6">
          {/* Cloud Sync & Multi-Google Accounts (up to 4) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-500" />
                <span>حساب‌های گوگل و همگام‌سازی ابری</span>
              </h3>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                {toPersianDigits(savedAccounts.length)} از {toPersianDigits(MAX_GOOGLE_ACCOUNTS)}
              </span>
            </div>

            {savedAccounts.length > 0 ? (
              <div className="space-y-2.5">
                {savedAccounts.map((acc) => {
                  const isActive = acc.slotId === activeSlotId;
                  const isOnline = Boolean(slotOnlineMap[acc.slotId]);
                  const initial = (acc.displayName || acc.email || 'ک').trim().charAt(0).toUpperCase();

                  return (
                    <div
                      key={acc.slotId}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                        isActive
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0E14]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSwitchAccount(acc.slotId)}
                        className="flex-1 min-h-[46px] flex items-center gap-2.5 text-right min-w-0 rounded-lg"
                      >
                        {acc.photoURL ? (
                          <img
                            src={acc.photoURL}
                            alt={acc.displayName || acc.email}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                          />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {initial}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
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
                        className="min-h-[44px] px-2.5 inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-500/50 hover:text-red-500 text-xs font-medium text-zinc-600 dark:text-zinc-300 shrink-0 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>خروج</span>
                      </button>
                    </div>
                  );
                })}

                {canAddMoreAccounts ? (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={onAddAccount}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-dashed border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {authLoading
                        ? 'در حال اتصال به گوگل...'
                        : `افزودن اکانت گوگل جدید (${toPersianDigits(savedAccounts.length)}/${toPersianDigits(MAX_GOOGLE_ACCOUNTS)})`}
                    </span>
                  </button>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    حداکثر ۴ اکانت گوگل متصل است. برای افزودن حساب جدید ابتدا یکی را خارج کنید.
                  </p>
                )}

                {user && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    همگام‌سازی خودکار بین موبایل و کامپیوتر برای حساب فعال برقرار است.
                  </p>
                )}

                {user && localUnsyncedCount > 0 && (
                  <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0E14] flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {toPersianDigits(localUnsyncedCount)} کار محلی آماده افزودن به این حساب است.
                    </span>
                    <button
                      type="button"
                      onClick={onMergeLocalToCloud}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shrink-0"
                    >
                      افزودن به حساب
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0B0E14] space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  می‌توانید تا ۴ اکانت جیمیل را به برنامه اضافه کنید؛ داده‌های هر اکانت به‌صورت جداگانه در فضای ابری ذخیره می‌شوند و با یک کلیک بین آن‌ها جابه‌جا شوید.
                </p>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={onSignIn}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'در حال اتصال به گوگل...' : 'ورود با حساب گوگل (Gmail)'}</span>
                </button>
              </div>
            )}

            {authError && (
              <p className="text-xs font-medium px-3 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                {authError}
              </p>
            )}
          </section>

          {/* Categories Management (Drag & Drop Reorderable) */}
          <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">دسته‌بندی‌ها</h3>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                برای تغییر ترتیب بکشید
              </span>
            </div>

            <ul className="space-y-2">
              {categories.map((cat, index) => {
                const spectrumClass = getCategorySpectrumClass(cat.id, cat.name);
                const isDragged = activeDragIndex === index;
                const isDropTarget =
                  activeDragIndex !== null && dropIndex === index && activeDragIndex !== index;

                return (
                  <li
                    key={cat.id}
                    data-settings-cat-index={index}
                    draggable={editingCatId !== cat.id}
                    onDragStart={(e) => {
                      if (editingCatId === cat.id) return;
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
                    className={`${spectrumClass} cat-rgb-row flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-[#0B0E14] transition-all ${
                      isDragged ? 'opacity-45 scale-[0.98]' : ''
                    } ${isDropTarget ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        type="button"
                        aria-label={`جابه‌جایی دسته ${cat.name}`}
                        title="بکشید یا با کلید بالا/پایین جابه‌جا کنید"
                        onTouchStart={() => {
                          setTouchDragIndex(index);
                          setDropIndex(index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' && index > 0) {
                            e.preventDefault();
                            onReorderCategories(index, index - 1);
                          } else if (e.key === 'ArrowDown' && index < categories.length - 1) {
                            e.preventDefault();
                            onReorderCategories(index, index + 1);
                          }
                        }}
                        className="touch-none min-h-[42px] sm:min-h-[34px] min-w-[34px] sm:min-w-[28px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing shrink-0"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      {editingCatId === cat.id ? (
                        <input
                          type="text"
                          dir="rtl"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          onBlur={() => {
                            if (editingCatName.trim()) {
                              onRenameCategory(cat.id, editingCatName.trim());
                            }
                            setEditingCatId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingCatName.trim()) {
                              onRenameCategory(cat.id, editingCatName.trim());
                              setEditingCatId(null);
                            }
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                          autoFocus
                          className="flex-1 min-h-[38px] px-2.5 py-1 rounded-lg border border-emerald-500 bg-white dark:bg-[#131720] text-base sm:text-sm text-right"
                        />
                      ) : (
                        <span className="cat-rgb-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold truncate">
                          <span className="cat-rgb-dot w-2 h-2 rounded-full shrink-0" aria-hidden="true" />
                          <span className="truncate">{cat.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        aria-label={`تغییر نام دسته ${cat.name}`}
                        className="min-h-[42px] min-w-[42px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={categories.length <= 1}
                        onClick={() => onDeleteCategory(cat.id)}
                        aria-label={`حذف دسته ${cat.name}`}
                        className="min-h-[42px] min-w-[42px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0B0E14]/60">
              <CustomCategoryForm
                existingCount={categories.length}
                submitLabel="افزودن"
                onSubmitCategory={(name, spectrum) => onAddCategory(name, spectrum)}
              />
            </div>
          </section>

          {/* Backup & Restore */}
          <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              پشتیبان‌گیری و انتقال اطلاعات (JSON)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              علاوه بر همگام‌سازی ابری، هر زمان می‌توانید از اطلاعات این حساب فایل پشتیبان JSON بگیرید یا بازیابی کنید.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onExportJson}
                className="min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] hover:border-emerald-500/60 text-sm font-medium text-zinc-800 dark:text-zinc-100 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>خروجی گرفتن (Export)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0B0E14] hover:border-emerald-500/60 text-sm font-medium text-zinc-800 dark:text-zinc-100 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>بازیابی فایل (Import)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
                aria-label="انتخاب فایل JSON برای بازیابی"
              />
            </div>

            {importFeedback && (
              <p
                className={`text-xs font-medium px-3 py-2 rounded-xl ${
                  importFeedback.ok
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                {importFeedback.message}
              </p>
            )}
          </section>

          {/* Sample Tasks Cleanup */}
          <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">کارهای نمونه</h3>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {sampleTaskCount > 0
                  ? `${toPersianDigits(sampleTaskCount)} کار نمونه در فهرست موجود است.`
                  : 'همه کارهای نمونه پاک شده‌اند.'}
              </span>
              <button
                type="button"
                disabled={sampleTaskCount === 0}
                onClick={onClearSampleTasks}
                className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-xs font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>پاک کردن کارهای نمونه</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
