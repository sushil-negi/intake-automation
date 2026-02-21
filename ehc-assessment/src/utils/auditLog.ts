import { openDB, AUDIT_LOG_STORE } from './db';
import { csvEscape } from './exportData';
import { computeHmac, verifyHmac } from './crypto';
import { logAuditRemote } from './supabaseAuditLog';

// --- Dual-write context (set by App.tsx when Supabase user is available) ---

let _supabaseOrgId: string | null = null;
let _supabaseUserEmail: string | null = null;

/**
 * Configure dual-write context for Supabase audit logs.
 * Call this from App.tsx whenever the Supabase user/org changes.
 * When set, every `logAudit()` call automatically dual-writes to Supabase.
 */
export function setAuditDualWriteContext(orgId: string | null, userEmail: string | null): void {
  _supabaseOrgId = orgId;
  _supabaseUserEmail = userEmail;
}

// --- Types ---

export type AuditAction =
  | 'login'
  | 'logout'
  | 'idle_timeout'
  | 'draft_create'
  | 'draft_update'
  | 'draft_delete'
  | 'draft_resume'
  | 'pdf_export'
  | 'csv_export'
  | 'json_export'
  | 'zip_export'
  | 'sheets_sync'
  | 'bulk_sync'
  | 'settings_change'
  | 'auth_config_change'
  | 'sheets_oauth_signin'
  | 'sheets_oauth_signout'
  | 'load_from_sheet'
  | 'import_row'
  | 'clear_all_drafts'
  | 'consent_grant'
  | 'consent_revoke'
  | 'data_purge'
  | 'email_sent'
  | 'email_failed'
  | 'assessment_submitted'
  | 'assessment_resubmitted'
  | 'contract_submitted'
  | 'contract_resubmitted'
  | 'submitted_edit'
  | 'draft_migrated'
  | 'error';

export interface AuditLogEntry {
  id?: number;
  timestamp: string;
  user: string;
  action: AuditAction;
  resource?: string;
  details?: string;
  status: 'success' | 'failure' | 'info';
  hmac?: string; // HMAC-SHA256 integrity hash
}

export interface GetAuditLogsOptions {
  limit?: number;
  action?: AuditAction;
  user?: string;
  since?: string; // ISO date string
}

// --- PHI sanitization for audit details ---

const PHI_PATTERNS: [RegExp, string][] = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]'],       // SSN
  [/(?<!\d)\(\d{3}\)\s?\d{3}-\d{4}\b/g, '[PHONE-REDACTED]'], // Phone (xxx) xxx-xxxx
  [/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE-REDACTED]'],       // Phone xxx-xxx-xxxx
  [/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[EMAIL-REDACTED]'],  // Email addresses
];

