import type { SheetsConfig } from '../types/sheetsConfig';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import { flattenData } from './exportData';
import { flattenContractData } from './contractExportData';
import {
  isNameField, isAddressField, isPhoneField, isDobField,
  isSsnField, isSignatureField, isEmailField, isInsuranceField,
} from './phiFieldDetection';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return email.charAt(0) + '***@' + email.slice(at + 1);
}

function maskInsurance(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '***';
  return '***' + value.slice(-4);
}

function toInitials(name: string): string {
  if (!name) return '';
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + '.').join('');
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) return '***-***-' + digits.slice(-4);
  return '***';
}

function yearOnly(dob: string): string {
  if (!dob) return '';
  const match = dob.match(/(\d{4})/);
  return match ? match[1] : '';
}

function cityStateOnly(address: string): string {
  if (!address) return '';
  // Try to extract city/state from common formats
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Last two comma-separated parts are usually city, state ZIP
    return parts.slice(-2).join(', ').replace(/\d{5}(-\d{4})?/, '').trim();
  }
  return '[ADDRESS REDACTED]';
}

/**
 * Sanitize a flat key-value map to mask PHI fields when BAA is not confirmed.
 * Clinical/service data passes through unchanged.
 */
export function sanitizeForSync(flat: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!value) {
      sanitized[key] = value;
    } else if (isSignatureField(key)) {
      sanitized[key] = value ? '[SIGNED]' : '';
    } else if (isSsnField(key)) {
      sanitized[key] = '***-**-****';
    } else if (isDobField(key)) {
      sanitized[key] = yearOnly(value);
    } else if (isPhoneField(key)) {
      sanitized[key] = maskPhone(value);
    } else if (isAddressField(key)) {
      sanitized[key] = cityStateOnly(value);
    } else if (isEmailField(key)) {
      sanitized[key] = maskEmail(value);
    } else if (isInsuranceField(key)) {
      sanitized[key] = maskInsurance(value);
    } else if (isNameField(key)) {
      sanitized[key] = toInitials(value);
    } else {
      sanitized[key] = value; // Clinical data passes through
    }
  }
  return sanitized;
}

/**
 * Build auth headers based on auth method.
 * OAuth: Authorization Bearer header (supports read + write)
 * API Key: no auth header (key goes in query param, read-only)
 */
function getHeaders(config: SheetsConfig): Record<string, string> {
  if (config.authMethod === 'oauth' && config.oauthAccessToken) {
    return {
      Authorization: `Bearer ${config.oauthAccessToken}`,
      'Content-Type': 'application/json',
    };
  }
  return { 'Content-Type': 'application/json' };
}

function buildUrl(config: SheetsConfig, path: string, query = ''): string {
  const base = `${SHEETS_API}/${encodeURIComponent(config.spreadsheetId)}${path}`;
  // API key auth: append key as query param
  if (config.authMethod === 'apiKey' && config.apiKey) {
    const keyParam = `key=${encodeURIComponent(config.apiKey)}`;
    const fullQuery = query ? `${query}&${keyParam}` : keyParam;
    return `${base}?${fullQuery}`;
  }
  // OAuth: no query param needed (auth is in headers)
  return query ? `${base}?${query}` : base;
}

