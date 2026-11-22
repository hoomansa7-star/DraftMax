import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_ORDER,
  LEGACY_DEFAULT_CATEGORY_IDS,
} from '../data/seedData';
import {
  ActiveTab,
  AppBackupPayload,
  CategoryItem,
  FilterState,
  Priority,
  StepItem,
  TaskItem,
} from '../types/task';
import { getTodayIsoDate, isDateOverdue } from './jalali';

export interface TaskProgress {
  doneCount: number;
  totalCount: number;
  percent: number;
}

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getNextStep(task: Pick<TaskItem, 'steps'>): StepItem | null {
  return task.steps.find((s) => !s.done) ?? null;
}

export function getTaskProgress(task: Pick<TaskItem, 'steps' | 'completed'>): TaskProgress {
  const totalCount = task.steps.length;
  const doneCount = task.steps.filter((s) => s.done).length;
  if (totalCount === 0) {
    return {
      doneCount: 0,
      totalCount: 0,
      percent: task.completed ? 100 : 0,
    };
  }
  return {
    doneCount,
    totalCount,
    percent: Math.round((doneCount / totalCount) * 100),
  };
}

/**
 * Toggles a step's done state. When all steps (count > 0) are done,
 * automatically marks the task as completed. If a step is unchecked,
 * automatically marks the task as active again.
 */
export function toggleStepInTask(
  task: TaskItem,
  stepId: string,
  nowIso: string = new Date().toISOString()
): TaskItem {
  const updatedSteps = task.steps.map((step) =>
    step.id === stepId ? { ...step, done: !step.done } : step
  );
  const hasSteps = updatedSteps.length > 0;
  const allDone = hasSteps && updatedSteps.every((s) => s.done);

  return {
    ...task,
    steps: updatedSteps,
    completed: allDone,
    completedAt: allDone ? (task.completedAt ?? nowIso) : null,
  };
}

/**
 * Marks the current next step as done and returns the updated task.
 */
export function completeNextStepInTask(
  task: TaskItem,
  nowIso: string = new Date().toISOString()
): TaskItem {
  const next = getNextStep(task);
  if (!next) {
    return task;
  }
  return toggleStepInTask(task, next.id, nowIso);
}

/**
 * Restores a completed task back to active.
 * If all steps were checked, unchecks the last step (or leaves steps as-is if there are no steps)
 * so the task has an actionable next step again.
 */
export function restoreTaskToActive(task: TaskItem): TaskItem {
  if (task.steps.length === 0) {
    return {
      ...task,
      completed: false,
      completedAt: null,
    };
  }

  const allDone = task.steps.every((s) => s.done);
  const steps = allDone
    ? task.steps.map((s, idx) => (idx === task.steps.length - 1 ? { ...s, done: false } : s))
    : task.steps;

  return {
    ...task,
    steps,
    completed: false,
    completedAt: null,
  };
}

export function reorderSteps(steps: StepItem[], fromIndex: number, toIndex: number): StepItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= steps.length ||
    toIndex >= steps.length ||
    fromIndex === toIndex
  ) {
    return steps;
  }
  const next = [...steps];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export interface ParsedMultilineQuickAdd {
  hasMultipleLines: boolean;
  suggestedTitle: string;
  suggestedSteps: string[];
}

/**
 * Cleans common list prefixes like "- ", "* ", "1. ", "۱) " from pasted step lines.
 */
function cleanStepLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*•▪▫]+\s+/, '')
    .replace(/^[\d۰-۹]+[.)\-:]\s+/, '')
    .trim();
}

export function parseMultilineQuickAdd(rawText: string): ParsedMultilineQuickAdd {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return {
      hasMultipleLines: false,
      suggestedTitle: lines[0] ?? '',
      suggestedSteps: [],
    };
  }

  return {
    hasMultipleLines: true,
    suggestedTitle: lines[0],
    suggestedSteps: lines.slice(1).map(cleanStepLine).filter((s) => s.length > 0),
  };
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function filterAndSortTasks(
  tasks: TaskItem[],
  tab: ActiveTab,
  filters: FilterState,
  todayIso: string = getTodayIsoDate()
): TaskItem[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    if (tab === 'done') {
      if (!task.completed) return false;
    } else if (tab === 'today') {
      if (task.completed || !task.isToday) return false;
    } else {
      if (task.completed) return false;
    }

    if (filters.categoryId !== 'all' && task.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }

    if (query.length > 0) {
      const inTitle = task.title.toLowerCase().includes(query);
      const inNote = task.note.toLowerCase().includes(query);
      const inDesc = task.description.toLowerCase().includes(query);
      if (!inTitle && !inNote && !inDesc) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (tab === 'done') {
      return (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt);
    }

    const aOverdue = isDateOverdue(a.dueDate, a.completed, todayIso) ? 0 : 1;
    const bOverdue = isDateOverdue(b.dueDate, b.completed, todayIso) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;

    const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pDiff !== 0) return pDiff;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function buildBackupPayload(tasks: TaskItem[], categories: CategoryItem[]): AppBackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    categories,
  };
}

