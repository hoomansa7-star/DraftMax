import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearCloudCache,
  readActiveUid,
  readCloudCache,
  writeActiveUid,
  writeCloudCache,
} from './cloudCache';
import { CategoryItem, TaskItem } from '../types/task';

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

test('writeActiveUid and readActiveUid round-trip and clear cleanly', () => {
  const mem = createMemoryStorage();
  assert.equal(readActiveUid(mem), null);

  writeActiveUid('user_123', mem);
  assert.equal(readActiveUid(mem), 'user_123');

  writeActiveUid(null, mem);
  assert.equal(readActiveUid(mem), null);
});

test('writeCloudCache and readCloudCache persist user tasks and categories and clear cleanly', () => {
  const mem = createMemoryStorage();
  const tasks: TaskItem[] = [
    {
      id: 'task_1',
      title: 'تمرین روزانه',
      description: '',
      categoryId: 'cat_sport',
      priority: 'medium',
      dueDate: null,
      steps: [],
      note: '',
      isToday: true,
      completed: false,
      completedAt: null,
      createdAt: '2026-11-15T00:00:00.000Z',
    },
  ];
  const categories: CategoryItem[] = [{ id: 'cat_sport', name: 'ورزش' }];

  writeCloudCache('user_123', tasks, categories, mem);
  const loaded = readCloudCache('user_123', mem);
  assert.ok(loaded);
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].title, 'تمرین روزانه');
  assert.equal(loaded.categories[0].name, 'ورزش');

  clearCloudCache('user_123', mem);
  assert.equal(readCloudCache('user_123', mem), null);
});
