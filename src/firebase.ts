import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, Firestore, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AccountSlotId } from './utils/accountsStore';

export interface FirebaseSlotServices {
  slotId: AccountSlotId;
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const slotCache = new Map<AccountSlotId, FirebaseSlotServices>();

export function getSlotServices(slotId: AccountSlotId = 'slot_0'): FirebaseSlotServices {
  const cached = slotCache.get(slotId);
  if (cached) return cached;

  const existingApps = getApps();
  let app: FirebaseApp;
  if (slotId === 'slot_0') {
    app = existingApps.find((a) => a.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);
  } else {
    app = existingApps.find((a) => a.name === slotId) ?? initializeApp(firebaseConfig, slotId);
  }

  const slotServices: FirebaseSlotServices = {
    slotId,
    app,
    auth: getAuth(app),
    db: getFirestore(app, firebaseConfig.firestoreDatabaseId),
  };
  slotCache.set(slotId, slotServices);
  return slotServices;
}

const defaultSlot = getSlotServices('slot_0');
export const db = defaultSlot.db;
export const auth = defaultSlot.auth;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function createGoogleProvider(loginHint?: string): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  if (loginHint && loginHint.trim().length > 0) {
    provider.setCustomParameters({
      login_hint: loginHint.trim(),
      prompt: 'select_account',
    });
  } else {
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  return provider;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authInstance: Auth = auth
): never {
  const currentUser = authInstance.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
