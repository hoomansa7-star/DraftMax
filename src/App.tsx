import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { AlertCircle, Plus } from 'lucide-react';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { BottomNav } from './components/BottomNav';
import { EmptyState } from './components/EmptyState';
import { FilterBar } from './components/FilterBar';
import { HeaderBar } from './components/HeaderBar';
import { LiquidBackground } from './components/LiquidBackground';
import { QuickAddSheet } from './components/QuickAddSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { TaskCard } from './components/TaskCard';
import { TaskDetailSheet } from './components/TaskDetailSheet';
import { UndoToast } from './components/UndoToast';
import { createSampleTasks, DEFAULT_CATEGORIES } from './data/seedData';
import { createGoogleProvider, getSlotServices } from './firebase';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import {
  applyCategoriesPresetInCloud,
  checkCloudHasData,
  clearSampleTasksInCloud,
  CloudTarget,
  createCategoryInCloud,
  createTaskInCloud,
  deleteCategoryAndReassignInCloud,
  deleteTaskInCloud,
  ensureUserProfile,
  migrateLocalDataToCloud,
  renameCategoryInCloud,
  reorderCategoriesInCloud,
  replaceCloudWithBackup,
  subscribeToUserCategories,
  subscribeToUserTasks,
  syncThemePreference,
  updateTaskInCloud,
} from './services/firestoreService';
import { ActiveTab, CategoryItem, FilterState, TaskItem, ThemeMode } from './types/task';
import {
  AccountSlotId,
  findFreeSlot,
  MAX_GOOGLE_ACCOUNTS,
  readActiveSlotId,
  readSavedAccounts,
  removeSavedAccount,
  SavedGoogleAccount,
  upsertSavedAccount,
  writeActiveSlotId,
  writeSavedAccounts,
} from './utils/accountsStore';
import { CategorySpectrum } from './utils/categoryTheme';
import {
  clearCloudCache,
  readActiveUid,
  readCloudCache,
  writeActiveUid,
  writeCloudCache,
} from './utils/cloudCache';
import { formatJalaliFull, getTodayIsoDate, toPersianDigits } from './utils/jalali';
import {
  addProgramCategoryIfMissing,
  buildBackupPayload,
  createId,
  filterAndSortTasks,
  migrateCategoriesAndTasksPreset,
  needsDefaultCategoriesMigration,
  needsProgramCategoryAddition,
  parseBackupPayload,
  PROGRAM_CATEGORY,
  reorderCategories,
  restoreTaskToActive,
  sortCategoriesByPreset,
} from './utils/taskLogic';

interface UndoAction {
  message: string;
  restore: () => void | Promise<void>;
}

