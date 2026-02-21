import { useState, useEffect, useRef, useMemo } from 'react';
import { getAllDrafts, deleteDraft, saveDraft, getEmailConfig, type DraftRecord } from '../utils/db';
import { exportJSON, exportCSV, importJSON, exportAllDraftsZip } from '../utils/exportData';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/auditLog';
import { resolveTemplate, resolveEmailBody } from '../utils/emailTemplates';
import { useSheetsSync } from '../hooks/useSheetsSync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSupabaseDrafts } from '../hooks/useSupabaseDrafts';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import type { EmailConfig } from '../types/emailConfig';
import { DEFAULT_EMAIL_CONFIG } from '../types/emailConfig';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmailComposeModal } from './ui/EmailComposeModal';
import { useBranding } from '../contexts/BrandingContext';

const ASSESSMENT_STEP_LABELS = [
  'Client Info',
  'History',
  'Assessment',
  'Medications',
  'Safety',
  'Consent',
  'Review',
];

const CONTRACT_STEP_LABELS = [
  'Agreement',
  'Terms',
  'Rights',
  'DCW Notice',
  'Transport',
  'Packet',
  'Review',
];

function getStepLabel(draft: DraftRecord): string {
  const labels = draft.type === 'serviceContract' ? CONTRACT_STEP_LABELS : ASSESSMENT_STEP_LABELS;
  return draft.currentStep != null ? (labels[draft.currentStep] || '') : '';
}

interface Props {
  onResumeDraft: (draft: DraftRecord) => void;
  onNewAssessment: () => void;
  currentData: AssessmentFormData | null;
  currentStep: number;
  /** Supabase auth.uid — for real-time drafts. */
  supabaseUserId?: string | null;
  /** Supabase org_id — for real-time drafts. */
  supabaseOrgId?: string | null;
}

