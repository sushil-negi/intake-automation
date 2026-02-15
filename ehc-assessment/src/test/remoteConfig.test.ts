import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { SharedConfig } from '../types/remoteConfig';

// Mock db.ts to return predictable local config
vi.mock('../utils/db', () => ({
  getAuthConfig: vi.fn(),
  getSheetsConfig: vi.fn(),
}));

// Mock logger to suppress output
vi.mock('../utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { resolveConfig } from '../utils/remoteConfig';
import { getAuthConfig, getSheetsConfig } from '../utils/db';

const LOCAL_AUTH = {
  requireAuth: false,
  allowedEmails: [] as string[],
  idleTimeoutMinutes: 15,
};

const LOCAL_SHEETS = {
  authMethod: 'oauth' as const,
  apiKey: 'local-encrypted-key',
  oauthClientId: 'local-client-id',
  oauthAccessToken: 'local-token-abc123',
  oauthExpiresAt: '2099-01-01T00:00:00Z',
  spreadsheetId: 'local-spreadsheet-id',
  assessmentSheetName: 'Assessments',
  contractSheetName: 'Contracts',
  autoSyncOnSubmit: false,
  lastSyncTimestamp: '2026-01-01T00:00:00Z',
  baaConfirmed: false,
  exportPrivacy: { includeNames: true, includeAddresses: true, includePhones: true, includeDob: true, includeEmails: true, includeInsurance: true, includeSignatures: true },
  baaInternalNotes: 'local note',
};

function makeRemoteResponse(): SharedConfig {
  return {
    auth: {
      requireAuth: true,
      allowedEmails: ['admin@ehc.com', 'staff@ehc.com'],
      idleTimeoutMinutes: 30,
    },
    sheets: {
      oauthClientId: 'remote-client-id',
      spreadsheetId: 'remote-spreadsheet-id',
      assessmentSheetName: 'RemoteAssessments',
      contractSheetName: 'RemoteContracts',
      authMethod: 'oauth',
      autoSyncOnSubmit: true,
      baaConfirmed: true,
      baaConfirmedDate: '2026-02-01',
    },
    _meta: {
      source: 'netlify',
      timestamp: '2026-02-15T00:00:00Z',
    },
  };
}

describe('resolveConfig', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(getAuthConfig).mockResolvedValue(LOCAL_AUTH);
    vi.mocked(getSheetsConfig).mockResolvedValue(LOCAL_SHEETS);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns remote config when fetch succeeds', async () => {
    const remote = makeRemoteResponse();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(remote), { status: 200 }));

    const result = await resolveConfig();

    expect(result.source).toBe('remote');
    expect(result.authConfig.requireAuth).toBe(true);
    expect(result.authConfig.allowedEmails).toEqual(['admin@ehc.com', 'staff@ehc.com']);
    expect(result.authConfig.idleTimeoutMinutes).toBe(30);
    expect(result.sheetsConfig.oauthClientId).toBe('remote-client-id');
    expect(result.sheetsConfig.spreadsheetId).toBe('remote-spreadsheet-id');
    expect(result.sheetsConfig.assessmentSheetName).toBe('RemoteAssessments');
    expect(result.sheetsConfig.contractSheetName).toBe('RemoteContracts');
    expect(result.sheetsConfig.autoSyncOnSubmit).toBe(true);
    expect(result.sheetsConfig.baaConfirmed).toBe(true);
    expect(result.sheetsConfig.baaConfirmedDate).toBe('2026-02-01');
  });

  it('per-device fields always come from local IndexedDB', async () => {
    const remote = makeRemoteResponse();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(remote), { status: 200 }));

    const result = await resolveConfig();

    expect(result.source).toBe('remote');
    // These must come from local, NOT remote
    expect(result.sheetsConfig.oauthAccessToken).toBe('local-token-abc123');
    expect(result.sheetsConfig.oauthExpiresAt).toBe('2099-01-01T00:00:00Z');
    expect(result.sheetsConfig.apiKey).toBe('local-encrypted-key');
    expect(result.sheetsConfig.lastSyncTimestamp).toBe('2026-01-01T00:00:00Z');
    expect(result.sheetsConfig.exportPrivacy).toEqual(LOCAL_SHEETS.exportPrivacy);
    expect(result.sheetsConfig.baaInternalNotes).toBe('local note');
  });

  it('falls back to local when fetch returns 404', async () => {
    fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));

    const result = await resolveConfig();

    expect(result.source).toBe('local');
    expect(result.authConfig).toEqual(LOCAL_AUTH);
    expect(result.sheetsConfig).toEqual(LOCAL_SHEETS);
  });

  it('falls back to local when fetch throws network error', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await resolveConfig();

    expect(result.source).toBe('local');
    expect(result.authConfig).toEqual(LOCAL_AUTH);
  });

  it('falls back to local when fetch times out', async () => {
    fetchSpy.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(Object.assign(new DOMException('Aborted', 'AbortError'))), 5000);
    }));

    // The function has a 3s timeout via AbortController, but for unit testing
    // we just verify the abort path is handled
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchSpy.mockRejectedValue(abortError);

    const result = await resolveConfig();

    expect(result.source).toBe('local');
    expect(result.authConfig).toEqual(LOCAL_AUTH);
  });

  it('falls back to local when response has invalid shape', async () => {
    // Missing _meta.source
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ foo: 'bar' }), { status: 200 }));

    const result = await resolveConfig();

    expect(result.source).toBe('local');
    expect(result.authConfig).toEqual(LOCAL_AUTH);
  });

  it('falls back to local when response has wrong _meta.source', async () => {
    const bad = { ...makeRemoteResponse(), _meta: { source: 'other', timestamp: '' } };
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(bad), { status: 200 }));

    const result = await resolveConfig();

    expect(result.source).toBe('local');
  });

  it('remote fields override local defaults for shared fields', async () => {
    const remote = makeRemoteResponse();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(remote), { status: 200 }));

    const result = await resolveConfig();

    // Local had authMethod='oauth', remote also has 'oauth' — but verify the merge happens
    expect(result.sheetsConfig.authMethod).toBe(remote.sheets.authMethod);
    // Local had autoSyncOnSubmit=false, remote has true
    expect(result.sheetsConfig.autoSyncOnSubmit).toBe(true);
    // Local had baaConfirmed=false, remote has true
    expect(result.sheetsConfig.baaConfirmed).toBe(true);
  });
});
