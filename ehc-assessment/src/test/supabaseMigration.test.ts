import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// Mock dependencies
vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(),
  getDeviceId: vi.fn(() => 'device-test'),
}));

vi.mock('../utils/supabaseDrafts', () => ({
  fetchRemoteDrafts: vi.fn(),
  upsertRemoteDraft: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
}));

import {
  isMigrationDone,
  markMigrationDone,
  resetMigrationFlag,
  migrateLocalDraftsToSupabase,
} from '../utils/supabaseMigration';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { fetchRemoteDrafts, upsertRemoteDraft } from '../utils/supabaseDrafts';
import { saveDraft } from '../utils/db';
import { INITIAL_DATA } from '../utils/initialData';
import type { DraftRecord } from '../utils/db';

const makeDraft = (id: string): DraftRecord => ({
  id,
  clientName: `Client ${id}`,
  type: 'assessment',
  data: { ...INITIAL_DATA },
  lastModified: new Date().toISOString(),
  status: 'draft',
  currentStep: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  indexedDB = new IDBFactory();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
});

describe('migration flag', () => {
  it('isMigrationDone returns false when no flag set', () => {
    expect(isMigrationDone()).toBe(false);
  });

  it('markMigrationDone sets the flag', () => {
    markMigrationDone();
    expect(isMigrationDone()).toBe(true);
  });

  it('resetMigrationFlag clears the flag', () => {
    markMigrationDone();
    expect(isMigrationDone()).toBe(true);
    resetMigrationFlag();
    expect(isMigrationDone()).toBe(false);
  });
});

describe('migrateLocalDraftsToSupabase', () => {
  it('returns error when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.errors).toContain('Supabase not configured');
    expect(result.uploaded).toBe(0);
  });

  it('marks done immediately when no local drafts exist', async () => {
    // No drafts saved to IndexedDB
    vi.mocked(fetchRemoteDrafts).mockResolvedValue([]);
    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.uploaded).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(isMigrationDone()).toBe(true);
  });

  it('uploads local drafts that do not exist remotely', async () => {
    // Save local drafts
    await saveDraft(makeDraft('local-1'));
    await saveDraft(makeDraft('local-2'));

    // No remote drafts
    vi.mocked(fetchRemoteDrafts).mockResolvedValue([]);
    vi.mocked(upsertRemoteDraft).mockResolvedValue({ id: 'x' } as never);

    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.uploaded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(upsertRemoteDraft).toHaveBeenCalledTimes(2);
    expect(isMigrationDone()).toBe(true);
  });

  it('skips drafts that already exist remotely', async () => {
    await saveDraft(makeDraft('existing-1'));
    await saveDraft(makeDraft('new-1'));

    // existing-1 already on remote
    vi.mocked(fetchRemoteDrafts).mockResolvedValue([
      { id: 'existing-1' } as never,
    ]);
    vi.mocked(upsertRemoteDraft).mockResolvedValue({ id: 'new-1' } as never);

    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(upsertRemoteDraft).toHaveBeenCalledTimes(1);
  });

  it('counts failures and does not mark done', async () => {
    await saveDraft(makeDraft('fail-1'));

    vi.mocked(fetchRemoteDrafts).mockResolvedValue([]);
    vi.mocked(upsertRemoteDraft).mockResolvedValue(null);

    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(isMigrationDone()).toBe(false);
  });

  it('handles upsert throwing an error', async () => {
    await saveDraft(makeDraft('throw-1'));

    vi.mocked(fetchRemoteDrafts).mockResolvedValue([]);
    vi.mocked(upsertRemoteDraft).mockRejectedValue(new Error('Network timeout'));

    const result = await migrateLocalDraftsToSupabase('org-1', 'user-1');
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('Network timeout');
  });
});
