// Initialises Firebase + Firestore once. Exports `db` (null when Firebase isn't configured yet).
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const isFirebaseConfigured =
  typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 0 && !firebaseConfig.apiKey.startsWith('YOUR_');

let db = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    // Long polling is more reliable than WebChannel streaming on React Native.
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    // Already initialised (e.g. after a Fast Refresh) — reuse the existing instance.
    db = getFirestore(app);
  }
}

export { db };
