import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DraftRecord } from '../utils/db';
import { INITIAL_DATA } from '../utils/initialData';

// ── Mock setup ───────────────────────────────────────────────────────────────
// Supabase client uses a fluent chain: from().select().eq().order()...
// The LAST call in each chain must return a promise-like { data, error }.
// We use `mockReturnValue` on a `resolveWith` holder to control the terminal result.

let terminalResult: { data: unknown; error: unknown } = { data: null, error: null };
const mockRpc = vi.fn();

function makeChain() {
  const chain: Record<string, unknown> = {};
  // Every chainable method returns the same chain object
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit']) {
    chain[method] = vi.fn((..._args: unknown[]) => chain);
  }
  // Terminal methods return the promise result
  chain.maybeSingle = vi.fn(() => Promise.resolve(terminalResult));
  chain.single = vi.fn(() => Promise.resolve(terminalResult));
  // Make the chain itself thenable so `await chain.order(...)` resolves
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(terminalResult).then(resolve, reject);
  return chain;
}

let currentChain = makeChain();
const mockFrom = vi.fn(() => { currentChain = makeChain(); return currentChain; });
const mockSupabaseClient = { from: mockFrom, rpc: mockRpc };

vi.mock('../utils/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  isSupabaseConfigured: vi.fn(() => true),
  getDeviceId: vi.fn(() => 'device-test-123'),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import {
  rowToDraftRecord,
  draftRecordToInsert,
  draftRecordToUpdate,
  fetchRemoteDrafts,
  fetchRemoteDraft,
  deleteRemoteDraft,
  acquireDraftLock,
  releaseDraftLock,
  getDraftLockInfo,
} from '../utils/supabaseDrafts';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import type { DraftRow } from '../types/supabase';

const makeDraftRow = (overrides: Partial<DraftRow> = {}): DraftRow => ({
  id: 'draft-123',
  org_id: 'org-1',
  client_name: 'Jane Doe',
  type: 'assessment',
  status: 'draft',
  current_step: 2,
  linked_assessment_id: null,
  form_data: { clientHelpList: { clientName: 'Jane Doe' } },
  version: 3,
  locked_by: null,
  locked_at: null,
  lock_device_id: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  ...overrides,
});

const makeDraftRecord = (overrides: Partial<DraftRecord> = {}): DraftRecord => ({
  id: 'draft-123',
  clientName: 'Jane Doe',
  type: 'assessment',
  data: { ...INITIAL_DATA, clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Jane Doe' } },
  lastModified: '2024-01-01T12:00:00Z',
  status: 'draft',
  currentStep: 2,
  remoteVersion: 3,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  terminalResult = { data: null, error: null };
  mockRpc.mockClear();
  mockFrom.mockClear();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
});

// ── Conversion helpers ───────────────────────────────────────────────────────

describe('rowToDraftRecord', () => {
  it('converts DraftRow to DraftRecord shape', () => {
    const row = makeDraftRow();
    const record = rowToDraftRecord(row);
    expect(record.id).toBe('draft-123');
    expect(record.clientName).toBe('Jane Doe');
    expect(record.type).toBe('assessment');
    expect(record.status).toBe('draft');
    expect(record.currentStep).toBe(2);
    expect(record.remoteVersion).toBe(3);
    expect(record.lastModified).toBe('2024-01-01T12:00:00Z');
    expect(record.data).toEqual({ clientHelpList: { clientName: 'Jane Doe' } });
  });

  it('maps linked_assessment_id to linkedAssessmentId', () => {
    const row = makeDraftRow({ linked_assessment_id: 'assess-456' });
    const record = rowToDraftRecord(row);
    expect(record.linkedAssessmentId).toBe('assess-456');
  });

  it('maps null linked_assessment_id to undefined', () => {
    const row = makeDraftRow({ linked_assessment_id: null });
    const record = rowToDraftRecord(row);
    expect(record.linkedAssessmentId).toBeUndefined();
  });
});

describe('draftRecordToInsert', () => {
  it('creates correct insert payload', () => {
    const record = makeDraftRecord();
    const insert = draftRecordToInsert(record, 'org-1', 'user-1');
    expect(insert.id).toBe('draft-123');
    expect(insert.org_id).toBe('org-1');
    expect(insert.client_name).toBe('Jane Doe');
    expect(insert.type).toBe('assessment');
    expect(insert.status).toBe('draft');
    expect(insert.current_step).toBe(2);
    expect(insert.created_by).toBe('user-1');
    expect(insert.updated_by).toBe('user-1');
    expect(insert.form_data).toBeDefined();
  });
});

describe('draftRecordToUpdate', () => {
  it('creates correct update payload without org_id or created_by', () => {
    const record = makeDraftRecord();
    const update = draftRecordToUpdate(record, 'user-1');
    expect(update.client_name).toBe('Jane Doe');
    expect(update.updated_by).toBe('user-1');
    expect(update.form_data).toBeDefined();
    expect((update as Record<string, unknown>).org_id).toBeUndefined();
    expect((update as Record<string, unknown>).created_by).toBeUndefined();
  });
});

// ── CRUD functions ───────────────────────────────────────────────────────────

describe('fetchRemoteDrafts', () => {
  it('returns empty array when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await fetchRemoteDrafts();
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('calls supabase.from(drafts).select(*).order(...) and returns data', async () => {
    terminalResult = { data: [makeDraftRow()], error: null };
    const result = await fetchRemoteDrafts();
    expect(mockFrom).toHaveBeenCalledWith('drafts');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('draft-123');
  });

  it('returns empty array on error', async () => {
    terminalResult = { data: null, error: { message: 'Network error' } };
    const result = await fetchRemoteDrafts();
    expect(result).toEqual([]);
  });
});

describe('fetchRemoteDraft', () => {
  it('returns null when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await fetchRemoteDraft('draft-123');
    expect(result).toBeNull();
  });

  it('fetches single draft by ID', async () => {
    const row = makeDraftRow();
    terminalResult = { data: row, error: null };
    const result = await fetchRemoteDraft('draft-123');
    expect(mockFrom).toHaveBeenCalledWith('drafts');
    expect(result).toEqual(row);
  });

  it('returns null when draft not found', async () => {
    terminalResult = { data: null, error: null };
    const result = await fetchRemoteDraft('nonexistent');
    expect(result).toBeNull();
  });
});

describe('deleteRemoteDraft', () => {
  it('returns false when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await deleteRemoteDraft('draft-123');
    expect(result).toBe(false);
  });

  it('deletes draft and returns true', async () => {
    terminalResult = { data: null, error: null };
    const result = await deleteRemoteDraft('draft-123');
    expect(mockFrom).toHaveBeenCalledWith('drafts');
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    terminalResult = { data: null, error: { message: 'RLS violation' } };
    const result = await deleteRemoteDraft('draft-123');
    expect(result).toBe(false);
  });
});

// ── Locking ──────────────────────────────────────────────────────────────────

describe('acquireDraftLock', () => {
  it('returns true when Supabase not configured (offline-only mode)', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await acquireDraftLock('draft-123', 'user-1');
    expect(result).toBe(true);
  });

  it('calls RPC acquire_draft_lock with correct params', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const result = await acquireDraftLock('draft-123', 'user-1');
    expect(mockRpc).toHaveBeenCalledWith('acquire_draft_lock', {
      p_draft_id: 'draft-123',
      p_user_id: 'user-1',
      p_device_id: 'device-test-123',
    });
    expect(result).toBe(true);
  });

  it('returns false when lock already held', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const result = await acquireDraftLock('draft-123', 'user-1');
    expect(result).toBe(false);
  });

  it('returns false on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
    const result = await acquireDraftLock('draft-123', 'user-1');
    expect(result).toBe(false);
  });
});

describe('releaseDraftLock', () => {
  it('does nothing when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    await releaseDraftLock('draft-123', 'user-1');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls RPC release_draft_lock', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await releaseDraftLock('draft-123', 'user-1');
    expect(mockRpc).toHaveBeenCalledWith('release_draft_lock', {
      p_draft_id: 'draft-123',
      p_user_id: 'user-1',
    });
  });
});

describe('getDraftLockInfo', () => {
  it('returns null when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await getDraftLockInfo('draft-123');
    expect(result).toBeNull();
  });

  it('returns null when draft is unlocked', async () => {
    terminalResult = {
      data: { locked_by: null, locked_at: null, lock_device_id: null },
      error: null,
    };
    const result = await getDraftLockInfo('draft-123');
    expect(result).toBeNull();
  });

  it('returns lock info when draft is locked', async () => {
    terminalResult = {
      data: {
        locked_by: 'user-2',
        locked_at: '2024-01-01T10:00:00Z',
        lock_device_id: 'device-other',
      },
      error: null,
    };
    const result = await getDraftLockInfo('draft-123');
    expect(result).toEqual({
      lockedBy: 'user-2',
      lockedAt: '2024-01-01T10:00:00Z',
      lockDeviceId: 'device-other',
    });
  });
});
