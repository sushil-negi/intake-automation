import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDraftLock } from '../hooks/useDraftLock';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getDeviceId: vi.fn(() => 'device-test-123'),
}));

const mockAcquire = vi.fn<(draftId: string, userId: string) => Promise<boolean>>();
const mockRelease = vi.fn<(draftId: string, userId: string) => Promise<void>>();
const mockGetInfo = vi.fn<(draftId: string) => Promise<{ lockedBy: string; lockedAt: string; lockDeviceId: string } | null>>();

vi.mock('../utils/supabaseDrafts', () => ({
  acquireDraftLock: (...args: [string, string]) => mockAcquire(...args),
  releaseDraftLock: (...args: [string, string]) => mockRelease(...args),
  getDraftLockInfo: (...args: [string]) => mockGetInfo(...args),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

const { isSupabaseConfigured } = await import('../utils/supabaseClient');

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useDraftLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcquire.mockResolvedValue(true);
    mockRelease.mockResolvedValue(undefined);
    mockGetInfo.mockResolvedValue(null);
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Disabled / no-op cases ──────────────────────────────────────────────

  it('returns idle state when disabled', () => {
    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: false }),
    );
    expect(result.current.locked).toBe(false);
    expect(result.current.lockedByOther).toBe(false);
    expect(result.current.lockError).toBeNull();
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('returns idle state when Supabase is not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );
    expect(result.current.locked).toBe(false);
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('returns idle state when draftId is null', () => {
    const { result } = renderHook(() =>
      useDraftLock({ draftId: null, userId: 'user-1', enabled: true }),
    );
    expect(result.current.locked).toBe(false);
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('returns idle state when userId is null', () => {
    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: null, enabled: true }),
    );
    expect(result.current.locked).toBe(false);
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  // ── Successful lock acquisition ─────────────────────────────────────────

  it('acquires lock on mount and sets locked=true', async () => {
    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.locked).toBe(true));
    expect(mockAcquire).toHaveBeenCalledWith('draft-1', 'user-1');
    expect(result.current.lockedByOther).toBe(false);
    expect(result.current.otherLockInfo).toBeNull();
  });

  // ── Lock held by another user ───────────────────────────────────────────

  it('sets lockedByOther when acquire returns false', async () => {
    mockAcquire.mockResolvedValue(false);
    mockGetInfo.mockResolvedValue({
      lockedBy: 'other-user',
      lockedAt: '2025-01-01T00:00:00Z',
      lockDeviceId: 'device-other-456',
    });

    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.lockedByOther).toBe(true));
    expect(result.current.locked).toBe(false);
    expect(result.current.otherLockInfo).toEqual({
      lockedBy: 'other-user',
      lockedAt: '2025-01-01T00:00:00Z',
      lockDeviceId: 'device-other-456',
    });
    expect(mockGetInfo).toHaveBeenCalledWith('draft-1');
  });

  it('sets otherLockInfo to null when getDraftLockInfo fails', async () => {
    mockAcquire.mockResolvedValue(false);
    mockGetInfo.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.lockedByOther).toBe(true));
    expect(result.current.otherLockInfo).toBeNull();
  });

  // ── Lock acquire errors ─────────────────────────────────────────────────

  it('sets lockError when acquire throws', async () => {
    mockAcquire.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.lockError).toBe('Network error'));
    expect(result.current.locked).toBe(false);
    // On error, we don't block the user
    expect(result.current.lockedByOther).toBe(false);
  });

  // ── Lock release on unmount ─────────────────────────────────────────────

  it('releases lock on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.locked).toBe(true));

    unmount();

    // releaseDraftLock should be called on cleanup
    expect(mockRelease).toHaveBeenCalledWith('draft-1', 'user-1');
  });

  // ── Manual release ──────────────────────────────────────────────────────

  it('releaseLock() manually releases the lock', async () => {
    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.locked).toBe(true));

    await act(async () => {
      await result.current.releaseLock();
    });

    expect(mockRelease).toHaveBeenCalledWith('draft-1', 'user-1');
    expect(result.current.locked).toBe(false);
  });

  // ── Retry lock ──────────────────────────────────────────────────────────

  it('retryLock() re-acquires lock after being locked out', async () => {
    // First attempt: blocked
    mockAcquire.mockResolvedValueOnce(false);
    mockGetInfo.mockResolvedValue({
      lockedBy: 'other-user',
      lockedAt: '2025-01-01T00:00:00Z',
      lockDeviceId: 'device-other',
    });

    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.lockedByOther).toBe(true));

    // Second attempt: succeeds (other user left)
    mockAcquire.mockResolvedValueOnce(true);

    await act(async () => {
      await result.current.retryLock();
    });

    expect(result.current.locked).toBe(true);
    expect(result.current.lockedByOther).toBe(false);
  });

  // ── Lock renewal ────────────────────────────────────────────────────────

  it('renews lock every 5 minutes via setInterval', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    // Initial acquire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.locked).toBe(true);
    expect(mockAcquire).toHaveBeenCalledTimes(1);

    // Advance to first renewal (5 min)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(mockAcquire).toHaveBeenCalledTimes(2);

    // Advance to second renewal (another 5 min)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(mockAcquire).toHaveBeenCalledTimes(3);
  });

  // ── Clears state when dependencies change ─────────────────────────────

  it('clears lock state when draftId changes to null', async () => {
    const { result, rerender } = renderHook(
      ({ draftId }) => useDraftLock({ draftId, userId: 'user-1', enabled: true }),
      { initialProps: { draftId: 'draft-1' as string | null } },
    );

    await waitFor(() => expect(result.current.locked).toBe(true));

    rerender({ draftId: null });

    expect(result.current.locked).toBe(false);
    expect(result.current.lockedByOther).toBe(false);
  });

  // ── beforeunload handler ──────────────────────────────────────────────

  it('registers and cleans up beforeunload handler', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() =>
      useDraftLock({ draftId: 'draft-1', userId: 'user-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.locked).toBe(true));

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
