import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { logAudit, logError, getAuditLogs, purgeOldLogs } from '../utils/auditLog';
import { openDB, AUDIT_LOG_STORE } from '../utils/db';

// Mock computeHmac/verifyHmac so tests don't depend on Web Crypto availability
// and so the async HMAC computation doesn't delay writes unpredictably.
vi.mock('../utils/crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils/crypto')>();
  return {
    ...mod,
    computeHmac: vi.fn().mockResolvedValue('test-hmac'),
    verifyHmac: vi.fn().mockResolvedValue(true),
  };
});

// Reset IndexedDB between tests so the DB schema is created fresh
beforeEach(() => {
  indexedDB = new IDBFactory();
});

/** Helper: wait for fire-and-forget logAudit to flush by waiting for async HMAC + write */
async function flushAuditWrites(): Promise<void> {
  // Allow microtasks and the async IIFE inside logAudit to resolve
  await new Promise(r => setTimeout(r, 50));
  // Then open a read transaction to ensure any pending writes complete
  const db = await openDB();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(AUDIT_LOG_STORE, 'readonly');
    tx.oncomplete = () => resolve();
  });
}

describe('logAudit', () => {
  it('writes an entry to the auditLogs store', async () => {
    logAudit('login', undefined, 'User logged in', 'success', 'admin@ehc.com');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('login');
    expect(logs[0].user).toBe('admin@ehc.com');
    expect(logs[0].status).toBe('success');
    expect(logs[0].details).toBe('User logged in');
  });

  it('defaults user to "system" when not provided', async () => {
    logAudit('settings_change');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].user).toBe('system');
  });

  it('stores resource and details when provided', async () => {
    logAudit('pdf_export', 'draft-abc', 'Exported John Doe', 'success', 'user@test.com');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs[0].resource).toBe('draft-abc');
    expect(logs[0].details).toBe('Exported John Doe');
  });

  it('never throws even if DB is broken', () => {
    // Temporarily break openDB by corrupting indexedDB
    const originalOpen = indexedDB.open;
    indexedDB.open = () => { throw new Error('DB broken'); };

    // Should NOT throw
    expect(() => logAudit('login')).not.toThrow();

    indexedDB.open = originalOpen;
  });
});

describe('logError', () => {
  it('logs an Error with message and stack', async () => {
    const err = new Error('Something broke');
    logError(err, 'TestComponent');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('error');
    expect(logs[0].status).toBe('failure');
    expect(logs[0].details).toContain('[TestComponent]');
    expect(logs[0].details).toContain('Something broke');
  });

  it('logs a string error', async () => {
    logError('Network timeout');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs[0].details).toBe('Network timeout');
  });
});

describe('getAuditLogs', () => {
  it('returns logs in newest-first order', async () => {
    logAudit('login', undefined, undefined, 'success', 'first@test.com');
    await flushAuditWrites();
    // Small delay to ensure different timestamps
    await new Promise(r => setTimeout(r, 10));
    logAudit('logout', undefined, undefined, 'success', 'second@test.com');
    await flushAuditWrites();

    const logs = await getAuditLogs();
    expect(logs).toHaveLength(2);
    // Newest first
    expect(logs[0].user).toBe('second@test.com');
    expect(logs[1].user).toBe('first@test.com');
  });

  it('filters by action', async () => {
    logAudit('login');
    logAudit('logout');
    logAudit('pdf_export');
    await flushAuditWrites();

    const logs = await getAuditLogs({ action: 'pdf_export' });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('pdf_export');
  });

  it('respects limit option', async () => {
    logAudit('login');
    logAudit('logout');
    logAudit('pdf_export');
    await flushAuditWrites();

    const logs = await getAuditLogs({ limit: 2 });
    expect(logs).toHaveLength(2);
  });
});

describe('purgeOldLogs', () => {
  it('deletes entries older than the retention period', async () => {
    // Insert an entry with an old timestamp by directly writing to the store
    const db = await openDB();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIT_LOG_STORE, 'readwrite');
      tx.objectStore(AUDIT_LOG_STORE).add({
        timestamp: oldDate.toISOString(),
        user: 'old@test.com',
        action: 'login',
        status: 'success',
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Add a recent entry
    logAudit('logout', undefined, undefined, 'success', 'recent@test.com');
    await flushAuditWrites();

    // Verify both exist
    let allLogs = await getAuditLogs();
    expect(allLogs).toHaveLength(2);

    // Purge entries older than 90 days
    const deleted = await purgeOldLogs(90);
    expect(deleted).toBe(1);

    // Only recent entry should remain
    allLogs = await getAuditLogs();
    expect(allLogs).toHaveLength(1);
    expect(allLogs[0].user).toBe('recent@test.com');
  });
});
