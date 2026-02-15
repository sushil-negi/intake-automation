import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  encryptObject,
  decryptObject,
  encryptString,
  decryptString,
  encryptCredential,
  decryptCredential,
  isEncrypted,
  computeHmac,
  verifyHmac,
  writeEncryptedLocalStorage,
} from '../utils/crypto';
import { logAudit, getAuditLogs, verifyAuditLogIntegrity } from '../utils/auditLog';
import { saveDraft, getAllDrafts, openDB } from '../utils/db';
import type { DraftRecord } from '../utils/db';
import { INITIAL_DATA } from '../utils/initialData';

// Flush audit log writes (fire-and-forget pattern needs microtask drain)
const flushAudit = () => new Promise<void>(r => setTimeout(r, 200));

beforeEach(() => {
  indexedDB = new IDBFactory();
  localStorage.clear();
});

// ─── PHI Encryption at Rest ─────────────────────────────────────────────

describe('PHI Encryption at Rest', () => {
  it('encryptObject produces ENC: prefixed string', async () => {
    const data = { name: 'John Doe', ssn: '123-45-6789' };
    const encrypted = await encryptObject(data);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.startsWith('ENC:')).toBe(true);
  });

  it('encryptObject + decryptObject round-trip preserves all data', async () => {
    const data = { name: 'Jane', nested: { arr: [1, 2, 3], bool: true } };
    const encrypted = await encryptObject(data);
    const decrypted = await decryptObject<typeof data>(encrypted);
    expect(decrypted).toEqual(data);
  });

  it('different encryptions of same data produce different ciphertexts (AES-GCM nonce)', async () => {
    const data = { secret: 'test' };
    const enc1 = await encryptObject(data);
    const enc2 = await encryptObject(data);
    expect(enc1).not.toBe(enc2); // Different IVs
  });

  it('PHI strings are encrypted with phi key', async () => {
    const phi = 'John Smith, DOB: 01/15/1990, SSN: 123-45-6789';
    const encrypted = await encryptString(phi, 'phi');
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptString(encrypted, 'phi');
    expect(decrypted).toBe(phi);
  });

  it('credential strings are encrypted with credential key', async () => {
    const token = 'ya29.a0AfH6SMB_super_secret_token';
    const encrypted = await encryptCredential(token);
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptCredential(encrypted);
    expect(decrypted).toBe(token);
  });

  it('writeEncryptedLocalStorage stores encrypted data', async () => {
    const data = { phi: 'sensitive' };
    await writeEncryptedLocalStorage('test-key', data);
    const raw = localStorage.getItem('test-key');
    expect(raw).toBeTruthy();
    expect(raw!.startsWith('ENC:')).toBe(true);
    // Should be recoverable
    const decrypted = await decryptObject<typeof data>(raw!);
    expect(decrypted).toEqual(data);
  });

  it('draft clientName is encrypted in IndexedDB', async () => {
    const draft: DraftRecord = {
      id: 'phi-test',
      clientName: 'Jane Doe',
      type: 'assessment',
      data: INITIAL_DATA,
      lastModified: new Date().toISOString(),
      status: 'draft',
    };
    await saveDraft(draft);

    // Read raw record from IndexedDB
    const db = await openDB();
    const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const req = tx.objectStore('drafts').get('phi-test');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // clientName must be encrypted
    expect(typeof raw.clientName).toBe('string');
    expect(isEncrypted(raw.clientName as string)).toBe(true);
    // Must NOT contain plaintext name
    expect(raw.clientName).not.toContain('Jane Doe');

    // encryptedData must be encrypted
    expect(typeof raw.encryptedData).toBe('string');
    expect(isEncrypted(raw.encryptedData as string)).toBe(true);
  });

  it('draft data is never stored as plaintext object in IndexedDB', async () => {
    const draft: DraftRecord = {
      id: 'no-plaintext',
      clientName: 'Test',
      type: 'assessment',
      data: INITIAL_DATA,
      lastModified: new Date().toISOString(),
      status: 'draft',
    };
    await saveDraft(draft);

    const db = await openDB();
    const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const req = tx.objectStore('drafts').get('no-plaintext');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // Legacy `data` field must NOT be present
    expect(raw.data).toBeUndefined();
    // encryptedData must be present and encrypted
    expect(raw.encryptedData).toBeDefined();
    expect(isEncrypted(raw.encryptedData as string)).toBe(true);
  });

  it('decrypted draft recovers original PHI data', async () => {
    const draft: DraftRecord = {
      id: 'recover-test',
      clientName: 'Alice Johnson',
      type: 'assessment',
      data: {
        ...INITIAL_DATA,
        clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Alice Johnson', dateOfBirth: '1985-03-15' },
      },
      lastModified: new Date().toISOString(),
      status: 'draft',
    };
    await saveDraft(draft);

    const drafts = await getAllDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].clientName).toBe('Alice Johnson');
    expect((drafts[0].data as Record<string, unknown> & { clientHelpList: { clientName: string; dateOfBirth: string } }).clientHelpList.clientName).toBe('Alice Johnson');
    expect((drafts[0].data as Record<string, unknown> & { clientHelpList: { clientName: string; dateOfBirth: string } }).clientHelpList.dateOfBirth).toBe('1985-03-15');
  });
});

