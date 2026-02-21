/**
 * Tests for the useAdminApi hook.
 *
 * Verifies request construction, auth header, error handling,
 * and convenience method wrappers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase client
const mockGetSession = vi.fn();
vi.mock('../utils/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { useAdminApi } from '../hooks/useAdminApi';

// Helper: mock a successful session
function mockSession(token = 'test-jwt-token') {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: token } },
  });
}

// Helper: mock fetch response
function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  });
}

describe('useAdminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
  });

  describe('callAdmin', () => {
    it('sends POST with correct headers and body', async () => {
      mockFetch({ ok: true, data: [] });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.callAdmin({ action: 'listOrgs' });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-token',
        },
        body: JSON.stringify({ action: 'listOrgs' }),
      });
    });

    it('returns success response with typed data', async () => {
      const orgs = [{ id: '1', name: 'Test Org', slug: 'test-org', is_active: true, created_at: '2025-01-01', user_count: 3 }];
      mockFetch({ ok: true, data: orgs });

      const { result } = renderHook(() => useAdminApi());

      let response: unknown;
      await act(async () => {
        response = await result.current.callAdmin({ action: 'listOrgs' });
      });

      expect(response).toEqual({ ok: true, data: orgs });
      expect(result.current.error).toBeNull();
    });

    it('sets error on API error response', async () => {
      mockFetch({ ok: false, error: 'Not authorized' }, 403);

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.callAdmin({ action: 'listOrgs' });
      });

      expect(result.current.error).toBe('Not authorized');
    });

    it('sets error when session is missing', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.callAdmin({ action: 'listOrgs' });
      });

      expect(result.current.error).toBe('Not authenticated');
    });

    it('manages loading state correctly', async () => {
      mockFetch({ ok: true, data: [] });

      const { result } = renderHook(() => useAdminApi());

      expect(result.current.loading).toBe(false);

      const promise = act(async () => {
        await result.current.callAdmin({ action: 'listOrgs' });
      });

      // After resolution, loading should be false
      await promise;
      expect(result.current.loading).toBe(false);
    });

    it('clearError clears the error state', async () => {
      mockFetch({ ok: false, error: 'Some error' });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.callAdmin({ action: 'listOrgs' });
      });
      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('convenience methods', () => {
    it('listOrgs returns array on success', async () => {
      const orgs = [{ id: '1', name: 'Org A', slug: 'org-a', is_active: true, created_at: '2025-01-01', user_count: 5 }];
      mockFetch({ ok: true, data: orgs });

      const { result } = renderHook(() => useAdminApi());

      let data: unknown;
      await act(async () => {
        data = await result.current.listOrgs();
      });

      expect(data).toEqual(orgs);
    });

    it('listOrgs returns empty array on error', async () => {
      mockFetch({ ok: false, error: 'DB error' });

      const { result } = renderHook(() => useAdminApi());

      let data: unknown;
      await act(async () => {
        data = await result.current.listOrgs();
      });

      expect(data).toEqual([]);
    });

    it('createOrg sends name and slug', async () => {
      const newOrg = { id: '2', name: 'New Org', slug: 'new-org', is_active: true, created_at: '2025-06-01', user_count: 0 };
      mockFetch({ ok: true, data: newOrg });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.createOrg('New Org', 'new-org');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({ action: 'createOrg', name: 'New Org', slug: 'new-org' }),
      }));
    });

    it('createOrg throws on error response', async () => {
      mockFetch({ ok: false, error: 'Slug already taken' });

      const { result } = renderHook(() => useAdminApi());

      await expect(act(async () => {
        await result.current.createOrg('Dup Org', 'dup-org');
      })).rejects.toThrow('Slug already taken');
    });

    it('inviteUser sends email, orgId, role, and optional fullName', async () => {
      const user = { id: 'u1', email: 'test@test.com', full_name: 'Test User', avatar_url: '', org_id: 'org1', role: 'staff', created_at: '', updated_at: '' };
      mockFetch({ ok: true, data: user });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.inviteUser('test@test.com', 'org1', 'staff', 'Test User');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({
          action: 'inviteUser',
          email: 'test@test.com',
          orgId: 'org1',
          role: 'staff',
          fullName: 'Test User',
        }),
      }));
    });

    it('suspendOrg sends orgId and suspend boolean', async () => {
      mockFetch({ ok: true, data: null });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.suspendOrg('org1', true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({ action: 'suspendOrg', orgId: 'org1', suspend: true }),
      }));
    });

    it('removeUser sends userId', async () => {
      mockFetch({ ok: true, data: null });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.removeUser('u1');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({ action: 'removeUser', userId: 'u1' }),
      }));
    });

    it('listUsers passes optional orgId', async () => {
      mockFetch({ ok: true, data: [] });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.listUsers('org1');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({ action: 'listUsers', orgId: 'org1' }),
      }));
    });

    it('listUsers omits orgId when not provided', async () => {
      mockFetch({ ok: true, data: [] });

      const { result } = renderHook(() => useAdminApi());

      await act(async () => {
        await result.current.listUsers();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({
        body: JSON.stringify({ action: 'listUsers' }),
      }));
    });
  });
});
