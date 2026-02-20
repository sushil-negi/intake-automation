/**
 * Supabase client singleton.
 *
 * Public env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are safe to
 * expose — all data protection comes from Row-Level Security policies in Postgres.
 *
 * When neither var is set the helper returns `null`, which every consumer checks
 * to fall back to the existing IndexedDB-only behaviour.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient<Database> | null = null;

/** Returns the shared Supabase client, or `null` if Supabase is not configured. */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
  }

  return client;
}

/** Quick boolean check so callers can short-circuit early. */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Returns a stable device ID for this browser tab group.
 * Used by the lock mechanism to identify which device holds a lock.
 */
export function getDeviceId(): string {
  const KEY = 'ehc-device-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `device-${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
