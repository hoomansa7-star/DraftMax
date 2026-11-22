import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addProgramCategoryIfMissing,
  buildBackupPayload,
  completeNextStepInTask,
  filterAndSortTasks,
  getNextStep,
  getTaskProgress,
  migrateCategoriesAndTasksPreset,
  needsDefaultCategoriesMigration,
  needsProgramCategoryAddition,
  parseBackupPayload,
  parseMultilineQuickAdd,
  reorderCategories,
  reorderSteps,
  restoreTaskToActive,
  sortCategoriesByPreset,
  toggleStepInTask,
} from './taskLogic';
import { TaskItem } from '../types/task';

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 't1',
    title: 'بازسازی آشپزخانه',
    description: '',
    categoryId: 'construction',
    priority: 'medium',
    dueDate: null,
    steps: [
      { id: 's1', text: 'اندازه‌گیری کابینت', done: true },
      { id: 's2', text: 'انتخاب رنگ', done: false },
      { id: 's3', text: 'هماهنگی نصاب', done: false },
    ],
    note: '',
    isToday: false,
    completed: false,
    completedAt: null,
    createdAt: '2026-11-14T08:00:00.000Z',
    ...overrides,
  };
}

test('getNextStep returns first unchecked step', () => {
  const task = makeTask();
  assert.equal(getNextStep(task)?.id, 's2');
});

test('getTaskProgress calculates doneCount, totalCount, and percent', () => {
  const task = makeTask();
  assert.deepEqual(getTaskProgress(task), {
    doneCount: 1,
    totalCount: 3,
    percent: 33,
  });
});

test('toggleStepInTask auto-completes task when final step is checked and restores when unchecked', () => {
  let task = makeTask({
    steps: [
      { id: 's1', text: 'قدم اول', done: true },
      { id: 's2', text: 'قدم دوم', done: false },
    ],
  });

  task = toggleStepInTask(task, 's2', '2026-11-14T10:00:00.000Z');
  assert.equal(task.completed, true);
  assert.equal(task.completedAt, '2026-11-14T10:00:00.000Z');
  assert.equal(getNextStep(task), null);

  task = toggleStepInTask(task, 's2', '2026-11-14T10:05:00.000Z');
  assert.equal(task.completed, false);
  assert.equal(task.completedAt, null);
  assert.equal(getNextStep(task)?.id, 's2');
});

test('completeNextStepInTask advances through steps until completion', () => {
  let task = makeTask();
  task = completeNextStepInTask(task);
  assert.equal(getNextStep(task)?.id, 's3');
  assert.equal(task.completed, false);

  task = completeNextStepInTask(task);
  assert.equal(getNextStep(task), null);
  assert.equal(task.completed, true);
});

test('restoreTaskToActive unchecks last step if all steps were done', () => {
  const completedTask = makeTask({
    completed: true,
    completedAt: '2026-11-14T10:00:00.000Z',
    steps: [
      { id: 's1', text: 'قدم ۱', done: true },
      { id: 's2', text: 'قدم ۲', done: true },
    ],
  });
  const restored = restoreTaskToActive(completedTask);
  assert.equal(restored.completed, false);
  assert.equal(restored.completedAt, null);
  assert.equal(restored.steps[0].done, true);
  assert.equal(restored.steps[1].done, false);
});

test('reorderSteps moves step cleanly', () => {
  const steps = [
    { id: '1', text: 'A', done: false },
    { id: '2', text: 'B', done: false },
    { id: '3', text: 'C', done: false },
  ];
  const reordered = reorderSteps(steps, 0, 2);
  assert.deepEqual(
    reordered.map((s) => s.id),
    ['2', '3', '1']
  );
});

test('parseMultilineQuickAdd extracts title and strips bullets/numbers from steps', () => {
  const single = parseMultilineQuickAdd('خرید نان');
  assert.equal(single.hasMultipleLines, false);

  const multi = parseMultilineQuickAdd('ضبط ویدیو جدید\n- نوشتن سناریو\n2. تنظیم نور و دوربین\nتدوین اولیه');
  assert.equal(multi.hasMultipleLines, true);
  assert.equal(multi.suggestedTitle, 'ضبط ویدیو جدید');
  assert.deepEqual(multi.suggestedSteps, [
    'نوشتن سناریو',
    'تنظیم نور و دوربین',
    'تدوین اولیه',
  ]);
});

test('filterAndSortTasks handles tabs, category, priority, search, and overdue ordering', () => {
  const tasks: TaskItem[] = [
    makeTask({ id: 'a', title: 'کار عادی', priority: 'low', isToday: false }),
    makeTask({ id: 'b', title: 'کار عقب‌افتاده', priority: 'low', dueDate: '2026-11-10' }),
    makeTask({ id: 'c', title: 'کار امروز', priority: 'high', isToday: true, categoryId: 'content' }),
    makeTask({ id: 'd', title: 'کار تکمیل‌شده', completed: true, completedAt: '2026-11-14T12:00:00.000Z' }),
  ];

  const active = filterAndSortTasks(
    tasks,
    'active',
    { search: '', categoryId: 'all', priority: 'all' },
    '2026-11-14'
  );
  assert.deepEqual(
    active.map((t) => t.id),
    ['b', 'c', 'a']
  );

  const todayOnly = filterAndSortTasks(
    tasks,
    'today',
    { search: '', categoryId: 'all', priority: 'all' },
    '2026-11-14'
  );
  assert.deepEqual(
    todayOnly.map((t) => t.id),
    ['c']
  );

  const doneOnly = filterAndSortTasks(
    tasks,
    'done',
    { search: '', categoryId: 'all', priority: 'all' },
    '2026-11-14'
  );
  assert.deepEqual(
    doneOnly.map((t) => t.id),
    ['d']
  );
});

