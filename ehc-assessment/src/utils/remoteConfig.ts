import type { SharedConfig, ResolvedConfig } from '../types/remoteConfig';
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
 * Resolve the app config by trying remote first, falling back to local IndexedDB.
 *
 * Merge strategy:
 * - If remote config is available, it provides the base values for shared fields.
 * - Per-device fields (oauthAccessToken, oauthExpiresAt, apiKey, exportPrivacy,
 *   lastSyncTimestamp, baaInternalNotes) are always loaded from local IndexedDB.
 * - The remote config REPLACES (not merges with) the local shared fields.
 */
export async function resolveConfig(): Promise<ResolvedConfig> {
  // Always load local config — we need per-device fields regardless
  const [localAuth, localSheets] = await Promise.all([
    getAuthConfig(),
    getSheetsConfig(),
  ]);

  // Attempt remote fetch
  const remote = await fetchRemoteConfig();

  if (!remote) {
    return {
      authConfig: localAuth,
      sheetsConfig: localSheets,
      source: 'local',
    };
  }

  // Merge: remote shared fields + local per-device fields
  const authConfig: AuthConfig = {
    requireAuth: remote.auth.requireAuth,
    allowedEmails: remote.auth.allowedEmails,
    idleTimeoutMinutes: remote.auth.idleTimeoutMinutes,
  };

  const sheetsConfig: SheetsConfig = {
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

  logger.log('[RemoteConfig] Loaded remote config, timestamp:', remote._meta.timestamp);

  return {
    authConfig,
    sheetsConfig,
    source: 'remote',
  };
}

// Re-export for convenience
export type { SharedConfig } from '../types/remoteConfig';