export async function testConnection(
  config: SheetsConfig,
): Promise<{ ok: boolean; sheetTitle?: string; error?: string }> {
  const hasAuth = config.authMethod === 'oauth'
    ? !!config.oauthAccessToken
    : !!config.apiKey;

  if (!config.spreadsheetId || !hasAuth) {
    return {
      ok: false,
      error: config.authMethod === 'oauth'
        ? 'Spreadsheet ID is required and you must sign in with Google first'
        : 'Spreadsheet ID and API Key are required',
    };
  }

  try {
    const url = buildUrl(config, '', 'fields=properties.title');
    const res = await fetch(url, { headers: getHeaders(config) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const data = await res.json();
    return { ok: true, sheetTitle: data.properties?.title };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function ensureHeaderRow(
  config: SheetsConfig,
  sheetName: string,
  headers: string[],
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!1:1`);
  const readUrl = buildUrl(config, `/values/${range}`);
  const res = await fetch(readUrl, { headers: getHeaders(config) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `HTTP ${res.status}`;
    // Provide a clear message when the sheet tab doesn't exist
    if (res.status === 400 || msg.toLowerCase().includes('unable to parse range') || msg.toLowerCase().includes('not found')) {
      throw new Error(
        `Sheet tab "${sheetName}" not found. Please create a tab named "${sheetName}" in your spreadsheet.`
      );
    }
    throw new Error(`Failed to read header row: ${msg}`);
  }

  const data = await res.json();
  if (data.values && data.values.length > 0 && data.values[0].length > 0) {
    return; // Header row already exists
  }

  // Write header row
  const writeUrl = buildUrl(config, `/values/${range}`, 'valueInputOption=RAW');
  const writeRes = await fetch(writeUrl, {
    method: 'PUT',
    headers: getHeaders(config),
    body: JSON.stringify({ values: [headers] }),
  });

  if (!writeRes.ok) {
    const body = await writeRes.json().catch(() => ({}));
    const writeMsg = body?.error?.message || `HTTP ${writeRes.status}`;
    if (writeRes.status === 401 || writeRes.status === 403) {
      throw new Error(`Authorization failed — your OAuth token may have expired. Please sign in again. (${writeMsg})`);
    }
    throw new Error(`Failed to write header row to "${sheetName}": ${writeMsg}`);
  }
}

async function appendRow(
  config: SheetsConfig,
  sheetName: string,
  headers: string[],
  values: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureHeaderRow(config, sheetName, headers);

    const range = encodeURIComponent(`${sheetName}!A1`);
    const url = buildUrl(
      config,
      `/values/${range}:append`,
      'valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({ values: [values] }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: `Authorization failed — your OAuth token may have expired. Please sign in again. (${msg})` };
      }
      return { ok: false, error: `Failed to append data to "${sheetName}": ${msg}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Read all rows from a sheet tab. Returns headers (row 1) and data rows (row 2+). */
export async function readAllRows(
  config: SheetsConfig,
  sheetName: string,
): Promise<{ ok: boolean; headers: string[]; rows: string[][]; error?: string }> {
  try {
    const range = encodeURIComponent(sheetName);
    const url = buildUrl(config, `/values/${range}`);
    const res = await fetch(url, { headers: getHeaders(config) });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${res.status}`;
      if (res.status === 400 || msg.toLowerCase().includes('unable to parse range') || msg.toLowerCase().includes('not found')) {
        return { ok: false, headers: [], rows: [], error: `Sheet tab "${sheetName}" not found.` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, headers: [], rows: [], error: 'Authorization failed — please sign in again.' };
      }
      return { ok: false, headers: [], rows: [], error: msg };
    }

    const data = await res.json();
    const values: string[][] = data.values || [];
    if (values.length === 0) {
      return { ok: true, headers: [], rows: [] };
    }

    return { ok: true, headers: values[0], rows: values.slice(1) };
  } catch (err) {
    return { ok: false, headers: [], rows: [], error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Convert a sheet row (header+value arrays) into a flat key→value map. */
export function rowToFlatMap(headers: string[], row: string[]): Record<string, string> {
  const flat: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    flat[headers[i]] = row[i] || '';
  }
  return flat;
}

export async function syncAssessment(
  config: SheetsConfig,
  data: AssessmentFormData,
  baaConfirmed = false,
): Promise<{ ok: boolean; error?: string }> {
  // Guard: verify data has assessment shape before flattening
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid assessment data: data is missing or not an object.' };
  }
  if (!('clientHelpList' in data) || !data.clientHelpList) {
    const keys = Object.keys(data).slice(0, 5).join(', ');
    return { ok: false, error: `Invalid assessment data: missing clientHelpList. Top-level keys: [${keys}]. This draft may be a service contract.` };
  }
  try {
    const rawFlat = flattenData(data);
    const flat = baaConfirmed ? rawFlat : sanitizeForSync(rawFlat);
    const headers = Object.keys(flat);
    const values = headers.map(k => flat[k] || '');
    // Add sync metadata columns
    headers.push('syncTimestamp', 'syncType', 'phiMasked');
    values.push(new Date().toISOString(), 'assessment', baaConfirmed ? 'no' : 'yes');
    return appendRow(config, config.assessmentSheetName, headers, values);
  } catch (err) {
    return { ok: false, error: `Assessment flatten/sync failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function syncContract(
  config: SheetsConfig,
  data: ServiceContractFormData,
  baaConfirmed = false,
): Promise<{ ok: boolean; error?: string }> {
  // Guard: verify data has contract shape before flattening
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid contract data: data is missing or not an object.' };
  }
  if (!('serviceAgreement' in data) || !data.serviceAgreement) {
    const keys = Object.keys(data).slice(0, 5).join(', ');
    return { ok: false, error: `Invalid contract data: missing serviceAgreement. Top-level keys: [${keys}]. This draft may be an assessment.` };
  }
  try {
    const rawFlat = flattenContractData(data);
    const flat = baaConfirmed ? rawFlat : sanitizeForSync(rawFlat);
    const headers = Object.keys(flat);
    const values = headers.map(k => flat[k] || '');
    headers.push('syncTimestamp', 'syncType', 'phiMasked');
    values.push(new Date().toISOString(), 'serviceContract', baaConfirmed ? 'no' : 'yes');
    return appendRow(config, config.contractSheetName, headers, values);
  } catch (err) {
    return { ok: false, error: `Contract flatten/sync failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
