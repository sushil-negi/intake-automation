import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import type { DraftRow } from '../types/supabase';
import type { DraftRecord } from '../utils/db';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getDeviceId: vi.fn(() => 'device-test-123'),
}));

const mockUpsertRemoteDraft = vi.fn();
const mockDeleteRemoteDraft = vi.fn();
const mockFetchRemoteDraft = vi.fn();
const mockRowToDraftRecord = vi.fn();

vi.mock('../utils/supabaseDrafts', () => ({
  upsertRemoteDraft: (...args: unknown[]) => mockUpsertRemoteDraft(...args),
  deleteRemoteDraft: (...args: unknown[]) => mockDeleteRemoteDraft(...args),
  fetchRemoteDraft: (...args: unknown[]) => mockFetchRemoteDraft(...args),
  rowToDraftRecord: (...args: unknown[]) => mockRowToDraftRecord(...args),
}));

const mockGetSupabaseSyncQueue = vi.fn();
const mockRemoveFromSupabaseSyncQueue = vi.fn();
const mockAddToSupabaseSyncQueue = vi.fn();
const mockGetDraft = vi.fn();
const mockSaveDraft = vi.fn();

vi.mock('../utils/db', () => ({
  getSupabaseSyncQueue: () => mockGetSupabaseSyncQueue(),
  removeFromSupabaseSyncQueue: (...args: unknown[]) => mockRemoveFromSupabaseSyncQueue(...args),
  addToSupabaseSyncQueue: (...args: unknown[]) => mockAddToSupabaseSyncQueue(...args),
  getDraft: (...args: unknown[]) => mockGetDraft(...args),
  saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

const { isSupabaseConfigured } = await import('../utils/supabaseClient');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeDraft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    id: 'draft-1',
    clientName: 'Test Client',
    type: 'assessment',
    data: {} as any,
    lastModified: '2025-01-01T00:00:00Z',
    status: 'draft',
    currentStep: 0,
    remoteVersion: 1,
    ...overrides,
  };
}

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
    version: 2,
    locked_by: null,
    locked_at: null,
    lock_device_id: null,
    created_by: 'user-1',
    updated_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useSupabaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUpsertRemoteDraft.mockResolvedValue(makeDraftRow());
    mockDeleteRemoteDraft.mockResolvedValue(true);
    mockGetSupabaseSyncQueue.mockResolvedValue([]);
    mockAddToSupabaseSyncQueue.mockResolvedValue(undefined);
    mockSaveDraft.mockResolvedValue(undefined);
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Basic state ────────────────────────────────────────────────────────

  it('starts in idle status when online', () => {
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.conflictInfo).toBeNull();
    expect(result.current.lastSynced).toBeNull();
  });

  it('starts in offline status when not online', () => {
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: false }),
    );
    expect(result.current.status).toBe('offline');
  });

  // ── Successful sync ───────────────────────────────────────────────────

  it('syncs draft after debounce', async () => {
    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => {
      result.current.scheduleDraftSync(draft);
    });

    // Before debounce fires
    expect(mockUpsertRemoteDraft).not.toHaveBeenCalled();

    // After debounce (3s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mockUpsertRemoteDraft).toHaveBeenCalledWith(draft, 'org-1', 'user-1');
    expect(result.current.status).toBe('synced');
    expect(result.current.lastSynced).toBeTruthy();
  });

  // ── Conflict detection ────────────────────────────────────────────────

  it('sets conflict status when upsert returns null (version mismatch)', async () => {
    mockUpsertRemoteDraft.mockResolvedValue(null); // conflict
    mockFetchRemoteDraft.mockResolvedValue(makeDraftRow({ updated_at: '2025-01-05T00:00:00Z' }));

    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => {
      result.current.scheduleDraftSync(draft);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.status).toBe('conflict');
    expect(result.current.conflictInfo).not.toBeNull();
    expect(result.current.conflictInfo?.draftId).toBe('draft-1');
    expect(result.current.conflictInfo?.clientName).toBe('Test Client');
    expect(result.current.conflictInfo?.remoteUpdatedAt).toBe('2025-01-05T00:00:00Z');
  });

  // ── Conflict resolution: Keep Mine ────────────────────────────────────

  it('resolveConflict("keepMine") force-overwrites remote', async () => {
    // Trigger a conflict first
    mockUpsertRemoteDraft.mockResolvedValueOnce(null);
    mockFetchRemoteDraft.mockResolvedValue(makeDraftRow({ version: 5 }));

    const draft = makeDraft({ remoteVersion: 1 });
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => { result.current.scheduleDraftSync(draft); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.conflictInfo).not.toBeNull();

    // Now resolve with Keep Mine
    const resolvedRow = makeDraftRow({ version: 6 });
    mockUpsertRemoteDraft.mockResolvedValueOnce(resolvedRow);

    let resolved: DraftRecord | null = null;
    await act(async () => {
      resolved = await result.current.resolveConflict('keepMine');
    });

    expect(mockUpsertRemoteDraft).toHaveBeenLastCalledWith(
      draft, 'org-1', 'user-1', { forceOverwrite: true },
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.remoteVersion).toBe(6);
    expect(mockSaveDraft).toHaveBeenCalled();
    expect(result.current.status).toBe('synced');
    expect(result.current.conflictInfo).toBeNull();
  });

  // ── Conflict resolution: Use Theirs ───────────────────────────────────

  it('resolveConflict("useTheirs") reloads from remote', async () => {
    // Trigger a conflict first
    mockUpsertRemoteDraft.mockResolvedValueOnce(null);
    const remoteRow = makeDraftRow({
      version: 5,
      client_name: 'Remote Client',
      form_data: { remoteKey: 'remoteValue' },
    });
    mockFetchRemoteDraft.mockResolvedValue(remoteRow);

    const remoteDraftRecord: DraftRecord = {
      id: 'draft-1',
      clientName: 'Remote Client',
      type: 'assessment',
      data: { remoteKey: 'remoteValue' } as any,
      lastModified: '2025-01-02T00:00:00Z',
      status: 'draft',
      currentStep: 0,
      remoteVersion: 5,
    };
    mockRowToDraftRecord.mockResolvedValue(remoteDraftRecord);

    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => { result.current.scheduleDraftSync(draft); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.conflictInfo).not.toBeNull();

    // Now resolve with Use Theirs
    let resolved: DraftRecord | null = null;
    await act(async () => {
      resolved = await result.current.resolveConflict('useTheirs');
    });

    expect(resolved).not.toBeNull();
    expect(resolved!.clientName).toBe('Remote Client');
    expect(mockSaveDraft).toHaveBeenCalledWith(remoteDraftRecord);
    expect(result.current.status).toBe('synced');
    expect(result.current.conflictInfo).toBeNull();
  });

  // ── Dismiss conflict ──────────────────────────────────────────────────

  it('dismissConflict clears conflict state', async () => {
    mockUpsertRemoteDraft.mockResolvedValueOnce(null);
    mockFetchRemoteDraft.mockResolvedValue(makeDraftRow());

    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => { result.current.scheduleDraftSync(draft); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.conflictInfo).not.toBeNull();

    act(() => { result.current.dismissConflict(); });

    expect(result.current.conflictInfo).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  // ── Offline queue ─────────────────────────────────────────────────────

  it('queues to offline queue when not online', async () => {
    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: false }),
    );

    act(() => {
      result.current.scheduleDraftSync(draft);
    });

    expect(mockAddToSupabaseSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: 'draft-1',
        action: 'upsert',
      }),
    );
    expect(mockUpsertRemoteDraft).not.toHaveBeenCalled();
  });

  // ── Flush ─────────────────────────────────────────────────────────────

  it('flushSync immediately syncs pending draft', async () => {
    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => {
      result.current.scheduleDraftSync(draft);
    });

    // Flush before debounce
    let count = 0;
    await act(async () => {
      count = await result.current.flushSync();
    });

    expect(count).toBe(1);
    expect(mockUpsertRemoteDraft).toHaveBeenCalled();
  });

  // ── Delete sync ───────────────────────────────────────────────────────

  it('scheduleDraftDelete calls deleteRemoteDraft immediately', async () => {
    vi.useRealTimers(); // Delete uses async IIFE, not debounce — need real timers

    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => {
      result.current.scheduleDraftDelete('draft-1');
    });

    // Wait for the async IIFE to complete
    await waitFor(() => expect(mockDeleteRemoteDraft).toHaveBeenCalledWith('draft-1'));
  });

  // ── Disabled when Supabase not configured ─────────────────────────────

  it('does not sync when Supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => {
      result.current.scheduleDraftSync(draft);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockUpsertRemoteDraft).not.toHaveBeenCalled();
  });

  // ── Error handling ────────────────────────────────────────────────────

  it('sets error status when sync throws', async () => {
    mockUpsertRemoteDraft.mockRejectedValue(new Error('Network error'));

    const draft = makeDraft();
    const { result } = renderHook(() =>
      useSupabaseSync({ userId: 'user-1', orgId: 'org-1', online: true }),
    );

    act(() => { result.current.scheduleDraftSync(draft); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    expect(result.current.status).toBe('error');
    expect(result.current.lastError).toBe('Network error');
  });
});