export function parseBackupPayload(jsonText: string): {
  ok: true;
  tasks: TaskItem[];
  categories: CategoryItem[];
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(jsonText) as Partial<AppBackupPayload>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'ساختار فایل پشتیبان معتبر نیست.' };
    }
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.categories)) {
      return { ok: false, error: 'فایل انتخاب‌شده فاقد لیست کارها یا دسته‌بندی‌ها است.' };
    }

    const categories: CategoryItem[] = parsed.categories
      .filter((c): c is CategoryItem => Boolean(c && typeof c.id === 'string' && typeof c.name === 'string'))
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        ...(typeof c.order === 'number' && Number.isFinite(c.order) ? { order: Math.round(c.order) } : {}),
      }))
      .filter((c) => c.name.length > 0);

    const tasks: TaskItem[] = parsed.tasks
      .filter((t): t is TaskItem => Boolean(t && typeof t.id === 'string' && typeof t.title === 'string'))
      .map((t) => ({
        id: t.id,
        title: t.title.trim(),
        description: typeof t.description === 'string' ? t.description : '',
        categoryId: typeof t.categoryId === 'string' ? t.categoryId : categories[0]?.id ?? 'personal',
        priority: t.priority === 'high' || t.priority === 'medium' || t.priority === 'low' ? t.priority : 'medium',
        dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
        steps: Array.isArray(t.steps)
          ? t.steps
              .filter((s): s is StepItem => Boolean(s && typeof s.id === 'string' && typeof s.text === 'string'))
              .map((s) => ({ id: s.id, text: s.text, done: Boolean(s.done) }))
          : [],
        note: typeof t.note === 'string' ? t.note : '',
        isToday: Boolean(t.isToday),
        completed: Boolean(t.completed),
        completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
        isSample: Boolean(t.isSample),
      }));

    return { ok: true, tasks, categories };
  } catch {
    return { ok: false, error: 'خواندن فایل JSON ناموفق بود. لطفاً فایل معتبر انتخاب کنید.' };
  }
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'فوری',
  medium: 'متوسط',
  low: 'عادی',
};

const LEGACY_TO_NEW_CATEGORY_MAP: Record<string, string> = {
  cat_construction: 'cat_routine',
  cat_content: 'cat_gaming',
  cat_personal: 'cat_claim',
  cat_work: 'cat_dilan',
};

export function reorderCategories(
  categories: CategoryItem[],
  fromIndex: number,
  toIndex: number
): CategoryItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= categories.length ||
    toIndex >= categories.length ||
    fromIndex === toIndex
  ) {
    return categories;
  }
  const next = [...categories];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((cat, idx) => ({ ...cat, order: idx }));
}

export function sortCategoriesByPreset(categories: CategoryItem[]): CategoryItem[] {
  const hasExplicitOrder = categories.some((c) => typeof c.order === 'number');
  if (hasExplicitOrder) {
    return [...categories].sort((a, b) => {
      const hasA = typeof a.order === 'number';
      const hasB = typeof b.order === 'number';
      if (hasA && hasB) {
        const diff = (a.order as number) - (b.order as number);
        if (diff !== 0) return diff;
      } else if (hasA) {
        return -1;
      } else if (hasB) {
        return 1;
      }
      const presetA = DEFAULT_CATEGORY_ORDER[a.id];
      const presetB = DEFAULT_CATEGORY_ORDER[b.id];
      if (presetA !== undefined && presetB !== undefined) return presetA - presetB;
      if (presetA !== undefined) return -1;
      if (presetB !== undefined) return 1;
      return 0;
    });
  }

  return [...categories].sort((a, b) => {
    const orderA = DEFAULT_CATEGORY_ORDER[a.id];
    const orderB = DEFAULT_CATEGORY_ORDER[b.id];
    if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;
    return 0;
  });
}

export function needsDefaultCategoriesMigration(categories: CategoryItem[]): boolean {
  const legacySet = new Set<string>(LEGACY_DEFAULT_CATEGORY_IDS);
  const newDefaultSet = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  const hasLegacy = categories.some((c) => legacySet.has(c.id));
  const hasAnyNewDefault = categories.some((c) => newDefaultSet.has(c.id));
  return hasLegacy && !hasAnyNewDefault;
}

export function migrateCategoriesAndTasksPreset(
  categories: CategoryItem[],
  tasks: TaskItem[],
  newDefaults: CategoryItem[] = DEFAULT_CATEGORIES
): {
  categories: CategoryItem[];
  tasks: TaskItem[];
  removedCategoryIds: string[];
  updatedTasks: TaskItem[];
} {
  const legacySet = new Set<string>(LEGACY_DEFAULT_CATEGORY_IDS);
  const removedCategoryIds = categories.filter((c) => legacySet.has(c.id)).map((c) => c.id);
  const customCategories = categories.filter(
    (c) => !legacySet.has(c.id) && !newDefaults.some((d) => d.id === c.id)
  );
  const nextCategories = sortCategoriesByPreset([...newDefaults, ...customCategories]);
  const fallbackId = newDefaults[0]?.id ?? 'cat_dilan';

  const updatedTasks: TaskItem[] = [];
  const nextTasks = tasks.map((task) => {
    if (!legacySet.has(task.categoryId)) return task;
    const mappedId = LEGACY_TO_NEW_CATEGORY_MAP[task.categoryId] ?? fallbackId;
    const nextTask = { ...task, categoryId: mappedId };
    updatedTasks.push(nextTask);
    return nextTask;
  });

  return {
    categories: nextCategories,
    tasks: nextTasks,
    removedCategoryIds,
    updatedTasks,
  };
}

export const PROGRAM_CATEGORY: CategoryItem = { id: 'cat_program', name: 'برنامه' };

export function needsProgramCategoryAddition(categories: CategoryItem[]): boolean {
  const hasProgram = categories.some(
    (c) => c.id === PROGRAM_CATEGORY.id || c.name.trim() === PROGRAM_CATEGORY.name
  );
  if (hasProgram) return false;
  const presetIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  return categories.some((c) => presetIds.has(c.id));
}

export function addProgramCategoryIfMissing(categories: CategoryItem[]): CategoryItem[] {
  if (!needsProgramCategoryAddition(categories)) {
    return sortCategoriesByPreset(categories);
  }
  return sortCategoriesByPreset([...categories, PROGRAM_CATEGORY]);
}