export function DraftManager({ onResumeDraft, onNewAssessment, currentData, currentStep, supabaseUserId: _supabaseUserId, supabaseOrgId }: Props) {
  const branding = useBranding();
  const [localDrafts, setLocalDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'assessment' | 'serviceContract'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [importError, setImportError] = useState('');
  const [zipExporting, setZipExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close export menu on click outside
  useEffect(() => {
    if (!exportMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportMenuId]);

  // Real-time drafts from Supabase (when configured)
  const supabaseConfigured = isSupabaseConfigured();
  const { drafts: remoteDrafts, loading: remoteLoading, realtimeConnected } = useSupabaseDrafts({
    orgId: supabaseOrgId ?? null,
    enabled: supabaseConfigured && !!supabaseOrgId,
  });

  // Merge local + remote drafts: remote is source of truth, local fills offline-only
  const drafts = useMemo(() => {
    if (!supabaseConfigured) return localDrafts;
    const byId = new Map<string, DraftRecord>();
    for (const rd of remoteDrafts) byId.set(rd.id, rd);
    for (const ld of localDrafts) {
      if (!byId.has(ld.id)) byId.set(ld.id, ld);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );
  }, [localDrafts, remoteDrafts, supabaseConfigured]);

  // Sheets sync
  const { config: sheetsConfig, syncDraft } = useSheetsSync();
  const isOnline = useOnlineStatus();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, { status: 'ok' | 'error'; error?: string }>>({});
  const sheetsConfigured = !!(sheetsConfig?.spreadsheetId && (
    sheetsConfig.authMethod === 'oauth'
      ? sheetsConfig.oauthAccessToken
      : sheetsConfig.apiKey
  ));

  // Email state
  const [emailDraftId, setEmailDraftId] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailComposeData, setEmailComposeData] = useState<{
    blob: Blob; filename: string; draftId: string; clientName: string; type: string; staffName: string;
  } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);

  // Load email config
  useEffect(() => {
    getEmailConfig().then(setEmailConfig).catch(() => {/* use defaults */});
  }, []);

  const handleSyncDraft = async (draft: DraftRecord) => {
    setSyncingId(draft.id);
    setSyncResult(prev => { const next = { ...prev }; delete next[draft.id]; return next; });
    try {
      const result = await syncDraft(draft);
      setSyncResult(prev => ({ ...prev, [draft.id]: { status: result.ok ? 'ok' : 'error', error: result.error } }));
      logAudit('sheets_sync', draft.id, draft.clientName, result.ok ? 'success' : 'failure');
    } catch (e) {
      setSyncResult(prev => ({ ...prev, [draft.id]: { status: 'error', error: e instanceof Error ? e.message : 'Network error' } }));
    } finally {
      setSyncingId(null);
    }
  };

  const handleExportData = async (draft: DraftRecord, format: 'csv' | 'json') => {
    const name = draft.clientName || 'Unknown';
    const privacyConfig = sheetsConfig?.exportPrivacy;
    logAudit(format === 'csv' ? 'csv_export' : 'json_export', draft.id, name);
    if (draft.type === 'serviceContract') {
      const { exportContractCSV, exportContractJSON } = await import('../utils/contractExportData');
      const contractData = draft.data as ServiceContractFormData;
      if (format === 'csv') exportContractCSV(contractData, name, privacyConfig);
      else exportContractJSON(contractData, name, privacyConfig);
    } else {
      const assessmentData = draft.data as AssessmentFormData;
      if (format === 'csv') exportCSV(assessmentData, name, privacyConfig);
      else exportJSON(assessmentData, name, privacyConfig);
    }
    setExportMenuId(null);
  };

  const handleExportPdf = async (draft: DraftRecord) => {
    setPdfLoadingId(draft.id);
    logAudit('pdf_export', draft.id, draft.clientName);
    try {
      if (draft.type === 'serviceContract') {
        const { generateContractPdf } = await import('../utils/pdf/generateContractPdf');
        await generateContractPdf(draft.data as ServiceContractFormData);
      } else {
        const { generatePdf } = await import('../utils/pdf/generatePdf');
        await generatePdf(draft.data as AssessmentFormData);
      }
    } catch (err) {
      logger.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleEmailPdf = async (draft: DraftRecord) => {
    setEmailDraftId(draft.id);
    try {
      let blob: Blob;
      let filename: string;
      if (draft.type === 'serviceContract') {
        const { buildContractPdf, getContractFilename } = await import('../utils/pdf/generateContractPdf');
        const doc = await buildContractPdf(draft.data as ServiceContractFormData, branding);
        filename = getContractFilename(draft.clientName || 'Unknown');
        blob = doc.output('blob');
      } else {
        const { buildAssessmentPdf, getAssessmentFilename } = await import('../utils/pdf/generatePdf');
        const doc = await buildAssessmentPdf(draft.data as AssessmentFormData, branding);
        filename = getAssessmentFilename(draft.clientName || 'Unknown');
        blob = doc.output('blob');
      }
      // Extract staff name from draft data
      const staffName = draft.type === 'serviceContract'
        ? (draft.data as ServiceContractFormData).serviceAgreement?.ehcRepName || ''
        : (draft.data as AssessmentFormData).clientHistory?.ehcStaffName || '';
      setEmailComposeData({
        blob,
        filename,
        draftId: draft.id,
        clientName: draft.clientName || 'Client',
        type: draft.type === 'serviceContract' ? 'Service Contract' : 'Assessment',
        staffName,
      });
      setShowEmailCompose(true);
    } catch (err) {
      logger.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setEmailDraftId(null);
    }
  };

  // Auto-dismiss email status after 4 seconds
  useEffect(() => {
    if (!emailStatus) return;
    const timer = setTimeout(() => setEmailStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [emailStatus]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const data = await importJSON(file);
      const importedDraft: DraftRecord = {
        id: `import-${Date.now()}`,
        clientName: data.clientHelpList?.clientName || 'Imported',
        type: 'assessment',
        data,
        lastModified: new Date().toISOString(),
        status: 'draft',
        currentStep: 0,
      };
      onResumeDraft(importedDraft);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportAllZip = async () => {
    if (drafts.length === 0) return;
    setZipExporting(true);
    logAudit('zip_export', undefined, `${drafts.length} drafts`);
    try {
      await exportAllDraftsZip(drafts);
    } catch (err) {
      logger.error('ZIP export failed:', err);
    } finally {
      setZipExporting(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const allDrafts = await getAllDrafts();
      setLocalDrafts(allDrafts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()));
    } catch (e) {
      logger.error('Failed to load drafts:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleSaveCurrentAsDraft = async () => {
    if (!currentData) return;
    const id = crypto.randomUUID();
    const draft: DraftRecord = {
      id,
      clientName: currentData.clientHelpList.clientName || 'Unnamed Client',
      type: 'assessment',
      data: currentData,
      lastModified: new Date().toISOString(),
      status: 'draft',
      currentStep,
    };
    await saveDraft(draft);
    await loadDrafts();
  };

  const handleDelete = async (id: string) => {
    logAudit('draft_delete', id);
    await deleteDraft(id);
    setConfirmDelete(null);
    await loadDrafts();
  };

  const handleResume = (draft: DraftRecord) => {
    logAudit('draft_resume', draft.id, draft.clientName);
    onResumeDraft(draft);
  };

  const handleEditSubmitted = (draft: DraftRecord) => {
    logAudit('submitted_edit', draft.id, `${draft.clientName} — editing submitted v${draft.version ?? 1}`);
    // Reopen as draft so the wizard treats it as editable
    onResumeDraft({ ...draft, status: 'draft' });
  };

  // Filter drafts by search query, status, and type
  const filteredDrafts = drafts.filter(d => {
    const matchesSearch = !searchQuery || (d.clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const isAssessment = d.type !== 'serviceContract';
    const matchesType = typeFilter === 'all' || (typeFilter === 'assessment' ? isAssessment : !isAssessment);
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort filtered drafts
  const sortedDrafts = [...filteredDrafts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    if (sortBy === 'oldest') return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
    return (a.clientName || '').localeCompare(b.clientName || '');
  });

  if (loading || (supabaseConfigured && remoteLoading && localDrafts.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading drafts..." size="sm" />
      </div>
    );
  }

  const renderDraftCard = (draft: DraftRecord) => (
    <div
      key={draft.id}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
          {draft.clientName || 'Unnamed Client'}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Last modified: {new Date(draft.lastModified).toLocaleString()}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
            draft.type === 'serviceContract'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
          }`}>
            {draft.type === 'serviceContract' ? 'Contract' : 'Assessment'}
          </span>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
            draft.status === 'submitted'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
          }`}>
            {draft.status === 'submitted' ? `Submitted${(draft.version ?? 1) > 1 ? ` (v${draft.version})` : ''}` : 'Draft'}
          </span>
          {draft.currentStep != null && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Step {draft.currentStep + 1}: {getStepLabel(draft)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:ml-3">
        <div className="relative" ref={exportMenuId === draft.id ? exportMenuRef : undefined}>
          <div className="flex">
            <button
              type="button"
              disabled={pdfLoadingId === draft.id}
              onClick={() => handleExportPdf(draft)}
              aria-label={`Export ${draft.clientName || 'draft'} as PDF`}
              className="px-3 py-1.5 text-xs font-medium rounded-l-lg border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-wait"
            >
              {pdfLoadingId === draft.id ? 'PDF...' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={() => setExportMenuId(exportMenuId === draft.id ? null : draft.id)}
              className="px-1.5 py-1.5 text-xs font-medium rounded-r-lg border border-l-0 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white transition-all min-h-[44px]"
              aria-label="More export options"
              aria-haspopup="menu"
              aria-expanded={exportMenuId === draft.id}
            >
              ▾
            </button>
          </div>
          {exportMenuId === draft.id && (
            <div role="menu" className="absolute right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20 min-w-[100px]">
              <button
                type="button"
                onClick={() => { handleExportData(draft, 'csv'); setExportMenuId(null); }}
                role="menuitem"
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => { handleExportData(draft, 'json'); setExportMenuId(null); }}
                role="menuitem"
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Export JSON
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={emailDraftId === draft.id}
          onClick={() => handleEmailPdf(draft)}
          aria-label={`Email ${draft.clientName || 'draft'} PDF`}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-wait"
        >
          {emailDraftId === draft.id ? 'Email...' : 'Email'}
        </button>
        {sheetsConfigured && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => handleSyncDraft(draft)}
              disabled={syncingId === draft.id || !isOnline}
              aria-label={`Sync ${draft.clientName || 'draft'} to Google Sheets`}
              title={!isOnline ? 'Offline — sync unavailable' : syncResult[draft.id]?.error || undefined}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed ${
                syncResult[draft.id]?.status === 'ok'
                  ? 'border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30'
                  : syncResult[draft.id]?.status === 'error'
                  ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/30'
                  : 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30'
              }`}
            >
              {syncingId === draft.id ? 'Sync...' : syncResult[draft.id]?.status === 'ok' ? 'Synced' : syncResult[draft.id]?.status === 'error' ? 'Error' : 'Sync'}
            </button>
            {syncResult[draft.id]?.status === 'error' && syncResult[draft.id]?.error && (
              <span className="text-[10px] text-red-600 dark:text-red-400 max-w-[200px] text-right leading-tight">
                {syncResult[draft.id].error}
              </span>
            )}
          </div>
        )}
        {draft.status === 'submitted' ? (
          confirmEdit === draft.id ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { setConfirmEdit(null); handleEditSubmitted(draft); }}
                aria-label={`Confirm edit submitted ${draft.clientName || 'draft'}`}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all min-h-[44px]"
              >
                Yes, Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmEdit(null)}
                aria-label="Cancel edit"
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-all min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmEdit(draft.id)}
              aria-label={`Edit submitted ${draft.type === 'serviceContract' ? 'contract' : 'assessment'} for ${draft.clientName || 'unnamed client'}`}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-all min-h-[44px]"
            >
              Edit
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => handleResume(draft)}
            aria-label={`Resume ${draft.type === 'serviceContract' ? 'contract' : 'assessment'} for ${draft.clientName || 'unnamed client'}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/50 transition-all min-h-[44px]"
          >
            Resume
          </button>
        )}
        {confirmDelete === draft.id ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleDelete(draft.id)}
              aria-label={`Confirm delete ${draft.clientName || 'draft'}`}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all min-h-[44px]"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              aria-label="Cancel delete"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-all min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(draft.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-all min-h-[44px]"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Saved Drafts</h3>
          {supabaseConfigured && (
            <span
              title={realtimeConnected ? 'Real-time sync active' : 'Real-time sync disconnected'}
              className={`inline-block w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-gray-400'}`}
            />
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import assessment from JSON file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all min-h-[36px]"
          >
            Import JSON
          </button>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllZip}
              disabled={zipExporting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all min-h-[36px] disabled:opacity-50 disabled:cursor-wait"
            >
              {zipExporting ? 'Exporting...' : 'Export All (ZIP)'}
            </button>
          )}
          {currentData && (
            <button
              type="button"
              onClick={handleSaveCurrentAsDraft}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-600 bg-white hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:bg-slate-800 dark:hover:bg-amber-900/30 transition-all min-h-[36px]"
            >
              Save Current as Draft
            </button>
          )}
          <button
            type="button"
            onClick={onNewAssessment}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all min-h-[36px]"
          >
            New Assessment
          </button>
        </div>
      </div>

      {emailStatus && (
        <div
          role="status"
          className={`rounded-xl p-3 text-sm font-medium ${
            emailStatus.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
          }`}
        >
          {emailStatus.message}
        </div>
      )}

      {importError && (
        <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
          {importError}
        </div>
      )}

      {/* Search & Filter Bar */}
      {drafts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Search by client name..."
            aria-label="Search drafts by client name"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as 'all' | 'assessment' | 'serviceContract')}
            aria-label="Filter drafts by type"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">All Types</option>
            <option value="assessment">Assessments ({drafts.filter(d => d.type !== 'serviceContract').length})</option>
            <option value="serviceContract">Contracts ({drafts.filter(d => d.type === 'serviceContract').length})</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'draft' | 'submitted')}
            aria-label="Filter drafts by status"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">All Status</option>
            <option value="draft">Drafts ({drafts.filter(d => d.status === 'draft').length})</option>
            <option value="submitted">Submitted ({drafts.filter(d => d.status === 'submitted').length})</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
            aria-label="Sort drafts"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 dark:text-slate-400 text-sm">No saved drafts</p>
          <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">Start a new assessment or service contract to begin</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 text-center">
          <p className="text-gray-500 dark:text-slate-400 text-sm">No matching drafts</p>
          <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-gray-500 dark:text-slate-400">{sortedDrafts.length} result{sortedDrafts.length !== 1 ? 's' : ''}</p>

          {/* Assessments Section */}
          {(() => {
            const assessmentDrafts = sortedDrafts.filter(d => d.type !== 'serviceContract');
            if (assessmentDrafts.length === 0 && typeFilter === 'serviceContract') return null;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Assessments
                    <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">({assessmentDrafts.length})</span>
                  </h4>
                </div>
                {assessmentDrafts.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 pl-4">No assessment drafts</p>
                ) : (
                  assessmentDrafts.map(renderDraftCard)
                )}
              </div>
            );
          })()}

          {/* Contracts Section */}
          {(() => {
            const contractDrafts = sortedDrafts.filter(d => d.type === 'serviceContract');
            if (contractDrafts.length === 0 && typeFilter === 'assessment') return null;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Service Contracts
                    <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">({contractDrafts.length})</span>
                  </h4>
                </div>
                {contractDrafts.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 pl-4">No contract drafts</p>
                ) : (
                  contractDrafts.map(renderDraftCard)
                )}
              </div>
            );
          })()}
        </div>
      )}

      {showEmailCompose && emailComposeData && (() => {
        const isContract = emailComposeData.type === 'Service Contract';
        const templateVars = {
          clientName: emailComposeData.clientName,
          date: new Date().toLocaleDateString(),
          staffName: emailComposeData.staffName,
        };
        return (
          <EmailComposeModal
            defaultSubject={resolveTemplate(
              isContract ? emailConfig.contractSubjectTemplate : emailConfig.assessmentSubjectTemplate,
              templateVars,
            )}
            defaultBody={resolveEmailBody(
              isContract ? emailConfig.contractBodyTemplate : emailConfig.assessmentBodyTemplate,
              templateVars,
              emailConfig.emailSignature,
            )}
            defaultCc={emailConfig.defaultCc}
            sending={emailSending}
            onSend={async (composeData) => {
              setEmailSending(true);
              try {
                const { sendPdfEmail } = await import('../utils/emailApi');
                const result = await sendPdfEmail(
                  {
                    to: composeData.to,
                    cc: composeData.cc || undefined,
                    subject: composeData.subject,
                    body: composeData.body,
                    pdfBlob: emailComposeData.blob,
                    filename: emailComposeData.filename,
                    htmlEnabled: emailConfig.htmlEnabled,
                  },
                  {
                    draftId: emailComposeData.draftId,
                    documentType: emailComposeData.type,
                  },
                );
                if (result.ok) {
                  setShowEmailCompose(false);
                  setEmailComposeData(null);
                  setEmailStatus({ message: `PDF emailed successfully to ${composeData.to}`, type: 'success' });
                } else {
                  setEmailStatus({ message: `Failed to send email: ${result.error}`, type: 'error' });
                }
              } catch {
                setEmailStatus({ message: 'Failed to send email. Please try again.', type: 'error' });
              } finally {
                setEmailSending(false);
              }
            }}
            onClose={() => {
              setShowEmailCompose(false);
              setEmailComposeData(null);
            }}
          />
        );
      })()}
    </div>
  );
}
