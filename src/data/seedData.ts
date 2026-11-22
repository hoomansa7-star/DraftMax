import { CategoryItem, TaskItem } from '../types/task';
import { addDaysToIsoDate, getTodayIsoDate } from '../utils/jalali';

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat_dilan', name: 'Dilan' },
  { id: 'cat_gaming', name: 'Gaming' },
  { id: 'cat_claim', name: 'ادعا کلیم' },
  { id: 'cat_routine', name: 'روتین' },
  { id: 'cat_sport', name: 'ورزش' },
  { id: 'cat_program', name: 'برنامه' },
];

export const LEGACY_DEFAULT_CATEGORY_IDS = [
  'cat_construction',
  'cat_content',
  'cat_personal',
  'cat_work',
] as const;

export const DEFAULT_CATEGORY_ORDER: Record<string, number> = {
  cat_dilan: 0,
  cat_gaming: 1,
  cat_claim: 2,
  cat_routine: 3,
  cat_sport: 4,
  cat_program: 5,
};

export function createSampleTasks(todayIso: string = getTodayIsoDate()): TaskItem[] {
  return [
    {
      id: 'sample_1',
      title: 'بازسازی و کابینت آشپزخانه',
      description: 'منتظر جواب پیمانکار هستم، یکشنبه ساعت ۱۰ برای تایید پیش‌فاکتور تماس بگیرم.',
      categoryId: 'cat_routine',
      priority: 'high',
      dueDate: addDaysToIsoDate(todayIso, -1),
      steps: [],
      note: '',
      isToday: true,
      completed: false,
      completedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      isSample: true,
    },
    {
      id: 'sample_2',
      title: 'انتشار ویدیوی بررسی ابزار مدیریت زمان',
      description: 'فایل راف‌کات در پوشه Projects/Video-14 ذخیره شده. فقط طراحی تامبنیل و آپلود مانده.',
      categoryId: 'cat_gaming',
      priority: 'medium',
      dueDate: addDaysToIsoDate(todayIso, 2),
      steps: [],
      note: '',
      isToday: true,
      completed: false,
      completedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      isSample: true,
    },
    {
      id: 'sample_3',
      title: 'مرتب‌سازی مدارک مالیاتی و بیمه‌ها',
      description: 'کد رهگیری قبلی در پیامک‌های بهمن است. استعلام قیمت تمدید بیمه از دو شرکت گرفته شود.',
      categoryId: 'cat_claim',
      priority: 'low',
      dueDate: addDaysToIsoDate(todayIso, 5),
      steps: [],
      note: '',
      isToday: false,
      completed: false,
      completedAt: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isSample: true,
    },
    {
      id: 'sample_4',
      title: 'سرویس دوره‌ای خودرو',
      description: 'روغن و فیلترها تعویض شد. کیلومتر بعدی روی ۱۰۵٬۰۰۰ یادداشت شد.',
      categoryId: 'cat_sport',
      priority: 'medium',
      dueDate: addDaysToIsoDate(todayIso, -3),
      steps: [],
      note: '',
      isToday: false,
      completed: true,
      completedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      isSample: true,
    },
  ];
}
