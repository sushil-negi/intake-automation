/**
 * Netlify Function — Org Encryption Key Derivation
 *
 * Derives a per-org AES-256 key from a master key using PBKDF2.
 * The master key lives in the `EHC_ENCRYPTION_MASTER_KEY` env var.
 *
 * Flow:
 *   1. Client sends JWT in Authorization header
 *   2. Function verifies JWT, looks up user's org_id
 *   3. Derives org-specific key: PBKDF2(masterKey, "ehc-org-key-" + orgId)
 *   4. Returns raw key bytes as base64
 *
 * The client imports the key as a non-extractable CryptoKey for AES-GCM
 * encrypt/decrypt of form_data before storing in Supabase.
 *
 * Security:
 *   - Master key never leaves the server
 *   - Derived keys are deterministic (same org always gets same key)
 *   - Each org gets a unique key via unique salt
 *   - Rate limited to 10 req/min/IP
 */

import { createClient } from '@supabase/supabase-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  try {
    // @ts-expect-error Netlify global is injected at runtime
    return Netlify.env.get(key) || '';
  } catch {
    return process.env[key] || '';
  }
}

// Rate limiter (10 requests/minute/IP — key fetch is infrequent)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function jsonResponse(body: { ok: boolean; data?: unknown; error?: string }, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── PBKDF2 key derivation ────────────────────────────────────────────────────

async function deriveOrgKey(masterKeyBase64: string, orgId: string): Promise<string> {
  const masterKeyBytes = Uint8Array.from(atob(masterKeyBase64), c => c.charCodeAt(0));

  // Import master key as PBKDF2 base material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  // Salt = "ehc-org-key-" + orgId → unique per org, deterministic
  const salt = new TextEncoder().encode(`ehc-org-key-${orgId}`);

  // Derive 256 bits (32 bytes) for AES-256-GCM
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    256,
  );

  // Return as base64
  const bytes = new Uint8Array(derivedBits);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const config = {
  path: '/api/org-key',
};

export default async (req: Request) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  // Check required env vars
  const masterKey = getEnv('EHC_ENCRYPTION_MASTER_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!masterKey) {
    return jsonResponse({ ok: false, error: 'Encryption not configured' }, 503);
  }
  if (!serviceRoleKey || !supabaseUrl) {
    return jsonResponse({ ok: false, error: 'Supabase not configured' }, 503);
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return jsonResponse({ ok: false, error: 'Rate limit exceeded' }, 429);
  }

  // ── Authenticate caller ──────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ ok: false, error: 'Missing authorization header' }, 401);
  }

  const jwt = authHeader.slice(7);

  // Create service_role client (bypasses RLS)
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify JWT and extract user
  const { data: { user }, error: authError } = await sb.auth.getUser(jwt);
  if (authError || !user) {
    return jsonResponse({ ok: false, error: 'Invalid or expired token' }, 401);
  }

  // Get user's org_id from profile
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.org_id) {
    return jsonResponse({ ok: false, error: 'User has no organization assigned' }, 403);
  }

  // ── Derive org-specific key ──────────────────────────────────────────────

  try {
    const orgKeyBase64 = await deriveOrgKey(masterKey, profile.org_id);

    return jsonResponse({
      ok: true,
      data: { key: orgKeyBase64 },
    }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Key derivation failed';
    return jsonResponse({ ok: false, error: msg }, 500);
  }
};
