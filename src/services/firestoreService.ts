import { Auth, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { CategoryItem, TaskItem, ThemeMode } from '../types/task';
import {
  cloudDocToCategoryItem,
  cloudDocToTaskItem,
  FIRESTORE_LIMITS,
  sanitizeCategoryForCloud,
  sanitizeId,
  sanitizeString,
  sanitizeTaskForCloud,
} from '../utils/cloudSync';

export interface CloudTarget {
  db: Firestore;
  auth: Auth;
}

const DEFAULT_TARGET: CloudTarget = { db, auth };

function userTasksCol(dbInstance: Firestore, userId: string) {
  return collection(dbInstance, 'users', userId, 'tasks');
}

function userTasksQuery(dbInstance: Firestore, userId: string) {
  return query(userTasksCol(dbInstance, userId), where('ownerId', '==', userId));
}

function userTaskDoc(dbInstance: Firestore, userId: string, taskId: string) {
  return doc(dbInstance, 'users', userId, 'tasks', taskId);
}

function userCategoriesCol(dbInstance: Firestore, userId: string) {
  return collection(dbInstance, 'users', userId, 'categories');
}

function userCategoriesQuery(dbInstance: Firestore, userId: string) {
  return query(userCategoriesCol(dbInstance, userId), where('ownerId', '==', userId));
}

function userCategoryDoc(dbInstance: Firestore, userId: string, categoryId: string) {
  return doc(dbInstance, 'users', userId, 'categories', categoryId);
}

function userProfileDoc(dbInstance: Firestore, userId: string) {
  return doc(dbInstance, 'users', userId, 'private', 'profile');
}

export async function ensureUserProfile(
  user: User,
  localTheme: ThemeMode,
  target: CloudTarget = DEFAULT_TARGET
): Promise<{ theme: ThemeMode }> {
  const path = `users/${user.uid}/private/profile`;
  const ref = userProfileDoc(target.db, user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = sanitizeString(user.displayName ?? '', FIRESTORE_LIMITS.DISPLAY_NAME_MAX, '');
    const email = sanitizeString(user.email ?? '', FIRESTORE_LIMITS.EMAIL_MAX, '');
    const photoURL = sanitizeString(user.photoURL ?? '', FIRESTORE_LIMITS.PHOTO_URL_MAX, '');

    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        displayName,
        email,
        photoURL,
        theme: localTheme,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { theme: localTheme };
    }

    const data = snap.data();
    const cloudTheme: ThemeMode = data.theme === 'light' ? 'light' : 'dark';
    if (data.displayName !== displayName || data.email !== email || data.photoURL !== photoURL) {
      await updateDoc(ref, {
        displayName,
        email,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
    return { theme: cloudTheme };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, target.auth);
  }
}

export async function syncThemePreference(
  userId: string,
  theme: ThemeMode,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}/private/profile`;
  try {
    await updateDoc(userProfileDoc(target.db, userId), {
      theme,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, target.auth);
  }
}

export async function checkCloudHasData(
  userId: string,
  target: CloudTarget = DEFAULT_TARGET
): Promise<{
  hasTasks: boolean;
  hasCategories: boolean;
}> {
  const tasksPath = `users/${userId}/tasks`;
  const catsPath = `users/${userId}/categories`;
  try {
    const [tasksSnap, catsSnap] = await Promise.all([
      getDocsFromServer(userTasksQuery(target.db, userId)),
      getDocsFromServer(userCategoriesQuery(target.db, userId)),
    ]);
    return {
      hasTasks: !tasksSnap.empty,
      hasCategories: !catsSnap.empty,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, tasksPath + ' | ' + catsPath, target.auth);
  }
}

export async function migrateLocalDataToCloud(
  userId: string,
  tasks: TaskItem[],
  categories: CategoryItem[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    for (const cat of categories) {
      const payload = sanitizeCategoryForCloud(cat, userId);
      const ref = userCategoryDoc(target.db, userId, payload.id);
      ops.push((batch) =>
        batch.set(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    for (const task of tasks) {
      const payload = sanitizeTaskForCloud(task, userId);
      const ref = userTaskDoc(target.db, userId, payload.id);
      ops.push((batch) =>
        batch.set(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(target.db);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, target.auth);
  }
}

export function subscribeToUserTasks(
  userId: string,
  onData: (tasks: TaskItem[]) => void,
  onError?: (error: unknown) => void,
  target: CloudTarget = DEFAULT_TARGET
): Unsubscribe {
  const path = `users/${userId}/tasks`;
  return onSnapshot(
    userTasksQuery(target.db, userId),
    (snapshot) => {
      const items = snapshot.docs.map((d) => cloudDocToTaskItem(d.data() as Record<string, unknown>));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, target.auth);
      } catch (err) {
        onError?.(err);
      }
    }
  );
}

export function subscribeToUserCategories(
  userId: string,
  onData: (categories: CategoryItem[]) => void,
  onError?: (error: unknown) => void,
  target: CloudTarget = DEFAULT_TARGET
): Unsubscribe {
  const path = `users/${userId}/categories`;
  return onSnapshot(
    userCategoriesQuery(target.db, userId),
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        cloudDocToCategoryItem(d.data() as Record<string, unknown>)
      );
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, target.auth);
      } catch (err) {
        onError?.(err);
      }
    }
  );
}

export async function createTaskInCloud(
  userId: string,
  task: TaskItem,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const payload = sanitizeTaskForCloud(task, userId);
  const path = `users/${userId}/tasks/${payload.id}`;
  try {
    await setDoc(userTaskDoc(target.db, userId, payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, target.auth);
  }
}

export async function updateTaskInCloud(
  userId: string,
  task: TaskItem,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const payload = sanitizeTaskForCloud(task, userId);
  const path = `users/${userId}/tasks/${payload.id}`;
  try {
    await updateDoc(userTaskDoc(target.db, userId, payload.id), {
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId,
      priority: payload.priority,
      dueDate: payload.dueDate,
      steps: payload.steps,
      note: payload.note,
      isToday: payload.isToday,
      completed: payload.completed,
      completedAt: payload.completedAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, target.auth);
  }
}

export async function deleteTaskInCloud(
  userId: string,
  taskId: string,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const safeId = sanitizeId(taskId, 'task');
  const path = `users/${userId}/tasks/${safeId}`;
  try {
    await deleteDoc(userTaskDoc(target.db, userId, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, target.auth);
  }
}

export async function createCategoryInCloud(
  userId: string,
  category: CategoryItem,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const payload = sanitizeCategoryForCloud(category, userId);
  const path = `users/${userId}/categories/${payload.id}`;
  try {
    await setDoc(userCategoryDoc(target.db, userId, payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, target.auth);
  }
}

export async function renameCategoryInCloud(
  userId: string,
  categoryId: string,
  name: string,
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const payload = sanitizeCategoryForCloud({ id: categoryId, name }, userId);
  const path = `users/${userId}/categories/${payload.id}`;
  try {
    await updateDoc(userCategoryDoc(target.db, userId, payload.id), {
      name: payload.name,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, target.auth);
  }
}

export async function reorderCategoriesInCloud(
  userId: string,
  orderedCategories: CategoryItem[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}/categories`;
  try {
    for (let i = 0; i < orderedCategories.length; i += 400) {
      const batch = writeBatch(target.db);
      const slice = orderedCategories.slice(i, i + 400);
      slice.forEach((cat, sliceIdx) => {
        const orderIndex = Math.max(0, Math.min(10000, i + sliceIdx));
        const safeId = sanitizeId(cat.id, 'cat');
        batch.update(userCategoryDoc(target.db, userId, safeId), {
          order: orderIndex,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, target.auth);
  }
}

export async function deleteCategoryAndReassignInCloud(
  userId: string,
  categoryId: string,
  fallbackCategoryId: string,
  affectedTaskIds: string[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const safeCatId = sanitizeId(categoryId, 'cat');
  const safeFallbackId = sanitizeId(fallbackCategoryId, 'cat');
  const path = `users/${userId}/categories/${safeCatId}`;
  try {
    const batch = writeBatch(target.db);
    batch.delete(userCategoryDoc(target.db, userId, safeCatId));
    for (const taskId of affectedTaskIds) {
      const safeTaskId = sanitizeId(taskId, 'task');
      batch.update(userTaskDoc(target.db, userId, safeTaskId), {
        categoryId: safeFallbackId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, target.auth);
  }
}

export async function clearSampleTasksInCloud(
  userId: string,
  sampleTaskIds: string[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}/tasks`;
  try {
    for (let i = 0; i < sampleTaskIds.length; i += 400) {
      const batch = writeBatch(target.db);
      sampleTaskIds.slice(i, i + 400).forEach((id) => {
        batch.delete(userTaskDoc(target.db, userId, sanitizeId(id, 'task')));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, target.auth);
  }
}

export async function applyCategoriesPresetInCloud(
  userId: string,
  newCategories: CategoryItem[],
  oldCategoryIdsToDelete: string[],
  tasksToUpdate: TaskItem[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}/categories`;
  try {
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    for (const oldId of oldCategoryIdsToDelete) {
      ops.push((batch) => batch.delete(userCategoryDoc(target.db, userId, sanitizeId(oldId, 'cat'))));
    }

    for (const cat of newCategories) {
      const payload = sanitizeCategoryForCloud(cat, userId);
      ops.push((batch) =>
        batch.set(userCategoryDoc(target.db, userId, payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    for (const task of tasksToUpdate) {
      const safeTaskId = sanitizeId(task.id, 'task');
      const safeCatId = sanitizeId(task.categoryId, 'cat');
      ops.push((batch) =>
        batch.update(userTaskDoc(target.db, userId, safeTaskId), {
          categoryId: safeCatId,
          updatedAt: serverTimestamp(),
        })
      );
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(target.db);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, target.auth);
  }
}

export async function replaceCloudWithBackup(
  userId: string,
  newTasks: TaskItem[],
  newCategories: CategoryItem[],
  existingTaskIds: string[],
  existingCategoryIds: string[],
  target: CloudTarget = DEFAULT_TARGET
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    for (const oldTaskId of existingTaskIds) {
      ops.push((batch) => batch.delete(userTaskDoc(target.db, userId, sanitizeId(oldTaskId, 'task'))));
    }
    for (const oldCatId of existingCategoryIds) {
      ops.push((batch) => batch.delete(userCategoryDoc(target.db, userId, sanitizeId(oldCatId, 'cat'))));
    }
    for (const cat of newCategories) {
      const payload = sanitizeCategoryForCloud(cat, userId);
      ops.push((batch) =>
        batch.set(userCategoryDoc(target.db, userId, payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
    for (const task of newTasks) {
      const payload = sanitizeTaskForCloud(task, userId);
      ops.push((batch) =>
        batch.set(userTaskDoc(target.db, userId, payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(target.db);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, target.auth);
  }
}
