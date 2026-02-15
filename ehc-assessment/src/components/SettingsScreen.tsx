import { useState, useEffect, useCallback } from 'react';
import { AccordionSection } from './ui/AccordionSection';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { getSheetsConfig, saveSheetsConfig, getAllDrafts, deleteDraft, getAuthConfig, saveAuthConfig, saveDraft, type DraftRecord } from '../utils/db';
import { testConnection, readAllRows, rowToFlatMap } from '../utils/sheetsApi';
import { exportAllDraftsZip, unflattenAssessment } from '../utils/exportData';
import { unflattenContractData } from '../utils/contractExportData';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { logger } from '../utils/logger';
import { logAudit, getAuditLogs, purgeOldLogs, exportAuditLogCSV, type AuditLogEntry, type AuditAction } from '../utils/auditLog';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { requestAccessToken, revokeAccessToken, isTokenExpired, isGsiLoaded } from '../utils/googleAuth';
import type { SheetsConfig, AuthMethod } from '../types/sheetsConfig';
import { DEFAULT_SHEETS_CONFIG } from '../types/sheetsConfig';
import { syncAssessment, syncContract } from '../utils/sheetsApi';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import type { AuthConfig } from '../types/auth';
import { DEFAULT_AUTH_CONFIG } from '../types/auth';

interface SettingsScreenProps {
  onGoHome: () => void;
  authUserEmail?: string;
}

