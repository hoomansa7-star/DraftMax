import { CategoryItem, Priority, StepItem, TaskItem } from '../types/task';

export const FIRESTORE_LIMITS = {
  ID_MAX: 128,
  TITLE_MAX: 300,
  DESCRIPTION_MAX: 2000,
  NOTE_MAX: 500,
  CATEGORY_NAME_MAX: 80,
  STEP_TEXT_MAX: 300,
  STEPS_MAX: 100,
  DISPLAY_NAME_MAX: 120,
  EMAIL_MAX: 200,
  PHOTO_URL_MAX: 500,
} as const;

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeId(rawId: string, fallbackPrefix = 'id'): string {
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, FIRESTORE_LIMITS.ID_MAX);
  if (cleaned.length >= 1 && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeString(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

export function sanitizeStepsForCloud(steps: StepItem[]): StepItem[] {
  return steps
    .slice(0, FIRESTORE_LIMITS.STEPS_MAX)
    .map((step, index) => ({
      id: sanitizeId(step.id, `step_${index}`),
      text: sanitizeString(step.text, FIRESTORE_LIMITS.STEP_TEXT_MAX, '').trim() || 'قدم',
      done: Boolean(step.done),
    }));
}

export interface CloudTaskPayload {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  categoryId: string;
  priority: Priority;
  dueDate: string | null;
  steps: StepItem[];
  note: string;
  isToday: boolean;
  completed: boolean;
  completedAt: string | null;
  clientCreatedAt: string;
  isSample: boolean;
}

export function sanitizeTaskForCloud(task: TaskItem, ownerId: string): CloudTaskPayload {
  const safeTitle = sanitizeString(task.title, FIRESTORE_LIMITS.TITLE_MAX, '').trim() || 'کار بدون عنوان';
  const safePriority: Priority =
    task.priority === 'high' || task.priority === 'medium' || task.priority === 'low'
      ? task.priority
      : 'medium';

  return {
    id: sanitizeId(task.id, 'task'),
    ownerId: sanitizeId(ownerId, 'user'),
    title: safeTitle,
    description: sanitizeString(task.description, FIRESTORE_LIMITS.DESCRIPTION_MAX, ''),
    categoryId: sanitizeId(task.categoryId, 'cat'),
    priority: safePriority,
    dueDate:
      typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
        ? task.dueDate.slice(0, 10)
        : null,
    steps: sanitizeStepsForCloud(task.steps),
    note: sanitizeString(task.note, FIRESTORE_LIMITS.NOTE_MAX, ''),
    isToday: Boolean(task.isToday),
    completed: Boolean(task.completed),
    completedAt:
      typeof task.completedAt === 'string' && task.completedAt.length > 0
        ? task.completedAt.slice(0, 40)
        : null,
    clientCreatedAt:
      typeof task.createdAt === 'string' && task.createdAt.length > 0
        ? task.createdAt.slice(0, 40)
        : new Date().toISOString(),
    isSample: Boolean(task.isSample),
  };
}

export interface CloudCategoryPayload {
  id: string;
  ownerId: string;
  name: string;
  order?: number;
}

export function sanitizeCategoryForCloud(
  category: CategoryItem,
  ownerId: string
): CloudCategoryPayload {
  const payload: CloudCategoryPayload = {
    id: sanitizeId(category.id, 'cat'),
    ownerId: sanitizeId(ownerId, 'user'),
    name: sanitizeString(category.name, FIRESTORE_LIMITS.CATEGORY_NAME_MAX, '').trim() || 'دسته‌بندی',
  };
  if (typeof category.order === 'number' && Number.isFinite(category.order)) {
    payload.order = Math.max(0, Math.min(10000, Math.round(category.order)));
  }
  return payload;
}

export function cloudDocToTaskItem(data: Record<string, unknown>): TaskItem {
  const priority: Priority =
    data.priority === 'high' || data.priority === 'medium' || data.priority === 'low'
      ? data.priority
      : 'medium';

  const rawSteps = Array.isArray(data.steps) ? data.steps : [];
  const steps: StepItem[] = rawSteps
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s, idx) => ({
      id: typeof s.id === 'string' ? s.id : `step_${idx}`,
      text: typeof s.text === 'string' ? s.text : '',
      done: Boolean(s.done),
    }))
    .filter((s) => s.text.length > 0);

  return {
    id: typeof data.id === 'string' ? data.id : sanitizeId('task'),
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : 'cat_dilan',
    priority,
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : null,
    steps,
    note: typeof data.note === 'string' ? data.note : '',
    isToday: Boolean(data.isToday),
    completed: Boolean(data.completed),
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : null,
    createdAt:
      typeof data.clientCreatedAt === 'string'
        ? data.clientCreatedAt
        : new Date().toISOString(),
    isSample: Boolean(data.isSample),
  };
}

export function cloudDocToCategoryItem(data: Record<string, unknown>): CategoryItem {
  const item: CategoryItem = {
    id: typeof data.id === 'string' ? data.id : sanitizeId('cat'),
    name: typeof data.name === 'string' ? data.name : 'عمومی',
  };
  if (typeof data.order === 'number' && Number.isFinite(data.order)) {
    item.order = Math.max(0, Math.min(10000, Math.round(data.order)));
  }
  return item;
}
