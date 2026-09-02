import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function ensureFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      try {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } catch (error) {
        console.warn('Firebase admin initialization warning:', error);
      }
    }
  }
}

// Initialized eagerly if credentials exist, otherwise lazily accessed on demand
ensureFirebaseAdmin();

const adminDb = new Proxy({} as any, {
  get(_target, prop) {
    ensureFirebaseAdmin();
    if (getApps().length) {
      const db = getFirestore();
      const val = (db as any)[prop];
      return typeof val === 'function' ? val.bind(db) : val;
    }
    return undefined;
  },
});

const adminAuth = new Proxy({} as any, {
  get(_target, prop) {
    ensureFirebaseAdmin();
    if (getApps().length) {
      const auth = getAuth();
      const val = (auth as any)[prop];
      return typeof val === 'function' ? val.bind(auth) : val;
    }
    return undefined;
  },
});

export { adminDb, adminAuth, FieldValue };

