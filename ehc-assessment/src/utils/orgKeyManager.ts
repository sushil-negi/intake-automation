/**
 * Org-level encryption key manager for Supabase form_data.
 *
 * Manages a per-org AES-256-GCM key fetched from the /api/org-key Netlify
 * Function.  The key is held as a non-extractable CryptoKey in module-level
 * memory — cleared on page refresh or explicit logout.
 *
 * Encrypted payloads are prefixed with "ORGENC:" to distinguish them from
 * the per-device "ENC:" encryption used by localStorage / IndexedDB.
 *
 * Graceful degradation:
 *   - If the key is not available (offline, /api/org-key not configured),
 *     encryptOrgData() falls back to plaintext JSON.
 *   - decryptOrgData() detects ORGENC: prefix → decrypt; otherwise returns
 *     the plain object as-is (migration path for existing plaintext data).
 */

import { getSupabaseClient } from './supabaseClient';
import { logger } from './logger';

// ── Constants ────────────────────────────────────────────────────────────────

export const ORGENC_PREFIX = 'ORGENC:';

// ── Module-level state (cleared on page refresh) ─────────────────────────────

let orgKey: CryptoKey | null = null;
let orgKeyOrgId: string | null = null;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the org encryption key from /api/org-key and import it as a
 * non-extractable CryptoKey.  Idempotent — skips if already loaded
 * for the same orgId.
 */
export async function fetchOrgKey(orgId: string): Promise<void> {
  // Already loaded for this org
  if (orgKey && orgKeyOrgId === orgId) return;

  const sb = getSupabaseClient();
  if (!sb) {
    logger.log('[OrgKey] Supabase not configured — skipping key fetch');
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    logger.log('[OrgKey] No active session — skipping key fetch');
    return;
  }

  const response = await fetch('/api/org-key', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    const msg = (body as { error?: string }).error || `HTTP ${response.status}`;
    // 503 = encryption not configured on server — this is expected in dev without the env var
    if (response.status === 503) {
      logger.log(`[OrgKey] Server encryption not configured: ${msg}`);
    } else {
      logger.error(`[OrgKey] Failed to fetch org key: ${msg}`);
    }
    return;
  }

  const result = await response.json() as { ok: boolean; data?: { key: string } };
  if (!result.ok || !result.data?.key) {
    logger.error('[OrgKey] Unexpected response from /api/org-key');
    return;
  }

  // Decode base64 → raw bytes
  const raw = atob(result.data.key);
  const keyBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    keyBytes[i] = raw.charCodeAt(i);
  }

  // Import as non-extractable AES-GCM key
  orgKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
  orgKeyOrgId = orgId;

  logger.log('[OrgKey] Org encryption key loaded successfully');
}

/** Clear the org key from memory (call on logout). */
export function clearOrgKey(): void {
  orgKey = null;
  orgKeyOrgId = null;
}

/** Check whether the org encryption key is available. */
export function hasOrgKey(): boolean {
  return orgKey !== null;
}

/** Check whether a value is org-encrypted (starts with ORGENC: prefix). */
export function isOrgEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ORGENC_PREFIX);
}

// ── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt a plain object using the org key.
 * Returns "ORGENC:" + base64(iv || ciphertext).
 *
 * Falls back to a plain JSON string if no org key is available
 * (graceful degradation — Supabase stores it as JSONB text).
 */
export async function encryptOrgData(data: Record<string, unknown>): Promise<string | Record<string, unknown>> {
  if (!orgKey) {
    // No key available — return plaintext object (Supabase stores as JSONB)
    return data;
  }

  const json = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(json);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    orgKey,
    encoded,
  );

  // Concatenate iv + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Build binary string (loop to avoid stack overflow on large payloads)
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }

  return ORGENC_PREFIX + btoa(binary);
}

/**
 * Decrypt an org-encrypted payload back to a plain object.
 *
 * Handles three cases:
 *   1. ORGENC: string → decrypt to object
 *   2. Plain JSON string (from graceful degradation) → JSON.parse
 *   3. Plain object (existing Supabase JSONB) → return as-is (migration path)
 */
export async function decryptOrgData(
  payload: Record<string, unknown> | string,
): Promise<Record<string, unknown>> {
  // Case 3: Plain object — return as-is (existing Supabase JSONB data)
  if (typeof payload !== 'string') {
    return payload;
  }

  // Case 1: Org-encrypted string
  if (payload.startsWith(ORGENC_PREFIX)) {
    if (!orgKey) {
      throw new Error('Org encryption key not available — cannot decrypt ORGENC data');
    }

    const b64 = payload.slice(ORGENC_PREFIX.length);
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      orgKey,
      ciphertext,
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  // Case 2: Plain JSON string (shouldn't normally happen, but safe fallback)
  try {
    return JSON.parse(payload);
  } catch {
    logger.error('[OrgKey] Failed to parse form_data string:', payload.slice(0, 100));
    return {};
  }
}

// ── Test helpers (only used in tests) ────────────────────────────────────────

/**
 * Directly set an org key for testing purposes.
 * @internal — only exported for unit tests.
 */
export async function _setTestKey(keyBytes: Uint8Array, orgId: string): Promise<void> {
  orgKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  orgKeyOrgId = orgId;
}
