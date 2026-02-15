export type AuthMethod = 'apiKey' | 'oauth';

export interface ExportPrivacyConfig {
  includeNames: boolean;
  includeAddresses: boolean;
  includePhones: boolean;
  includeDob: boolean;
  includeEmails: boolean;
  includeInsurance: boolean;
  includeSignatures: boolean;
}

export const DEFAULT_EXPORT_PRIVACY: ExportPrivacyConfig = {
  includeNames: true,
  includeAddresses: true,
  includePhones: true,
  includeDob: true,
  includeEmails: true,
  includeInsurance: true,
  includeSignatures: true,
};

export interface SheetsConfig {
  authMethod: AuthMethod;
  // API Key fields (read-only access)
  apiKey: string;
  // OAuth fields
  oauthClientId: string;
  oauthAccessToken: string;
  oauthExpiresAt: string;
  // Shared fields
  spreadsheetId: string;
  assessmentSheetName: string;
  contractSheetName: string;
  autoSyncOnSubmit: boolean;
  lastSyncTimestamp: string | null;
  baaConfirmed: boolean;
  // BAA documentation fields (19.4)
  baaConfirmedDate?: string;
  baaInternalNotes?: string;
  // Export privacy (19.3 — Minimum Necessary)
  exportPrivacy?: ExportPrivacyConfig;
}

export const DEFAULT_SHEETS_CONFIG: SheetsConfig = {
  authMethod: 'oauth',
  apiKey: '',
  oauthClientId: '',
  oauthAccessToken: '',
  oauthExpiresAt: '',
  spreadsheetId: '',
  assessmentSheetName: 'Assessments',
  contractSheetName: 'Contracts',
  autoSyncOnSubmit: false,
  lastSyncTimestamp: null,
  baaConfirmed: false,
};