export function SettingsScreen({ onGoHome, authUserEmail }: SettingsScreenProps) {
  const isOnline = useOnlineStatus();

  // Config state
  const [config, setConfig] = useState<SheetsConfig>(DEFAULT_SHEETS_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Connection test state
  const [testResult, setTestResult] = useState<{ ok: boolean; sheetTitle?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Bulk sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number; errors: number } | null>(null);
  const [syncError, setSyncError] = useState('');

  // Show/hide API key
  const [showApiKey, setShowApiKey] = useState(false);

  // Setup help expanded state
  const [showSetupHelp, setShowSetupHelp] = useState(false);

  // OAuth state
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  // Clear drafts confirm + export
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [zipExporting, setZipExporting] = useState(false);

  // Load from Sheet state
  const [sheetRows, setSheetRows] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [importedRows, setImportedRows] = useState<Set<number>>(new Set());
  const [importType, setImportType] = useState<'assessment' | 'contract'>('assessment');

  // Auth config state
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const [newEmail, setNewEmail] = useState('');
  const [authSaveStatus, setAuthSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Activity log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoaded, setAuditLogsLoaded] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<AuditAction | ''>('');
  const [retentionDays, setRetentionDays] = useState(90);
  const [purgeResult, setPurgeResult] = useState('');

  const refreshDraftCount = useCallback(async () => {
    try {
      const drafts = await getAllDrafts();
      setDraftCount(drafts.length);
    } catch { /* ignore */ }
  }, []);

  // Load config on mount
  useEffect(() => {
    (async () => {
      try {
        const [cfg, auth] = await Promise.all([getSheetsConfig(), getAuthConfig()]);
        setConfig(cfg);
        setAuthConfig(auth);
      } catch (err) {
        logger.error('Failed to load config:', err);
      } finally {
        setConfigLoading(false);
      }
    })();
    refreshDraftCount();
  }, [refreshDraftCount]);

  // v4-3: Admin gate — admin is the first email in allowedEmails, or all users when no list configured
  const isAdmin = !authConfig.allowedEmails.length ||
    (!!authUserEmail && authConfig.allowedEmails[0]?.toLowerCase() === authUserEmail.toLowerCase());

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await saveSheetsConfig(config);
      logAudit('settings_change', 'sheetsConfig', 'Sheets config saved');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(config);
    setTestResult(result);
    setTesting(false);
  };

  // --- OAuth sign-in ---
  const handleOAuthSignIn = async () => {
    if (!config.oauthClientId) {
      setOauthError('Enter your OAuth Client ID first');
      return;
    }
    setOauthLoading(true);
    setOauthError('');
    try {
      const response = await requestAccessToken(config.oauthClientId);
      const expiresAt = new Date(Date.now() + response.expires_in * 1000).toISOString();
      const updated: SheetsConfig = {
        ...config,
        oauthAccessToken: response.access_token,
        oauthExpiresAt: expiresAt,
      };
      setConfig(updated);
      await saveSheetsConfig(updated);
      logAudit('sheets_oauth_signin');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setOauthLoading(false);
    }
  };

  // --- OAuth sign-out ---
  const handleOAuthSignOut = async () => {
    if (config.oauthAccessToken) {
      await revokeAccessToken(config.oauthAccessToken);
    }
    const updated: SheetsConfig = {
      ...config,
      oauthAccessToken: '',
      oauthExpiresAt: '',
    };
    setConfig(updated);
    await saveSheetsConfig(updated);
    logAudit('sheets_oauth_signout');
  };

  const handleBulkSync = async () => {
    setSyncing(true);
    setSyncError('');
    setSyncProgress({ done: 0, total: 0, errors: 0 });
    try {
      // Re-fetch fresh config from DB to avoid stale state
      const freshConfig = await getSheetsConfig();
      setConfig(freshConfig);

      // Re-fetch fresh drafts from DB
      const drafts = await getAllDrafts();
      const total = drafts.length;
      setSyncProgress({ done: 0, total, errors: 0 });

      let done = 0;
      let errors = 0;
      let lastError = '';

      for (const draft of drafts) {
        try {
          let result: { ok: boolean; error?: string };
          // Detect type from draft.type or fall back to data shape inspection
          const dataRecord = draft.data as Record<string, unknown>;
          const isContract = draft.type === 'serviceContract'
            || (!draft.type && !!dataRecord.serviceAgreement);
          const isAssessment = draft.type === 'assessment'
            || (!draft.type && !!dataRecord.clientHelpList);

          if (!isContract && !isAssessment) {
            errors++;
            lastError = `Draft "${draft.clientName}" has unrecognizable data format — skipped`;
            done++;
            setSyncProgress({ done, total, errors });
            continue;
          }

          if (isContract) {
            result = await syncContract(freshConfig, draft.data as ServiceContractFormData, freshConfig.baaConfirmed);
          } else {
            result = await syncAssessment(freshConfig, draft.data as AssessmentFormData, freshConfig.baaConfirmed);
          }
          if (!result.ok) {
            errors++;
            lastError = result.error || 'Unknown error';
          }
        } catch (e) {
          errors++;
          lastError = e instanceof Error ? e.message : 'Network error';
        }
        done++;
        setSyncProgress({ done, total, errors });
      }

      if (lastError) setSyncError(lastError);

      // Update last sync timestamp only if at least some succeeded
      if (errors < total) {
        const updated = { ...freshConfig, lastSyncTimestamp: new Date().toISOString() };
        setConfig(updated);
        await saveSheetsConfig(updated);
      }
      logAudit('bulk_sync', undefined, `${done - errors}/${total} synced, ${errors} errors`);
    } catch (err) {
      logger.error('Bulk sync failed:', err);
      setSyncError(err instanceof Error ? err.message : 'Bulk sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAllDrafts = async () => {
    try {
      const drafts = await getAllDrafts();
      for (const d of drafts) {
        await deleteDraft(d.id);
      }
      logAudit('clear_all_drafts', undefined, `${drafts.length} drafts deleted`);
      setShowClearConfirm(false);
      await refreshDraftCount();
    } catch (err) {
      logger.error('Failed to clear drafts:', err);
    }
  };

  const handleLoadFromSheet = async () => {
    setSheetLoading(true);
    setSheetError('');
    setSheetRows(null);
    setImportedRows(new Set());
    const sheetName = importType === 'contract' ? config.contractSheetName : config.assessmentSheetName;
    const result = await readAllRows(config, sheetName);
    if (!result.ok) {
      setSheetError(result.error || 'Failed to read sheet');
    } else if (result.rows.length === 0) {
      setSheetError('No data rows found in sheet (only header row or empty).');
    } else {
      setSheetRows({ headers: result.headers, rows: result.rows });
    }
    setSheetLoading(false);
    logAudit('load_from_sheet', sheetName);
  };

  const handleImportRow = async (rowIndex: number) => {
    if (!sheetRows) return;
    const flat = rowToFlatMap(sheetRows.headers, sheetRows.rows[rowIndex]);

    let clientName: string;
    let draft: DraftRecord;

    if (importType === 'contract') {
      const contractData = unflattenContractData(flat);
      clientName = `${flat['firstName'] || ''} ${flat['lastName'] || ''}`.trim() || 'Imported Client';
      draft = {
        id: `sheet-import-${Date.now()}-${rowIndex}`,
        clientName,
        type: 'serviceContract',
        data: contractData,
        lastModified: new Date().toISOString(),
        status: 'draft',
        currentStep: 6, // Review step — imported data spans all sections
      };
    } else {
      const assessmentData = unflattenAssessment(flat);
      clientName = flat['clientName'] || 'Imported Client';
      draft = {
        id: `sheet-import-${Date.now()}-${rowIndex}`,
        clientName,
        type: 'assessment',
        data: assessmentData,
        lastModified: new Date().toISOString(),
        status: 'draft',
        currentStep: 6, // Review step — imported data spans all sections
      };
    }

    await saveDraft(draft);
    logAudit('import_row', draft.id, clientName);
    setImportedRows(prev => new Set([...prev, rowIndex]));
    await refreshDraftCount();
  };

  const handleImportTypeChange = (type: 'assessment' | 'contract') => {
    setImportType(type);
    setSheetRows(null);
    setSheetError('');
    setImportedRows(new Set());
  };

  const updateConfig = (patch: Partial<SheetsConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
    setSaveStatus('idle');
    setTestResult(null);
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Loading settings..." />
      </div>
    );
  }

  // Derived state
  const oauthSignedIn = !!(config.oauthAccessToken && !isTokenExpired(config.oauthExpiresAt));
  const oauthExpired = !!(config.oauthAccessToken && isTokenExpired(config.oauthExpiresAt));
  const isConfigured = config.authMethod === 'oauth'
    ? !!(config.spreadsheetId && oauthSignedIn)
    : !!(config.spreadsheetId && config.apiKey);
  const canTestConnection = config.authMethod === 'oauth'
    ? !!(config.spreadsheetId && oauthSignedIn)
    : !!(config.spreadsheetId && config.apiKey);

  return (
    <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 relative">
      {/* Background watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/ehc-watermark-h.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'clamp(280px, 55vw, 700px) auto',
          opacity: 0.06,
        }}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div role="alert" className="bg-yellow-500 text-white text-center py-2 text-sm font-medium relative z-10">
          You are offline. Some features may be unavailable.
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 shadow-md" style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #1f4f5f 50%, #1a3a4a 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <img
            src="/ehc-watermark-h.png"
            alt="Executive Home Care of Chester County"
            className="h-9 sm:h-11 w-auto object-contain brightness-0 invert"
          />
          <h1 className="text-sm sm:text-base font-semibold text-white/90 hidden sm:block">Admin / Settings</h1>
          <button
            type="button"
            onClick={onGoHome}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-all min-h-[36px]"
          >
            Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8 relative z-[1]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#1a3a4a] dark:text-slate-100">Admin / Settings</h2>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-all min-h-[36px] disabled:opacity-50 ${saveStatus === 'saved' ? 'bg-green-500 dark:bg-green-600' : 'bg-[#1a3a4a] dark:bg-slate-600'}`}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error — Retry' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-4">
          {/* v4-3: Admin gate — show notice for non-admin users */}
          {!isAdmin && (
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 rounded-xl p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Restricted Access</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Only the primary administrator can modify Google Sheets, authentication, and data management settings.
                Contact your administrator for configuration changes.
              </p>
            </div>
          )}

          {/* Sections 1-5: Admin-only settings (Sheets, Auth, Data Management) */}
          {isAdmin && (<>
          <AccordionSection title="Google Sheets Connection" defaultOpen>
            <div className="space-y-4">
              {/* Auth method */}
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Authentication Method</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateConfig({ authMethod: 'oauth' as AuthMethod })}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border-2 transition-all min-h-[36px] ${
                      config.authMethod === 'oauth'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a]/5 dark:border-slate-300 dark:bg-slate-700/50 font-medium text-[#1a3a4a] dark:text-slate-100'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      config.authMethod === 'oauth'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a] dark:border-slate-200 dark:bg-slate-200'
                        : 'border-gray-300 dark:border-slate-500'
                    }`} />
                    OAuth 2.0
                    <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">Recommended</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateConfig({ authMethod: 'apiKey' as AuthMethod })}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border-2 transition-all min-h-[36px] ${
                      config.authMethod === 'apiKey'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a]/5 dark:border-slate-300 dark:bg-slate-700/50 font-medium text-[#1a3a4a] dark:text-slate-100'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      config.authMethod === 'apiKey'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a] dark:border-slate-200 dark:bg-slate-200'
                        : 'border-gray-300 dark:border-slate-500'
                    }`} />
                    API Key
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">Read-only</span>
                  </button>
                </div>
              </div>

              {/* OAuth section */}
              {config.authMethod === 'oauth' && (
                <div className="space-y-3">
                  {/* Client ID */}
                  <div>
                    <label htmlFor="oauthClientId" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">OAuth Client ID</label>
                    <input
                      id="oauthClientId"
                      type="text"
                      value={config.oauthClientId}
                      onChange={e => updateConfig({ oauthClientId: e.target.value })}
                      placeholder="123456789-abc123.apps.googleusercontent.com"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Sign-in status & button */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {oauthSignedIn ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-green-700 dark:text-green-400 font-medium">Signed in with Google</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          Token expires: {new Date(config.oauthExpiresAt).toLocaleTimeString()}
                        </span>
                        <button
                          type="button"
                          onClick={handleOAuthSignOut}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-all min-h-[36px]"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        {oauthExpired && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-xs text-yellow-700 dark:text-yellow-300">Token expired — sign in again</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleOAuthSignIn}
                          disabled={oauthLoading || !config.oauthClientId || !isOnline}
                          className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 bg-[#4285f4] dark:bg-blue-600"
                        >
                          {oauthLoading ? (
                            'Signing in...'
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="16" height="16" className="flex-shrink-0">
                                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Sign in with Google
                            </>
                          )}
                        </button>
                        {!isGsiLoaded() && (
                          <span className="text-xs text-red-600 dark:text-red-400">Google Identity Services library not loaded</span>
                        )}
                      </>
                    )}
                  </div>

                  {oauthError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{oauthError}</p>
                  )}
                </div>
              )}

              {/* API Key section */}
              {config.authMethod === 'apiKey' && (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 dark:bg-amber-900/30 dark:border-amber-700 rounded-lg p-2">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      API keys only support <strong>read-only</strong> access to Google Sheets.
                      To sync (write) data, switch to <strong>OAuth 2.0</strong>.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="apiKey" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Google API Key</label>
                    <div className="relative">
                      <input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={e => updateConfig({ apiKey: e.target.value })}
                        placeholder="AIza..."
                        className="w-full px-3 py-2 pr-16 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-3 py-2 min-h-[36px]"
                      >
                        {showApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Spreadsheet ID — shared for both auth methods */}
              <div>
                <label htmlFor="spreadsheetId" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Spreadsheet ID</label>
                <input
                  id="spreadsheetId"
                  type="text"
                  value={config.spreadsheetId}
                  onChange={e => updateConfig({ spreadsheetId: e.target.value })}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Found in the spreadsheet URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                </p>
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !canTestConnection || !isOnline}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#1a3a4a] text-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && (
                  <span className={`text-sm ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {testResult.ok
                      ? `Connected to "${testResult.sheetTitle}"`
                      : testResult.error}
                  </span>
                )}
              </div>

              {/* Setup help toggle */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSetupHelp(!showSetupHelp)}
                  className="text-xs font-medium text-[#1a3a4a] dark:text-slate-300 hover:underline flex items-center gap-1"
                >
                  <span
                    className="transition-transform duration-200 inline-block"
                    style={{ transform: showSetupHelp ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    &#9654;
                  </span>
                  {showSetupHelp ? 'Hide setup guide' : 'Need help? View setup guide'}
                </button>
              </div>

              {/* Inline setup guide */}
              {showSetupHelp && (
                <div className="space-y-4">
                  {/* Quick Start summary */}
                  <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Quick Start (3 steps)</h4>
                    <ol className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 list-decimal list-inside">
                      <li>Set up OAuth in Google Cloud Console (see detailed guide below) and paste your <strong>Client ID</strong>.</li>
                      <li>Create a Google Spreadsheet with two tabs (<strong>Assessments</strong> and <strong>Contracts</strong>) and paste the <strong>Spreadsheet ID</strong>.</li>
                      <li>Click <strong>"Sign in with Google"</strong>, then <strong>"Test Connection"</strong> — you're ready to sync!</li>
                    </ol>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Detailed step-by-step instructions for each part are below.
                    </p>
                  </div>

                  {/* OAuth setup guide */}
                  <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Step 1: OAuth 2.0 Setup (Recommended)</h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      OAuth lets you sign in with your Google account to read <em>and write</em> to your spreadsheet.
                      Follow these steps to create an OAuth Client ID in the Google Cloud Console:
                    </p>
                    <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
                      <li>
                        Go to the{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-blue-600 dark:text-blue-400"
                        >
                          Google Cloud Console &rarr; Credentials
                        </a>{' '}
                        and sign in with your Google account.
                      </li>
                      <li>
                        <strong>Create a project</strong> (if you don't have one): Click the project selector at the top,
                        then <strong>New Project</strong>. Name it (e.g. "EHC Assessment") and click <strong>Create</strong>.
                        Make sure this project is selected for the following steps.
                      </li>
                      <li>
                        <strong>Enable the Google Sheets API:</strong> Go to{' '}
                        <a
                          href="https://console.cloud.google.com/apis/library/sheets.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-blue-600 dark:text-blue-400"
                        >
                          APIs &amp; Services &rarr; Library &rarr; Google Sheets API
                        </a>{' '}
                        and click <strong>Enable</strong>. (If you see "Manage" instead, it's already enabled.)
                      </li>
                      <li>
                        <strong>Configure the OAuth consent screen:</strong> Go to{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials/consent"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-blue-600 dark:text-blue-400"
                        >
                          APIs &amp; Services &rarr; OAuth consent screen
                        </a>
                        . Choose <strong>External</strong> user type and click <strong>Create</strong>.
                        Fill in:
                        <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
                          <li><strong>App name:</strong> e.g. "EHC Assessment"</li>
                          <li><strong>User support email:</strong> Your email address</li>
                          <li><strong>Developer contact email:</strong> Your email address</li>
                        </ul>
                        Click <strong>Save and Continue</strong>.
                      </li>
                      <li>
                        <strong>Add Scopes:</strong> Click <strong>Add or Remove Scopes</strong>. Search for and select{' '}
                        <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">.../auth/spreadsheets</code>{' '}
                        (Google Sheets API — full access). Click <strong>Update</strong>, then <strong>Save and Continue</strong>.
                      </li>
                      <li>
                        <strong>Add test users:</strong> Click <strong>+ Add Users</strong>, enter your Google email
                        address, and click <strong>Save</strong>. (While the app is in "Testing" mode, only listed test users can sign in.)
                      </li>
                      <li>
                        Back on the <strong>Credentials</strong> page, click <strong>+ CREATE CREDENTIALS</strong> &rarr;{' '}
                        <strong>OAuth client ID</strong>.
                      </li>
                      <li>
                        Application type: <strong>Web application</strong>. Name it (e.g. "EHC Assessment App").
                      </li>
                      <li>
                        Under <strong>Authorized JavaScript origins</strong>, click <strong>+ ADD URI</strong> and enter your app URL:<br />
                        <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-[11px]">{window.location.origin}</code>{' '}
                        <span className="text-blue-500 dark:text-blue-400">(your current origin — no trailing slash)</span>
                        <br />
                        <span className="text-blue-600 dark:text-blue-400 text-[11px]">If you deploy to a production domain later, add that origin here too.</span>
                      </li>
                      <li>
                        Click <strong>Create</strong>. Copy the <strong>Client ID</strong>{' '}
                        (looks like <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-[11px]">123456789-abc.apps.googleusercontent.com</code>)
                        and paste it into the "OAuth Client ID" field above.
                      </li>
                      <li>
                        Click <strong>"Sign in with Google"</strong> above. A popup will ask you to authorize access.
                        Select your Google account, click <strong>Continue</strong> (you may see a "this app isn't verified" warning — click <strong>Advanced</strong> &rarr; <strong>Go to EHC Assessment</strong>), and grant spreadsheet access.
                        Done!
                      </li>
                    </ol>
                    <div className="bg-blue-100 dark:bg-blue-900/40 rounded p-2 mt-2">
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> OAuth tokens last about <strong>1 hour</strong>. When a token expires, you'll see a
                        yellow "Token expired" indicator. Simply click "Sign in with Google" again to get a fresh token — no need to
                        re-do any setup steps.
                      </p>
                    </div>
                  </div>

                  {/* Spreadsheet setup guide */}
                  <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Step 2: Google Spreadsheet Setup</h4>
                    <ol className="text-xs text-amber-800 dark:text-amber-300 space-y-2 list-decimal list-inside">
                      <li>
                        Create a new spreadsheet at{' '}
                        <a
                          href="https://sheets.new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-amber-600 dark:text-amber-400"
                        >
                          sheets.new
                        </a>{' '}
                        (or open an existing one).
                      </li>
                      <li>
                        Copy the <strong>Spreadsheet ID</strong> from the URL: <br />
                        <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-[11px] break-all">
                          https://docs.google.com/spreadsheets/d/<strong>THIS_PART</strong>/edit
                        </code>
                        <br />
                        <span className="text-amber-600 dark:text-amber-400 text-[11px]">It's the long string of letters, numbers, and dashes between /d/ and /edit.</span>
                      </li>
                      <li>
                        Create two tabs (the bottom tabs in the spreadsheet): name one <strong>Assessments</strong> and
                        the other <strong>Contracts</strong>. These names must match the Sheet Configuration section below.<br />
                        <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                          Tip: Click the "+" icon at the bottom-left of the spreadsheet to add a new tab.
                          Right-click a tab to rename it.
                        </span>
                      </li>
                      <li>
                        <strong>With OAuth:</strong> The spreadsheet just needs to be owned by or shared with your
                        Google account — no public sharing needed! Your data stays private.
                      </li>
                      <li>
                        Paste the Spreadsheet ID into the field above and click <strong>Test Connection</strong> to verify.
                        You should see the spreadsheet name displayed.
                      </li>
                    </ol>
                    <div className="bg-amber-100 dark:bg-amber-900/40 rounded p-2 mt-2">
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        <strong>What happens on first sync:</strong> The app will automatically write a header row
                        (column names) to each tab. Your data rows will be appended below the headers. You don't need to
                        set up any column headers manually.
                      </p>
                    </div>
                  </div>

                  {/* API Key info */}
                  <div className="bg-gray-50 border border-gray-200 dark:bg-slate-700/50 dark:border-slate-600 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">API Key (Alternative — Read Only)</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      An API key can only <strong>read</strong> spreadsheet data, not write.
                      It cannot sync assessments or contracts to your spreadsheet.
                      Use an API key only if you want to test the connection without setting up OAuth:
                    </p>
                    <ol className="text-xs text-gray-500 dark:text-slate-400 space-y-1 list-decimal list-inside">
                      <li>In Google Cloud Console &rarr; Credentials, click <strong>+ CREATE CREDENTIALS</strong> &rarr; <strong>API key</strong>.</li>
                      <li>Copy the generated key and paste it in the API Key field above.</li>
                      <li>The spreadsheet must be shared as <strong>"Anyone with the link"</strong> (Viewer) for API key access to work.</li>
                    </ol>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      To actually push data to Google Sheets, switch to <strong>OAuth 2.0</strong>.
                    </p>
                  </div>

                  {/* Troubleshooting */}
                  <div className="bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Troubleshooting</h4>
                    <dl className="text-xs text-red-800 dark:text-red-300 space-y-2">
                      <dt className="font-semibold">"popup_closed_by_user" error</dt>
                      <dd className="ml-3">
                        The Google sign-in popup was closed before completing authorization.
                        Click "Sign in with Google" again and make sure to complete the full authorization flow
                        (select account &rarr; grant access).
                      </dd>
                      <dt className="font-semibold">"access_denied" or consent screen error</dt>
                      <dd className="ml-3">
                        Make sure your Google email is added as a <strong>test user</strong> in the OAuth consent screen settings
                        (Google Cloud Console &rarr; OAuth consent screen &rarr; Test users).
                        While the app is in "Testing" mode, only listed test users can sign in.
                      </dd>
                      <dt className="font-semibold">"This app isn't verified" warning</dt>
                      <dd className="ml-3">
                        This is normal for apps in Testing mode. Click <strong>Advanced</strong> at the bottom-left,
                        then click <strong>Go to [App Name] (unsafe)</strong> to continue. This warning
                        only appears because the app hasn't gone through Google's verification process (not needed for internal use).
                      </dd>
                      <dt className="font-semibold">"Invalid client_id" or "origin_mismatch"</dt>
                      <dd className="ml-3">
                        Check that your Client ID is correct (no extra spaces) and that{' '}
                        <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">{window.location.origin}</code>{' '}
                        is listed in <strong>Authorized JavaScript origins</strong> for your OAuth client
                        (no trailing slash). Changes to origins may take a few minutes to take effect.
                      </dd>
                      <dt className="font-semibold">"Google Sheets API has not been enabled" (403 error)</dt>
                      <dd className="ml-3">
                        Go to{' '}
                        <a
                          href="https://console.cloud.google.com/apis/library/sheets.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline dark:text-red-400"
                        >
                          APIs &amp; Services &rarr; Library &rarr; Google Sheets API
                        </a>{' '}
                        and click <strong>Enable</strong>. Make sure you're in the correct Google Cloud project.
                      </dd>
                      <dt className="font-semibold">"Spreadsheet not found" or 404 error</dt>
                      <dd className="ml-3">
                        Double-check the Spreadsheet ID (the long string between /d/ and /edit in the URL).
                        With OAuth, the spreadsheet must be owned by or shared with the signed-in Google account.
                      </dd>
                      <dt className="font-semibold">Token expired — yellow indicator</dt>
                      <dd className="ml-3">
                        OAuth tokens last about 1 hour. When expired, a yellow "Token expired" indicator appears.
                        Click <strong>"Sign in with Google"</strong> again to get a fresh token.
                        No setup changes are needed — just re-authorize.
                      </dd>
                      <dt className="font-semibold">Connection works but sync fails</dt>
                      <dd className="ml-3">
                        Ensure the sheet tab names in your spreadsheet match the names in the "Sheet Configuration"
                        section below (default: "Assessments" and "Contracts"). The tabs must already exist in the
                        spreadsheet before syncing.
                      </dd>
                      <dt className="font-semibold">Google Identity Services library not loaded</dt>
                      <dd className="ml-3">
                        A red message appears below the Sign In button. This usually means the Google script failed
                        to load — check your internet connection and try refreshing the page. Ad blockers can also
                        interfere with Google's sign-in library.
                      </dd>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section 2: Sheet Configuration */}
          <AccordionSection title="Sheet Configuration">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assessmentSheet" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Assessment Sheet Name</label>
                  <input
                    id="assessmentSheet"
                    type="text"
                    value={config.assessmentSheetName}
                    onChange={e => updateConfig({ assessmentSheetName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="contractSheet" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Contract Sheet Name</label>
                  <input
                    id="contractSheet"
                    type="text"
                    value={config.contractSheetName}
                    onChange={e => updateConfig({ contractSheetName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                These must match the tab names in your Google Spreadsheet exactly (case-sensitive).
                Create the tabs manually in your spreadsheet before syncing — the app will write column headers automatically on first sync.
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncOnSubmit}
                  onChange={e => updateConfig({ autoSyncOnSubmit: e.target.checked })}
                  className="accent-[#1a3a4a] w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Auto-sync on form submission</span>
              </label>

              {/* Export Privacy Filters (19.3) */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Export Privacy (Minimum Necessary)</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Control which PHI categories are included in CSV/JSON exports. Unchecked categories will be omitted entirely.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['includeNames', 'Names'],
                    ['includeAddresses', 'Addresses'],
                    ['includePhones', 'Phone Numbers'],
                    ['includeDob', 'Date of Birth'],
                    ['includeEmails', 'Email Addresses'],
                    ['includeInsurance', 'Insurance Policy #'],
                    ['includeSignatures', 'Signatures'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.exportPrivacy?.[key] !== false}
                        onChange={e => updateConfig({
                          exportPrivacy: {
                            includeNames: true,
                            includeAddresses: true,
                            includePhones: true,
                            includeDob: true,
                            includeEmails: true,
                            includeInsurance: true,
                            includeSignatures: true,
                            ...config.exportPrivacy,
                            [key]: e.target.checked,
                          },
                        })}
                        className="accent-[#1a3a4a] w-4 h-4"
                      />
                      <span className="text-xs text-gray-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* BAA Confirmation */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.baaConfirmed}
                    onChange={e => {
                      const checked = e.target.checked;
                      updateConfig({
                        baaConfirmed: checked,
                        baaConfirmedDate: checked ? new Date().toISOString() : undefined,
                      });
                      logAudit('auth_config_change', 'baaConfirmed', checked ? 'BAA confirmed' : 'BAA unconfirmed');
                    }}
                    className="accent-[#1a3a4a] w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    Business Associate Agreement (BAA) is in place with Google Workspace
                  </span>
                </label>
                {!config.baaConfirmed && (
                  <div className="bg-red-50 border-2 border-red-300 dark:bg-red-900/30 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 text-lg" aria-hidden="true">&#9888;</span>
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          HIPAA Compliance Warning
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Without a confirmed Business Associate Agreement (BAA) with Google Workspace,
                          syncing Protected Health Information (PHI) to Google Sheets may violate 45 CFR &sect;164.502(e).
                          All PHI fields (names, DOB, addresses, phone numbers, signatures) are <strong>automatically masked</strong> before syncing.
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          To sync unmasked PHI, first execute a BAA with Google Workspace, then check the box above.
                          Data is encrypted at rest on this device using AES-GCM 256-bit encryption.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {config.baaConfirmed && (
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      BAA confirmed{config.baaConfirmedDate ? ` on ${new Date(config.baaConfirmedDate).toLocaleDateString()}` : ''} — full PHI data will be synced to Google Sheets without masking.
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">BAA Internal Notes</label>
                      <textarea
                        value={config.baaInternalNotes || ''}
                        onChange={e => updateConfig({ baaInternalNotes: e.target.value })}
                        placeholder="e.g., BAA executed 2024-01-15, Google Workspace Business Plus plan"
                        rows={2}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* Section 3: Sync Status & Actions */}
          <AccordionSection title="Sync Status & Actions">
            <div className="space-y-4">
              {/* Status indicators */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-600 dark:text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-gray-600 dark:text-slate-400">{isConfigured ? 'Sheets configured' : 'Not configured'}</span>
                </div>
                {config.authMethod === 'oauth' && (
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${oauthSignedIn ? 'bg-green-500' : oauthExpired ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                    <span className="text-gray-600 dark:text-slate-400">
                      {oauthSignedIn ? 'Authenticated' : oauthExpired ? 'Token expired' : 'Not signed in'}
                    </span>
                  </div>
                )}
                {config.lastSyncTimestamp && (
                  <span className="text-gray-500 dark:text-slate-400 text-xs">
                    Last sync: {new Date(config.lastSyncTimestamp).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Bulk sync */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleBulkSync}
                  disabled={syncing || !isConfigured || !isOnline || draftCount === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed bg-[#8a6212] dark:bg-amber-700"
                >
                  {syncing ? 'Syncing...' : `Sync All Drafts (${draftCount})`}
                </button>
                {syncProgress && (
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    {syncProgress.done} / {syncProgress.total} synced
                    {syncProgress.errors > 0 && (
                      <span className="text-red-600 dark:text-red-400 ml-1">({syncProgress.errors} errors)</span>
                    )}
                  </span>
                )}
              </div>

              {syncError && (
                <div className="bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">Sync Error Details:</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">{syncError}</p>
                </div>
              )}

              {!isConfigured ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {config.authMethod === 'oauth' && !oauthSignedIn
                    ? 'Sign in with Google and enter a Spreadsheet ID to enable sync.'
                    : 'Configure your Google Sheets connection above to enable sync.'}
                </p>
              ) : draftCount === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No saved drafts to sync. Go to the Drafts page and save assessments or contracts first,
                  then return here to sync them all — or use the per-draft Sync button on the Drafts page.
                </p>
              ) : null}
            </div>
          </AccordionSection>

          {/* Section 4: Load from Sheet */}
          <AccordionSection title="Load from Sheet">
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Read {importType === 'contract' ? 'contract' : 'assessment'} rows from your Google Sheet and import them as local drafts.
              </p>

              {/* Import type toggle */}
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Import Type</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleImportTypeChange('assessment')}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border-2 transition-all min-h-[36px] ${
                      importType === 'assessment'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a]/5 dark:border-slate-300 dark:bg-slate-700/50 font-medium text-[#1a3a4a] dark:text-slate-100'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      importType === 'assessment'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a] dark:border-slate-200 dark:bg-slate-200'
                        : 'border-gray-300 dark:border-slate-500'
                    }`} />
                    Assessments
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportTypeChange('contract')}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border-2 transition-all min-h-[36px] ${
                      importType === 'contract'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a]/5 dark:border-slate-300 dark:bg-slate-700/50 font-medium text-[#1a3a4a] dark:text-slate-100'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      importType === 'contract'
                        ? 'border-[#1a3a4a] bg-[#1a3a4a] dark:border-slate-200 dark:bg-slate-200'
                        : 'border-gray-300 dark:border-slate-500'
                    }`} />
                    Contracts
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadFromSheet}
                  disabled={sheetLoading || !isConfigured || !isOnline}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#1a3a4a] text-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sheetLoading ? 'Loading...' : `Load from "${importType === 'contract' ? config.contractSheetName : config.assessmentSheetName}"`}
                </button>
                {sheetRows && (
                  <span className="text-sm text-gray-600 dark:text-slate-400">{sheetRows.rows.length} row(s) found</span>
                )}
              </div>

              {sheetError && (
                <div className="bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 rounded-lg p-3">
                  <p className="text-xs text-red-700 dark:text-red-300">{sheetError}</p>
                </div>
              )}

              {sheetRows && sheetRows.rows.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">#</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Client Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Address</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {sheetRows.rows.map((row, idx) => {
                          const flat = rowToFlatMap(sheetRows.headers, row);
                          const imported = importedRows.has(idx);
                          const name = importType === 'contract'
                            ? `${flat['firstName'] || ''} ${flat['lastName'] || ''}`.trim() || '—'
                            : flat['clientName'] || '—';
                          const date = importType === 'contract'
                            ? flat['agreementDate'] || '—'
                            : flat['date'] || '—';
                          const address = importType === 'contract'
                            ? flat['address'] || '—'
                            : flat['clientAddress'] || '—';
                          return (
                            <tr key={idx} className={imported ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}>
                              <td className="px-3 py-2 text-gray-400 dark:text-slate-500">{idx + 1}</td>
                              <td className="px-3 py-2 text-gray-900 dark:text-slate-100 font-medium">{name}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{date}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-slate-400 max-w-[200px] truncate">{address}</td>
                              <td className="px-3 py-2 text-right">
                                {imported ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">Imported</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleImportRow(idx)}
                                    className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all min-h-[36px]"
                                  >
                                    Import as Draft
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!isConfigured && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Configure your Google Sheets connection above to load data.
                </p>
              )}
            </div>
          </AccordionSection>

          {/* Section 5: User Access Control */}
          <AccordionSection title="User Access Control">
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authConfig.requireAuth}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked && !config.oauthClientId) {
                      alert('Please configure an OAuth Client ID in the Google Sheets Connection section first.');
                      return;
                    }
                    const updated = { ...authConfig, requireAuth: checked };
                    setAuthConfig(updated);
                    setAuthSaveStatus('saving');
                    await saveAuthConfig(updated);
                    logAudit('auth_config_change', 'requireAuth', String(checked));
                    setAuthSaveStatus('saved');
                    setTimeout(() => setAuthSaveStatus('idle'), 2000);
                  }}
                  className="accent-[#1a3a4a] w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Require Google sign-in to access app</span>
              </label>

              {authConfig.requireAuth && (
                <>
                  <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      When enabled, users must sign in with a Google account before accessing any part of the app.
                      Uses the same OAuth Client ID configured above for Google Sheets.
                      {authConfig.allowedEmails.length === 0 && (
                        <strong className="block mt-1">
                          No allowed emails configured — any Google account can sign in. Add emails below to restrict access.
                        </strong>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Authorized Email Addresses</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="user@example.com"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newEmail.trim() && newEmail.includes('@')) {
                            e.preventDefault();
                            const email = newEmail.trim().toLowerCase();
                            if (!authConfig.allowedEmails.includes(email)) {
                              const updated = { ...authConfig, allowedEmails: [...authConfig.allowedEmails, email] };
                              setAuthConfig(updated);
                              await saveAuthConfig(updated);
                            }
                            setNewEmail('');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newEmail.trim() || !newEmail.includes('@')) return;
                          const email = newEmail.trim().toLowerCase();
                          if (!authConfig.allowedEmails.includes(email)) {
                            const updated = { ...authConfig, allowedEmails: [...authConfig.allowedEmails, email] };
                            setAuthConfig(updated);
                            await saveAuthConfig(updated);
                          }
                          setNewEmail('');
                        }}
                        disabled={!newEmail.trim() || !newEmail.includes('@')}
                        className="px-3 py-2 text-sm font-medium rounded-lg text-white transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a3a4a] dark:bg-slate-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {authConfig.allowedEmails.length > 0 && (
                    <div className="space-y-1">
                      {authConfig.allowedEmails.map((email) => (
                        <div key={email} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700 dark:text-slate-300">{email}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = { ...authConfig, allowedEmails: authConfig.allowedEmails.filter(e => e !== email) };
                              setAuthConfig(updated);
                              await saveAuthConfig(updated);
                            }}
                            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 px-3 py-2 min-h-[36px]"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Session Idle Timeout</label>
                    <select
                      value={authConfig.idleTimeoutMinutes || 15}
                      onChange={async (e) => {
                        const updated = { ...authConfig, idleTimeoutMinutes: Number(e.target.value) };
                        setAuthConfig(updated);
                        setAuthSaveStatus('saving');
                        await saveAuthConfig(updated);
                        logAudit('auth_config_change', 'idleTimeout', `${e.target.value} min`);
                        setAuthSaveStatus('saved');
                        setTimeout(() => setAuthSaveStatus('idle'), 2000);
                      }}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes (default)</option>
                      <option value={30}>30 minutes</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Auto-locks the app after this period of inactivity. A 2-minute warning appears before timeout.
                    </p>
                  </div>
                </>
              )}

              {authSaveStatus === 'saved' && (
                <p className="text-xs text-green-600 dark:text-green-400">Auth settings saved</p>
              )}
            </div>
          </AccordionSection>

          {/* Section 5: Data Management */}
          <AccordionSection title="Data Management">
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <p><strong>Auto-save:</strong> Form data is stored in localStorage while you work.</p>
                <p><strong>Drafts:</strong> Saved drafts are stored in IndexedDB on this device.</p>
                <p><strong>Sync:</strong> When configured, data is pushed to Google Sheets for backup and reporting.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    setZipExporting(true);
                    try {
                      const drafts = await getAllDrafts();
                      if (drafts.length > 0) await exportAllDraftsZip(drafts);
                    } catch (err) {
                      logger.error('ZIP export failed:', err);
                    } finally {
                      setZipExporting(false);
                    }
                  }}
                  disabled={draftCount === 0 || zipExporting}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {zipExporting ? 'Exporting...' : `Export All (ZIP)`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={draftCount === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear All Drafts ({draftCount})
                </button>
                <span className="text-xs text-gray-500 dark:text-slate-400">Clear cannot be undone</span>
              </div>
            </div>
          </AccordionSection>

          {/* Section: HIPAA Compliance Checklist (19.4) */}
          <AccordionSection title="HIPAA Compliance">
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                This checklist shows the HIPAA-related safeguards implemented in this application.
              </p>

              {/* Implemented safeguards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">Safeguards in Place</p>
                {[
                  { label: 'AES-256-GCM encryption at rest (localStorage + IndexedDB)', active: true },
                  { label: 'PHI auto-masking for Google Sheets sync (when BAA not confirmed)', active: true },
                  { label: 'Audit logging with HMAC tamper-evidence', active: true },
                  { label: 'Session expiry (8-hour absolute + configurable idle timeout)', active: true },
                  { label: 'Auto-purge of old data after 90 days', active: true },
                  { label: 'Content Security Policy (CSP) + HSTS security headers', active: true },
                  { label: 'No external data transmission without user action', active: true },
                  { label: 'Export privacy filters (Minimum Necessary standard)', active: true },
                  { label: 'Consent timestamps and revocation audit trail', active: true },
                  { label: 'CSV formula injection prevention (OWASP)', active: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 text-sm flex-shrink-0" aria-hidden="true">&#10003;</span>
                    <span className="text-xs text-gray-700 dark:text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Limitations */}
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">Limitations & User Responsibilities</p>
                {[
                  'No server-side storage — all data resides on this device only',
                  'No BAA with Google is provided — user must execute their own BAA with Google Workspace',
                  'No email encryption — do not email exported files containing unmasked PHI',
                  'PDF accessibility tags not supported (jsPDF limitation)',
                  'No external error monitoring (Sentry HIPAA plan optional)',
                  'Encryption keys are device-specific — data cannot be recovered if device is lost',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="text-amber-500 dark:text-amber-400 text-sm flex-shrink-0" aria-hidden="true">&#9888;</span>
                    <span className="text-xs text-gray-600 dark:text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>

          </>)}
          {/* End admin-only sections */}

          {/* Section 6: Activity Log — visible to all users */}
          <AccordionSection title="Activity Log">
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                HIPAA-required audit trail of all PHI access and system actions. Stored locally in IndexedDB.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    setAuditLoading(true);
                    try {
                      const logs = await getAuditLogs({
                        limit: 500,
                        action: auditActionFilter || undefined,
                      });
                      setAuditLogs(logs);
                      setAuditLogsLoaded(true);
                    } catch {
                      setAuditLogs([]);
                    } finally {
                      setAuditLoading(false);
                    }
                  }}
                  disabled={auditLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#1a3a4a] text-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 transition-all min-h-[36px] disabled:opacity-40"
                >
                  {auditLoading ? 'Loading...' : 'Load Activity Log'}
                </button>

                <select
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value as AuditAction | '')}
                  aria-label="Filter by action"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="">All Actions</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="idle_timeout">Idle Timeout</option>
                  <option value="draft_create">Draft Create</option>
                  <option value="draft_delete">Draft Delete</option>
                  <option value="draft_resume">Draft Resume</option>
                  <option value="pdf_export">PDF Export</option>
                  <option value="csv_export">CSV Export</option>
                  <option value="json_export">JSON Export</option>
                  <option value="zip_export">ZIP Export</option>
                  <option value="sheets_sync">Sheets Sync</option>
                  <option value="bulk_sync">Bulk Sync</option>
                  <option value="settings_change">Settings Change</option>
                  <option value="auth_config_change">Auth Config</option>
                  <option value="error">Errors</option>
                </select>

                <button
                  type="button"
                  onClick={() => exportAuditLogCSV()}
                  disabled={!auditLogsLoaded}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all min-h-[36px] disabled:opacity-40"
                >
                  Export Log (CSV)
                </button>
              </div>

              {auditLogsLoaded && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Time</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-slate-400">User</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Action</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Resource</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 py-4 text-center text-gray-400 dark:text-slate-500">
                              No log entries found
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr
                              key={log.id}
                              className={log.action === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                            >
                              <td className="px-2 py-1.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-2 py-1.5 text-gray-700 dark:text-slate-300 max-w-[140px] truncate">
                                {log.user}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  log.action === 'error'
                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                    : log.action.includes('export') || log.action.includes('sync')
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : log.action.includes('login') || log.action.includes('logout')
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-gray-600 dark:text-slate-400 max-w-[200px] truncate" title={log.details || ''}>
                                {log.resource || log.details || '—'}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`text-[10px] font-medium ${
                                  log.status === 'failure' ? 'text-red-600 dark:text-red-400' : log.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {auditLogs.length > 0 && (
                    <div className="px-2 py-1.5 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                      Showing {auditLogs.length} entries (newest first)
                    </div>
                  )}
                </div>
              )}

              {/* Retention / Purge */}
              <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100 dark:border-slate-700">
                <label className="text-xs text-gray-500 dark:text-slate-400">Retention:</label>
                <select
                  value={retentionDays}
                  onChange={e => setRetentionDays(Number(e.target.value))}
                  aria-label="Log retention period"
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days (default)</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    const deleted = await purgeOldLogs(retentionDays);
                    setPurgeResult(`Deleted ${deleted} old entries`);
                    setTimeout(() => setPurgeResult(''), 3000);
                    // Refresh logs if loaded
                    if (auditLogsLoaded) {
                      const logs = await getAuditLogs({ limit: 500, action: auditActionFilter || undefined });
                      setAuditLogs(logs);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all min-h-[36px]"
                >
                  Clear Old Logs
                </button>
                {purgeResult && (
                  <span className="text-xs text-green-600 dark:text-green-400">{purgeResult}</span>
                )}
              </div>
            </div>
          </AccordionSection>
        </div>
      </main>

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear All Drafts?"
          message={`This will permanently delete all ${draftCount} saved draft(s) from this device. This action cannot be undone.`}
          actions={[
            { label: 'Delete All Drafts', variant: 'danger', onClick: handleClearAllDrafts },
            { label: 'Cancel', variant: 'secondary', onClick: () => setShowClearConfirm(false) },
          ]}
          onClose={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