test('backup export and import round-trip validates safely', () => {
  const payload = buildBackupPayload([makeTask()], [{ id: 'construction', name: 'ساخت و ساز' }]);
  const json = JSON.stringify(payload);
  const parsed = parseBackupPayload(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.tasks.length, 1);
    assert.equal(parsed.categories[0].name, 'ساخت و ساز');
  }

  const invalid = parseBackupPayload('{bad json');
  assert.equal(invalid.ok, false);
});

test('sortCategoriesByPreset keeps new default categories in requested order', () => {
  const unordered = [
    { id: 'cat_program', name: 'برنامه' },
    { id: 'cat_sport', name: 'ورزش' },
    { id: 'cat_custom', name: 'متفرقه' },
    { id: 'cat_dilan', name: 'Dilan' },
    { id: 'cat_claim', name: 'ادعا کلیم' },
    { id: 'cat_routine', name: 'روتین' },
    { id: 'cat_gaming', name: 'Gaming' },
  ];
  assert.deepEqual(
    sortCategoriesByPreset(unordered).map((c) => c.name),
    ['Dilan', 'Gaming', 'ادعا کلیم', 'روتین', 'ورزش', 'برنامه', 'متفرقه']
  );
});

test('needsDefaultCategoriesMigration and migrateCategoriesAndTasksPreset upgrade legacy defaults safely', () => {
  const legacyCats = [
    { id: 'cat_construction', name: 'ساخت و ساز' },
    { id: 'cat_content', name: 'تولید محتوا' },
    { id: 'cat_personal', name: 'شخصی' },
    { id: 'cat_work', name: 'کاری' },
    { id: 'cat_custom', name: 'سفر' },
  ];
  const tasks = [
    makeTask({ id: 't1', categoryId: 'cat_construction' }),
    makeTask({ id: 't2', categoryId: 'cat_custom' }),
  ];

  assert.equal(needsDefaultCategoriesMigration(legacyCats), true);

  const migrated = migrateCategoriesAndTasksPreset(legacyCats, tasks);
  assert.deepEqual(
    migrated.categories.map((c) => c.name),
    ['Dilan', 'Gaming', 'ادعا کلیم', 'روتین', 'ورزش', 'برنامه', 'سفر']
  );
  assert.equal(migrated.tasks[0].categoryId, 'cat_routine');
  assert.equal(migrated.tasks[1].categoryId, 'cat_custom');
  assert.equal(needsDefaultCategoriesMigration(migrated.categories), false);
});

test('needsProgramCategoryAddition appends برنامه for existing 5-category users', () => {
  const v2Cats = [
    { id: 'cat_dilan', name: 'Dilan' },
    { id: 'cat_gaming', name: 'Gaming' },
    { id: 'cat_claim', name: 'ادعا کلیم' },
    { id: 'cat_routine', name: 'روتین' },
    { id: 'cat_sport', name: 'ورزش' },
  ];
  assert.equal(needsProgramCategoryAddition(v2Cats), true);
  const upgraded = addProgramCategoryIfMissing(v2Cats);
  assert.deepEqual(
    upgraded.map((c) => c.name),
    ['Dilan', 'Gaming', 'ادعا کلیم', 'روتین', 'ورزش', 'برنامه']
  );
  assert.equal(needsProgramCategoryAddition(upgraded), false);
});

test('reorderCategories updates positions and sortCategoriesByPreset respects explicit user order', () => {
  const initial = [
    { id: 'cat_dilan', name: 'Dilan' },
    { id: 'cat_gaming', name: 'Gaming' },
    { id: 'cat_claim', name: 'ادعا کلیم' },
    { id: 'cat_program', name: 'برنامه' },
  ];

  const reordered = reorderCategories(initial, 3, 0);
  assert.deepEqual(
    reordered.map((c) => c.name),
    ['برنامه', 'Dilan', 'Gaming', 'ادعا کلیم']
  );
  assert.deepEqual(
    reordered.map((c) => c.order),
    [0, 1, 2, 3]
  );

  // Even if shuffled, sortCategoriesByPreset must honor explicit order over preset defaults
  const shuffled = [reordered[2], reordered[0], reordered[3], reordered[1]];
  assert.deepEqual(
    sortCategoriesByPreset(shuffled).map((c) => c.name),
    ['برنامه', 'Dilan', 'Gaming', 'ادعا کلیم']
  );
});
