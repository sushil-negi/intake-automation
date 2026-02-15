import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConnection, readAllRows, rowToFlatMap, syncAssessment, syncContract } from '../utils/sheetsApi';
import type { SheetsConfig } from '../types/sheetsConfig';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import { INITIAL_DATA } from '../utils/initialData';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';

const oauthConfig: SheetsConfig = {
  ...DEFAULT_SHEETS_CONFIG,
  authMethod: 'oauth',
  oauthAccessToken: 'ya29.test',
  spreadsheetId: 'sheet-123',
};

const apiKeyConfig: SheetsConfig = {
  ...DEFAULT_SHEETS_CONFIG,
  authMethod: 'apiKey',
  apiKey: 'AIza-test-key',
  spreadsheetId: 'sheet-456',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── testConnection ───────────────────────────────────────────────────

describe('testConnection', () => {
  it('returns error when spreadsheetId is missing', async () => {
    const res = await testConnection({ ...oauthConfig, spreadsheetId: '' });
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('returns error when OAuth token is missing', async () => {
    const res = await testConnection({ ...oauthConfig, oauthAccessToken: '' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('sign in');
  });

  it('returns error when API key is missing (apiKey auth)', async () => {
    const res = await testConnection({ ...apiKeyConfig, apiKey: '' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('API Key');
  });

  it('returns ok with sheet title on success (OAuth)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ properties: { title: 'EHC Data' } }), { status: 200 }),
    );

    const res = await testConnection(oauthConfig);
    expect(res.ok).toBe(true);
    expect(res.sheetTitle).toBe('EHC Data');

    // Verify Authorization header was sent
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect((fetchCall[1]?.headers as Record<string, string>)?.Authorization).toContain('Bearer');
  });

  it('returns ok on success (API key)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ properties: { title: 'Sheet' } }), { status: 200 }),
    );

    const res = await testConnection(apiKeyConfig);
    expect(res.ok).toBe(true);

    // Verify API key in URL query param
    const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('key=AIza-test-key');
  });

  it('returns error on HTTP failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Not Found' } }), { status: 404 }),
    );

    const res = await testConnection(oauthConfig);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Not Found');
  });

  it('returns error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));

    const res = await testConnection(oauthConfig);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Network timeout');
  });
});

// ─── readAllRows ──────────────────────────────────────────────────────

describe('readAllRows', () => {
  it('returns headers and rows on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        values: [
          ['Name', 'Age', 'Status'],
          ['Alice', '30', 'Active'],
          ['Bob', '25', 'Draft'],
        ],
      }), { status: 200 }),
    );

    const res = await readAllRows(oauthConfig, 'Assessments');
    expect(res.ok).toBe(true);
    expect(res.headers).toEqual(['Name', 'Age', 'Status']);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toEqual(['Alice', '30', 'Active']);
  });

  it('returns empty when sheet has no data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ values: [] }), { status: 200 }),
    );

    const res = await readAllRows(oauthConfig, 'Assessments');
    expect(res.ok).toBe(true);
    expect(res.headers).toEqual([]);
    expect(res.rows).toEqual([]);
  });

  it('returns error when sheet tab not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Unable to parse range' } }), { status: 400 }),
    );

    const res = await readAllRows(oauthConfig, 'NonExistent');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not found');
  });

  it('returns auth error on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Token expired' } }), { status: 401 }),
    );

    const res = await readAllRows(oauthConfig, 'Assessments');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('sign in');
  });
});

// ─── rowToFlatMap ─────────────────────────────────────────────────────

describe('rowToFlatMap', () => {
  it('maps header-value pairs correctly', () => {
    const result = rowToFlatMap(['Name', 'Age'], ['Alice', '30']);
    expect(result).toEqual({ Name: 'Alice', Age: '30' });
  });

  it('fills missing values with empty string', () => {
    const result = rowToFlatMap(['A', 'B', 'C'], ['x']);
    expect(result).toEqual({ A: 'x', B: '', C: '' });
  });

  it('handles empty inputs', () => {
    const result = rowToFlatMap([], []);
    expect(result).toEqual({});
  });
});

// ─── syncAssessment ───────────────────────────────────────────────────

describe('syncAssessment', () => {
  it('returns error for null/undefined data', async () => {
    const res = await syncAssessment(oauthConfig, null as never);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('missing');
  });

  it('returns error when clientHelpList is missing (wrong type)', async () => {
    const res = await syncAssessment(oauthConfig, { serviceAgreement: {} } as never);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('clientHelpList');
  });

  it('calls fetch with correct URL and data on valid assessment', async () => {
    // ensureHeaderRow read (returns existing headers)
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [['col1']] }), { status: 200 }))
      // appendRow
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const data = {
      ...INITIAL_DATA,
      clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Test' },
    };
    const res = await syncAssessment(oauthConfig, data, true);
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ─── syncContract ─────────────────────────────────────────────────────

describe('syncContract', () => {
  it('returns error for null/undefined data', async () => {
    const res = await syncContract(oauthConfig, null as never);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('missing');
  });

  it('returns error when serviceAgreement is missing (wrong type)', async () => {
    const res = await syncContract(oauthConfig, { clientHelpList: {} } as never);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('serviceAgreement');
  });

  it('calls fetch with correct URL and data on valid contract', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [['col1']] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const res = await syncContract(oauthConfig, SERVICE_CONTRACT_INITIAL_DATA, false);
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
