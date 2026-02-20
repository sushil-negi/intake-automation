/**
 * Tests for the useSupabaseAuth hook.
 *
 * Covers: configured guard, session lifecycle, profile fetch,
 * org name/slug fetch chain, super admin detection, sign in/out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mock Supabase Client ─────────────────────────────────────────────────────

let mockConfigured = true;

const mockGetSession = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockAuthSignOut = vi.fn();
const mockSubscriptionUnsubscribe = vi.fn();
let authStateChangeCallback: ((_event: string, session: unknown) => void) | null = null;

const mockFrom = vi.fn();
const mockOnAuthStateChange = vi.fn().mockImplementation((callback: (event: string, session: unknown) => void) => {
  authStateChangeCallback = callback;
  return { data: { subscription: { unsubscribe: mockSubscriptionUnsubscribe } } };
});

vi.mock('../utils/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockAuthSignOut,
    },
    from: mockFrom,
  })),
  isSupabaseConfigured: vi.fn(() => mockConfigured),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-123',
  email: 'admin@ehc.com',
  user_metadata: {
    full_name: 'Admin User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

const MOCK_SESSION = {
  access_token: 'mock-jwt-token',
  user: MOCK_USER,
};

const MOCK_PROFILE = {
  id: 'user-123',
  email: 'admin@ehc.com',
  full_name: 'Admin User',
  avatar_url: 'https://example.com/avatar.jpg',
  org_id: 'org-456',
  role: 'admin',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

function setupDefaultMocks() {
  mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION }, error: null });
  mockAuthSignOut.mockResolvedValue({ error: null });
  mockSignInWithOAuth.mockResolvedValue({ error: null });

  // Mock profiles table query
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
  };

  // Mock organizations table query
  const orgQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'EHC Chester', slug: 'ehc-chester' }, error: null }),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileQuery;
    if (table === 'organizations') return orgQuery;
    return profileQuery;
  });
}

describe('useSupabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured = true;
    authStateChangeCallback = null;
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Configured Guard ───────────────────────────────────────────────────────

  describe('configured guard', () => {
    it('returns null user when Supabase not configured', () => {
      mockConfigured = false;
      const { result } = renderHook(() => useSupabaseAuth());

      expect(result.current.supabaseUser).toBeNull();
      expect(result.current.configured).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('does not call getSession when not configured', () => {
      mockConfigured = false;
      renderHook(() => useSupabaseAuth());

      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it('returns configured=true when Supabase is configured', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      expect(result.current.configured).toBe(true);
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  // ── Session Lifecycle ──────────────────────────────────────────────────────

  describe('session lifecycle', () => {
    it('starts with loading=true when configured', () => {
      const { result } = renderHook(() => useSupabaseAuth());
      // Loading starts as true when configured
      expect(result.current.loading).toBe(true);
    });

    it('fetches session on mount and maps user', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.supabaseUser).not.toBeNull();
      });

      expect(result.current.supabaseUser!.email).toBe('admin@ehc.com');
      expect(result.current.supabaseUser!.name).toBe('Admin User');
      expect(result.current.supabaseUser!.picture).toBe('https://example.com/avatar.jpg');
      expect(result.current.userId).toBe('user-123');
    });

    it('subscribes to auth state changes', async () => {
      renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      });
    });

    it('unsubscribes on unmount', async () => {
      const { unmount } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();
      expect(mockSubscriptionUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('updates session when auth state changes (login)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.supabaseUser).toBeNull();
      });

      // Simulate login event
      await act(async () => {
        authStateChangeCallback?.('SIGNED_IN', MOCK_SESSION);
      });

      await waitFor(() => {
        expect(result.current.supabaseUser).not.toBeNull();
        expect(result.current.supabaseUser!.email).toBe('admin@ehc.com');
      });
    });

    it('clears session when auth state changes (logout)', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.supabaseUser).not.toBeNull();
      });

      // Simulate logout event
      await act(async () => {
        authStateChangeCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.supabaseUser).toBeNull();
        expect(result.current.userId).toBeNull();
      });
    });

    it('returns null user when getSession returns null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.supabaseUser).toBeNull();
      expect(result.current.userId).toBeNull();
    });
  });

  // ── Profile Fetch ──────────────────────────────────────────────────────────

  describe('profile fetch', () => {
    it('fetches profile when session user exists', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.profile!.role).toBe('admin');
      expect(result.current.orgId).toBe('org-456');
    });

    it('clears profile when session is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.orgId).toBeNull();
    });

    it('handles profile fetch error gracefully', async () => {
      const profileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      mockFrom.mockReturnValue(profileQuery);

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.orgId).toBeNull();
    });
  });

  // ── Org Name/Slug Chain ────────────────────────────────────────────────────

  describe('org name/slug fetch', () => {
    it('fetches org name and slug when profile has org_id', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.orgName).toBe('EHC Chester');
        expect(result.current.orgSlug).toBe('ehc-chester');
      });
    });

    it('sets orgName/orgSlug to null when profile has no org_id', async () => {
      const profileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...MOCK_PROFILE, org_id: null },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(profileQuery);

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.orgName).toBeNull();
      expect(result.current.orgSlug).toBeNull();
    });
  });

  // ── Super Admin Detection ──────────────────────────────────────────────────

  describe('super admin detection', () => {
    it('isSuperAdmin is true when role is super_admin', async () => {
      const profileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...MOCK_PROFILE, role: 'super_admin' },
          error: null,
        }),
      };
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'X', slug: 'x' }, error: null }),
          };
        }
        return profileQuery;
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isSuperAdmin).toBe(true);
      });
    });

    it('isSuperAdmin is false when role is admin', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.isSuperAdmin).toBe(false);
    });

    it('isSuperAdmin is false when profile is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(false);
    });
  });

  // ── Sign Out ───────────────────────────────────────────────────────────────

  describe('sign out', () => {
    it('calls supabase auth.signOut', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.supabaseUser).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    });

    it('clears session and profile after sign out', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.supabaseUser).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.supabaseUser).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });
});
