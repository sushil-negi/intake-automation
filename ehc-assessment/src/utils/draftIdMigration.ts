/**
 * One-time migration: re-ID drafts with old `draft-xxx` format IDs to proper UUIDs.
 *
 * Old IDs (e.g. "draft-1771082816216") can't sync to Supabase because the
 * `drafts.id` column is UUID type. This migration assigns new UUIDs and resets
 * submitted drafts back to "draft" status so they can be re-submitted cleanly.
 *
 * Also deduplicates drafts that share the same clientName + type (caused by
 * a prior version of this migration that raced with Dashboard auto-rescue).
 *
 * Follows the same one-time-flag pattern as supabaseMigration.ts.
 */

import { getAllDrafts, saveDraft, deleteDraft, getDraft } from './db';
import { logAudit } from './auditLog';
import { logger } from './logger';

const MIGRATION_FLAG = 'ehc-draft-uuid-migration-v2';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COMPANION_KEYS: Record<string, string> = {
  assessment: 'ehc-assessment-draft-id',
  serviceContract: 'ehc-service-contract-draft-id',
};

/**
 * Migrate all non-UUID draft IDs to proper UUIDs, then deduplicate.
 *
 * MUST be awaited before rendering Dashboard — otherwise the Dashboard
 * auto-rescue and `getAllDrafts()` calls race with the migration.
 *
 * Runs once per device — subsequent calls return immediately.
 */
export async function migrateNonUuidDraftIds(): Promise<{ migrated: number; deduped: number }> {
  if (localStorage.getItem(MIGRATION_FLAG)) return { migrated: 0, deduped: 0 };

  try {
    const allDrafts = await getAllDrafts();
    let migrated = 0;

    // ── Phase 1: Re-ID non-UUID drafts ──────────────────────────────────
    for (const draft of allDrafts) {
      if (UUID_RE.test(draft.id)) continue; // already valid UUID

      const newId = crypto.randomUUID();
      const newDraft = { ...draft, id: newId };

      // Reset submitted → draft so user can re-submit cleanly to Supabase
      if (newDraft.status === 'submitted') {
        newDraft.status = 'draft';
        newDraft.version = undefined;
      }

      // Save new record first (prevents data loss if delete fails)
      await saveDraft(newDraft);
      await deleteDraft(draft.id);

      // Verify the old record is actually gone
      const ghost = await getDraft(draft.id);
      if (ghost) {
        logger.warn(`[DraftIdMigration] Old record ${draft.id} persisted after delete — retrying`);
        await deleteDraft(draft.id);
      }

      // Update companion localStorage key if it references the old ID
      const companionKey = COMPANION_KEYS[draft.type];
      if (companionKey && localStorage.getItem(companionKey) === draft.id) {
        localStorage.setItem(companionKey, newId);
      }

      logAudit('draft_migrated', newId, `${draft.clientName} — migrated from ${draft.id}`);
      migrated++;
    }

    // ── Phase 2: Deduplicate ────────────────────────────────────────────
    // Group by (clientName + type) and keep only the newest record per group.
    const freshDrafts = await getAllDrafts();
    const groups = new Map<string, typeof freshDrafts>();
    for (const d of freshDrafts) {
      const key = `${d.type}::${d.clientName}`;
      const list = groups.get(key) ?? [];
      list.push(d);
      groups.set(key, list);
    }

    let deduped = 0;
    for (const [, dupes] of groups) {
      if (dupes.length <= 1) continue;
      // Sort newest first — keep the first, delete the rest
      dupes.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      for (let i = 1; i < dupes.length; i++) {
        await deleteDraft(dupes[i].id);
        logger.log(`[DraftIdMigration] Deduped ${dupes[i].clientName} (removed ${dupes[i].id})`);
        deduped++;
      }
    }

    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());

    if (migrated > 0 || deduped > 0) {
      logger.log(`[DraftIdMigration] Migrated ${migrated} draft(s), deduped ${deduped}`);
    }

    return { migrated, deduped };
  } catch (err) {
    logger.error('[DraftIdMigration] Migration failed:', err);
    // Don't set the flag — retry next load
    return { migrated: 0, deduped: 0 };
  }
}
