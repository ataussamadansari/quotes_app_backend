import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { logger } from '../utils/logger.js';
import { env } from './env.js';

let firebaseApp = null;

const buildFirebaseCredential = () => {
  if (env.firebaseUseApplicationDefault) {
    return applicationDefault();
  }

  if (
    env.firebaseProjectId &&
    env.firebaseClientEmail &&
    env.firebasePrivateKey
  ) {
    return cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey.replace(/\\n/g, '\n'),
    });
  }

  throw new Error(
    'FCM is enabled but Firebase credentials are missing. Configure application default credentials or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
  );
};

export const initializeFirebaseAdmin = () => {
  if (!env.fcmEnabled) {
    logger.info('FCM is disabled. Firebase Admin SDK initialization skipped.', {
      event: 'firebase_init_skipped',
    });
    return null;
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps()[0] ?? initializeApp({
    credential: buildFirebaseCredential(),
  });

  logger.info('Firebase Admin SDK initialized successfully.', {
    event: 'firebase_initialized',
  });
  return firebaseApp;
};

export const isFirebaseMessagingEnabled = () => env.fcmEnabled;

export const getFirebaseMessagingClient = () => {
  if (!env.fcmEnabled) {
    return null;
  }

  const app = initializeFirebaseAdmin();
  return getMessaging(app);
};
