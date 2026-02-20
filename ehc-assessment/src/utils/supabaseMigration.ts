/**
 * One-time migration: IndexedDB → Supabase.
 *
 * Uploads all local drafts to Supabase for the first time.
 * Skips drafts that already exist remotely (by ID match).
 * Stores a migration flag in localStorage to prevent re-running.
 */

import { getAllDrafts } from './db';
import { fetchRemoteDrafts, upsertRemoteDraft } from './supabaseDrafts';
import { isSupabaseConfigured } from './supabaseClient';
import { logger } from './logger';
import { logAudit } from './auditLog';

const MIGRATION_FLAG = 'ehc-supabase-migration-done';

/** Check if migration has already been completed on this device. */
export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true';
}

/** Mark migration as completed on this device. */
export function markMigrationDone(): void {
  localStorage.setItem(MIGRATION_FLAG, 'true');
}

/** Reset the migration flag (e.g., for re-running after data reset). */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG);
}

export interface MigrationResult {
  uploaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Migrate all local IndexedDB drafts to Supabase.
 *
 * - Fetches all local drafts from IndexedDB
 * - Fetches existing remote draft IDs to avoid duplicates
 * - Uploads each local draft that doesn't exist remotely
 * - Marks migration as done on success
 *
 * @param orgId - The user's organization ID
 * @param userId - The authenticated user's ID
 * @returns Migration result with counts
 */
export async function migrateLocalDraftsToSupabase(
  orgId: string,
  userId: string,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) {
    result.errors.push('Supabase not configured');
    return result;
  }

  try {
    // 1. Load all local drafts
    const localDrafts = await getAllDrafts();
    if (localDrafts.length === 0) {
      logger.log('[Migration] No local drafts to migrate');
      markMigrationDone();
      return result;
    }

    // 2. Fetch remote draft IDs to avoid duplicates
    const remoteDrafts = await fetchRemoteDrafts();
    const remoteIds = new Set(remoteDrafts.map(d => d.id));

    // 3. Upload each local draft that doesn't exist remotely
    for (const draft of localDrafts) {
      if (remoteIds.has(draft.id)) {
        result.skipped++;
        continue;
      }

      try {
        const uploaded = await upsertRemoteDraft(draft, orgId, userId);
        if (uploaded) {
          result.uploaded++;
        } else {
          result.failed++;
          result.errors.push(`Failed to upload draft ${draft.id}`);
        }
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Draft ${draft.id}: ${msg}`);
        logger.error(`[Migration] Failed to upload draft ${draft.id}:`, err);
      }
    }

    // 4. Mark done if no failures
    if (result.failed === 0) {
      markMigrationDone();
    }

    // 5. Audit log
    logAudit(
      'data_purge', // reusing closest existing action type
      'migration',
      `Migrated ${result.uploaded} drafts to Supabase (${result.skipped} skipped, ${result.failed} failed)`,
      result.failed === 0 ? 'success' : 'failure',
    );

    logger.log(
      `[Migration] Complete: ${result.uploaded} uploaded, ${result.skipped} skipped, ${result.failed} failed`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    logger.error('[Migration] Migration failed:', err);
  }

  return result;
}
