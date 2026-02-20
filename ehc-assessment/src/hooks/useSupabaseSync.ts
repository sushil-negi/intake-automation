/**
 * useSupabaseSync — Background sync between IndexedDB and Supabase.
 *
 * Responsibilities:
 * 1. Push local draft changes to Supabase (3s debounce after last edit)
 * 2. Drain the offline sync queue when coming back online
 * 3. Flush pending changes on `visibilitychange` (tab hidden)
 * 4. Provide sync status to the UI (syncing, synced, error, offline)
 *
 * This hook does NOT handle real-time subscriptions or lock management.
 * Those are in separate hooks (useSupabaseDrafts, useDraftLock) — Phase 3.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { upsertRemoteDraft, deleteRemoteDraft } from '../utils/supabaseDrafts';
import {
  getSupabaseSyncQueue,
  removeFromSupabaseSyncQueue,
  addToSupabaseSyncQueue,
  getDraft,
} from '../utils/db';
import type { DraftRecord, DraftType } from '../utils/db';
import type { DraftRow } from '../types/supabase';
import { logger } from '../utils/logger';

const REMOTE_SYNC_DEBOUNCE_MS = 3000;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'conflict';

export interface UseSupabaseSyncOptions {
  /** Supabase user ID (auth.uid) — required for writes. */
  userId: string | null;
  /** Organisation ID — required for inserts. */
  orgId: string | null;
  /** Whether the user is online. */
  online?: boolean;
}

export interface UseSupabaseSyncReturn {
  /** Current sync status. */
  status: SyncStatus;
  /** Timestamp of last successful sync. */
  lastSynced: Date | null;
  /** Error message from last failed sync attempt. */
  lastError: string | null;
  /**
   * Schedule a draft for background sync to Supabase.
   * Debounced — only the last call within 3s actually fires.
   */
  scheduleDraftSync: (draft: DraftRecord) => void;
  /**
   * Schedule a draft deletion for sync to Supabase.
   */
  scheduleDraftDelete: (draftId: string) => void;
  /**
   * Immediately flush all pending syncs (e.g., before navigation).
   * Returns the number of items synced.
   */
  flushSync: () => Promise<number>;
  /**
   * Drain the offline queue — called when coming back online.
   */
  drainOfflineQueue: () => Promise<void>;
}

export function useSupabaseSync({
  userId,
  orgId,
  online = true,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>(online ? 'idle' : 'offline');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftRef = useRef<DraftRecord | null>(null);
  const isSyncingRef = useRef(false);

  const configured = isSupabaseConfigured();
  const canSync = configured && !!userId && !!orgId && online;

  // Update status when online state changes
  useEffect(() => {
    if (!online) {
      setStatus('offline');
    } else if (status === 'offline') {
      setStatus('idle');
    }
  }, [online, status]);

  // ── Core sync function ────────────────────────────────────────────────────

  const syncDraft = useCallback(async (draft: DraftRecord): Promise<DraftRow | null> => {
    if (!canSync || !userId || !orgId) return null;
    if (isSyncingRef.current) return null;

    isSyncingRef.current = true;
    setStatus('syncing');
    setLastError(null);

    try {
      const result = await upsertRemoteDraft(draft, orgId, userId);
      if (result) {
        setStatus('synced');
        setLastSynced(new Date());
        return result;
      } else {
        // Could be a version conflict or other issue
        setStatus('conflict');
        setLastError('Sync conflict — remote version changed');
        return null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      logger.error('[SupabaseSync] syncDraft error:', msg);
      setStatus('error');
      setLastError(msg);
      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, [canSync, userId, orgId]);

  // ── Debounced schedule ────────────────────────────────────────────────────

  const scheduleDraftSync = useCallback((draft: DraftRecord) => {
    if (!configured) return;

    pendingDraftRef.current = draft;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!canSync) {
      // Queue for offline sync
      addToSupabaseSyncQueue({
        id: `sync-${draft.id}-${Date.now()}`,
        draftId: draft.id,
        action: 'upsert',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      return;
    }

    timerRef.current = setTimeout(async () => {
      const draftToSync = pendingDraftRef.current;
      if (!draftToSync) return;
      pendingDraftRef.current = null;

      await syncDraft(draftToSync);
    }, REMOTE_SYNC_DEBOUNCE_MS);
  }, [configured, canSync, syncDraft]);

  // ── Schedule deletion ─────────────────────────────────────────────────────

  const scheduleDraftDelete = useCallback((draftId: string) => {
    if (!configured) return;

    if (!canSync) {
      // Queue for offline sync
      addToSupabaseSyncQueue({
        id: `delete-${draftId}-${Date.now()}`,
        draftId,
        action: 'delete',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      return;
    }

    // Delete immediately — no debounce needed for deletes
    (async () => {
      setStatus('syncing');
      try {
        await deleteRemoteDraft(draftId);
        setStatus('synced');
        setLastSynced(new Date());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Delete sync failed';
        logger.error('[SupabaseSync] scheduleDraftDelete error:', msg);
        setStatus('error');
        setLastError(msg);
      }
    })();
  }, [configured, canSync]);

  // ── Flush (immediate sync) ────────────────────────────────────────────────

  const flushSync = useCallback(async (): Promise<number> => {
    if (!canSync || !userId || !orgId) return 0;

    // Cancel pending debounced sync
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    let count = 0;

    // Sync the pending draft if any
    const pending = pendingDraftRef.current;
    if (pending) {
      pendingDraftRef.current = null;
      const result = await syncDraft(pending);
      if (result) count++;
    }

    // Also drain the offline queue
    await drainOfflineQueueInternal();

    return count;
  }, [canSync, userId, orgId, syncDraft]);

  // ── Offline queue drain ───────────────────────────────────────────────────

  const drainOfflineQueueInternal = useCallback(async () => {
    if (!canSync || !userId || !orgId) return;

    try {
      const queue = await getSupabaseSyncQueue();
      if (queue.length === 0) return;

      logger.log(`[SupabaseSync] Draining offline queue: ${queue.length} items`);

      for (const item of queue) {
        try {
          if (item.action === 'upsert') {
            const draft = await getDraft(item.draftId);
            if (draft) {
              await upsertRemoteDraft(draft, orgId, userId);
            }
          } else if (item.action === 'delete') {
            await deleteRemoteDraft(item.draftId);
          }
          await removeFromSupabaseSyncQueue(item.id);
        } catch (err) {
          logger.error(`[SupabaseSync] Failed to drain item ${item.id}:`, err);
          // Leave it in the queue for next attempt
        }
      }
    } catch (err) {
      logger.error('[SupabaseSync] drainOfflineQueue error:', err);
    }
  }, [canSync, userId, orgId]);

  const drainOfflineQueue = useCallback(async () => {
    await drainOfflineQueueInternal();
  }, [drainOfflineQueueInternal]);

  // ── Drain queue when coming back online ───────────────────────────────────

  useEffect(() => {
    if (canSync) {
      drainOfflineQueueInternal();
    }
  }, [canSync, drainOfflineQueueInternal]);

  // ── Flush on visibilitychange (tab hidden) ────────────────────────────────

  useEffect(() => {
    if (!configured) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Fire-and-forget — flush pending syncs when tab goes to background
        flushSync().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [configured, flushSync]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSynced,
    lastError,
    scheduleDraftSync,
    scheduleDraftDelete,
    flushSync,
    drainOfflineQueue,
  };
}
