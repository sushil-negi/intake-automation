/**
 * Netlify Function v2 — Super-Admin API
 *
 * Handles tenant management operations for SIE super-admins:
 * create/suspend orgs, invite/list users.
 *
 * Uses Supabase service_role key (bypasses RLS) — NEVER exposed client-side.
 * Caller must provide a valid Supabase JWT for a user with role = 'super_admin'.
 *
 * Set SUPABASE_SERVICE_ROLE_KEY in Netlify dashboard to activate.
 */

import { createClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminRequest {
  action: string;
  [key: string]: unknown;
}

interface AdminResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  try {
    // @ts-expect-error Netlify global is injected at runtime
    return Netlify.env.get(key) || '';
  } catch {
    return process.env[key] || '';
  }
}

// Rate limiter (30 requests/minute/IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

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

function jsonResponse(body: AdminResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

const VALID_ROLES = ['admin', 'staff'] as const;

// ── Main handler ─────────────────────────────────────────────────────────────

export default async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  // Check service_role key exists (master switch)
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  if (!serviceRoleKey || !supabaseUrl) {
    return jsonResponse({ ok: false, error: 'Admin API not configured' }, 503);
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

  // Check super_admin role
  const { data: profile } = await sb.from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'super_admin') {
    return jsonResponse({ ok: false, error: 'Forbidden: super_admin role required' }, 403);
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let payload: AdminRequest;
  try {
    payload = await req.json() as AdminRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request body' }, 400);
  }

  const { action } = payload;

  // ── Action dispatch ──────────────────────────────────────────────────────

  switch (action) {
    // ── List Organizations ───────────────────────────────────────────────
    case 'listOrgs': {
      const { data: orgs, error } = await sb
        .from('org_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return jsonResponse({ ok: false, error: `Failed to list orgs: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: orgs }, 200);
    }

    // ── Create Organization ──────────────────────────────────────────────
    case 'createOrg': {
      const name = (payload.name as string || '').trim();
      const slug = (payload.slug as string || '').trim().toLowerCase();

      if (!name || name.length > 200) {
        return jsonResponse({ ok: false, error: 'Name is required (max 200 characters)' }, 400);
      }
      if (!isValidSlug(slug)) {
        return jsonResponse({
          ok: false,
          error: 'Invalid slug: 3-50 chars, lowercase letters, numbers, and hyphens only',
        }, 400);
      }

      // Check slug uniqueness
      const { data: existing } = await sb
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        return jsonResponse({ ok: false, error: `Slug "${slug}" is already taken` }, 409);
      }

      const { data: org, error } = await sb
        .from('organizations')
        .insert({ name, slug })
        .select()
        .single();

      if (error) {
        return jsonResponse({ ok: false, error: `Failed to create org: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: org }, 201);
    }

    // ── Suspend/Reactivate Organization ──────────────────────────────────
    case 'suspendOrg': {
      const orgId = payload.orgId as string;
      const suspend = payload.suspend as boolean;

      if (!orgId || typeof suspend !== 'boolean') {
        return jsonResponse({ ok: false, error: 'orgId and suspend (boolean) are required' }, 400);
      }

      const { data: org, error } = await sb
        .from('organizations')
        .update({ is_active: !suspend })
        .eq('id', orgId)
        .select()
        .single();

      if (error) {
        return jsonResponse({ ok: false, error: `Failed to update org: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: org }, 200);
    }

    // ── List Users ───────────────────────────────────────────────────────
    case 'listUsers': {
      const orgId = payload.orgId as string | undefined;

      let query = sb.from('profiles').select('*').order('created_at', { ascending: false });
      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data: users, error } = await query;
      if (error) {
        return jsonResponse({ ok: false, error: `Failed to list users: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: users }, 200);
    }

    // ── Invite User (pre-create profile) ─────────────────────────────────
    case 'inviteUser': {
      const email = (payload.email as string || '').trim().toLowerCase();
      const orgId = payload.orgId as string;
      const role = payload.role as string;
      const fullName = (payload.fullName as string || '').trim();

      if (!email || !isValidEmail(email)) {
        return jsonResponse({ ok: false, error: 'Valid email is required' }, 400);
      }
      if (!orgId) {
        return jsonResponse({ ok: false, error: 'orgId is required' }, 400);
      }
      if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
        return jsonResponse({ ok: false, error: `Invalid role. Must be: ${VALID_ROLES.join(', ')}` }, 400);
      }

      // Verify org exists
      const { data: org } = await sb
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .maybeSingle();

      if (!org) {
        return jsonResponse({ ok: false, error: 'Organization not found' }, 404);
      }

      // Check if profile already exists for this email
      const { data: existingProfile } = await sb
        .from('profiles')
        .select('id, org_id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        return jsonResponse({
          ok: false,
          error: `User ${email} already has a profile`,
        }, 409);
      }

      // Pre-create profile with a placeholder UUID.
      // When the user signs in via Google OAuth, the handle_new_user trigger
      // will update this row with the real auth.user id.
      const placeholderId = crypto.randomUUID();

      const { data: createdProfile, error } = await sb
        .from('profiles')
        .insert({
          id: placeholderId,
          email,
          full_name: fullName || '',
          org_id: orgId,
          role,
        })
        .select()
        .single();

      if (error) {
        return jsonResponse({ ok: false, error: `Failed to invite user: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: createdProfile }, 201);
    }

    // ── Remove User ──────────────────────────────────────────────────────
    case 'removeUser': {
      const userId = payload.userId as string;
      if (!userId) {
        return jsonResponse({ ok: false, error: 'userId is required' }, 400);
      }

      // Don't allow removing self
      if (userId === user.id) {
        return jsonResponse({ ok: false, error: 'Cannot remove yourself' }, 400);
      }

      const { error } = await sb
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        return jsonResponse({ ok: false, error: `Failed to remove user: ${error.message}` }, 500);
      }
      return jsonResponse({ ok: true, data: { removed: userId } }, 200);
    }

    default:
      return jsonResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
  }
};

export const config = {
  path: '/api/admin',
};
