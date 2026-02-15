/**
 * Shared Playwright fixture that disables the auth gate.
 *
 * The EHC app defaults to requireAuth=true and shows a LoginScreen
 * unless an IndexedDB record overrides this. This fixture seeds
 * the `authConfig` store with requireAuth=false before each test.
 */
import { test as base, expect } from '@playwright/test';

const DB_NAME = 'ehc-assessment-db';
const DB_VERSION = 4;

export const test = base.extend({
  page: async ({ page }, use) => {
    // Navigate to the app so IndexedDB is available in this origin
    await page.goto('/');

    // Seed IndexedDB with auth disabled
    await page.evaluate(
      ({ dbName, dbVersion }) => {
        return new Promise<void>((resolve, reject) => {
          const req = indexedDB.open(dbName, dbVersion);

          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('drafts'))
              db.createObjectStore('drafts', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('syncQueue'))
              db.createObjectStore('syncQueue', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('sheetsConfig'))
              db.createObjectStore('sheetsConfig', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('authConfig'))
              db.createObjectStore('authConfig', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('auditLogs')) {
              const store = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('action', 'action', { unique: false });
              store.createIndex('user', 'user', { unique: false });
            }
          };

          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('authConfig', 'readwrite');
            tx.objectStore('authConfig').put({
              id: 'singleton',
              requireAuth: false,
              allowedEmails: [],
              idleTimeoutMinutes: 15,
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          };

          req.onerror = () => reject(req.error);
        });
      },
      { dbName: DB_NAME, dbVersion: DB_VERSION },
    );

    // Reload so the app reads the seeded auth config
    await page.reload();
    await page.waitForLoadState('networkidle');

    await use(page);
  },
});

export { expect };
