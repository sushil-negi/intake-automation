/**
 * Default values for each tenant config type.
 *
 * Used as fallback when no per-org config row exists in Supabase `app_config`.
 * These match the current hardcoded defaults so behavior is unchanged
 * for orgs that haven't customized their config.
 */

import type { TenantAuthConfig, TenantSheetsConfig, TenantEmailConfig } from '../types/tenantConfig';

export const DEFAULT_TENANT_AUTH: TenantAuthConfig = {
  requireAuth: false,
  allowedEmails: [],
  idleTimeoutMinutes: 15,
};

export const DEFAULT_TENANT_SHEETS: TenantSheetsConfig = {
  oauthClientId: '',
  spreadsheetId: '',
  assessmentSheetName: 'Assessments',
  contractSheetName: 'Contracts',
  authMethod: 'oauth',
  autoSyncOnSubmit: false,
  baaConfirmed: false,
};

export const DEFAULT_TENANT_EMAIL: TenantEmailConfig = {
  defaultCc: '',
  subjectTemplate: '',
  bodyTemplate: '',
  signature: '',
  htmlEnabled: true,
};

/**
 * Get the default config for a given config type.
 * Returns a fresh copy each time to prevent mutation.
 */
export function getDefaultTenantConfig(type: 'auth'): TenantAuthConfig;
export function getDefaultTenantConfig(type: 'sheets'): TenantSheetsConfig;
export function getDefaultTenantConfig(type: 'email'): TenantEmailConfig;
export function getDefaultTenantConfig(type: string): Record<string, unknown>;
export function getDefaultTenantConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'auth':
      return { ...DEFAULT_TENANT_AUTH, allowedEmails: [...DEFAULT_TENANT_AUTH.allowedEmails] };
    case 'sheets':
      return { ...DEFAULT_TENANT_SHEETS };
    case 'email':
      return { ...DEFAULT_TENANT_EMAIL };
    default:
      return {};
  }
}
