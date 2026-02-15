import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import type { SheetsConfig } from '../types/sheetsConfig';
import { flattenData } from '../utils/exportData';
import { flattenContractData } from '../utils/contractExportData';
import { INITIAL_DATA } from '../utils/initialData';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';

describe('SheetsConfig defaults', () => {
  it('has correct default values', () => {
    expect(DEFAULT_SHEETS_CONFIG.authMethod).toBe('oauth');
    expect(DEFAULT_SHEETS_CONFIG.apiKey).toBe('');
    expect(DEFAULT_SHEETS_CONFIG.oauthClientId).toBe('');
    expect(DEFAULT_SHEETS_CONFIG.spreadsheetId).toBe('');
    expect(DEFAULT_SHEETS_CONFIG.assessmentSheetName).toBe('Assessments');
    expect(DEFAULT_SHEETS_CONFIG.contractSheetName).toBe('Contracts');
    expect(DEFAULT_SHEETS_CONFIG.autoSyncOnSubmit).toBe(false);
    expect(DEFAULT_SHEETS_CONFIG.lastSyncTimestamp).toBeNull();
  });

  it('includes OAuth token fields', () => {
    expect(DEFAULT_SHEETS_CONFIG.oauthAccessToken).toBe('');
    expect(DEFAULT_SHEETS_CONFIG.oauthExpiresAt).toBe('');
  });
});

describe('flattenData produces valid Sheets row', () => {
  it('headers and values have same length for assessment', () => {
    const flat = flattenData(INITIAL_DATA as AssessmentFormData);
    const headers = Object.keys(flat);
    const values = headers.map(k => flat[k]);
    expect(headers.length).toBeGreaterThan(0);
    expect(values.length).toBe(headers.length);
  });

  it('headers and values have same length for contract', () => {
    const flat = flattenContractData(SERVICE_CONTRACT_INITIAL_DATA as ServiceContractFormData);
    const headers = Object.keys(flat);
    const values = headers.map(k => flat[k]);
    expect(headers.length).toBeGreaterThan(0);
    expect(values.length).toBe(headers.length);
  });

  it('assessment flat data includes key fields', () => {
    const data = { ...INITIAL_DATA, clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Jane Doe' } } as AssessmentFormData;
    const flat = flattenData(data);
    expect(flat['clientName']).toBe('Jane Doe');
    expect('consentSigned' in flat).toBe(true);
  });

  it('contract flat data includes key fields', () => {
    const data = {
      ...SERVICE_CONTRACT_INITIAL_DATA,
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        customerInfo: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo,
          firstName: 'John',
          lastName: 'Smith',
        },
      },
    } as ServiceContractFormData;
    const flat = flattenContractData(data);
    expect(flat['firstName']).toBe('John');
    expect(flat['lastName']).toBe('Smith');
  });
});

describe('isTokenExpired', () => {
  it('returns true for empty string', async () => {
    const { isTokenExpired } = await import('../utils/googleAuth');
    expect(isTokenExpired('')).toBe(true);
  });

  it('returns true for expired token', async () => {
    const { isTokenExpired } = await import('../utils/googleAuth');
    const pastDate = new Date(Date.now() - 120_000).toISOString();
    expect(isTokenExpired(pastDate)).toBe(true);
  });

  it('returns false for valid future token', async () => {
    const { isTokenExpired } = await import('../utils/googleAuth');
    const futureDate = new Date(Date.now() + 300_000).toISOString(); // 5 min from now
    expect(isTokenExpired(futureDate)).toBe(false);
  });

  it('returns true when within 60s buffer of expiry', async () => {
    const { isTokenExpired } = await import('../utils/googleAuth');
    const almostExpired = new Date(Date.now() + 30_000).toISOString(); // 30s from now
    expect(isTokenExpired(almostExpired)).toBe(true);
  });
});

describe('Sheets API URL construction', () => {
  const mockConfig: SheetsConfig = {
    ...DEFAULT_SHEETS_CONFIG,
    authMethod: 'apiKey',
    apiKey: 'test-api-key-123',
    spreadsheetId: 'test-spreadsheet-id',
    assessmentSheetName: 'Assessments',
    contractSheetName: 'Contracts',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('testConnection calls correct endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ properties: { title: 'Test Sheet' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { testConnection } = await import('../utils/sheetsApi');
    const result = await testConnection(mockConfig);

    expect(result.ok).toBe(true);
    expect(result.sheetTitle).toBe('Test Sheet');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('test-spreadsheet-id');
    expect(url).toContain('key=test-api-key-123');
    expect(url).toContain('fields=properties.title');
  });

  it('testConnection returns error on failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Not found' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { testConnection } = await import('../utils/sheetsApi');
    const result = await testConnection(mockConfig);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Not found');
  });

  it('testConnection returns error when config is missing', async () => {
    const { testConnection } = await import('../utils/sheetsApi');
    // Default config has no spreadsheet ID or token, so it should fail
    const result = await testConnection({ ...DEFAULT_SHEETS_CONFIG });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('syncAssessment calls append endpoint', async () => {
    const fetchCalls: Array<{ url: string; method?: string }> = [];
    const mockFetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      fetchCalls.push({ url, method: opts?.method });
      // Return empty header row read, then success for writes
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ values: [] }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { syncAssessment } = await import('../utils/sheetsApi');
    const result = await syncAssessment(mockConfig, INITIAL_DATA as AssessmentFormData);

    expect(result.ok).toBe(true);
    // Should have made at least 2 calls: read header + write header or append
    expect(fetchCalls.length).toBeGreaterThanOrEqual(2);
    // Last call should be POST (append)
    const lastCall = fetchCalls[fetchCalls.length - 1];
    expect(lastCall.method).toBe('POST');
    expect(lastCall.url).toContain('append');
    expect(lastCall.url).toContain('Assessments');
  });
});
