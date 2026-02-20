/**
 * Supabase Audit Log — dual-write audit entries to both IndexedDB and Supabase.
 *
 * Fire-and-forget: never blocks the calling code.
 * Falls back gracefully if Supabase is not configured or offline.
 */

import { getSupabaseClient, isSupabaseConfigured, getDeviceId } from './supabaseClient';
import { logger } from './logger';
import type { AuditLogInsert, AuditLogRow } from '../types/supabase';

/**
 * Write an audit log entry to Supabase.
 *
 * This is a fire-and-forget function — it never throws.
 * The local IndexedDB audit log (auditLog.ts → logAudit) remains
 * the primary log; this is the remote copy for cross-device visibility.
 */
export function logAuditRemote(
  orgId: string,
  userEmail: string,
  action: string,
  resource?: string,
  details?: string,
  status: 'success' | 'failure' | 'info' = 'success',
): void {
  if (!isSupabaseConfigured()) return;

  const entry: AuditLogInsert = {
    org_id: orgId,
    user_email: userEmail,
    action,
    resource: resource ?? null,
    details: details ?? null,
    status,
    device_id: getDeviceId(),
  };

  // Fire-and-forget
  (async () => {
    try {
      const sb = getSupabaseClient();
      if (!sb) return;

      const { error } = await sb
        .from('audit_logs')
        .insert(entry);

      if (error) {
        logger.error('[SupabaseAudit] Failed to write audit log:', error.message);
      }
    } catch {
      // Silently fail — audit logging must never crash the app
    }
  })();
}

/**
 * Fetch recent audit logs from Supabase for the current org.
 *
 * @param limit - Maximum number of entries to return (default 100)
 * @param action - Optional filter by action type
 */
export async function fetchAuditLogs(options?: {
  limit?: number;
  action?: string;
}): Promise<AuditLogRow[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  if (!sb) return [];

  const limit = options?.limit ?? 100;

  let query = sb
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.action) {
    query = query.eq('action', options.action);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[SupabaseAudit] fetchAuditLogs failed:', error.message);
    return [];
  }

  return (data ?? []) as AuditLogRow[];
}
