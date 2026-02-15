/**
 * AES-GCM encryption module for PHI and credential data at rest.
 *
 * Two separate keys:
 *   - "phi" — for patient health information (localStorage + IndexedDB drafts)
 *   - "credential" — for OAuth tokens and API keys
 *
 * Keys are generated via Web Crypto API and stored in IndexedDB.
 * Encrypted payloads are prefixed with "ENC:" for easy detection.
 * Plaintext values pass through decryptString() unchanged (migration path).
 */

const CRYPTO_DB_NAME = 'ehc-crypto-keys';
const CRYPTO_DB_VERSION = 1;
const CRYPTO_STORE = 'keys';

const ENC_PREFIX = 'ENC:';

type KeyPurpose = 'phi' | 'credential';
type HmacKeyId = 'audit-hmac';

// --- Internal: IndexedDB for CryptoKey storage ---

function openCryptoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CRYPTO_DB_NAME, CRYPTO_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CRYPTO_STORE)) {
        db.createObjectStore(CRYPTO_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOrCreateKey(purpose: KeyPurpose): Promise<CryptoKey> {
  const db = await openCryptoDB();

  // Try to load existing key
  const existing = await new Promise<{ id: string; key: CryptoKey } | undefined>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readonly');
    const req = tx.objectStore(CRYPTO_STORE).get(purpose);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (existing?.key) {
    return existing.key;
  }

  // Generate a new AES-GCM 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable for security
    ['encrypt', 'decrypt'],
  );

  // Store it (IndexedDB supports structured cloning of CryptoKey)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readwrite');
    tx.objectStore(CRYPTO_STORE).put({ id: purpose, key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

// --- Public API ---

/** Check if a string value is encrypted (starts with ENC: prefix). */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * Encrypt a plaintext string using AES-GCM.
 * Returns "ENC:" + base64(iv || ciphertext).
 */
export async function encryptString(plaintext: string, purpose: KeyPurpose): Promise<string> {
  const key = await getOrCreateKey(purpose);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  // Concatenate iv + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Build binary string via loop (spread operator causes stack overflow on large payloads)
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return ENC_PREFIX + btoa(binary);
}

/**
 * Decrypt an encrypted string. If the value is not encrypted (no ENC: prefix),
 * returns it unchanged — this is the plaintext migration path.
 */
export async function decryptString(payload: string, purpose: KeyPurpose): Promise<string> {
  if (!isEncrypted(payload)) {
    return payload; // plaintext pass-through (migration path)
  }

  const key = await getOrCreateKey(purpose);
  const raw = atob(payload.slice(ENC_PREFIX.length));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

// --- Object-level helpers (PHI) ---

/** Encrypt a JavaScript object as JSON using the PHI key. */
export async function encryptObject(obj: unknown): Promise<string> {
  return encryptString(JSON.stringify(obj), 'phi');
}

/** Decrypt an encrypted payload back to a JavaScript object. Plaintext JSON passes through. */
export async function decryptObject<T>(payload: string): Promise<T> {
  if (!isEncrypted(payload)) {
    // Plaintext JSON — parse directly (migration path)
    return JSON.parse(payload) as T;
  }
  const json = await decryptString(payload, 'phi');
  return JSON.parse(json) as T;
}

// --- Credential helpers ---

/** Encrypt a credential value (OAuth token, API key). */
export async function encryptCredential(value: string): Promise<string> {
  if (!value) return value;
  return encryptString(value, 'credential');
}

/** Decrypt a credential value. Plaintext passes through. */
export async function decryptCredential(payload: string): Promise<string> {
  if (!payload) return payload;
  return decryptString(payload, 'credential');
}

// --- localStorage helper ---

/** Write an encrypted object to localStorage. */
export async function writeEncryptedLocalStorage(key: string, data: unknown): Promise<void> {
  const encrypted = await encryptObject(data);
  localStorage.setItem(key, encrypted);
}

// --- HMAC for audit log integrity ---

async function getOrCreateHmacKey(_id: HmacKeyId): Promise<CryptoKey> {
  const db = await openCryptoDB();
  const storeId = 'audit-hmac';

  const existing = await new Promise<{ id: string; key: CryptoKey } | undefined>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readonly');
    const req = tx.objectStore(CRYPTO_STORE).get(storeId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (existing?.key) return existing.key;

  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false, // non-extractable
    ['sign', 'verify'],
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readwrite');
    tx.objectStore(CRYPTO_STORE).put({ id: storeId, key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

/** Compute HMAC-SHA256 over a data string. Returns base64 digest. */
export async function computeHmac(data: string): Promise<string> {
  const key = await getOrCreateHmacKey('audit-hmac');
  const encoded = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign('HMAC', key, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Verify an HMAC-SHA256 digest against data. */
export async function verifyHmac(data: string, hmac: string): Promise<boolean> {
  const key = await getOrCreateHmacKey('audit-hmac');
  const encoded = new TextEncoder().encode(data);
  const sigBytes = new Uint8Array(atob(hmac).split('').map(c => c.charCodeAt(0)));
  return crypto.subtle.verify('HMAC', key, sigBytes, encoded);
}
