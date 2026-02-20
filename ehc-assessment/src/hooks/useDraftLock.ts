/**
 * useDraftLock — Manages the lock lifecycle for a draft being edited.
 *
 * Responsibilities:
 * 1. Acquire lock on mount (when enabled + draftId is set)
 * 2. Renew the lock every 5 minutes (server locks expire at 30 min)
 * 3. Release lock on unmount (cleanup)
 * 4. Release lock via `beforeunload` as a safety net
 * 5. Provide lock status to the UI (locked, lockedByOther, error)
 *
 * When Supabase is not configured, the hook is a no-op returning
 * `{ locked: false, lockedByOther: false }` — the app works as before.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import {
  acquireDraftLock,
  releaseDraftLock,
  getDraftLockInfo,
} from '../utils/supabaseDrafts';
import { logger } from '../utils/logger';

/** How often to renew the lock while editing. */
const LOCK_RENEWAL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface LockInfo {
  lockedBy: string;
  lockedAt: string;
  lockDeviceId: string;
}

export interface UseDraftLockOptions {
  /** The draft ID to lock. When null/undefined, the hook is inactive. */
  draftId: string | null | undefined;
  /** The current Supabase user ID (auth.uid). */
  userId: string | null;
  /** Whether locking is enabled. Typically `isSupabaseConfigured() && !!draftId`. */
  enabled: boolean;
}

export interface UseDraftLockReturn {
  /** True when we successfully hold the lock. */
  locked: boolean;
  /** True when another user holds the lock (we cannot edit). */
  lockedByOther: boolean;
  /** Error message from lock operations. */
  lockError: string | null;
  /** Info about who holds the lock (when lockedByOther is true). */
  otherLockInfo: LockInfo | null;
  /** Manually release the lock (e.g., before navigating away). */
  releaseLock: () => Promise<void>;
  /** Retry acquiring the lock after being locked out. */
  retryLock: () => Promise<void>;
}

export function useDraftLock({
  draftId,
  userId,
  enabled,
}: UseDraftLockOptions): UseDraftLockReturn {
  const [locked, setLocked] = useState(false);
  const [lockedByOther, setLockedByOther] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [otherLockInfo, setOtherLockInfo] = useState<LockInfo | null>(null);

  const renewalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isReleasingRef = useRef(false);
  const activeDraftIdRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  const configured = isSupabaseConfigured();
  const canLock = configured && enabled && !!draftId && !!userId;

  // Keep refs in sync for beforeunload callback
  activeDraftIdRef.current = draftId ?? null;
  activeUserIdRef.current = userId;

  // ── Acquire lock ──────────────────────────────────────────────────────────

  const acquireLock = useCallback(async () => {
    if (!draftId || !userId) return;

    setLockError(null);

    try {
      const acquired = await acquireDraftLock(draftId, userId);
      if (acquired) {
        setLocked(true);
        setLockedByOther(false);
        setOtherLockInfo(null);
      } else {
        // Lock held by someone else — fetch who
        setLocked(false);
        setLockedByOther(true);
        try {
          const info = await getDraftLockInfo(draftId);
          setOtherLockInfo(info);
        } catch {
          setOtherLockInfo(null);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to acquire lock';
      logger.error('[DraftLock] acquire error:', msg);
      setLockError(msg);
      // When lock acquire fails (network error), assume optimistic — don't block editing
      setLocked(false);
      setLockedByOther(false);
    }
  }, [draftId, userId]);

  // ── Release lock ──────────────────────────────────────────────────────────

  const releaseLockFn = useCallback(async () => {
    if (isReleasingRef.current) return;
    if (!draftId || !userId) return;

    isReleasingRef.current = true;
    try {
      await releaseDraftLock(draftId, userId);
    } catch (err) {
      logger.error('[DraftLock] release error:', err);
    } finally {
      isReleasingRef.current = false;
      setLocked(false);
    }
  }, [draftId, userId]);

  // ── Retry (for UI "Retry" button) ─────────────────────────────────────────

  const retryLock = useCallback(async () => {
    setLockedByOther(false);
    setOtherLockInfo(null);
    await acquireLock();
  }, [acquireLock]);

  // ── Main lifecycle: acquire → renew → release ─────────────────────────────

  useEffect(() => {
    if (!canLock) {
      // Not eligible for locking — clear state
      setLocked(false);
      setLockedByOther(false);
      setOtherLockInfo(null);
      setLockError(null);
      return;
    }

    // Acquire lock on mount
    acquireLock();

    // Start renewal timer
    renewalTimerRef.current = setInterval(() => {
      if (draftId && userId) {
        acquireDraftLock(draftId, userId).catch((err) => {
          logger.error('[DraftLock] renewal error:', err);
        });
      }
    }, LOCK_RENEWAL_INTERVAL_MS);

    // Cleanup: release lock + clear timer
    return () => {
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
      // Fire-and-forget lock release
      if (draftId && userId) {
        releaseDraftLock(draftId, userId).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLock, draftId, userId]);

  // ── beforeunload: last-resort lock release ────────────────────────────────

  useEffect(() => {
    if (!canLock) return;

    const handleBeforeUnload = () => {
      const did = activeDraftIdRef.current;
      const uid = activeUserIdRef.current;
      if (did && uid) {
        // Fire-and-forget — sendBeacon isn't available for RPC calls,
        // but we can attempt a synchronous-ish release via fetch keepalive
        try {
          // Attempt async release — won't always complete before page unloads
          releaseDraftLock(did, uid).catch(() => {});
        } catch {
          // Swallow — page is unloading
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [canLock]);

  return {
    locked,
    lockedByOther,
    lockError,
    otherLockInfo,
    releaseLock: releaseLockFn,
    retryLock,
  };
}