// ─── HMAC Audit Log Integrity ───────────────────────────────────────────

describe('HMAC Audit Log Integrity', () => {
  it('audit log entries have HMAC field', async () => {
    logAudit('login', 'auth', 'User logged in', 'success', 'user@test.com');
    await flushAudit();

    const logs = await getAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].hmac).toBeDefined();
    expect(typeof logs[0].hmac).toBe('string');
    expect(logs[0].hmac!.length).toBeGreaterThan(0);
  });

  it('HMAC verifies successfully for untampered entries', async () => {
    logAudit('draft_create', 'draft-1', 'Created draft', 'success');
    await flushAudit();

    const result = await verifyAuditLogIntegrity();
    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(0);
    expect(result.noHmac).toBe(0);
  });

  it('HMAC detects tampering of audit details', async () => {
    logAudit('draft_create', 'draft-1', 'Original details', 'success');
    await flushAudit();

    // Tamper with the entry directly in IndexedDB
    const db = await openDB();
    const entry = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('auditLogs', 'readonly');
      const req = tx.objectStore('auditLogs').getAll();
      req.onsuccess = () => resolve(req.result[0]);
      req.onerror = () => reject(req.error);
    });

    // Modify the details (simulating tampering)
    entry.details = 'TAMPERED details';
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('auditLogs', 'readwrite');
      tx.objectStore('auditLogs').put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    const result = await verifyAuditLogIntegrity();
    expect(result.invalid).toBe(1);
    expect(result.valid).toBe(0);
  });

  it('computeHmac + verifyHmac round-trip succeeds', async () => {
    const data = 'test|data|string';
    const hmac = await computeHmac(data);
    const valid = await verifyHmac(data, hmac);
    expect(valid).toBe(true);
  });

  it('verifyHmac rejects modified data', async () => {
    const hmac = await computeHmac('original');
    const valid = await verifyHmac('modified', hmac);
    expect(valid).toBe(false);
  });

  it('multiple audit entries all verify successfully', async () => {
    logAudit('login', 'auth', 'Login 1', 'success', 'user1@test.com');
    await flushAudit();
    logAudit('draft_create', 'draft-1', 'Draft created', 'success');
    await flushAudit();
    logAudit('pdf_export', 'draft-1', 'PDF exported', 'success');
    await flushAudit();
    logAudit('logout', 'auth', 'Logout', 'success', 'user1@test.com');
    await flushAudit();

    const result = await verifyAuditLogIntegrity();
    expect(result.valid).toBe(4);
    expect(result.invalid).toBe(0);
  });
});

// ─── PHI Sanitization in Audit Details ──────────────────────────────────

describe('PHI Sanitization in Audit Log', () => {
  it('SSNs are redacted in audit details', async () => {
    logAudit('error', 'test', 'Failed for SSN 123-45-6789', 'failure');
    await flushAudit();

    const logs = await getAuditLogs();
    expect(logs[0].details).toContain('[SSN-REDACTED]');
    expect(logs[0].details).not.toContain('123-45-6789');
  });

  it('phone numbers are redacted in audit details (xxx-xxx-xxxx format)', async () => {
    logAudit('error', 'test', 'Contact at 555-123-4567', 'failure');
    await flushAudit();

    const logs = await getAuditLogs();
    expect(logs[0].details).toContain('[PHONE-REDACTED]');
    expect(logs[0].details).not.toContain('555-123-4567');
  });

  it('phone numbers are redacted (parenthesized format)', async () => {
    logAudit('error', 'test', 'Call (610) 555-1234 for info', 'failure');
    await flushAudit();

    const logs = await getAuditLogs();
    expect(logs[0].details).toContain('[PHONE-REDACTED]');
    expect(logs[0].details).not.toContain('(610) 555-1234');
  });
});

// ─── isEncrypted Detection ──────────────────────────────────────────────

describe('isEncrypted detection', () => {
  it('identifies ENC: prefix as encrypted', () => {
    expect(isEncrypted('ENC:abc123')).toBe(true);
  });

  it('identifies plaintext JSON as not encrypted', () => {
    expect(isEncrypted('{"name":"test"}')).toBe(false);
  });

  it('identifies empty string as not encrypted', () => {
    expect(isEncrypted('')).toBe(false);
  });

  it('identifies null/undefined-like as not encrypted', () => {
    expect(isEncrypted('null')).toBe(false);
    expect(isEncrypted('undefined')).toBe(false);
  });
});
