import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  encryptCredential,
  decryptCredential,
  isEncrypted,
  writeEncryptedLocalStorage,
} from '../utils/crypto';

// Reset IndexedDB between tests so keys are fresh
beforeEach(() => {
  indexedDB = new IDBFactory();
});

describe('isEncrypted', () => {
  it('returns true for strings starting with ENC:', () => {
    expect(isEncrypted('ENC:abc123')).toBe(true);
  });

  it('returns false for plaintext strings', () => {
    expect(isEncrypted('hello world')).toBe(false);
    expect(isEncrypted('{"key": "value"}')).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(isEncrypted('')).toBe(false);
  });
});

describe('encryptString / decryptString', () => {
  it('encrypts and decrypts a string round-trip with phi key', async () => {
    const plaintext = 'Hello, world! PHI data here.';
    const encrypted = await encryptString(plaintext, 'phi');
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptString(encrypted, 'phi');
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts with credential key', async () => {
    const token = 'ya29.access-token-here';
    const encrypted = await encryptString(token, 'credential');
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptString(encrypted, 'credential');
    expect(decrypted).toBe(token);
  });

  it('produces different ciphertext for same plaintext (unique IVs)', async () => {
    const plaintext = 'same input';
    const enc1 = await encryptString(plaintext, 'phi');
    const enc2 = await encryptString(plaintext, 'phi');
    expect(enc1).not.toBe(enc2);
    // Both should still decrypt to the same value
    expect(await decryptString(enc1, 'phi')).toBe(plaintext);
    expect(await decryptString(enc2, 'phi')).toBe(plaintext);
  });

  it('decryptString returns plaintext unchanged when not encrypted', async () => {
    const plaintext = '{"name": "John"}';
    const result = await decryptString(plaintext, 'phi');
    expect(result).toBe(plaintext);
  });

  it('handles empty string input', async () => {
    const encrypted = await encryptString('', 'phi');
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptString(encrypted, 'phi');
    expect(decrypted).toBe('');
  });

  it('handles unicode strings', async () => {
    const text = 'Héllo Wörld 日本語 🏥';
    const encrypted = await encryptString(text, 'phi');
    const decrypted = await decryptString(encrypted, 'phi');
    expect(decrypted).toBe(text);
  });

  it('handles large strings', async () => {
    const text = 'A'.repeat(100000);
    const encrypted = await encryptString(text, 'phi');
    const decrypted = await decryptString(encrypted, 'phi');
    expect(decrypted).toBe(text);
  });
});

describe('encryptObject / decryptObject', () => {
  it('encrypts and decrypts nested objects', async () => {
    const data = {
      clientName: 'Jane Doe',
      medications: [{ name: 'Aspirin', dosage: '81mg' }],
      nested: { deep: { value: 42 } },
    };
    const encrypted = await encryptObject(data);
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptObject<typeof data>(encrypted);
    expect(decrypted).toEqual(data);
  });

  it('decryptObject handles plaintext JSON (migration path)', async () => {
    const data = { name: 'Test', age: 30 };
    const plainJson = JSON.stringify(data);
    const result = await decryptObject<typeof data>(plainJson);
    expect(result).toEqual(data);
  });
});

describe('encryptCredential / decryptCredential', () => {
  it('encrypts and decrypts credential values', async () => {
    const token = 'ya29.some-long-access-token';
    const encrypted = await encryptCredential(token);
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptCredential(encrypted);
    expect(decrypted).toBe(token);
  });

  it('returns empty string unchanged', async () => {
    const result = await encryptCredential('');
    expect(result).toBe('');
    const result2 = await decryptCredential('');
    expect(result2).toBe('');
  });

  it('passes through plaintext (migration path)', async () => {
    const plainToken = 'plain-api-key-123';
    const result = await decryptCredential(plainToken);
    expect(result).toBe(plainToken);
  });
});

describe('writeEncryptedLocalStorage', () => {
  it('writes encrypted data to localStorage', async () => {
    const data = { clientName: 'Test Patient', dob: '1990-01-01' };
    await writeEncryptedLocalStorage('test-key', data);
    const stored = localStorage.getItem('test-key');
    expect(stored).toBeTruthy();
    expect(isEncrypted(stored!)).toBe(true);
    const decrypted = await decryptObject<typeof data>(stored!);
    expect(decrypted).toEqual(data);
  });
});
