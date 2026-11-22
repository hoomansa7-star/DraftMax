import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudDocToCategoryItem,
  cloudDocToTaskItem,
  FIRESTORE_LIMITS,
  sanitizeCategoryForCloud,
  sanitizeId,
  sanitizeTaskForCloud,
} from './cloudSync';
import { TaskItem } from '../types/task';

test('sanitizeId strips invalid characters and respects max length', () => {
  assert.equal(sanitizeId('task_123-abc'), 'task_123-abc');
  assert.equal(sanitizeId('bad id/with spaces!'), 'bad_id_with_spaces_');
  assert.equal(sanitizeId('a'.repeat(200)).length, FIRESTORE_LIMITS.ID_MAX);
});

test('sanitizeTaskForCloud enforces schema limits and round-trips cleanly', () => {
  const oversizedSteps = Array.from({ length: 120 }, (_, i) => ({
    id: `step_${i}`,
    text: 'x'.repeat(350),
    done: i % 2 === 0,
  }));

  const raw: TaskItem = {
    id: 'task_1',
    title: 'ت'.repeat(400),
    description: 'د'.repeat(2500),
    categoryId: 'cat_work',
    priority: 'high',
    dueDate: '2026-11-14',
    steps: oversizedSteps,
    note: 'ن'.repeat(600),
    isToday: true,
    completed: false,
    completedAt: null,
    createdAt: '2026-11-14T10:00:00.000Z',
    isSample: false,
  };

  const payload = sanitizeTaskForCloud(raw, 'user_abc');
  assert.equal(payload.ownerId, 'user_abc');
  assert.equal(payload.title.length, FIRESTORE_LIMITS.TITLE_MAX);
  assert.equal(payload.description.length, FIRESTORE_LIMITS.DESCRIPTION_MAX);
  assert.equal(payload.note.length, FIRESTORE_LIMITS.NOTE_MAX);
  assert.equal(payload.steps.length, FIRESTORE_LIMITS.STEPS_MAX);
  assert.equal(payload.steps[0].text.length, FIRESTORE_LIMITS.STEP_TEXT_MAX);

  const restored = cloudDocToTaskItem(payload as unknown as Record<string, unknown>);
  assert.equal(restored.id, 'task_1');
  assert.equal(restored.priority, 'high');
  assert.equal(restored.steps.length, FIRESTORE_LIMITS.STEPS_MAX);
});

test('sanitizeCategoryForCloud enforces name length and round-trips', () => {
  const payload = sanitizeCategoryForCloud(
    { id: 'cat_1', name: 'د'.repeat(100) },
    'user_1'
  );
  assert.equal(payload.name.length, FIRESTORE_LIMITS.CATEGORY_NAME_MAX);

  const trimmedPayload = sanitizeCategoryForCloud(
    { id: 'cat_2', name: '   ' },
    'user_1'
  );
  assert.equal(trimmedPayload.name, 'دسته‌بندی');

  const orderedPayload = sanitizeCategoryForCloud(
    { id: 'cat_3', name: 'برنامه', order: 2 },
    'user_1'
  );
  assert.equal(orderedPayload.order, 2);

  const restoredOrdered = cloudDocToCategoryItem(orderedPayload as unknown as Record<string, unknown>);
  assert.equal(restoredOrdered.order, 2);

  const restored = cloudDocToCategoryItem(payload as unknown as Record<string, unknown>);
  assert.equal(restored.id, 'cat_1');
  assert.equal(restored.order, undefined);
});
