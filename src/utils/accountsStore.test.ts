import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findFreeSlot,
  MAX_GOOGLE_ACCOUNTS,
  readActiveSlotId,
  readSavedAccounts,
  removeSavedAccount,
  SavedGoogleAccount,
  upsertSavedAccount,
  writeActiveSlotId,
  writeSavedAccounts,
} from './accountsStore';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

test('accountsStore enforces max 4 Google accounts and avoids duplicate UIDs', () => {
  const storage = createMemoryStorage();
  let list: SavedGoogleAccount[] = [];

  for (let i = 0; i < 4; i++) {
    const slot = findFreeSlot(list);
    assert.ok(slot);
    list = upsertSavedAccount(list, {
      slotId: slot,
      uid: `uid_${i}`,
      email: `user${i}@gmail.com`,
      displayName: `User ${i}`,
      photoURL: '',
      addedAt: 1000 + i,
    });
  }

  assert.equal(list.length, MAX_GOOGLE_ACCOUNTS);
  assert.equal(findFreeSlot(list), null);

  // Attempting to add a 5th unique user should not exceed MAX_GOOGLE_ACCOUNTS
  const afterFifth = upsertSavedAccount(list, {
    slotId: 'slot_0',
    uid: 'uid_4',
    email: 'user4@gmail.com',
    displayName: 'User 4',
    photoURL: '',
    addedAt: 2000,
  });
  // Existing slot_0 replaced when signing directly into slot_0, total remains 4
  assert.equal(afterFifth.length, MAX_GOOGLE_ACCOUNTS);

  // Deduplicates same UID into existing slot and updates display info
  const updatedSameUid = upsertSavedAccount(list, {
    slotId: 'slot_3',
    uid: 'uid_1',
    email: 'user1@gmail.com',
    displayName: 'Updated User 1',
    photoURL: 'https://example.com/p.png',
    addedAt: 3000,
  });
  assert.equal(updatedSameUid.length, MAX_GOOGLE_ACCOUNTS);
  assert.equal(updatedSameUid.find((a) => a.uid === 'uid_1')?.slotId, 'slot_1');
  assert.equal(updatedSameUid.find((a) => a.uid === 'uid_1')?.displayName, 'Updated User 1');

  writeSavedAccounts(updatedSameUid, storage);
  writeActiveSlotId('slot_2', storage);

  assert.equal(readActiveSlotId(storage), 'slot_2');
  assert.equal(readSavedAccounts(storage).length, 4);

  const afterRemove = removeSavedAccount(updatedSameUid, 'slot_1');
  assert.equal(afterRemove.length, 3);
  assert.equal(findFreeSlot(afterRemove), 'slot_1');
});