export default function App() {
  const [localTasks, setLocalTasks] = useLocalStorageState<TaskItem[]>('nextstep_tasks_v1', () =>
    createSampleTasks()
  );
  const [localCategories, setLocalCategories] = useLocalStorageState<CategoryItem[]>(
    'nextstep_categories_v1',
    DEFAULT_CATEGORIES
  );
  const [theme, setTheme] = useLocalStorageState<ThemeMode>('nextstep_theme_v1', 'dark');

  // Multi-Google Account Slots (up to 4 independent Firebase Auth + Firestore sessions)
  const [savedAccounts, setSavedAccounts] = useState<SavedGoogleAccount[]>(() => readSavedAccounts());
  const [activeSlotId, setActiveSlotId] = useState<AccountSlotId>(() => readActiveSlotId());
  const [signingInSlot, setSigningInSlot] = useState<AccountSlotId | null>(null);
  const [slotUsers, setSlotUsers] = useState<Partial<Record<AccountSlotId, User | null>>>({});
  const [slotAuthResolved, setSlotAuthResolved] = useState<Partial<Record<AccountSlotId, boolean>>>({});

  const [cachedActiveUid, setCachedActiveUid] = useState<string | null>(() => {
    const uid = readActiveUid();
    if (uid) return uid;
    const accounts = readSavedAccounts();
    const slot = readActiveSlotId();
    return accounts.find((a) => a.slotId === slot)?.uid ?? null;
  });

  const initialCloudSnapshot = useMemo(
    () => (cachedActiveUid ? readCloudCache(cachedActiveUid) : null),
    // Read once on mount for zero-flash hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudTasks, setCloudTasks] = useState<TaskItem[]>(() => initialCloudSnapshot?.tasks ?? []);
  const [cloudCategories, setCloudCategories] = useState<CategoryItem[]>(
    () => initialCloudSnapshot?.categories ?? []
  );
  const [hasCachedCloud, setHasCachedCloud] = useState<boolean>(() => Boolean(initialCloudSnapshot));
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categoryId: 'all',
    priority: 'all',
  });

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Refs for stable access inside async listeners & migrations
  const localTasksRef = useRef(localTasks);
  localTasksRef.current = localTasks;
  const localCategoriesRef = useRef(localCategories);
  localCategoriesRef.current = localCategories;
  const savedAccountsRef = useRef(savedAccounts);
  savedAccountsRef.current = savedAccounts;
  const activeSlotIdRef = useRef(activeSlotId);
  activeSlotIdRef.current = activeSlotId;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const cloudPresetMigratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    writeSavedAccounts(savedAccounts);
  }, [savedAccounts]);

  useEffect(() => {
    writeActiveSlotId(activeSlotId);
  }, [activeSlotId]);

  useEffect(() => {
    try {
      const migratedFlag = window.localStorage.getItem('draftmax_categories_preset_v3');
      if (migratedFlag !== '1') {
        if (needsDefaultCategoriesMigration(localCategoriesRef.current)) {
          const res = migrateCategoriesAndTasksPreset(
            localCategoriesRef.current,
            localTasksRef.current
          );
          localCategoriesRef.current = res.categories;
          localTasksRef.current = res.tasks;
          setLocalCategories(res.categories);
          setLocalTasks(res.tasks);
        } else if (needsProgramCategoryAddition(localCategoriesRef.current)) {
          const nextCats = addProgramCategoryIfMissing(localCategoriesRef.current);
          localCategoriesRef.current = nextCats;
          setLocalCategories(nextCats);
        }
        window.localStorage.setItem('draftmax_categories_preset_v3', '1');
      }
    } catch {
      // Ignore storage restrictions
    }
  }, [setLocalCategories, setLocalTasks]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Monitor auth state for active slot, slot_0 (default), all saved slots, and any in-progress sign-in slot
  const monitoredSlotsKey = useMemo(() => {
    const set = new Set<AccountSlotId>(['slot_0', activeSlotId]);
    savedAccounts.forEach((a) => set.add(a.slotId));
    if (signingInSlot) set.add(signingInSlot);
    return Array.from(set).sort().join(',');
  }, [activeSlotId, savedAccounts, signingInSlot]);

  useEffect(() => {
    const slots = monitoredSlotsKey
      .split(',')
      .filter((s): s is AccountSlotId => Boolean(s));
    let cancelled = false;

    const unsubscribers = slots.map((slotId) => {
      const services = getSlotServices(slotId);
      return onAuthStateChanged(services.auth, async (slotUser) => {
        if (cancelled) return;

        if (slotUser) {
          const duplicate = savedAccountsRef.current.find(
            (a) => a.uid === slotUser.uid && a.slotId !== slotId
          );
          if (duplicate) {
            try {
              await signOut(services.auth);
            } catch {
              // ignore duplicate cleanup failure
            }
            if (!cancelled) {
              setSlotUsers((prev) => ({ ...prev, [slotId]: null }));
              setSlotAuthResolved((prev) => ({ ...prev, [slotId]: true }));
            }
            return;
          }

          setSavedAccounts((prev) =>
            upsertSavedAccount(prev, {
              slotId,
              uid: slotUser.uid,
              email: slotUser.email ?? '',
              displayName: slotUser.displayName ?? '',
              photoURL: slotUser.photoURL ?? '',
              addedAt: Date.now(),
            })
          );
        }

        setSlotUsers((prev) => ({ ...prev, [slotId]: slotUser }));
        setSlotAuthResolved((prev) => ({ ...prev, [slotId]: true }));
      });
    });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [monitoredSlotsKey]);

  const activeUser = slotUsers[activeSlotId] ?? null;
  const activeAuthResolved = Boolean(slotAuthResolved[activeSlotId]);
  const activeSavedAccount = useMemo(
    () => savedAccounts.find((a) => a.slotId === activeSlotId) ?? null,
    [savedAccounts, activeSlotId]
  );

  const activeServices = useMemo(() => getSlotServices(activeSlotId), [activeSlotId]);
  const activeCloudTarget = useMemo<CloudTarget>(
    () => ({ db: activeServices.db, auth: activeServices.auth }),
    [activeServices]
  );

  const slotOnlineMap = useMemo(() => {
    const map: Partial<Record<AccountSlotId, boolean>> = {};
    for (const acc of savedAccounts) {
      map[acc.slotId] = Boolean(slotUsers[acc.slotId]);
    }
    return map;
  }, [savedAccounts, slotUsers]);

  // Reset transient UI state when switching active account
  const activeUserUid = activeUser?.uid ?? null;
  const prevActiveUidRef = useRef<string | null>(activeUserUid);
  useEffect(() => {
    if (prevActiveUidRef.current !== activeUserUid) {
      prevActiveUidRef.current = activeUserUid;
      setSelectedTaskId(null);
      setFilters({ search: '', categoryId: 'all', priority: 'all' });
    }
  }, [activeUserUid]);

  // Subscribe to the active Google account's isolated Firestore workspace
  useEffect(() => {
    let cancelled = false;
    setCloudError(null);

    if (!activeUser) {
      if (activeSavedAccount) {
        const snap = readCloudCache(activeSavedAccount.uid);
        if (snap) {
          setCloudTasks(snap.tasks);
          setCloudCategories(snap.categories);
          setHasCachedCloud(true);
        } else {
          setCloudTasks([]);
          setCloudCategories([]);
          setHasCachedCloud(false);
        }
        setCachedActiveUid(activeSavedAccount.uid);
      } else {
        writeActiveUid(null);
        setCachedActiveUid(null);
        setHasCachedCloud(false);
        setCloudTasks([]);
        setCloudCategories([]);
      }
      setCloudReady(false);
      return;
    }

    const uid = activeUser.uid;
    writeActiveUid(uid);
    setCachedActiveUid(uid);

    const userCache = readCloudCache(uid);
    if (userCache) {
      setCloudTasks(userCache.tasks);
      setCloudCategories(userCache.categories);
      setHasCachedCloud(true);
    } else {
      setHasCachedCloud(false);
      setCloudTasks([]);
      setCloudCategories([]);
    }
    setCloudReady(false);

    let snapshotArrived = false;
    let migrationCheckDone = false;

    const unsubTasks = subscribeToUserTasks(
      uid,
      (items) => {
        if (cancelled) return;
        snapshotArrived = true;
        setCloudTasks(items);
        if (items.length > 0 || migrationCheckDone) {
          setCloudReady(true);
        }
      },
      (err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('Quota exceeded')) {
          setCloudError('سهمیه روزانه پایگاه داده ابری به پایان رسیده است و فردا بازنشانی می‌شود.');
        } else {
          setCloudError('خطا در همگام‌سازی کارها با سرور.');
        }
      },
      activeCloudTarget
    );

    const unsubCats = subscribeToUserCategories(
      uid,
      (items) => {
        if (cancelled) return;
        setCloudCategories(items);
      },
      () => {
        if (cancelled) return;
        setCloudError('خطا در همگام‌سازی دسته‌بندی‌ها.');
      },
      activeCloudTarget
    );

    const bootstrapWorkspace = async () => {
      try {
        const [profile, { hasTasks, hasCategories }] = await Promise.all([
          ensureUserProfile(activeUser, themeRef.current, activeCloudTarget),
          checkCloudHasData(uid, activeCloudTarget),
        ]);
        if (cancelled) return;
        setTheme(profile.theme);

        if (!hasTasks && !hasCategories) {
          const isFirstAccount =
            savedAccountsRef.current.filter((a) => a.uid !== uid).length === 0 &&
            activeSlotIdRef.current === 'slot_0';

          if (isFirstAccount) {
            await migrateLocalDataToCloud(
              uid,
              localTasksRef.current,
              localCategoriesRef.current,
              activeCloudTarget
            );
          } else {
            // 2nd/3rd/4th Google accounts always get a clean, isolated workspace
            await migrateLocalDataToCloud(uid, [], DEFAULT_CATEGORIES, activeCloudTarget);
          }
          if (cancelled) return;
        }

        migrationCheckDone = true;
        if (snapshotArrived) {
          setCloudReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('Quota exceeded')) {
            setCloudError('سهمیه روزانه پایگاه داده ابری به پایان رسیده است.');
          } else {
            setCloudError('امکان اتصال به فضای ابری برقرار نشد؛ تغییرات به صورت موقت محلی هستند.');
          }
          setCloudReady(false);
        }
      }
    };

    void bootstrapWorkspace();

    return () => {
      cancelled = true;
      unsubTasks();
      unsubCats();
    };
  }, [activeUser, activeSavedAccount, activeCloudTarget, setTheme]);

  const useCloudCacheWhileSyncing =
    (!activeAuthResolved && Boolean(cachedActiveUid) && hasCachedCloud) ||
    (Boolean(activeUser) && !cloudReady && hasCachedCloud);
  const isCloudActive = Boolean(activeUser && cloudReady);
  const showCloudData = isCloudActive || useCloudCacheWhileSyncing;
  const isBootstrapping =
    (!activeAuthResolved && !useCloudCacheWhileSyncing) ||
    (Boolean(activeUser) && !cloudReady && !hasCachedCloud && !cloudError);

  useEffect(() => {
    if (!activeUser || !cloudReady) return;
    writeCloudCache(activeUser.uid, cloudTasks, cloudCategories);
  }, [activeUser, cloudReady, cloudTasks, cloudCategories]);

  const tasks = isBootstrapping ? [] : showCloudData ? cloudTasks : localTasks;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const rawCategories =
    showCloudData && cloudCategories.length > 0 ? cloudCategories : localCategories;
  const categories = useMemo(() => sortCategoriesByPreset(rawCategories), [rawCategories]);

  useEffect(() => {
    if (!isCloudActive || !activeUser || cloudCategories.length === 0) return;
    if (cloudPresetMigratedUidRef.current === activeUser.uid) return;
    cloudPresetMigratedUidRef.current = activeUser.uid;

    const cloudFlagKey = `draftmax_cloud_preset_v3_${activeUser.uid}`;
    let alreadyApplied = false;
    try {
      alreadyApplied = window.localStorage.getItem(cloudFlagKey) === '1';
    } catch {
      alreadyApplied = false;
    }
    if (alreadyApplied) return;

    if (needsDefaultCategoriesMigration(cloudCategories)) {
      const res = migrateCategoriesAndTasksPreset(cloudCategories, cloudTasks);
      void applyCategoriesPresetInCloud(
        activeUser.uid,
        DEFAULT_CATEGORIES,
        res.removedCategoryIds,
        res.updatedTasks,
        activeCloudTarget
      )
        .then(() => {
          try {
            window.localStorage.setItem(cloudFlagKey, '1');
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Error surfaced cleanly via subscription or next write
        });
    } else if (needsProgramCategoryAddition(cloudCategories)) {
      void createCategoryInCloud(activeUser.uid, PROGRAM_CATEGORY, activeCloudTarget)
        .then(() => {
          try {
            window.localStorage.setItem(cloudFlagKey, '1');
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Error surfaced cleanly via subscription or next write
        });
    } else {
      try {
        window.localStorage.setItem(cloudFlagKey, '1');
      } catch {
        // ignore
      }
    }
  }, [isCloudActive, activeUser, activeCloudTarget, cloudCategories, cloudTasks]);

  const localUnsyncedTasks = useMemo(() => {
    if (!isCloudActive || savedAccounts.length > 1 || activeSlotId !== 'slot_0') return [];
    const cloudIds = new Set(cloudTasks.map((t) => t.id));
    return localTasks.filter((t) => !t.isSample && !cloudIds.has(t.id));
  }, [isCloudActive, savedAccounts.length, activeSlotId, cloudTasks, localTasks]);

  const showUndo = useCallback((message: string, restore: () => void | Promise<void>) => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
    }
    setUndoState({ message, restore });
    undoTimerRef.current = window.setTimeout(() => {
      setUndoState(null);
      undoTimerRef.current = null;
    }, 6500);
  }, []);

  const dismissUndo = () => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoState(null);
  };

  const handleUndo = () => {
    if (!undoState) return;
    void undoState.restore();
    dismissUndo();
  };

  const handleSignInSlot = useCallback(async (slotId: AccountSlotId, loginHint?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setSigningInSlot(slotId);
    try {
      const services = getSlotServices(slotId);
      const result = await signInWithPopup(services.auth, createGoogleProvider(loginHint));
      const signedInUser = result.user;

      const existing = savedAccountsRef.current.find(
        (a) => a.uid === signedInUser.uid && a.slotId !== slotId
      );
      if (existing) {
        await signOut(services.auth);
        setSavedAccounts((prev) =>
          upsertSavedAccount(prev, {
            slotId: existing.slotId,
            uid: signedInUser.uid,
            email: signedInUser.email ?? existing.email,
            displayName: signedInUser.displayName ?? existing.displayName,
            photoURL: signedInUser.photoURL ?? existing.photoURL,
            addedAt: existing.addedAt,
          })
        );
        setActiveSlotId(existing.slotId);
        setAccountsModalOpen(false);
        return;
      }

      setSavedAccounts((prev) =>
        upsertSavedAccount(prev, {
          slotId,
          uid: signedInUser.uid,
          email: signedInUser.email ?? '',
          displayName: signedInUser.displayName ?? '',
          photoURL: signedInUser.photoURL ?? '',
          addedAt: Date.now(),
        })
      );
      setSlotUsers((prev) => ({ ...prev, [slotId]: signedInUser }));
      setSlotAuthResolved((prev) => ({ ...prev, [slotId]: true }));
      setActiveSlotId(slotId);
      setAccountsModalOpen(false);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (code === 'auth/popup-blocked') {
        setAuthError('پنجره ورود توسط مرورگر مسدود شد. لطفاً اجازه باز شدن پاپ‌آپ را در مرورگر بدهید.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'دامنه سایت در فایربیس مجاز نیست. دامنه draftmax.vercel.app باید در بخش Authentication > Settings > Authorized domains کنسول فایربیس ثبت شود.'
        );
      } else if (code === 'auth/network-request-failed') {
        setAuthError('خطای ارتباط با سرورهای گوگل. لطفاً اتصال اینترنت یا فیلترشکن خود را بررسی کنید.');
      } else {
        const msg = (err as { message?: string })?.message ?? '';
        setAuthError(`ورود با حساب گوگل ناموفق بود: ${code || msg || 'لطفاً دوباره تلاش کنید.'}`);
      }
    } finally {
      setSigningInSlot(null);
      setAuthLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(() => {
    const freeSlot = findFreeSlot(savedAccountsRef.current) ?? activeSlotIdRef.current;
    void handleSignInSlot(freeSlot);
  }, [handleSignInSlot]);

  const handleAddAccount = useCallback(() => {
    if (savedAccountsRef.current.length >= MAX_GOOGLE_ACCOUNTS) {
      setAuthError('حداکثر ۴ اکانت گوگل قابل اتصال است.');
      return;
    }
    const freeSlot = findFreeSlot(savedAccountsRef.current);
    if (!freeSlot) {
      setAuthError('حداکثر ۴ اکانت گوگل قابل اتصال است.');
      return;
    }
    void handleSignInSlot(freeSlot);
  }, [handleSignInSlot]);

  const handleSwitchAccount = useCallback(
    (slotId: AccountSlotId) => {
      setAuthError(null);
      if (slotUsers[slotId]) {
        setActiveSlotId(slotId);
        return;
      }
      const targetAcc = savedAccountsRef.current.find((a) => a.slotId === slotId);
      void handleSignInSlot(slotId, targetAcc?.email);
    },
    [slotUsers, handleSignInSlot]
  );

  const handleRemoveAccount = useCallback(
    async (slotId: AccountSlotId) => {
      setAuthError(null);
      const targetAcc = savedAccountsRef.current.find((a) => a.slotId === slotId);
      const uid = slotUsers[slotId]?.uid ?? targetAcc?.uid;
      if (uid) {
        clearCloudCache(uid);
      }

      const remaining = removeSavedAccount(savedAccountsRef.current, slotId);
      setSavedAccounts(remaining);

      try {
        await signOut(getSlotServices(slotId).auth);
      } catch {
        // Ignore signOut failures on already-expired sessions
      }

      setSlotUsers((prev) => ({ ...prev, [slotId]: null }));

      if (activeSlotIdRef.current === slotId) {
        const nextOnline = remaining.find((a) => Boolean(slotUsers[a.slotId]));
        const nextSlot = nextOnline?.slotId ?? remaining[0]?.slotId ?? 'slot_0';
        setActiveSlotId(nextSlot);
        if (remaining.length === 0) {
          writeActiveUid(null);
          setCachedActiveUid(null);
          setHasCachedCloud(false);
          setCloudReady(false);
          setCloudTasks([]);
          setCloudCategories([]);
        }
      }
    },
    [slotUsers]
  );

  const handleMergeLocalToCloud = async () => {
    if (!activeUser || localUnsyncedTasks.length === 0) return;
    const cloudCatIds = new Set(cloudCategories.map((c) => c.id));
    const missingCats = localCategories.filter((c) => !cloudCatIds.has(c.id));
    await migrateLocalDataToCloud(activeUser.uid, localUnsyncedTasks, missingCats, activeCloudTarget);
  };

  const handleCloudMutationError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Quota exceeded')) {
      setCloudError('سهمیه روزانه پایگاه داده ابری به پایان رسیده است و فردا بازنشانی می‌شود.');
    } else {
      setCloudError('خطا در ذخیره تغییرات روی فضای ابری. لطفاً اتصال اینترنت را بررسی کنید.');
    }
  }, []);

  const runCloudWrite = useCallback((promise: Promise<unknown>) => {
    void promise.catch(handleCloudMutationError);
  }, [handleCloudMutationError]);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (activeUser && cloudReady) {
      runCloudWrite(syncThemePreference(activeUser.uid, nextTheme, activeCloudTarget));
    }
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const counts = useMemo(() => {
    let active = 0;
    let today = 0;
    let done = 0;
    for (const t of tasks) {
      if (t.completed) {
        done++;
      } else {
        active++;
        if (t.isToday) today++;
      }
    }
    return { active, today, done };
  }, [tasks]);

  const visibleTasks = useMemo(
    () => filterAndSortTasks(tasks, activeTab, filters),
    [tasks, activeTab, filters]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const sampleTaskCount = useMemo(
    () => tasks.filter((t) => t.isSample).length,
    [tasks]
  );

  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.categoryId !== 'all' || filters.priority !== 'all';

  // Task Handlers (dual local + active account Firestore) - Stabilized with useCallback & tasksRef for locked 60fps rendering
  const handleToggleComplete = useCallback(
    (taskId: string) => {
      const target = tasksRef.current.find((t) => t.id === taskId);
      if (!target) return;
      const nextCompleted = !target.completed;
      const updated: TaskItem = {
        ...target,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : null,
      };
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleToggleToday = useCallback(
    (taskId: string) => {
      const target = tasksRef.current.find((t) => t.id === taskId);
      if (!target) return;
      const updated = { ...target, isToday: !target.isToday };
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleUpdateTitle = useCallback(
    (taskId: string, title: string) => {
      const target = tasksRef.current.find((t) => t.id === taskId);
      if (!target) return;
      const trimmed = title.trim();
      if (!trimmed || trimmed === target.title) return;
      const updated = { ...target, title: trimmed };
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleUpdateBody = useCallback(
    (taskId: string, body: string) => {
      const target = tasksRef.current.find((t) => t.id === taskId);
      if (!target) return;
      const updated: TaskItem = {
        ...target,
        description: body,
        note: '',
        steps: [],
      };
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleUpdateTask = useCallback(
    (updated: TaskItem) => {
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleCreateTask = useCallback(
    (newTask: TaskItem) => {
      if (isCloudActive && activeUser) {
        runCloudWrite(createTaskInCloud(activeUser.uid, newTask, activeCloudTarget));
      } else {
        setLocalTasks((prev) => [newTask, ...prev]);
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleRestoreTask = useCallback(
    (taskId: string) => {
      const target = tasksRef.current.find((t) => t.id === taskId);
      if (!target) return;
      const updated = restoreTaskToActive(target);
      if (isCloudActive && activeUser) {
        runCloudWrite(updateTaskInCloud(activeUser.uid, updated, activeCloudTarget));
      } else {
        setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const targetIndex = tasksRef.current.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) return;
      const deletedTask = tasksRef.current[targetIndex];

      setSelectedTaskId((prev) => (prev === taskId ? null : prev));

      if (isCloudActive && activeUser) {
        const uid = activeUser.uid;
        const targetCloud = activeCloudTarget;
        runCloudWrite(deleteTaskInCloud(uid, taskId, targetCloud));
        showUndo(`کار «${deletedTask.title}» حذف شد.`, () =>
          createTaskInCloud(uid, deletedTask, targetCloud)
        );
      } else {
        setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
        showUndo(`کار «${deletedTask.title}» حذف شد.`, () => {
          setLocalTasks((prev) => {
            if (prev.some((t) => t.id === deletedTask.id)) return prev;
            const copy = [...prev];
            copy.splice(Math.min(targetIndex, copy.length), 0, deletedTask);
            return copy;
          });
        });
      }
    },
    [isCloudActive, activeUser, activeCloudTarget, runCloudWrite, setLocalTasks, showUndo]
  );

  // Category handlers
  const handleAddCategory = (name: string, spectrum?: CategorySpectrum): CategoryItem | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const maxOrder = categories.reduce(
      (max, c, idx) => Math.max(max, typeof c.order === 'number' ? c.order : idx),
      -1
    );
    const prefix = spectrum ? `cat_rgb_${spectrum}` : 'cat';
    const newCat: CategoryItem = {
      id: createId(prefix),
      name: trimmed,
      order: maxOrder + 1,
    };
    if (isCloudActive && activeUser) {
      runCloudWrite(createCategoryInCloud(activeUser.uid, newCat, activeCloudTarget));
    } else {
      setLocalCategories((prev) => [...prev, newCat]);
    }
    return newCat;
  };

  const handleReorderCategories = (fromIndex: number, toIndex: number) => {
    const reordered = reorderCategories(categories, fromIndex, toIndex);
    if (reordered === categories) return;
    if (isCloudActive && activeUser) {
      setCloudCategories(reordered);
      runCloudWrite(reorderCategoriesInCloud(activeUser.uid, reordered, activeCloudTarget));
    } else {
      setLocalCategories(reordered);
    }
  };

  const handleRenameCategory = (id: string, name: string) => {
    if (isCloudActive && activeUser) {
      runCloudWrite(renameCategoryInCloud(activeUser.uid, id, name, activeCloudTarget));
    } else {
      setLocalCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    const remaining = categories.filter((c) => c.id !== id);
    const fallbackId = remaining[0].id;
    const affectedTaskIds = tasks.filter((t) => t.categoryId === id).map((t) => t.id);

    if (filters.categoryId === id) {
      setFilters((prev) => ({ ...prev, categoryId: 'all' }));
    }

    if (isCloudActive && activeUser) {
      runCloudWrite(
        deleteCategoryAndReassignInCloud(
          activeUser.uid,
          id,
          fallbackId,
          affectedTaskIds,
          activeCloudTarget
        )
      );
    } else {
      setLocalCategories(remaining);
      setLocalTasks((prev) =>
        prev.map((t) => (t.categoryId === id ? { ...t, categoryId: fallbackId } : t))
      );
    }
  };

  // Backup handlers
  const handleExportJson = () => {
    const payload = buildBackupPayload(tasks, categories);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draftmax-backup-${getTodayIsoDate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (jsonText: string) => {
    const result = parseBackupPayload(jsonText);
    if (!result.ok) {
      return { ok: false, message: result.error };
    }
    if (isCloudActive && activeUser) {
      const nextCats = result.categories.length > 0 ? result.categories : categories;
      await replaceCloudWithBackup(
        activeUser.uid,
        result.tasks,
        nextCats,
        cloudTasks.map((t) => t.id),
        cloudCategories.map((c) => c.id),
        activeCloudTarget
      );
    } else {
      if (result.categories.length > 0) {
        setLocalCategories(result.categories);
      }
      setLocalTasks(result.tasks);
    }
    return {
      ok: true,
      message: `${toPersianDigits(result.tasks.length)} کار با موفقیت بازیابی شد.`,
    };
  };

  const handleClearSampleTasks = () => {
    const removedSamples = tasks.filter((t) => t.isSample);
    if (removedSamples.length === 0) return;

    if (isCloudActive && activeUser) {
      const uid = activeUser.uid;
      const targetCloud = activeCloudTarget;
      runCloudWrite(
        clearSampleTasksInCloud(
          uid,
          removedSamples.map((t) => t.id),
          targetCloud
        )
      );
      showUndo(`${toPersianDigits(removedSamples.length)} کار نمونه پاک شد.`, () =>
        migrateLocalDataToCloud(uid, removedSamples, [], targetCloud)
      );
    } else {
      setLocalTasks((prev) => prev.filter((t) => !t.isSample));
      showUndo(`${toPersianDigits(removedSamples.length)} کار نمونه پاک شد.`, () => {
        setLocalTasks((prev) => [...removedSamples, ...prev]);
      });
    }
  };

  const todayJalali = formatJalaliFull(getTodayIsoDate());

  const tabHeading =
    activeTab === 'today'
      ? 'برنامه امروز'
      : activeTab === 'done'
        ? 'کارهای انجام‌شده'
        : 'کارهای فعال';

  const tabSubline = isBootstrapping
    ? `${todayJalali} · در حال بارگذاری کارهای شما...`
    : activeTab === 'today'
      ? counts.today > 0
        ? `${toPersianDigits(counts.today)} کار برای تمرکز امروز انتخاب شده`
        : 'کارهای مهم امروزتان را انتخاب کنید'
      : activeTab === 'done'
        ? `${toPersianDigits(counts.done)} کار تکمیل‌شده`
        : `${todayJalali} · ${toPersianDigits(counts.active)} کار در جریان`;

  return (
    <div className="relative min-h-screen text-zinc-900 dark:text-zinc-100 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-12 transition-colors">
      <LiquidBackground theme={theme} />
      <div className="relative z-10">
      <HeaderBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={counts}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        onOpenAccounts={() => setAccountsModalOpen(true)}
        savedAccounts={savedAccounts}
        user={activeUser}
        authLoading={authLoading}
        authPending={!activeAuthResolved}
        onSignIn={handleSignIn}
      />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 pt-4 md:pt-8 space-y-4 md:space-y-5">
        {cloudError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs sm:text-sm text-red-600 dark:text-red-400"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cloudError}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudError(null)}
              className="min-h-[36px] px-2 text-xs underline shrink-0"
            >
              بستن
            </button>
          </div>
        )}

        {/* Section Heading */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {tabHeading}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
              {tabSubline}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories}
          onAddCategory={handleAddCategory}
          onReorderCategories={handleReorderCategories}
        />

        {/* Task Grid */}
        {isBootstrapping ? (
          <div
            aria-label="در حال بارگذاری کارهای شما"
            className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-4"
          >
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="liquid-glass-card h-44 rounded-3xl border border-white/60 dark:border-white/10 p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-7 w-7 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="h-6 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-12 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
              </div>
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            tab={activeTab}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={() => setFilters({ search: '', categoryId: 'all', priority: 'all' })}
            onQuickAdd={() => setQuickAddOpen(true)}
            onSwitchToActive={() => setActiveTab('active')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-4">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                categoryName={categoryMap.get(task.categoryId) ?? 'عمومی'}
                categories={categories}
                onToggleComplete={handleToggleComplete}
                onToggleToday={handleToggleToday}
                onUpdateTitle={handleUpdateTitle}
                onUpdateBody={handleUpdateBody}
                onOpenDetail={setSelectedTaskId}
                onRestoreTask={handleRestoreTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Quick Add "+" Button */}
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        aria-label="افزودن سریع کار جدید"
        className="liquid-glass-fab fixed bottom-[calc(4.35rem+env(safe-area-inset-bottom))] md:bottom-7 left-4 md:left-7 z-40 w-13 h-13 md:w-14 md:h-14 rounded-2xl hover:brightness-110 active:scale-95 text-white flex items-center justify-center transition-all"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} counts={counts} />

      {/* Sheets & Overlays */}
      <QuickAddSheet
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        categories={categories}
        defaultCategoryId={filters.categoryId !== 'all' ? filters.categoryId : undefined}
        defaultToday={activeTab === 'today'}
        onCreateTask={handleCreateTask}
        onAddCategory={handleAddCategory}
      />

      <TaskDetailSheet
        task={selectedTask}
        categories={categories}
        onClose={() => setSelectedTaskId(null)}
        onUpdateTask={handleUpdateTask}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        onRestoreTask={handleRestoreTask}
        onAddCategory={handleAddCategory}
      />

      <AccountSwitcherModal
        isOpen={accountsModalOpen}
        onClose={() => setAccountsModalOpen(false)}
        accounts={savedAccounts}
        activeSlotId={activeSlotId}
        slotOnlineMap={slotOnlineMap}
        authLoading={authLoading}
        authError={authError}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
        onRemoveAccount={handleRemoveAccount}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onReorderCategories={handleReorderCategories}
        onDeleteCategory={handleDeleteCategory}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        sampleTaskCount={sampleTaskCount}
        onClearSampleTasks={handleClearSampleTasks}
        user={activeUser}
        savedAccounts={savedAccounts}
        activeSlotId={activeSlotId}
        slotOnlineMap={slotOnlineMap}
        authLoading={authLoading}
        authError={authError}
        onSignIn={handleSignIn}
        onAddAccount={handleAddAccount}
        onSwitchAccount={handleSwitchAccount}
        onRemoveAccount={handleRemoveAccount}
        localUnsyncedCount={localUnsyncedTasks.length}
        onMergeLocalToCloud={handleMergeLocalToCloud}
      />

      <UndoToast
        message={undoState?.message ?? null}
        onUndo={handleUndo}
        onDismiss={dismissUndo}
      />
      </div>
    </div>
  );
}
