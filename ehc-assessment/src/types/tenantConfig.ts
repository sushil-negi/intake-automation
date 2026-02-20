/**
 * Per-tenant configuration types.
 *
 * Mirrors the `app_config` Supabase table schema.
 * Each org can have one row per config_type containing
 * a JSONB `config_data` payload.
 */

// ── Config type discriminator ─────────────────────────────────────────────────

export type TenantConfigType = 'auth' | 'sheets' | 'email' | 'branding';

// ── Per-type config shapes (stored in config_data JSONB) ──────────────────────

/** Auth settings that an org admin can override */
export interface TenantAuthConfig {
  requireAuth: boolean;
  allowedEmails: string[];
  idleTimeoutMinutes: number;
}

/** Sheets integration settings per org */
export interface TenantSheetsConfig {
  oauthClientId: string;
  spreadsheetId: string;
  assessmentSheetName: string;
  contractSheetName: string;
  authMethod: 'oauth' | 'apiKey';
  autoSyncOnSubmit: boolean;
  baaConfirmed: boolean;
  baaConfirmedDate?: string;
}

/** Email settings per org */
export interface TenantEmailConfig {
  defaultCc: string;
  subjectTemplate: string;
  bodyTemplate: string;
  signature: string;
  htmlEnabled: boolean;
}

// Branding config is defined in types/branding.ts (Phase 2)

// ── Config map for type-safe access ───────────────────────────────────────────

export interface TenantConfigMap {
  auth: TenantAuthConfig;
  sheets: TenantSheetsConfig;
  email: TenantEmailConfig;
  branding: Record<string, unknown>; // typed as BrandingConfig in Phase 2
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseTenantConfigReturn {
  /** Get config for a given type. Returns null if not set or Supabase not configured. */
  getConfig: <K extends TenantConfigType>(type: K) => TenantConfigMap[K] | null;
  /** Write/update config for a given type. Requires admin role (enforced by RLS). */
  setConfig: <K extends TenantConfigType>(type: K, data: TenantConfigMap[K]) => Promise<void>;
  /** True while initial fetch is in progress */
  loading: boolean;
  /** Last error message, or null */
  error: string | null;
  /** Re-fetch all config from Supabase */
  refresh: () => Promise<void>;
}
