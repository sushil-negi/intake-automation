import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import type { SheetsConfig } from '../types/sheetsConfig';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import type { AuthConfig } from '../types/auth';
import { DEFAULT_AUTH_CONFIG } from '../types/auth';
import type { EmailConfig } from '../types/emailConfig';
import { DEFAULT_EMAIL_CONFIG } from '../types/emailConfig';
import { INITIAL_DATA } from './initialData';
import { SERVICE_CONTRACT_INITIAL_DATA } from './contractInitialData';
import { encryptObject, decryptObject, encryptCredential, decryptCredential, encryptString, decryptString, isEncrypted } from './crypto';
import { logger } from './logger';

const DB_NAME = 'ehc-assessment-db';
const DB_VERSION = 7;
const DRAFTS_STORE = 'drafts';
const SYNC_QUEUE_STORE = 'syncQueue';
const SHEETS_CONFIG_STORE = 'sheetsConfig';
const AUTH_CONFIG_STORE = 'authConfig';
export const AUDIT_LOG_STORE = 'auditLogs';
const EMAIL_CONFIG_STORE = 'emailConfig';
const SUPABASE_SYNC_QUEUE_STORE = 'supabaseSyncQueue';

export type DraftType = 'assessment' | 'serviceContract';

export interface DraftRecord {
  id: string;
  clientName: string;
  type: DraftType;
  data: AssessmentFormData | ServiceContractFormData;
  lastModified: string;
  status: 'draft' | 'submitted';
  currentStep?: number;
  linkedAssessmentId?: string;
  /** Supabase remote version number for optimistic concurrency. */
  remoteVersion?: number;
  /** Local submission version — incremented each time the record is re-submitted. */
  version?: number;
}

/** Internal stored form — data may be encrypted string or legacy plaintext object */
interface StoredDraftRecord {
  id: string;
  clientName: string;
  type: DraftType;
  data?: AssessmentFormData | ServiceContractFormData; // legacy plaintext
  encryptedData?: string; // encrypted payload
  lastModified: string;
  status: 'draft' | 'submitted';
  currentStep?: number;
  linkedAssessmentId?: string;
}

