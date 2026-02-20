import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup ───────────────────────────────────────────────────────────────

let terminalResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'eq', 'order', 'limit']) {
    chain[method] = vi.fn((..._args: unknown[]) => chain);
  }
  // Make chain thenable so `await query` resolves with terminalResult
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(terminalResult).then(resolve, reject);
  return chain;
}

let currentChain = makeChain();
const mockFrom = vi.fn(() => { currentChain = makeChain(); return currentChain; });

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(() => ({ from: mockFrom })),
  getDeviceId: vi.fn(() => 'device-test-456'),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { logAuditRemote, fetchAuditLogs } from '../utils/supabaseAuditLog';
import { isSupabaseConfigured } from '../utils/supabaseClient';

beforeEach(() => {
  vi.clearAllMocks();
  terminalResult = { data: null, error: null };
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
});

describe('logAuditRemote', () => {
  it('does nothing when Supabase not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    logAuditRemote('org-1', 'user@test.com', 'draft_create');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts an audit log entry with correct fields', async () => {
    terminalResult = { data: null, error: null };
    logAuditRemote('org-1', 'user@test.com', 'draft_create', 'draft-123', 'Created draft', 'success');

    // Fire-and-forget — wait for the async to settle
    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    });

    const insertFn = currentChain.insert as ReturnType<typeof vi.fn>;
    expect(insertFn).toHaveBeenCalledTimes(1);
    const insertArg = insertFn.mock.calls[0][0];
    expect(insertArg.org_id).toBe('org-1');
    expect(insertArg.user_email).toBe('user@test.com');
    expect(insertArg.action).toBe('draft_create');
    expect(insertArg.resource).toBe('draft-123');
    expect(insertArg.details).toBe('Created draft');
    expect(insertArg.status).toBe('success');
    expect(insertArg.device_id).toBe('device-test-456');
  });

  it('defaults status to success and nulls for optional fields', async () => {
    terminalResult = { data: null, error: null };
    logAuditRemote('org-1', 'user@test.com', 'login');

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    });

    const insertArg = (currentChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.status).toBe('success');
    expect(insertArg.resource).toBeNull();
    expect(insertArg.details).toBeNull();
  });

  it('does not throw on insert failure', () => {
    terminalResult = { data: null, error: { message: 'DB error' } };
    expect(() => logAuditRemote('org-1', 'user@test.com', 'error')).not.toThrow();
  });
});

describe('fetchAuditLogs', () => {
  it('returns empty array when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await fetchAuditLogs();
    expect(result).toEqual([]);
  });

  it('fetches logs with default limit of 100', async () => {
    const mockLogs = [{ id: 1, action: 'login' }, { id: 2, action: 'logout' }];
    terminalResult = { data: mockLogs, error: null };

    const result = await fetchAuditLogs();
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(result).toHaveLength(2);
  });

  it('filters by action when provided', async () => {
    terminalResult = { data: [], error: null };

    await fetchAuditLogs({ action: 'login', limit: 50 });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect((currentChain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('action', 'login');
  });

  it('returns empty array on error', async () => {
    terminalResult = { data: null, error: { message: 'RLS' } };
    const result = await fetchAuditLogs();
    expect(result).toEqual([]);
  });
});
