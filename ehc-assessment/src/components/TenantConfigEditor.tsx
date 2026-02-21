/**
 * Admin UI for editing per-org configuration stored in Supabase `app_config`.
 *
 * Sections: Auth Config, Sheets Config, Email Config.
 * Read-only for staff users; editable for admin/super_admin.
 * Uses AccordionSection pattern consistent with SettingsScreen.
 */

import { useState, useEffect, useCallback } from 'react';
import { AccordionSection } from './ui/AccordionSection';
import type { UseTenantConfigReturn } from '../types/tenantConfig';
import type { TenantAuthConfig, TenantSheetsConfig, TenantEmailConfig } from '../types/tenantConfig';
import { getDefaultTenantConfig } from '../utils/tenantConfigDefaults';

interface TenantConfigEditorProps {
  tenantConfig: UseTenantConfigReturn;
  userRole?: string | null;
  isSuperAdmin?: boolean;
}

const VALID_TIMEOUTS = [5, 10, 15, 30];

export function TenantConfigEditor({ tenantConfig, userRole, isSuperAdmin }: TenantConfigEditorProps) {
  const canEdit = userRole === 'admin' || isSuperAdmin;

  // ── Auth config state ──────────────────────────────────────────────────────
  const [authData, setAuthData] = useState<TenantAuthConfig>(getDefaultTenantConfig('auth'));
  const [authNewEmail, setAuthNewEmail] = useState('');
  const [authSaveStatus, setAuthSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Sheets config state ────────────────────────────────────────────────────
  const [sheetsData, setSheetsData] = useState<TenantSheetsConfig>(getDefaultTenantConfig('sheets'));
  const [sheetsSaveStatus, setSheetsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Email config state ─────────────────────────────────────────────────────
  const [emailData, setEmailData] = useState<TenantEmailConfig>(getDefaultTenantConfig('email'));
  const [emailSaveStatus, setEmailSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load tenant config data
  useEffect(() => {
    if (tenantConfig.loading) return;

    const auth = tenantConfig.getConfig('auth');
    if (auth) setAuthData(auth);

    const sheets = tenantConfig.getConfig('sheets');
    if (sheets) setSheetsData(sheets);

    const email = tenantConfig.getConfig('email');
    if (email) setEmailData(email);
  }, [tenantConfig.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handlers ──────────────────────────────────────────────────────────

  const saveAuth = useCallback(async () => {
    setAuthSaveStatus('saving');
    try {
      await tenantConfig.setConfig('auth', authData);
      setAuthSaveStatus('saved');
      setTimeout(() => setAuthSaveStatus('idle'), 2000);
    } catch {
      setAuthSaveStatus('error');
    }
  }, [tenantConfig, authData]);

  const saveSheets = useCallback(async () => {
    setSheetsSaveStatus('saving');
    try {
      await tenantConfig.setConfig('sheets', sheetsData);
      setSheetsSaveStatus('saved');
      setTimeout(() => setSheetsSaveStatus('idle'), 2000);
    } catch {
      setSheetsSaveStatus('error');
    }
  }, [tenantConfig, sheetsData]);

  const saveEmail = useCallback(async () => {
    setEmailSaveStatus('saving');
    try {
      await tenantConfig.setConfig('email', emailData);
      setEmailSaveStatus('saved');
      setTimeout(() => setEmailSaveStatus('idle'), 2000);
    } catch {
      setEmailSaveStatus('error');
    }
  }, [tenantConfig, emailData]);

  // ── Helper: save status badge ──────────────────────────────────────────────

  const statusBadge = (status: 'idle' | 'saving' | 'saved' | 'error') => {
    if (status === 'idle') return null;
    const styles = {
      saving: 'text-blue-600 dark:text-blue-400',
      saved: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
    };
    const labels = { saving: 'Saving...', saved: '✓ Saved', error: 'Error saving' };
    return <span className={`text-xs font-medium ml-2 ${styles[status]}`}>{labels[status]}</span>;
  };

  if (tenantConfig.loading) {
    return (
      <div className="py-4 text-center text-sm text-gray-500 dark:text-slate-400">
        Loading organization config...
      </div>
    );
  }

  if (tenantConfig.error) {
    return (
      <div className="py-4 text-center text-sm text-red-600 dark:text-red-400">
        {tenantConfig.error}
      </div>
    );
  }

  const readOnlyNotice = !canEdit ? (
    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
      These settings are managed by your organization admin. Contact them to make changes.
    </p>
  ) : null;

  return (
    <div className="space-y-3">
      {readOnlyNotice}

      {/* ── Auth Config ──────────────────────────────────────────────────── */}
      <AccordionSection title="Authentication" defaultOpen={false}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={authData.requireAuth}
              onChange={e => setAuthData(prev => ({ ...prev, requireAuth: e.target.checked }))}
              disabled={!canEdit}
              className="rounded"
            />
            Require authentication
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Idle Timeout (minutes)
            </label>
            <select
              value={authData.idleTimeoutMinutes}
              onChange={e => setAuthData(prev => ({ ...prev, idleTimeoutMinutes: Number(e.target.value) }))}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
            >
              {VALID_TIMEOUTS.map(t => (
                <option key={t} value={t}>{t} minutes</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Allowed Emails
            </label>
            {authData.allowedEmails.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {authData.allowedEmails.map((email, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded">
                    {email}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setAuthData(prev => ({
                          ...prev,
                          allowedEmails: prev.allowedEmails.filter((_, idx) => idx !== i),
                        }))}
                        className="text-gray-400 hover:text-red-500 text-xs"
                        aria-label={`Remove ${email}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={authNewEmail}
                  onChange={e => setAuthNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && authNewEmail.includes('@')) {
                      e.preventDefault();
                      setAuthData(prev => ({
                        ...prev,
                        allowedEmails: [...prev.allowedEmails, authNewEmail.trim().toLowerCase()],
                      }));
                      setAuthNewEmail('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (authNewEmail.includes('@')) {
                      setAuthData(prev => ({
                        ...prev,
                        allowedEmails: [...prev.allowedEmails, authNewEmail.trim().toLowerCase()],
                      }));
                      setAuthNewEmail('');
                    }
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={saveAuth}
              disabled={authSaveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary,#1a3a4a)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Save Auth Config
            </button>
          )}
          {statusBadge(authSaveStatus)}
        </div>
      </AccordionSection>

      {/* ── Sheets Config ────────────────────────────────────────────────── */}
      <AccordionSection title="Google Sheets Integration" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Spreadsheet ID
            </label>
            <input
              type="text"
              value={sheetsData.spreadsheetId}
              onChange={e => setSheetsData(prev => ({ ...prev, spreadsheetId: e.target.value }))}
              disabled={!canEdit}
              placeholder="1a2b3c..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Assessment Sheet Name
              </label>
              <input
                type="text"
                value={sheetsData.assessmentSheetName}
                onChange={e => setSheetsData(prev => ({ ...prev, assessmentSheetName: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Contract Sheet Name
              </label>
              <input
                type="text"
                value={sheetsData.contractSheetName}
                onChange={e => setSheetsData(prev => ({ ...prev, contractSheetName: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={sheetsData.autoSyncOnSubmit}
              onChange={e => setSheetsData(prev => ({ ...prev, autoSyncOnSubmit: e.target.checked }))}
              disabled={!canEdit}
              className="rounded"
            />
            Auto-sync to Google Sheets on submit
          </label>

          {canEdit && (
            <button
              type="button"
              onClick={saveSheets}
              disabled={sheetsSaveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary,#1a3a4a)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Save Sheets Config
            </button>
          )}
          {statusBadge(sheetsSaveStatus)}
        </div>
      </AccordionSection>

      {/* ── Email Config ──────────────────────────────────────────────────── */}
      <AccordionSection title="Email Settings" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Default CC
            </label>
            <input
              type="email"
              value={emailData.defaultCc}
              onChange={e => setEmailData(prev => ({ ...prev, defaultCc: e.target.value }))}
              disabled={!canEdit}
              placeholder="cc@example.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Subject Template
            </label>
            <input
              type="text"
              value={emailData.subjectTemplate}
              onChange={e => setEmailData(prev => ({ ...prev, subjectTemplate: e.target.value }))}
              disabled={!canEdit}
              placeholder="{clientName} - Assessment from {staffName}"
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Placeholders: {'{clientName}'}, {'{date}'}, {'{staffName}'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Signature
            </label>
            <textarea
              value={emailData.signature}
              onChange={e => setEmailData(prev => ({ ...prev, signature: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={emailData.htmlEnabled}
              onChange={e => setEmailData(prev => ({ ...prev, htmlEnabled: e.target.checked }))}
              disabled={!canEdit}
              className="rounded"
            />
            Send HTML-formatted emails
          </label>

          {canEdit && (
            <button
              type="button"
              onClick={saveEmail}
              disabled={emailSaveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary,#1a3a4a)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Save Email Config
            </button>
          )}
          {statusBadge(emailSaveStatus)}
        </div>
      </AccordionSection>
    </div>
  );
}
