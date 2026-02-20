import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseDrafts } from '../hooks/useSupabaseDrafts';
import type { DraftRow } from '../types/supabase';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(),
  getDeviceId: vi.fn(() => 'device-test-123'),
}));

const mockFetchRemoteDrafts = vi.fn<[], Promise<DraftRow[]>>();

vi.mock('../utils/supabaseDrafts', () => ({
  fetchRemoteDrafts: () => mockFetchRemoteDrafts(),
  rowToDraftRecord: vi.fn((row: DraftRow) => ({
    id: row.id,
    clientName: row.client_name,
    type: row.type,
    data: row.form_data,
    lastModified: row.updated_at,
    status: row.status,
    currentStep: row.current_step,
    remoteVersion: row.version,
  })),
}));

const mockGetAllDrafts = vi.fn();
vi.mock('../utils/db', () => ({
  getAllDrafts: () => mockGetAllDrafts(),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

// Channel mock
let channelCallbacks: Record<string, (payload: unknown) => void> = {};
let subscribeCallback: ((status: string) => void) | null = null;

const mockUnsubscribe = vi.fn();
const mockChannel = {
  on: vi.fn((_event: string, _filter: unknown, callback: (payload: unknown) => void) => {
    channelCallbacks['change'] = callback;
    return mockChannel;
  }),
  subscribe: vi.fn((cb?: (status: string) => void) => {
    subscribeCallback = cb ?? null;
    return mockChannel;
  }),
  unsubscribe: mockUnsubscribe,
};

const { isSupabaseConfigured, getSupabaseClient } = await import('../utils/supabaseClient');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeDraftRow(overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: 'draft-1',
    org_id: 'org-1',
    client_name: 'Test Client',
    type: 'assessment',
    status: 'draft',
    current_step: 0,
    linked_assessment_id: null,
    form_data: {},
    version: 1,
    locked_by: null,
    locked_at: null,
    lock_device_id: null,
    created_by: 'user-1',
    updated_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useSupabaseDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelCallbacks = {};
    subscribeCallback = null;
    mockFetchRemoteDrafts.mockResolvedValue([]);
    mockGetAllDrafts.mockResolvedValue([]);
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getSupabaseClient).mockReturnValue({
      channel: vi.fn(() => mockChannel),
    } as unknown as ReturnType<typeof getSupabaseClient>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Disabled / no-op cases ──────────────────────────────────────────────

  it('returns empty when disabled', () => {
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: false }),
    );
    expect(result.current.drafts).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockFetchRemoteDrafts).not.toHaveBeenCalled();
  });

  it('returns empty when Supabase is not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );
    expect(result.current.drafts).toEqual([]);
    expect(mockFetchRemoteDrafts).not.toHaveBeenCalled();
  });

  it('returns empty when orgId is null', () => {
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: null, enabled: true }),
    );
    expect(result.current.drafts).toEqual([]);
    expect(mockFetchRemoteDrafts).not.toHaveBeenCalled();
  });

  // ── Initial fetch ────────────────────────────────────────────────────────

  it('fetches remote drafts on mount', async () => {
    const row = makeDraftRow({ id: 'remote-1', client_name: 'Alice' });
    mockFetchRemoteDrafts.mockResolvedValue([row]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('remote-1');
    expect(result.current.drafts[0].clientName).toBe('Alice');
  });

  it('merges local drafts not in remote', async () => {
    mockFetchRemoteDrafts.mockResolvedValue([
      makeDraftRow({ id: 'remote-1', updated_at: '2025-01-01T00:00:00Z' }),
    ]);
    mockGetAllDrafts.mockResolvedValue([
      {
        id: 'local-only',
        clientName: 'Local Only',
        type: 'assessment',
        data: {},
        lastModified: '2025-01-02T00:00:00Z',
        status: 'draft',
      },
    ]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.drafts.length).toBeGreaterThan(0));
    expect(result.current.drafts).toHaveLength(2);
    const ids = result.current.drafts.map(d => d.id);
    expect(ids).toContain('remote-1');
    expect(ids).toContain('local-only');
  });

  // ── Error handling ──────────────────────────────────────────────────────

  it('sets error when fetch fails', async () => {
    mockFetchRemoteDrafts.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.error).toBe('Fetch failed'));
    expect(result.current.drafts).toEqual([]);
  });

  // ── Manual refresh ──────────────────────────────────────────────────────

  it('refresh() re-fetches drafts', async () => {
    mockFetchRemoteDrafts.mockResolvedValueOnce([]);
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchRemoteDrafts).toHaveBeenCalledTimes(1);

    // Add data for second fetch
    mockFetchRemoteDrafts.mockResolvedValueOnce([
      makeDraftRow({ id: 'new-1' }),
    ]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchRemoteDrafts).toHaveBeenCalledTimes(2);
    expect(result.current.drafts).toHaveLength(1);
  });

  // ── Realtime subscription setup ─────────────────────────────────────────

  it('subscribes to realtime channel on mount', async () => {
    const sb = getSupabaseClient()!;
    renderHook(() => useSupabaseDrafts({ orgId: 'org-1', enabled: true }));

    await waitFor(() => expect(sb.channel).toHaveBeenCalledWith('drafts-org-org-1'));
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: '*', table: 'drafts' }),
      expect.any(Function),
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('unsubscribes from realtime channel on unmount', async () => {
    const { unmount } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  // ── Realtime INSERT event ───────────────────────────────────────────────

  it('adds draft on INSERT event', async () => {
    mockFetchRemoteDrafts.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate INSERT
    const changeHandler = channelCallbacks['change'];
    expect(changeHandler).toBeDefined();

    act(() => {
      changeHandler({
        eventType: 'INSERT',
        new: makeDraftRow({ id: 'insert-1', client_name: 'New Client' }),
        old: {},
      });
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('insert-1');
  });

  it('does not duplicate on INSERT if already exists', async () => {
    const row = makeDraftRow({ id: 'existing-1' });
    mockFetchRemoteDrafts.mockResolvedValue([row]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.drafts).toHaveLength(1));

    // Simulate INSERT with same ID
    const changeHandler = channelCallbacks['change'];
    act(() => {
      changeHandler({
        eventType: 'INSERT',
        new: makeDraftRow({ id: 'existing-1' }),
        old: {},
      });
    });

    // Should still be 1
    expect(result.current.drafts).toHaveLength(1);
  });

  // ── Realtime UPDATE event ───────────────────────────────────────────────

  it('updates draft on UPDATE event', async () => {
    mockFetchRemoteDrafts.mockResolvedValue([
      makeDraftRow({ id: 'draft-1', client_name: 'Original' }),
    ]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.drafts).toHaveLength(1));
    expect(result.current.drafts[0].clientName).toBe('Original');

    // Simulate UPDATE
    const changeHandler = channelCallbacks['change'];
    act(() => {
      changeHandler({
        eventType: 'UPDATE',
        new: makeDraftRow({ id: 'draft-1', client_name: 'Updated' }),
        old: makeDraftRow({ id: 'draft-1' }),
      });
    });

    expect(result.current.drafts[0].clientName).toBe('Updated');
  });

  // ── Realtime DELETE event ───────────────────────────────────────────────

  it('removes draft on DELETE event', async () => {
    mockFetchRemoteDrafts.mockResolvedValue([
      makeDraftRow({ id: 'draft-1' }),
      makeDraftRow({ id: 'draft-2' }),
    ]);

    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(result.current.drafts).toHaveLength(2));

    // Simulate DELETE
    const changeHandler = channelCallbacks['change'];
    act(() => {
      changeHandler({
        eventType: 'DELETE',
        new: {},
        old: { id: 'draft-1' },
      });
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('draft-2');
  });

  // ── Realtime connection status ──────────────────────────────────────────

  it('sets realtimeConnected when subscription status is SUBSCRIBED', async () => {
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());

    // Simulate subscription status
    act(() => {
      subscribeCallback?.('SUBSCRIBED');
    });

    expect(result.current.realtimeConnected).toBe(true);
  });

  it('clears realtimeConnected on CHANNEL_ERROR', async () => {
    const { result } = renderHook(() =>
      useSupabaseDrafts({ orgId: 'org-1', enabled: true }),
    );

    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());

    act(() => {
      subscribeCallback?.('SUBSCRIBED');
    });
    expect(result.current.realtimeConnected).toBe(true);

    act(() => {
      subscribeCallback?.('CHANNEL_ERROR');
    });
    expect(result.current.realtimeConnected).toBe(false);
  });
});
