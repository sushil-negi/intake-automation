import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openDB,
  saveDraft,
  getAllDrafts,
  getDraft,
  deleteDraft,
  saveSheetsConfig,
  getSheetsConfig,
  saveAuthConfig,
  getAuthConfig,
  purgeOldDrafts,
} from '../utils/db';
import type { DraftRecord } from '../utils/db';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import { DEFAULT_AUTH_CONFIG } from '../types/auth';
import { INITIAL_DATA } from '../utils/initialData';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';

// Reset IndexedDB between tests
beforeEach(() => {
  indexedDB = new IDBFactory();
});

describe('openDB', () => {
  it('creates all required object stores', async () => {
    const db = await openDB();
    expect(db.objectStoreNames.contains('drafts')).toBe(true);
    expect(db.objectStoreNames.contains('syncQueue')).toBe(true);
    expect(db.objectStoreNames.contains('sheetsConfig')).toBe(true);
    expect(db.objectStoreNames.contains('authConfig')).toBe(true);
    expect(db.objectStoreNames.contains('auditLogs')).toBe(true);
    db.close();
  });

  it('auditLogs store has timestamp and action indexes', async () => {
    const db = await openDB();
    const tx = db.transaction('auditLogs', 'readonly');
    const store = tx.objectStore('auditLogs');
    expect(store.indexNames.contains('timestamp')).toBe(true);
    expect(store.indexNames.contains('action')).toBe(true);
    expect(store.indexNames.contains('user')).toBe(true);
    db.close();
  });
});

// --- Draft CRUD with encryption round-trip ---

describe('Draft CRUD', () => {
  const makeDraft = (overrides: Partial<DraftRecord> = {}): DraftRecord => ({
    id: `draft-${Date.now()}`,
    clientName: 'John Doe',
    type: 'assessment',
    data: { ...INITIAL_DATA, clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'John Doe' } },
    lastModified: new Date().toISOString(),
    status: 'draft',
    currentStep: 2,
    ...overrides,
  });

  it('saveDraft + getDraft round-trip preserves all fields', async () => {
    const draft = makeDraft({ id: 'test-1', clientName: 'Alice Smith' });
    await saveDraft(draft);

    const loaded = await getDraft('test-1');
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe('test-1');
    expect(loaded!.clientName).toBe('Alice Smith');
    expect(loaded!.type).toBe('assessment');
    expect(loaded!.status).toBe('draft');
    expect(loaded!.currentStep).toBe(2);
    expect(loaded!.lastModified).toBe(draft.lastModified);
  });

  it('saveDraft encrypts data and clientName (stored values are encrypted)', async () => {
    const draft = makeDraft({ id: 'enc-test', clientName: 'Secret Name' });
    await saveDraft(draft);

    // Read raw stored record directly from IndexedDB
    const db = await openDB();
    const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const req = tx.objectStore('drafts').get('enc-test');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // encryptedData should be a string (not a plain object)
    expect(typeof raw.encryptedData).toBe('string');
    expect(raw.encryptedData).toMatch(/^ENC:/);
    // clientName should be encrypted too
    expect(typeof raw.clientName).toBe('string');
    expect(raw.clientName).toMatch(/^ENC:/);
    // Legacy data field should NOT be present
    expect(raw.data).toBeUndefined();
  });

  it('getAllDrafts returns all saved drafts decrypted', async () => {
    await saveDraft(makeDraft({ id: 'd1', clientName: 'Client A' }));
    await saveDraft(makeDraft({ id: 'd2', clientName: 'Client B' }));
    await saveDraft(makeDraft({ id: 'd3', clientName: 'Client C' }));

    const all = await getAllDrafts();
    expect(all).toHaveLength(3);
    const names = all.map(d => d.clientName).sort();
    expect(names).toEqual(['Client A', 'Client B', 'Client C']);
  });

  it('getDraft returns undefined for non-existent id', async () => {
    const result = await getDraft('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('deleteDraft removes the draft', async () => {
    await saveDraft(makeDraft({ id: 'del-test' }));
    expect(await getDraft('del-test')).toBeDefined();

    await deleteDraft('del-test');
    expect(await getDraft('del-test')).toBeUndefined();
  });

  it('saveDraft upserts (put) — updating existing draft replaces data', async () => {
    const draft1 = makeDraft({ id: 'upsert-test', clientName: 'Version 1' });
    await saveDraft(draft1);

    const draft2 = makeDraft({ id: 'upsert-test', clientName: 'Version 2', currentStep: 5 });
    await saveDraft(draft2);

    const all = await getAllDrafts();
    const matching = all.filter(d => d.id === 'upsert-test');
    expect(matching).toHaveLength(1);
    expect(matching[0].clientName).toBe('Version 2');
    expect(matching[0].currentStep).toBe(5);
  });

  it('handles service contract type drafts', async () => {
    const contractDraft = makeDraft({
      id: 'contract-1',
      clientName: 'Contract Client',
      type: 'serviceContract',
      data: SERVICE_CONTRACT_INITIAL_DATA,
      linkedAssessmentId: 'linked-123',
    });
    await saveDraft(contractDraft);

    const loaded = await getDraft('contract-1');
    expect(loaded).toBeDefined();
    expect(loaded!.type).toBe('serviceContract');
    expect(loaded!.linkedAssessmentId).toBe('linked-123');
  });
});