function sanitizeDetails(details: string): string {
  let sanitized = details;
  for (const [pattern, replacement] of PHI_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

/** Build the HMAC data string from an audit entry. */
function hmacData(entry: Omit<AuditLogEntry, 'id' | 'hmac'>): string {
  return `${entry.timestamp}|${entry.action}|${entry.user}|${entry.details || ''}`;
}

// --- Core Functions ---

/**
 * Log an audit event. Fire-and-forget — never throws, never blocks the caller.
 * Computes HMAC-SHA256 integrity hash for tamper-evidence.
 */
export function logAudit(
  action: AuditAction,
  resource?: string,
  details?: string,
  status: AuditLogEntry['status'] = 'success',
  user?: string,
): void {
  try {
    const entry: Omit<AuditLogEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      user: user || 'system',
      action,
      resource: resource || undefined,
      details: details ? sanitizeDetails(details) : undefined,
      status,
    };

    // Fire-and-forget — don't await
    (async () => {
      try {
        // Compute HMAC for tamper-evidence
        try {
          entry.hmac = await computeHmac(hmacData(entry));
        } catch {
          // If HMAC fails (e.g., no Web Crypto), log without it
        }
        const db = await openDB();
        const tx = db.transaction(AUDIT_LOG_STORE, 'readwrite');
        tx.objectStore(AUDIT_LOG_STORE).add(entry);
      } catch {
        // Silently fail — audit logging must never break the app
      }

      // Dual-write to Supabase (fire-and-forget)
      if (_supabaseOrgId && _supabaseUserEmail) {
        try {
          logAuditRemote(
            _supabaseOrgId,
            entry.user !== 'system' ? entry.user : _supabaseUserEmail,
            action,
            entry.resource,
            entry.details,
            entry.status,
          );
        } catch {
          // Silently fail — dual-write must never break the app
        }
      }
    })();
  } catch {
    // Silently fail
  }
}

/**
 * Log a runtime error to the audit log.
 */
export function logError(error: unknown, context?: string): void {
  try {
    const message =
      error instanceof Error
        ? `${error.message}${error.stack ? '\n' + error.stack.slice(0, 500) : ''}`
        : String(error);
    const details = context ? `[${context}] ${message}` : message;
    logAudit('error', undefined, details, 'failure');
  } catch {
    // Silently fail
  }
}

/**
 * Retrieve audit logs, newest first.
 * Supports optional filtering by action, user, and date range.
 */
export async function getAuditLogs(options?: GetAuditLogsOptions): Promise<AuditLogEntry[]> {
  const db = await openDB();
  const limit = options?.limit ?? 500;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_LOG_STORE, 'readonly');
    const store = tx.objectStore(AUDIT_LOG_STORE);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // newest first

    const results: AuditLogEntry[] = [];
    const sinceDate = options?.since ? new Date(options.since).getTime() : 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || results.length >= limit) {
        resolve(results);
        return;
      }

      const entry = cursor.value as AuditLogEntry;

      // Apply filters
      if (sinceDate && new Date(entry.timestamp).getTime() < sinceDate) {
        // Past the date range — stop (since we're iterating newest-first)
        resolve(results);
        return;
      }
      if (options?.action && entry.action !== options.action) {
        cursor.continue();
        return;
      }
      if (options?.user && entry.user !== options.user) {
        cursor.continue();
        return;
      }

      results.push(entry);
      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete audit log entries older than the specified number of days.
 */
export async function purgeOldLogs(daysToKeep: number): Promise<number> {
  const db = await openDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffISO = cutoff.toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_LOG_STORE, 'readwrite');
    const store = tx.objectStore(AUDIT_LOG_STORE);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoffISO);
    const request = index.openCursor(range);
    let deleted = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.delete();
      deleted++;
      cursor.continue();
    };

    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Verify integrity of audit log entries using HMAC.
 * Returns entries where HMAC does not match or is missing.
 */
export async function verifyAuditLogIntegrity(options?: GetAuditLogsOptions): Promise<{ valid: number; invalid: number; noHmac: number }> {
  const logs = await getAuditLogs(options);
  let valid = 0;
  let invalid = 0;
  let noHmac = 0;

  for (const entry of logs) {
    if (!entry.hmac) {
      noHmac++;
      continue;
    }
    try {
      const data = hmacData(entry);
      const ok = await verifyHmac(data, entry.hmac);
      if (ok) valid++;
      else invalid++;
    } catch {
      invalid++;
    }
  }

  return { valid, invalid, noHmac };
}

/**
 * Export the full audit log as a CSV file download.
 */
export async function exportAuditLogCSV(): Promise<void> {
  const logs = await getAuditLogs({ limit: 10000 });

  const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'Status'];
  const rows = logs.map((log) =>
    [
      csvEscape(log.timestamp),
      csvEscape(log.user),
      csvEscape(log.action),
      csvEscape(log.resource || ''),
      csvEscape(log.details || ''),
      csvEscape(log.status),
    ].join(','),
  );

  const csv = headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EHC_Audit_Log_${new Date().toLocaleDateString('en-CA')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
