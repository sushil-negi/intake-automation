import type { AuthConfig } from './auth';
import type { SheetsConfig } from './sheetsConfig';

/** The subset of config that can be centrally managed via Netlify env vars */
export interface SharedConfig {
  auth: Pick<AuthConfig, 'requireAuth' | 'allowedEmails' | 'idleTimeoutMinutes'>;
  sheets: Pick<SheetsConfig,
    | 'oauthClientId'
    | 'spreadsheetId'
    | 'assessmentSheetName'
    | 'contractSheetName'
    | 'authMethod'
    | 'autoSyncOnSubmit'
    | 'baaConfirmed'
    | 'baaConfirmedDate'
  >;
  _meta: {
    source: 'netlify';
    timestamp: string;
  };
}

export type ConfigSource = 'remote' | 'local' | 'tenant';

export interface TenantOverrides {
  auth?: Partial<Pick<AuthConfig, 'requireAuth' | 'allowedEmails' | 'idleTimeoutMinutes'>>;
  sheets?: Partial<Pick<SheetsConfig,
    | 'oauthClientId'
    | 'spreadsheetId'
    | 'assessmentSheetName'
    | 'contractSheetName'
    | 'authMethod'
    | 'autoSyncOnSubmit'
    | 'baaConfirmed'
    | 'baaConfirmedDate'
  >>;
}

export interface ResolvedConfig {
  authConfig: AuthConfig;
  sheetsConfig: SheetsConfig;
  source: ConfigSource;
  /** True when Supabase app_config overrides were applied */
  hasTenantOverrides: boolean;
}
