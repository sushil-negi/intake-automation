/**
 * Hook for calling the super-admin API (/api/admin).
 *
 * Sends the current Supabase JWT as Bearer token.
 * Only usable by super_admin users.
 */

import { useCallback, useState } from 'react';
import { getSupabaseClient } from '../utils/supabaseClient';
import type {
  AdminRequest,
  AdminResponse,
  OrgSummary,
  UserProfile,
} from '../types/admin';

export interface UseAdminApiReturn {
  /** Execute an admin API action. Returns typed response or throws. */
  callAdmin: <T = unknown>(request: AdminRequest) => Promise<AdminResponse<T>>;
  /** True while an API call is in flight. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Clear the error state. */
  clearError: () => void;

  // ── Convenience methods ────────────────────────────────────────────────
  listOrgs: () => Promise<OrgSummary[]>;
  createOrg: (name: string, slug: string) => Promise<OrgSummary>;
  suspendOrg: (orgId: string, suspend: boolean) => Promise<void>;
  listUsers: (orgId?: string) => Promise<UserProfile[]>;
  inviteUser: (email: string, orgId: string, role: 'admin' | 'staff', fullName?: string) => Promise<UserProfile>;
  removeUser: (userId: string) => Promise<void>;
}

export function useAdminApi(): UseAdminApiReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const callAdmin = useCallback(async <T = unknown>(
    request: AdminRequest,
  ): Promise<AdminResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      // Get current Supabase session JWT
      const sb = getSupabaseClient();
      if (!sb) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json() as AdminResponse<T>;

      if (!result.ok) {
        const msg = (result as { error?: string }).error || `Request failed (${response.status})`;
        setError(msg);
        return result;
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Admin API request failed';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Convenience wrappers ───────────────────────────────────────────────

  const listOrgs = useCallback(async (): Promise<OrgSummary[]> => {
    const res = await callAdmin<OrgSummary[]>({ action: 'listOrgs' });
    return res.ok ? res.data : [];
  }, [callAdmin]);

  const createOrg = useCallback(async (name: string, slug: string): Promise<OrgSummary> => {
    const res = await callAdmin<OrgSummary>({ action: 'createOrg', name, slug });
    if (!res.ok) throw new Error((res as { error?: string }).error || 'Failed to create org');
    return res.data;
  }, [callAdmin]);

  const suspendOrg = useCallback(async (orgId: string, suspend: boolean): Promise<void> => {
    const res = await callAdmin({ action: 'suspendOrg', orgId, suspend });
    if (!res.ok) throw new Error((res as { error?: string }).error || 'Failed to update org');
  }, [callAdmin]);

  const listUsers = useCallback(async (orgId?: string): Promise<UserProfile[]> => {
    const res = await callAdmin<UserProfile[]>({ action: 'listUsers', ...(orgId ? { orgId } : {}) });
    return res.ok ? res.data : [];
  }, [callAdmin]);

  const inviteUser = useCallback(async (
    email: string, orgId: string, role: 'admin' | 'staff', fullName?: string,
  ): Promise<UserProfile> => {
    const res = await callAdmin<UserProfile>({ action: 'inviteUser', email, orgId, role, fullName });
    if (!res.ok) throw new Error((res as { error?: string }).error || 'Failed to invite user');
    return res.data;
  }, [callAdmin]);

  const removeUser = useCallback(async (userId: string): Promise<void> => {
    const res = await callAdmin({ action: 'removeUser', userId });
    if (!res.ok) throw new Error((res as { error?: string }).error || 'Failed to remove user');
  }, [callAdmin]);

  return {
    callAdmin,
    loading,
    error,
    clearError,
    listOrgs,
    createOrg,
    suspendOrg,
    listUsers,
    inviteUser,
    removeUser,
  };
}
