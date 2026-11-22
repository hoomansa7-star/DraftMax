export const MAX_GOOGLE_ACCOUNTS = 4;

export const ACCOUNT_SLOTS = ['slot_0', 'slot_1', 'slot_2', 'slot_3'] as const;
export type AccountSlotId = (typeof ACCOUNT_SLOTS)[number];

export interface SavedGoogleAccount {
  slotId: AccountSlotId;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  addedAt: number;
}

const ACCOUNTS_STORAGE_KEY = 'draftmax_accounts_v1';
const ACTIVE_SLOT_STORAGE_KEY = 'draftmax_active_slot_v1';

function getStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isValidSlotId(value: unknown): value is AccountSlotId {
  return typeof value === 'string' && (ACCOUNT_SLOTS as readonly string[]).includes(value);
}

export function readSavedAccounts(storage?: Storage | null): SavedGoogleAccount[] {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seenSlots = new Set<string>();
    const seenUids = new Set<string>();
    const result: SavedGoogleAccount[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        !isValidSlotId(item.slotId) ||
        typeof item.uid !== 'string' ||
        item.uid.trim().length === 0
      ) {
        continue;
      }
      if (seenSlots.has(item.slotId) || seenUids.has(item.uid)) continue;
      seenSlots.add(item.slotId);
      seenUids.add(item.uid);
      result.push({
        slotId: item.slotId,
        uid: item.uid,
        email: typeof item.email === 'string' ? item.email : '',
        displayName: typeof item.displayName === 'string' ? item.displayName : '',
        photoURL: typeof item.photoURL === 'string' ? item.photoURL : '',
        addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
      });
      if (result.length >= MAX_GOOGLE_ACCOUNTS) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function writeSavedAccounts(accounts: SavedGoogleAccount[], storage?: Storage | null): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_GOOGLE_ACCOUNTS)));
  } catch {
    // Ignore storage restrictions
  }
}

export function readActiveSlotId(storage?: Storage | null): AccountSlotId {
  const store = getStorage(storage);
  if (!store) return 'slot_0';
  try {
    const raw = store.getItem(ACTIVE_SLOT_STORAGE_KEY);
    return isValidSlotId(raw) ? raw : 'slot_0';
  } catch {
    return 'slot_0';
  }
}

export function writeActiveSlotId(slotId: AccountSlotId, storage?: Storage | null): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.setItem(ACTIVE_SLOT_STORAGE_KEY, slotId);
  } catch {
    // Ignore storage restrictions
  }
}

export function findFreeSlot(accounts: SavedGoogleAccount[]): AccountSlotId | null {
  const used = new Set(accounts.map((a) => a.slotId));
  return ACCOUNT_SLOTS.find((slot) => !used.has(slot)) ?? null;
}

export function upsertSavedAccount(
  accounts: SavedGoogleAccount[],
  incoming: SavedGoogleAccount
): SavedGoogleAccount[] {
  const existingByUid = accounts.find((a) => a.uid === incoming.uid);
  if (existingByUid) {
    return accounts.map((a) =>
      a.uid === incoming.uid
        ? {
            ...a,
            email: incoming.email || a.email,
            displayName: incoming.displayName || a.displayName,
            photoURL: incoming.photoURL || a.photoURL,
          }
        : a
    );
  }

  const existingBySlot = accounts.find((a) => a.slotId === incoming.slotId);
  if (existingBySlot) {
    return accounts.map((a) => (a.slotId === incoming.slotId ? incoming : a));
  }

  if (accounts.length >= MAX_GOOGLE_ACCOUNTS) {
    return accounts;
  }
  return [...accounts, incoming];
}

export function removeSavedAccount(
  accounts: SavedGoogleAccount[],
  slotId: AccountSlotId
): SavedGoogleAccount[] {
  return accounts.filter((a) => a.slotId !== slotId);
}
