import type { SharedConfig, ResolvedConfig, TenantOverrides } from '../types/remoteConfig';
import type { AuthConfig } from '../types/auth';
import type { SheetsConfig } from '../types/sheetsConfig';
import { getAuthConfig, getSheetsConfig } from './db';
import { logger } from './logger';

const REMOTE_CONFIG_URL = '/api/config';
const FETCH_TIMEOUT_MS = 3000;

/**
 * Fetch shared config from the Netlify Function endpoint.
 * Returns null on any failure (network, 404, timeout, parse error).
 */
async function fetchRemoteConfig(): Promise<SharedConfig | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(REMOTE_CONFIG_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!response.ok) {
      logger.log(`[RemoteConfig] Server returned ${response.status} — using local config`);
      return null;
    }

    const data: unknown = await response.json();

    // Basic shape validation — must have _meta.source === 'netlify'
    if (
      !data ||
      typeof data !== 'object' ||
      !('_meta' in data) ||
      !(data as SharedConfig)._meta?.source ||
      (data as SharedConfig)._meta.source !== 'netlify'
    ) {
      logger.warn('[RemoteConfig] Invalid response shape');
      return null;
    }

    return data as SharedConfig;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      logger.log('[RemoteConfig] Fetch timed out — using local config');
    } else {
      logger.log('[RemoteConfig] Fetch failed — using local config');
    }
    return null;
  }
}

/**
 * Resolve the app config using a 3-layer merge hierarchy:
 *
 *   1. Netlify env vars (global defaults via /api/config)
 *   2. Supabase app_config rows (per-org overrides) — optional tenant layer
 *   3. Local IndexedDB (per-device: OAuth tokens, API keys, privacy prefs)
 *
 * Each layer only overrides the shared fields it provides.
 * Per-device fields (tokens, keys) are always from local IndexedDB.
 *
 * @param tenantOverrides - Optional per-org config from Supabase `app_config`.
 *   Passed in by the caller (from `useTenantConfig` hook) when available.
 */
export async function resolveConfig(tenantOverrides?: TenantOverrides | null): Promise<ResolvedConfig> {
  // Always load local config — we need per-device fields regardless
  const [localAuth, localSheets] = await Promise.all([
    getAuthConfig(),
    getSheetsConfig(),
  ]);

  // Attempt remote fetch (Layer 1: Netlify env vars)
  const remote = await fetchRemoteConfig();

  // Start with local config as base
  let authConfig: AuthConfig = { ...localAuth };
  let sheetsConfig: SheetsConfig = { ...localSheets };
  let source: ResolvedConfig['source'] = 'local';
  let hasTenantOverrides = false;

  // Layer 1: Apply Netlify remote config (if available)
  if (remote) {
    authConfig = {
      requireAuth: remote.auth.requireAuth,
      allowedEmails: remote.auth.allowedEmails,
      idleTimeoutMinutes: remote.auth.idleTimeoutMinutes,
    };

    sheetsConfig = {
      // Remote shared fields
      oauthClientId: remote.sheets.oauthClientId,
      spreadsheetId: remote.sheets.spreadsheetId,
      assessmentSheetName: remote.sheets.assessmentSheetName,
      contractSheetName: remote.sheets.contractSheetName,
      authMethod: remote.sheets.authMethod,
      autoSyncOnSubmit: remote.sheets.autoSyncOnSubmit,
      baaConfirmed: remote.sheets.baaConfirmed,
      baaConfirmedDate: remote.sheets.baaConfirmedDate,
      // Per-device fields from local IndexedDB
      apiKey: localSheets.apiKey,
      oauthAccessToken: localSheets.oauthAccessToken,
      oauthExpiresAt: localSheets.oauthExpiresAt,
      lastSyncTimestamp: localSheets.lastSyncTimestamp,
      exportPrivacy: localSheets.exportPrivacy,
      baaInternalNotes: localSheets.baaInternalNotes,
    };

    source = 'remote';
    logger.log('[RemoteConfig] Loaded remote config, timestamp:', remote._meta.timestamp);
  }

  // Layer 2: Apply tenant (per-org) overrides from Supabase app_config
  if (tenantOverrides) {
    if (tenantOverrides.auth) {
      const ta = tenantOverrides.auth;
      if (ta.requireAuth !== undefined) authConfig.requireAuth = ta.requireAuth;
      if (ta.allowedEmails !== undefined) authConfig.allowedEmails = ta.allowedEmails;
      if (ta.idleTimeoutMinutes !== undefined) authConfig.idleTimeoutMinutes = ta.idleTimeoutMinutes;
    }

    if (tenantOverrides.sheets) {
      const ts = tenantOverrides.sheets;
      if (ts.oauthClientId !== undefined) sheetsConfig.oauthClientId = ts.oauthClientId;
      if (ts.spreadsheetId !== undefined) sheetsConfig.spreadsheetId = ts.spreadsheetId;
      if (ts.assessmentSheetName !== undefined) sheetsConfig.assessmentSheetName = ts.assessmentSheetName;
      if (ts.contractSheetName !== undefined) sheetsConfig.contractSheetName = ts.contractSheetName;
      if (ts.authMethod !== undefined) sheetsConfig.authMethod = ts.authMethod;
      if (ts.autoSyncOnSubmit !== undefined) sheetsConfig.autoSyncOnSubmit = ts.autoSyncOnSubmit;
      if (ts.baaConfirmed !== undefined) sheetsConfig.baaConfirmed = ts.baaConfirmed;
      if (ts.baaConfirmedDate !== undefined) sheetsConfig.baaConfirmedDate = ts.baaConfirmedDate;
    }

    hasTenantOverrides = true;
    source = 'tenant';
    logger.log('[RemoteConfig] Applied tenant config overrides');
  }

  // Layer 3: Per-device fields are already in sheetsConfig from localSheets above

  return {
    authConfig,
    sheetsConfig,
    source,
    hasTenantOverrides,
  };
}

// Re-export for convenience
export type { SharedConfig } from '../types/remoteConfig';
