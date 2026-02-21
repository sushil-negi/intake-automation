import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptOrgData,
  decryptOrgData,
  isOrgEncrypted,
  hasOrgKey,
  clearOrgKey,
  ORGENC_PREFIX,
  _setTestKey,
} from '../utils/orgKeyManager';

// Generate a fresh 256-bit key for each test
async function setupTestKey(): Promise<void> {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  await _setTestKey(keyBytes, 'test-org-id');
}

describe('isOrgEncrypted', () => {
  it('returns true for strings starting with ORGENC:', () => {
    expect(isOrgEncrypted('ORGENC:abc123')).toBe(true);
  });

  it('returns false for plaintext strings', () => {
    expect(isOrgEncrypted('hello world')).toBe(false);
    expect(isOrgEncrypted('ENC:abc123')).toBe(false);
    expect(isOrgEncrypted('{"key": "value"}')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isOrgEncrypted(42)).toBe(false);
    expect(isOrgEncrypted(null)).toBe(false);
    expect(isOrgEncrypted(undefined)).toBe(false);
    expect(isOrgEncrypted({ key: 'value' })).toBe(false);
  });
});

describe('hasOrgKey', () => {
  beforeEach(() => {
    clearOrgKey();
  });

  it('returns false when no key is loaded', () => {
    expect(hasOrgKey()).toBe(false);
  });

  it('returns true after key is loaded', async () => {
    await setupTestKey();
    expect(hasOrgKey()).toBe(true);
  });

  it('returns false after clearOrgKey', async () => {
    await setupTestKey();
    expect(hasOrgKey()).toBe(true);
    clearOrgKey();
    expect(hasOrgKey()).toBe(false);
  });
});

describe('encryptOrgData / decryptOrgData', () => {
  beforeEach(() => {
    clearOrgKey();
  });

  it('encrypts and decrypts a simple object round-trip', async () => {
    await setupTestKey();
    const data = { name: 'John Doe', age: 30, email: 'john@example.com' };

    const encrypted = await encryptOrgData(data);
    expect(typeof encrypted).toBe('string');
    expect((encrypted as string).startsWith(ORGENC_PREFIX)).toBe(true);

    const decrypted = await decryptOrgData(encrypted as string);
    expect(decrypted).toEqual(data);
  });

  it('encrypts and decrypts a nested object', async () => {
    await setupTestKey();
    const data = {
      clientInfo: { firstName: 'Jane', lastName: 'Smith' },
      medications: ['med1', 'med2'],
      signature: 'data:image/png;base64,iVBOR...',
    };

    const encrypted = await encryptOrgData(data);
    const decrypted = await decryptOrgData(encrypted as string);
    expect(decrypted).toEqual(data);
  });

  it('produces different ciphertext for same data (unique IVs)', async () => {
    await setupTestKey();
    const data = { name: 'test' };

    const enc1 = await encryptOrgData(data);
    const enc2 = await encryptOrgData(data);
    expect(enc1).not.toBe(enc2);

    // Both should still decrypt to the same value
    const dec1 = await decryptOrgData(enc1 as string);
    const dec2 = await decryptOrgData(enc2 as string);
    expect(dec1).toEqual(data);
    expect(dec2).toEqual(data);
  });

  it('handles large payloads (simulating signature data)', async () => {
    await setupTestKey();
    // Simulate a ~100KB base64 signature
    const bigString = 'A'.repeat(100_000);
    const data = { signature: `data:image/png;base64,${bigString}` };

    const encrypted = await encryptOrgData(data);
    const decrypted = await decryptOrgData(encrypted as string);
    expect(decrypted).toEqual(data);
  });

  it('handles empty object', async () => {
    await setupTestKey();
    const data = {};

    const encrypted = await encryptOrgData(data);
    const decrypted = await decryptOrgData(encrypted as string);
    expect(decrypted).toEqual(data);
  });
});

describe('graceful degradation (no key)', () => {
  beforeEach(() => {
    clearOrgKey();
  });

  it('encryptOrgData returns plain object when no key is available', async () => {
    const data = { name: 'test', secret: 'phi-data' };
    const result = await encryptOrgData(data);
    // Should return the original plain object, not a string
    expect(typeof result).toBe('object');
    expect(result).toEqual(data);
  });

  it('decryptOrgData passes through plain objects when no key is available', async () => {
    const data = { name: 'test', value: 42 };
    const result = await decryptOrgData(data);
    expect(result).toEqual(data);
  });

  it('decryptOrgData throws for ORGENC: data when no key is available', async () => {
    // Create encrypted data with a key
    await setupTestKey();
    const encrypted = await encryptOrgData({ name: 'test' });
    clearOrgKey();

    // Should throw since we can't decrypt without a key
    await expect(decryptOrgData(encrypted as string)).rejects.toThrow(
      'Org encryption key not available',
    );
  });
});

describe('migration path', () => {
  beforeEach(async () => {
    clearOrgKey();
    await setupTestKey();
  });

  it('decryptOrgData handles plain JSONB objects (existing unencrypted data)', async () => {
    // Simulate existing Supabase row with plain JSONB
    const plainJsonb = { clientInfo: { firstName: 'Bob' }, medications: [] };
    const result = await decryptOrgData(plainJsonb);
    expect(result).toEqual(plainJsonb);
  });

  it('decryptOrgData handles plain JSON string fallback', async () => {
    // Edge case: string that is valid JSON but not ORGENC:
    const jsonStr = '{"name":"test"}';
    const result = await decryptOrgData(jsonStr);
    expect(result).toEqual({ name: 'test' });
  });

  it('decryptOrgData returns empty object for invalid non-JSON string', async () => {
    const invalid = 'not-json-at-all';
    const result = await decryptOrgData(invalid);
    expect(result).toEqual({});
  });
});
