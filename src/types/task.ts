export type Priority = 'high' | 'medium' | 'low';

export type ActiveTab = 'active' | 'today' | 'done';

export type ThemeMode = 'dark' | 'light';

export interface StepItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  order?: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  priority: Priority;
  dueDate: string | null; // ISO YYYY-MM-DD
  steps: StepItem[];
  note: string; // "Where I left off" note
  isToday: boolean;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  isSample?: boolean;
}

export interface FilterState {
  search: string;
  categoryId: string; // 'all' or categoryId
  priority: Priority | 'all';
}

export interface AppBackupPayload {
  version: 1;
  exportedAt: string;
  tasks: TaskItem[];
  categories: CategoryItem[];
}