// --- Sheets Config ---

describe('SheetsConfig CRUD', () => {
  it('getSheetsConfig returns defaults when no config saved', async () => {
    const config = await getSheetsConfig();
    expect(config.authMethod).toBe(DEFAULT_SHEETS_CONFIG.authMethod);
    expect(config.spreadsheetId).toBe('');
    expect(config.autoSyncOnSubmit).toBe(false);
  });

  it('saveSheetsConfig + getSheetsConfig round-trip preserves values', async () => {
    await saveSheetsConfig({
      ...DEFAULT_SHEETS_CONFIG,
      spreadsheetId: 'abc123',
      assessmentSheetName: 'MySheet',
      autoSyncOnSubmit: true,
    });

    const loaded = await getSheetsConfig();
    expect(loaded.spreadsheetId).toBe('abc123');
    expect(loaded.assessmentSheetName).toBe('MySheet');
    expect(loaded.autoSyncOnSubmit).toBe(true);
  });

  it('encrypts oauthAccessToken and apiKey at rest', async () => {
    await saveSheetsConfig({
      ...DEFAULT_SHEETS_CONFIG,
      oauthAccessToken: 'ya29.secret-token',
      apiKey: 'AIzaSy-secret-key',
    });

    // Read raw from IndexedDB
    const db = await openDB();
    const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('sheetsConfig', 'readonly');
      const req = tx.objectStore('sheetsConfig').get('singleton');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // Stored values should be encrypted
    expect(typeof raw.oauthAccessToken).toBe('string');
    expect(raw.oauthAccessToken).toMatch(/^ENC:/);
    expect(typeof raw.apiKey).toBe('string');
    expect(raw.apiKey).toMatch(/^ENC:/);

    // But getSheetsConfig should decrypt them back
    const config = await getSheetsConfig();
    expect(config.oauthAccessToken).toBe('ya29.secret-token');
    expect(config.apiKey).toBe('AIzaSy-secret-key');
  });
});

// --- Auth Config ---

describe('AuthConfig CRUD', () => {
  it('getAuthConfig returns defaults when no config saved', async () => {
    const config = await getAuthConfig();
    expect(config.requireAuth).toBe(DEFAULT_AUTH_CONFIG.requireAuth);
    expect(config.allowedEmails).toEqual(DEFAULT_AUTH_CONFIG.allowedEmails);
  });

  it('saveAuthConfig + getAuthConfig round-trip preserves values', async () => {
    await saveAuthConfig({
      ...DEFAULT_AUTH_CONFIG,
      requireAuth: true,
      allowedEmails: ['user@example.com'],
      idleTimeoutMinutes: 30,
    });

    const loaded = await getAuthConfig();
    expect(loaded.requireAuth).toBe(true);
    expect(loaded.allowedEmails).toEqual(['user@example.com']);
    expect(loaded.idleTimeoutMinutes).toBe(30);
  });
});

// --- Data Retention ---

describe('purgeOldDrafts', () => {
  it('deletes drafts older than threshold and returns count', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
    const recent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    await saveDraft({
      id: 'old-draft',
      clientName: 'Old',
      type: 'assessment',
      data: INITIAL_DATA,
      lastModified: old.toISOString(),
      status: 'draft',
    });
    await saveDraft({
      id: 'recent-draft',
      clientName: 'Recent',
      type: 'assessment',
      data: INITIAL_DATA,
      lastModified: recent.toISOString(),
      status: 'draft',
    });

    const purged = await purgeOldDrafts(90);
    expect(purged).toBe(1);

    const remaining = await getAllDrafts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('recent-draft');
  });

  it('returns 0 when no drafts to purge', async () => {
    const purged = await purgeOldDrafts(90);
    expect(purged).toBe(0);
  });
});
