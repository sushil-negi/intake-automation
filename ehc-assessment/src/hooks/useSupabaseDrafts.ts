/**
 * useSupabaseDrafts — Real-time draft list via Supabase Realtime.
 *
 * Responsibilities:
 * 1. Fetch all remote drafts on mount
 * 2. Subscribe to Postgres changes (INSERT/UPDATE/DELETE) via Realtime
 * 3. Merge remote drafts with local IndexedDB drafts
 * 4. Provide a unified draft list to the dashboard / DraftManager
 *
 * When Supabase is not configured, returns empty array — caller falls
 * back to the existing IndexedDB-only draft loading.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { fetchRemoteDrafts, rowToDraftRecord } from '../utils/supabaseDrafts';
import { getAllDrafts, type DraftRecord } from '../utils/db';
import type { DraftRow } from '../types/supabase';
import { logger } from '../utils/logger';

export interface UseSupabaseDraftsOptions {
  /** The current user's org ID. Required for RLS to work. */
  orgId: string | null;
  /** Whether the hook is enabled. */
  enabled: boolean;
}

export interface UseSupabaseDraftsReturn {
  /** Merged draft list (remote + local). */
  drafts: DraftRecord[];
  /** True while initial fetch is in progress. */
  loading: boolean;
  /** Error message from fetch/subscription. */
  error: string | null;
  /** Force a full refresh of the draft list. */
  refresh: () => Promise<void>;
  /** Whether real-time is connected. */
  realtimeConnected: boolean;
}

export function useSupabaseDrafts({
  orgId,
  enabled,
}: UseSupabaseDraftsOptions): UseSupabaseDraftsReturn {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);
  const configured = isSupabaseConfigured();
  const active = configured && enabled && !!orgId;

  // ── Merge remote + local drafts ───────────────────────────────────────────

  const mergeDrafts = useCallback(async (remoteDrafts: DraftRecord[]): Promise<DraftRecord[]> => {
    try {
      const localDrafts = await getAllDrafts();
      const byId = new Map<string, DraftRecord>();

      // Add all remote drafts
      for (const rd of remoteDrafts) {
        byId.set(rd.id, rd);
      }

      // Overlay local drafts that aren't yet remote (offline-created)
      for (const ld of localDrafts) {
        if (!byId.has(ld.id)) {
          byId.set(ld.id, ld);
        }
        // If both exist, prefer the one with newer lastModified
        const existing = byId.get(ld.id);
        if (existing && ld.lastModified > existing.lastModified) {
          byId.set(ld.id, ld);
        }
      }

      return Array.from(byId.values()).sort(
        (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
      );
    } catch {
      // If IndexedDB fails, just return remote
      return remoteDrafts;
    }
  }, []);

  // ── Initial fetch ─────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!active) return;

    setLoading(true);
    setError(null);

    try {
      const rows = await fetchRemoteDrafts();
      const remoteDrafts = rows.map(rowToDraftRecord);
      const merged = await mergeDrafts(remoteDrafts);
      setDrafts(merged);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch drafts';
      logger.error('[SupabaseDrafts] refresh error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [active, mergeDrafts]);

  // ── Real-time subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!active) {
      setDrafts([]);
      setRealtimeConnected(false);
      return;
    }

    // Initial fetch
    refresh();

    // Subscribe to realtime changes
    const sb = getSupabaseClient();
    if (!sb) return;

    const channel = sb
      .channel(`drafts-org-${orgId}`)
      .on<DraftRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drafts',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDraft = rowToDraftRecord(payload.new);
            setDrafts(prev => {
              // Don't add duplicates
              if (prev.some(d => d.id === newDraft.id)) return prev;
              return [newDraft, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToDraftRecord(payload.new);
            setDrafts(prev =>
              prev.map(d => (d.id === updated.id ? updated : d)),
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setDrafts(prev => prev.filter(d => d.id !== deletedId));
            }
          }
        },
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          logger.error('[SupabaseDrafts] Realtime channel error');
        }
      });

    channelRef.current = channel;

    // Cleanup: unsubscribe
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setRealtimeConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, orgId]);

  return {
    drafts,
    loading,
    error,
    refresh,
    realtimeConnected,
  };
}
