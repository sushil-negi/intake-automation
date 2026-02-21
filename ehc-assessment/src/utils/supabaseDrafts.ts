/**
 * Supabase Drafts — CRUD operations on the remote `drafts` table.
 *
 * All functions are no-ops when Supabase is not configured, returning
 * empty results so callers don't need guard checks.
 *
 * Data flows:  IndexedDB (local) ↔ this module ↔ Supabase Postgres (remote)
 */

import { getSupabaseClient, isSupabaseConfigured, getDeviceId } from './supabaseClient';
import { logger } from './logger';
import type { DraftRow, DraftInsert, DraftUpdate } from '../types/supabase';
import type { DraftRecord, DraftType } from './db';

/** UUID v4 format check — Postgres `drafts.id` is UUID type; non-UUID IDs cause cast errors. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Supabase DraftRow into the local DraftRecord shape. */
export function rowToDraftRecord(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    type: row.type as DraftType,
    data: row.form_data as unknown as DraftRecord['data'],
    lastModified: row.updated_at,
    status: row.status,
    currentStep: row.current_step,
    linkedAssessmentId: row.linked_assessment_id ?? undefined,
    remoteVersion: row.version,
  };
}

/** Convert a local DraftRecord into a Supabase DraftInsert payload. */
export function draftRecordToInsert(
  draft: DraftRecord,
  orgId: string,
  userId: string,
): DraftInsert {
  return {
    id: draft.id,
    org_id: orgId,
    client_name: draft.clientName,
    type: draft.type,
    status: draft.status,
    current_step: draft.currentStep ?? 0,
    linked_assessment_id: draft.linkedAssessmentId ?? null,
    form_data: draft.data as unknown as Record<string, unknown>,
    created_by: userId,
    updated_by: userId,
  };
}

/** Convert a local DraftRecord into a Supabase DraftUpdate payload. */
export function draftRecordToUpdate(
  draft: DraftRecord,
  userId: string,
): DraftUpdate {
  return {
    client_name: draft.clientName,
    status: draft.status,
    current_step: draft.currentStep ?? 0,
    linked_assessment_id: draft.linkedAssessmentId ?? null,
    form_data: draft.data as unknown as Record<string, unknown>,
    updated_by: userId,
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all drafts for the current org.
 * RLS enforces org isolation automatically.
 */
export async function fetchRemoteDrafts(): Promise<DraftRow[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('drafts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('[SupabaseDrafts] fetchRemoteDrafts failed:', error.message);
    return [];
  }
  return (data ?? []) as DraftRow[];
}

/**
 * Fetch a single draft by ID.
 */
export async function fetchRemoteDraft(id: string): Promise<DraftRow | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabaseClient();
  if (!sb) return null;
  if (!UUID_RE.test(id)) return null;

  const { data, error } = await sb
    .from('drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('[SupabaseDrafts] fetchRemoteDraft failed:', error.message);
    return null;
  }
  return data as DraftRow | null;
}

/**
 * Upsert a draft to Supabase.
 *
 * Uses optimistic concurrency: if a `remoteVersion` is provided on the
 * DraftRecord, the update only succeeds when the remote version matches.
 * Returns the updated row (with new version) or null on conflict/error.
 *
 * Pass `forceOverwrite: true` to skip the version guard (used by conflict
 * resolution "Keep Mine" flow).
 */
export async function upsertRemoteDraft(
  draft: DraftRecord,
  orgId: string,
  userId: string,
  options?: { forceOverwrite?: boolean },
): Promise<DraftRow | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabaseClient();
  if (!sb) return null;
  if (!UUID_RE.test(draft.id)) return null;

  // Check if the draft already exists remotely
  const existing = await fetchRemoteDraft(draft.id);

  if (existing) {
    // UPDATE path — with optimistic concurrency if we have a known version
    const update = draftRecordToUpdate(draft, userId);

    let query = sb
      .from('drafts')
      .update(update)
      .eq('id', draft.id);

    // Version guard: only update if remote version matches what we last saw
    // Skip when force-overwriting (conflict resolution "Keep Mine")
    if (draft.remoteVersion !== undefined && !options?.forceOverwrite) {
      query = query.eq('version', draft.remoteVersion);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      logger.error('[SupabaseDrafts] update failed:', error.message);
      return null;
    }
    if (!data) {
      // Version mismatch — conflict
      logger.warn('[SupabaseDrafts] version conflict for draft:', draft.id);
      return null;
    }
    return data as DraftRow;
  } else {
    // INSERT path
    const insert = draftRecordToInsert(draft, orgId, userId);
    const { data, error } = await sb
      .from('drafts')
      .insert(insert)
      .select()
      .single();

    if (error) {
      logger.error('[SupabaseDrafts] insert failed:', error.message);
      return null;
    }
    return data as DraftRow;
  }
}

/**
 * Delete a draft from Supabase.
 */
export async function deleteRemoteDraft(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const sb = getSupabaseClient();
  if (!sb) return false;
  if (!UUID_RE.test(id)) return false;

  const { error } = await sb
    .from('drafts')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('[SupabaseDrafts] delete failed:', error.message);
    return false;
  }
  return true;
}

// ── Locking ──────────────────────────────────────────────────────────────────

/**
 * Acquire an exclusive lock on a draft.
 * Returns `true` if the lock was acquired, `false` if another user holds it.
 * Throws on RPC errors so callers can handle optimistically.
 */
export async function acquireDraftLock(
  draftId: string,
  userId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // no lock needed if offline-only
  const sb = getSupabaseClient();
  if (!sb) return true;
  // Local-only draft IDs (e.g. "draft-1708xxx") are not valid UUIDs
  // and can't exist in Supabase — skip locking entirely
  if (!UUID_RE.test(draftId)) return true;

  const deviceId = getDeviceId();
  const { data, error } = await sb.rpc('acquire_draft_lock', {
    p_draft_id: draftId,
    p_user_id: userId,
    p_device_id: deviceId,
  });

  if (error) {
    logger.error('[SupabaseDrafts] acquireDraftLock failed:', error.message);
    throw new Error(error.message);
  }
  return data as boolean;
}

/**
 * Release the lock on a draft.
 */
export async function releaseDraftLock(
  draftId: string,
  userId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  if (!UUID_RE.test(draftId)) return;

  const { error } = await sb.rpc('release_draft_lock', {
    p_draft_id: draftId,
    p_user_id: userId,
  });

  if (error) {
    logger.error('[SupabaseDrafts] releaseDraftLock failed:', error.message);
  }
}

/**
 * Get lock info for a draft — returns the lock holder or null if unlocked.
 */
export async function getDraftLockInfo(draftId: string): Promise<{
  lockedBy: string;
  lockedAt: string;
  lockDeviceId: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabaseClient();
  if (!sb) return null;
  if (!UUID_RE.test(draftId)) return null;

  const { data, error } = await sb
    .from('drafts')
    .select('locked_by, locked_at, lock_device_id')
    .eq('id', draftId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { locked_by: string | null; locked_at: string | null; lock_device_id: string | null };
  if (!row.locked_by) return null;

  return {
    lockedBy: row.locked_by,
    lockedAt: row.locked_at ?? '',
    lockDeviceId: row.lock_device_id ?? '',
  };
}