export interface SyncQueueItem {
  id: string;
  data: AssessmentFormData;
  submittedAt: string;
  synced: boolean;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (oldVersion < 1) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        db.createObjectStore(SHEETS_CONFIG_STORE, { keyPath: 'id' });
      }
      if (oldVersion < 3) {
        db.createObjectStore(AUTH_CONFIG_STORE, { keyPath: 'id' });
      }
      if (oldVersion < 4) {
        const auditStore = db.createObjectStore(AUDIT_LOG_STORE, { keyPath: 'id', autoIncrement: true });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        auditStore.createIndex('action', 'action', { unique: false });
        auditStore.createIndex('user', 'user', { unique: false });
      }
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains(EMAIL_CONFIG_STORE)) {
          db.createObjectStore(EMAIL_CONFIG_STORE, { keyPath: 'id' });
        }
      }
      if (oldVersion < 7) {
        if (!db.objectStoreNames.contains(SUPABASE_SYNC_QUEUE_STORE)) {
          const store = db.createObjectStore(SUPABASE_SYNC_QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('draftId', 'draftId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Draft Management (encrypted) ---

/** Decrypt a stored draft record into the public DraftRecord shape. */
async function decryptDraft(stored: StoredDraftRecord): Promise<DraftRecord> {
  let data: AssessmentFormData | ServiceContractFormData;

  if (stored.encryptedData) {
    data = await decryptObject<AssessmentFormData | ServiceContractFormData>(stored.encryptedData);
  } else if (stored.data && typeof stored.data === 'object') {
    // Legacy plaintext — use directly
    data = stored.data;
  } else {
    throw new Error(`Draft ${stored.id} has no data`);
  }

  // v4-4: Decrypt clientName — handles both encrypted (ENC:) and legacy plaintext
  const clientName = isEncrypted(stored.clientName)
    ? await decryptString(stored.clientName, 'phi')
    : stored.clientName;

  // Default type for legacy drafts; detect by checking data shape
  const type: DraftType = stored.type
    || ((data as unknown as Record<string, unknown>).serviceAgreement ? 'serviceContract' : 'assessment');

  // Merge with schema defaults so legacy drafts get any new fields (e.g. staffNotes)
  // This is a shallow merge per top-level key — preserves existing saved values
  // while filling in any sections added after the draft was originally saved.
  const dataRecord = data as unknown as Record<string, unknown>;
  if (type === 'assessment') {
    const defaults = INITIAL_DATA as unknown as Record<string, unknown>;
    for (const key of Object.keys(defaults)) {
      if (dataRecord[key] === undefined) {
        dataRecord[key] = defaults[key];
      }
    }
  } else {
    const defaults = SERVICE_CONTRACT_INITIAL_DATA as unknown as Record<string, unknown>;
    for (const key of Object.keys(defaults)) {
      if (dataRecord[key] === undefined) {
        dataRecord[key] = defaults[key];
      }
    }
  }

  return {
    id: stored.id,
    clientName,
    type,
    data,
    lastModified: stored.lastModified,
    status: stored.status,
    currentStep: stored.currentStep,
    linkedAssessmentId: stored.linkedAssessmentId,
  };
}

export async function saveDraft(draft: DraftRecord): Promise<void> {
  const encrypted = await encryptObject(draft.data);
  // v4-4: Encrypt clientName — PHI should not be stored in plaintext
  const encryptedName = await encryptString(draft.clientName, 'phi');
  const stored: StoredDraftRecord = {
    id: draft.id,
    clientName: encryptedName,
    type: draft.type,
    encryptedData: encrypted,
    lastModified: draft.lastModified,
    status: draft.status,
    currentStep: draft.currentStep,
    linkedAssessmentId: draft.linkedAssessmentId,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, 'readwrite');
    tx.objectStore(DRAFTS_STORE).put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllDrafts(): Promise<DraftRecord[]> {
  const db = await openDB();
  const storedRecords = await new Promise<StoredDraftRecord[]>((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, 'readonly');
    const request = tx.objectStore(DRAFTS_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const results: DraftRecord[] = [];
  for (const stored of storedRecords) {
    try {
      results.push(await decryptDraft(stored));
    } catch (e) {
      logger.error(`Failed to decrypt draft ${stored.id}:`, e);
    }
  }
  return results;
}

export async function getDraft(id: string): Promise<DraftRecord | undefined> {
  const db = await openDB();
  const stored = await new Promise<StoredDraftRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, 'readonly');
    const request = tx.objectStore(DRAFTS_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!stored) return undefined;
  return decryptDraft(stored);
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, 'readwrite');
    tx.objectStore(DRAFTS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Sync Queue ---

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  // Encrypt sync queue data at rest (PHI protection)
  const encryptedData = await encryptObject(item.data);
  const stored = { ...item, encryptedData, data: undefined };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SYNC_QUEUE_STORE).put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  const raw = await new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const request = tx.objectStore(SYNC_QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(request.error);
  });

  const results: SyncQueueItem[] = [];
  for (const stored of raw as Array<SyncQueueItem & { encryptedData?: string }>) {
    if (stored.synced) continue;
    // Decrypt sync queue items (handles both encrypted and legacy plaintext)
    if (stored.encryptedData) {
      try {
        stored.data = await decryptObject(stored.encryptedData);
      } catch {
        // If decryption fails, skip this item
        continue;
      }
    }
    results.push(stored);
  }
  return results;
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as SyncQueueItem;
      if (item) {
        item.synced = true;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncedItems(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result as SyncQueueItem[];
      for (const item of items) {
        if (item.synced) store.delete(item.id);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Sheets Config (credentials encrypted) ---

export async function getSheetsConfig(): Promise<SheetsConfig> {
  const db = await openDB();
  const raw = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
    const tx = db.transaction(SHEETS_CONFIG_STORE, 'readonly');
    const request = tx.objectStore(SHEETS_CONFIG_STORE).get('singleton');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!raw) return { ...DEFAULT_SHEETS_CONFIG };

  const { id: _id, ...config } = raw;
  const merged = { ...DEFAULT_SHEETS_CONFIG, ...config } as SheetsConfig;

  // Decrypt credential fields if encrypted
  if (merged.oauthAccessToken && isEncrypted(merged.oauthAccessToken)) {
    merged.oauthAccessToken = await decryptCredential(merged.oauthAccessToken);
  }
  if (merged.apiKey && isEncrypted(merged.apiKey)) {
    merged.apiKey = await decryptCredential(merged.apiKey);
  }

  return merged;
}

export async function saveSheetsConfig(config: SheetsConfig): Promise<void> {
  // Encrypt sensitive credential fields before storing
  const stored = { ...config } as Record<string, unknown>;
  if (config.oauthAccessToken) {
    stored.oauthAccessToken = await encryptCredential(config.oauthAccessToken);
  }
  if (config.apiKey) {
    stored.apiKey = await encryptCredential(config.apiKey);
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHEETS_CONFIG_STORE, 'readwrite');
    tx.objectStore(SHEETS_CONFIG_STORE).put({ id: 'singleton', ...stored });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Auth Config ---

export async function getAuthConfig(): Promise<AuthConfig> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_CONFIG_STORE, 'readonly');
    const request = tx.objectStore(AUTH_CONFIG_STORE).get('singleton');
    request.onsuccess = () => {
      if (request.result) {
        const { id: _id, ...config } = request.result;
        resolve({ ...DEFAULT_AUTH_CONFIG, ...config });
      } else {
        resolve({ ...DEFAULT_AUTH_CONFIG });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAuthConfig(config: AuthConfig): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_CONFIG_STORE, 'readwrite');
    tx.objectStore(AUTH_CONFIG_STORE).put({ id: 'singleton', ...config });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Email Config ---

export async function getEmailConfig(): Promise<EmailConfig> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMAIL_CONFIG_STORE, 'readonly');
    const request = tx.objectStore(EMAIL_CONFIG_STORE).get('singleton');
    request.onsuccess = () => {
      if (request.result) {
        const { id: _id, ...config } = request.result;
        resolve({ ...DEFAULT_EMAIL_CONFIG, ...config });
      } else {
        resolve({ ...DEFAULT_EMAIL_CONFIG });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveEmailConfig(config: EmailConfig): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMAIL_CONFIG_STORE, 'readwrite');
    tx.objectStore(EMAIL_CONFIG_STORE).put({ id: 'singleton', ...config });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Data Retention ---

/** Delete drafts older than the specified number of days */
export async function purgeOldDrafts(daysToKeep: number): Promise<number> {
  const db = await openDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffISO = cutoff.toISOString();

  const storedRecords = await new Promise<StoredDraftRecord[]>((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, 'readonly');
    const request = tx.objectStore(DRAFTS_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const toDelete = storedRecords.filter(d => d.lastModified < cutoffISO);
  if (toDelete.length === 0) return 0;

  const db2 = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db2.transaction(DRAFTS_STORE, 'readwrite');
    const store = tx.objectStore(DRAFTS_STORE);
    for (const draft of toDelete) {
      store.delete(draft.id);
    }
    tx.oncomplete = () => resolve(toDelete.length);
    tx.onerror = () => reject(tx.error);
  });
}

// --- Supabase Sync Queue ---

export interface SupabaseSyncQueueItem {
  id: string;
  draftId: string;
  action: 'upsert' | 'delete';
  timestamp: string;
}

export async function addToSupabaseSyncQueue(item: SupabaseSyncQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUPABASE_SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SUPABASE_SYNC_QUEUE_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSupabaseSyncQueue(): Promise<SupabaseSyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUPABASE_SYNC_QUEUE_STORE, 'readonly');
    const request = tx.objectStore(SUPABASE_SYNC_QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromSupabaseSyncQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUPABASE_SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SUPABASE_SYNC_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSupabaseSyncQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUPABASE_SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SUPABASE_SYNC_QUEUE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Sync Logic ---

export async function attemptSync(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const pending = await getPendingSyncItems();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      // Client-side sync — marks draft as synced in IndexedDB
      logger.log('[Sync] Synced assessment:', item.id);
      await markSynced(item.id);
      synced++;
    } catch {
      failed++;
    }
  }

  await removeSyncedItems();
  return { synced, failed };
}
