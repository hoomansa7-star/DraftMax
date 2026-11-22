import { CategoryItem, TaskItem } from '../types/task';

export const ACTIVE_UID_KEY = 'draftmax_active_uid_v1';
const CLOUD_CACHE_PREFIX = 'draftmax_cloud_cache_v1_';

export interface CloudCachePayload {
  tasks: TaskItem[];
  categories: CategoryItem[];
  updatedAt: number;
}

function getStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readActiveUid(storage?: Storage | null): string | null {
  const store = getStorage(storage);
  if (!store) return null;
  try {
    const val = store.getItem(ACTIVE_UID_KEY);
    return val && val.trim().length > 0 ? val : null;
  } catch {
    return null;
  }
}

export function writeActiveUid(uid: string | null, storage?: Storage | null): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    if (uid && uid.trim().length > 0) {
      store.setItem(ACTIVE_UID_KEY, uid);
    } else {
      store.removeItem(ACTIVE_UID_KEY);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

export function readCloudCache(uid: string, storage?: Storage | null): CloudCachePayload | null {
  const store = getStorage(storage);
  if (!store || !uid) return null;
  try {
    const raw = store.getItem(`${CLOUD_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudCachePayload>;
    if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.categories)) {
      return null;
    }
    return {
      tasks: parsed.tasks,
      categories: parsed.categories,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeCloudCache(
  uid: string,
  tasks: TaskItem[],
  categories: CategoryItem[],
  storage?: Storage | null
): void {
  const store = getStorage(storage);
  if (!store || !uid) return;
  try {
    const payload: CloudCachePayload = {
      tasks,
      categories,
      updatedAt: Date.now(),
    };
    store.setItem(`${CLOUD_CACHE_PREFIX}${uid}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or security errors
  }
}

export function clearCloudCache(uid: string, storage?: Storage | null): void {
  const store = getStorage(storage);
  if (!store || !uid) return;
  try {
    store.removeItem(`${CLOUD_CACHE_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}
