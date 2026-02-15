import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Mock dependencies before importing the hook
vi.mock('../utils/db', () => ({
  getSheetsConfig: vi.fn(),
  getDraft: vi.fn(),
}));
vi.mock('../utils/sheetsApi', () => ({
  testConnection: vi.fn(),
  syncAssessment: vi.fn(),
  syncContract: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { useSheetsSync } from '../hooks/useSheetsSync';
import { getSheetsConfig, getDraft } from '../utils/db';
import { testConnection as apiTestConnection, syncAssessment, syncContract } from '../utils/sheetsApi';
import type { SheetsConfig } from '../types/sheetsConfig';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import type { DraftRecord } from '../utils/db';

const mockConfig: SheetsConfig = {
  ...DEFAULT_SHEETS_CONFIG,
  authMethod: 'oauth',
  oauthAccessToken: 'ya29.test-token',
  spreadsheetId: 'sheet-123',
};

function makeDraft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    id: 'draft-1',
    clientName: 'Test Client',
    type: 'assessment',
    data: { clientHelpList: { clientName: 'Test' } } as unknown as DraftRecord['data'],
    lastModified: new Date().toISOString(),
    status: 'draft',
    ...overrides,
  };
}

describe('useSheetsSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSheetsConfig).mockResolvedValue(mockConfig);
  });

  // --- Initialization ---

  it('loads config on mount and sets loading=false', async () => {
    const { result } = renderHook(() => useSheetsSync());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config).toEqual(mockConfig);
    expect(getSheetsConfig).toHaveBeenCalledOnce();
  });

  it('sets config to null when getSheetsConfig fails', async () => {
    vi.mocked(getSheetsConfig).mockRejectedValueOnce(new Error('DB failed'));

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config).toBeNull();
  });

  // --- testConnection ---

  it('testConnection delegates to apiTestConnection with current config', async () => {
    vi.mocked(apiTestConnection).mockResolvedValue({ ok: true, sheetTitle: 'My Sheet' });

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.testConnection();
    expect(res).toEqual({ ok: true, sheetTitle: 'My Sheet' });
    expect(apiTestConnection).toHaveBeenCalledWith(mockConfig);
  });

  it('testConnection with override config uses override', async () => {
    vi.mocked(apiTestConnection).mockResolvedValue({ ok: true });
    const override = { ...mockConfig, spreadsheetId: 'other-sheet' };

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.testConnection(override);
    expect(apiTestConnection).toHaveBeenCalledWith(override);
  });

  it('testConnection returns error when config not loaded', async () => {
    vi.mocked(getSheetsConfig).mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.testConnection();
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not loaded');
  });

  // --- syncDraft (assessment) ---

  it('syncDraft syncs assessment draft successfully', async () => {
    const draft = makeDraft({ type: 'assessment' });
    vi.mocked(getDraft).mockResolvedValue(draft);
    vi.mocked(syncAssessment).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(draft);
    expect(res.ok).toBe(true);
    expect(syncAssessment).toHaveBeenCalledWith(mockConfig, draft.data, mockConfig.baaConfirmed);
  });

  // --- syncDraft (contract) ---

  it('syncDraft syncs contract draft successfully', async () => {
    const draft = makeDraft({
      type: 'serviceContract',
      data: { serviceAgreement: { customerInfo: { firstName: 'Test' } } } as unknown as DraftRecord['data'],
    });
    vi.mocked(getDraft).mockResolvedValue(draft);
    vi.mocked(syncContract).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(draft);
    expect(res.ok).toBe(true);
    expect(syncContract).toHaveBeenCalled();
  });

  // --- syncDraft error cases ---

  it('syncDraft returns error when sheets not configured', async () => {
    vi.mocked(getSheetsConfig).mockResolvedValue({ ...DEFAULT_SHEETS_CONFIG });

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(makeDraft());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not configured');
  });

  it('syncDraft returns error when draft not found in DB', async () => {
    vi.mocked(getDraft).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(makeDraft());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not found');
  });

  it('syncDraft returns error for unknown draft type', async () => {
    const draft = makeDraft({ type: undefined, data: { randomKey: true } as unknown as DraftRecord['data'] });
    vi.mocked(getDraft).mockResolvedValue(draft);

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(draft);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Unable to determine draft type');
  });

  it('syncDraft returns error when getSheetsConfig fails during sync', async () => {
    // First call succeeds (init), second fails (syncDraft re-fetch)
    vi.mocked(getSheetsConfig)
      .mockResolvedValueOnce(mockConfig)
      .mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() => useSheetsSync());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.syncDraft(makeDraft());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Failed to load');
  });
});
