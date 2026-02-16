import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB, getEmailConfig, saveEmailConfig } from '../utils/db';
import { DEFAULT_EMAIL_CONFIG } from '../types/emailConfig';
import type { EmailConfig } from '../types/emailConfig';

// Reset IndexedDB between tests
beforeEach(() => {
  indexedDB = new IDBFactory();
});

describe('Email Config — IndexedDB persistence', () => {
  it('returns defaults when no config saved', async () => {
    const config = await getEmailConfig();
    expect(config).toEqual(DEFAULT_EMAIL_CONFIG);
  });

  it('saves and retrieves email config', async () => {
    const custom: EmailConfig = {
      ...DEFAULT_EMAIL_CONFIG,
      assessmentSubjectTemplate: 'Custom Assessment - {clientName}',
      defaultCc: 'admin@ehc.com',
      emailSignature: 'Best regards,\nEHC Team',
      htmlEnabled: false,
    };

    await saveEmailConfig(custom);
    const loaded = await getEmailConfig();

    expect(loaded.assessmentSubjectTemplate).toBe('Custom Assessment - {clientName}');
    expect(loaded.defaultCc).toBe('admin@ehc.com');
    expect(loaded.emailSignature).toBe('Best regards,\nEHC Team');
    expect(loaded.htmlEnabled).toBe(false);
  });

  it('merges partial saved config with defaults', async () => {
    // Simulate an older config that only had some fields
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('emailConfig', 'readwrite');
      tx.objectStore('emailConfig').put({
        id: 'singleton',
        assessmentSubjectTemplate: 'Old Subject - {clientName}',
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    const loaded = await getEmailConfig();
    // Saved field should persist
    expect(loaded.assessmentSubjectTemplate).toBe('Old Subject - {clientName}');
    // Missing fields should use defaults
    expect(loaded.contractSubjectTemplate).toBe(DEFAULT_EMAIL_CONFIG.contractSubjectTemplate);
    expect(loaded.htmlEnabled).toBe(DEFAULT_EMAIL_CONFIG.htmlEnabled);
  });

  it('DB version 5 creates emailConfig store', async () => {
    const db = await openDB();
    expect(db.objectStoreNames.contains('emailConfig')).toBe(true);
    db.close();
  });

  it('overwrites existing config on re-save', async () => {
    await saveEmailConfig({ ...DEFAULT_EMAIL_CONFIG, defaultCc: 'first@ehc.com' });
    await saveEmailConfig({ ...DEFAULT_EMAIL_CONFIG, defaultCc: 'second@ehc.com' });

    const loaded = await getEmailConfig();
    expect(loaded.defaultCc).toBe('second@ehc.com');
  });
});
