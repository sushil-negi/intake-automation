/**
 * Supabase authentication hook.
 *
 * Wraps `supabase.auth` and maps Supabase sessions to the existing
 * `AuthUser` shape so the rest of the app doesn't need to change.
 *
 * When Supabase is not configured (`isSupabaseConfigured() === false`),
 * every function is a no-op and `supabaseUser` stays `null`, letting
 * the existing GIS auth path remain in control.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import type { AuthUser } from '../types/auth';
import type { ProfileRow } from '../types/supabase';
import { logger } from '../utils/logger';

export interface SupabaseAuthState {
  /** Mapped to the existing AuthUser shape — null until session resolves. */
  supabaseUser: AuthUser | null;
  /** The raw Supabase user id (auth.uid). */
  userId: string | null;
  /** The user's organisation id from the `profiles` table. */
  orgId: string | null;
  /** The user's profile row. */
  profile: ProfileRow | null;
  /** True while the initial session is loading. */
  loading: boolean;
  /** True when Supabase env vars are present. */
  configured: boolean;
  /** Start the Google OAuth flow via Supabase. */
  signInWithGoogle: () => Promise<void>;
  /** Sign out of Supabase (and clear local session). */
  signOut: () => Promise<void>;
}

function mapUser(user: User): AuthUser {
  return {
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    picture: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '',
    loginTime: Date.now(),
  };
}

export function useSupabaseAuth(): SupabaseAuthState {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(configured); // only load if configured

  // Listen for Supabase auth state changes
  useEffect(() => {
    if (!configured) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    // Get initial session
    sb.auth.getSession().then(({ data, error }) => {
      if (error) logger.error('[Supabase Auth] getSession error:', error.message);
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to changes (login, logout, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  // Fetch profile when session user changes
  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) return;

    sb.from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to fetch profile:', error.message);
          setProfile(null);
        } else {
          setProfile(data as ProfileRow | null);
        }
      });
  }, [session?.user?.id]);

  const signInWithGoogle = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      logger.error('Supabase Google sign-in failed:', error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const supabaseUser = session?.user ? mapUser(session.user) : null;

  return {
    supabaseUser,
    userId: session?.user?.id ?? null,
    orgId: profile?.org_id ?? null,
    profile,
    loading,
    configured,
    signInWithGoogle,
    signOut,
  };
}
