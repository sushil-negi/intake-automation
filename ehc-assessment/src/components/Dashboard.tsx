import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardCard } from './ui/DashboardCard';
import { getAllDrafts, saveDraft, getDraft } from '../utils/db';
import type { DraftType } from '../utils/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { logger } from '../utils/logger';
import { isEncrypted, decryptObject } from '../utils/crypto';
import type { AppView } from '../types/navigation';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';
import type { AuthUser } from '../types/auth';
import type { ThemeMode } from '../hooks/useDarkMode';
import { ThemeToggle } from './ui/ThemeToggle';
import { HelpModal } from './ui/HelpModal';
import { useBranding } from '../contexts/BrandingContext';

interface DarkModeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

interface DashboardProps {
  onNavigate: (view: AppView) => void;
  authUser?: AuthUser | null;
  onSignOut?: () => void;
  darkMode?: DarkModeState;
  isSuperAdmin?: boolean;
  orgName?: string | null;
}

const STORAGE_KEYS: Record<DraftType, string> = {
  assessment: 'ehc-assessment-draft',
  serviceContract: 'ehc-service-contract-draft',
};

/** Companion keys that store the IndexedDB draft ID being actively edited.
 *  Set when resuming a draft, cleared on exit. Auto-rescue uses these to
 *  avoid creating duplicates after page reload (e.g., dev server restart). */
const DRAFT_ID_KEYS: Record<DraftType, string> = {
  assessment: 'ehc-assessment-draft-id',
  serviceContract: 'ehc-service-contract-draft-id',
};

/** Try to extract a client name from stored form data (handles encrypted payloads) */
async function extractClientName(type: DraftType, raw: string): Promise<string> {
  try {
    const parsed = isEncrypted(raw)
      ? await decryptObject<AssessmentFormData | ServiceContractFormData>(raw)
      : JSON.parse(raw);
    if (type === 'assessment') {
      const d = parsed as AssessmentFormData;
      return d.clientHelpList?.clientName || '';
    } else {
      const d = parsed as ServiceContractFormData;
      const info = d.serviceAgreement?.customerInfo;
      return [info?.firstName, info?.lastName].filter(Boolean).join(' ') || '';
    }
  } catch {
    return '';
  }
}

/** Check if localStorage has meaningful data (not just empty defaults, handles encrypted payloads) */
async function hasUnsavedData(key: string): Promise<boolean> {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  try {
    const parsed = isEncrypted(raw)
      ? await decryptObject<AssessmentFormData | ServiceContractFormData>(raw)
      : JSON.parse(raw);
    // Quick heuristic: if there's a clientName or firstName filled in, data exists
    if (key === STORAGE_KEYS.assessment) {
      const d = parsed as AssessmentFormData;
      return !!d.clientHelpList?.clientName || !!d.clientHelpList?.dateOfBirth;
    } else {
      const d = parsed as ServiceContractFormData;
      const info = d.serviceAgreement?.customerInfo;
      return !!info?.firstName || !!info?.lastName || !!info?.dateOfBirth;
    }
  } catch {
    return false;
  }
}

export function Dashboard({ onNavigate, authUser, onSignOut, darkMode, isSuperAdmin, orgName }: DashboardProps) {
  const [draftCount, setDraftCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const isOnline = useOnlineStatus();
  const rescuedRef = useRef(false);
  const branding = useBranding();

  const refreshDraftCount = useCallback(() => {
    getAllDrafts().then(drafts => setDraftCount(drafts.length)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshDraftCount();
  }, [refreshDraftCount]);

  // Auto-rescue: on Dashboard mount, save any stale localStorage data as drafts to IndexedDB
  // then clear localStorage so the user isn't interrupted with popups when starting new forms.
  useEffect(() => {
    if (rescuedRef.current) return;
    rescuedRef.current = true;

    (async () => {
      const entries: [DraftType, string][] = [
        ['assessment', STORAGE_KEYS.assessment],
        ['serviceContract', STORAGE_KEYS.serviceContract],
      ];
      let rescued = false;
      for (const [type, key] of entries) {
        const draftIdKey = DRAFT_ID_KEYS[type];
        if (await hasUnsavedData(key)) {
          // Check if this localStorage data belongs to an existing IndexedDB draft
          // (i.e., user was editing a resumed draft when the page reloaded).
          const linkedDraftId = localStorage.getItem(draftIdKey);
          if (linkedDraftId) {
            const existing = await getDraft(linkedDraftId).catch(() => undefined);
            if (existing) {
              // The draft already exists in IndexedDB — no rescue needed.
              // Just clean up localStorage.
              localStorage.removeItem(key);
              localStorage.removeItem(draftIdKey);
              continue;
            }
          }

          const raw = localStorage.getItem(key) || '';
          try {
            const data = isEncrypted(raw)
              ? await decryptObject<AssessmentFormData | ServiceContractFormData>(raw)
              : JSON.parse(raw);
            const clientName = await extractClientName(type, raw);

            // Dedup: skip rescue if a matching draft was saved recently (within 60s)
            const existingDrafts = await getAllDrafts();
            const now = Date.now();
            const isDuplicate = existingDrafts.some(d =>
              d.type === type &&
              d.clientName === (clientName || 'Untitled') &&
              now - new Date(d.lastModified).getTime() < 60_000,
            );

            if (!isDuplicate) {
              await saveDraft({
                id: crypto.randomUUID(),
                clientName: clientName || 'Untitled',
                type,
                data,
                lastModified: new Date().toISOString(),
                status: 'draft',
              });
              rescued = true;
            }
          } catch (err) {
            logger.error('Failed to auto-rescue draft:', err);
          }
          localStorage.removeItem(key);
        } else {
          // No meaningful data — just clean up stale empty data
          localStorage.removeItem(key);
        }
        // Always clean up the companion ID key when returning to dashboard
        localStorage.removeItem(draftIdKey);
      }
      if (rescued) {
        refreshDraftCount();
      }
    })();
  }, [refreshDraftCount]);

  /** Start a new form — localStorage is always clean thanks to auto-rescue */
  const handleNew = (_type: DraftType, view: AppView) => {
    onNavigate(view);
  };

  return (
    <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 relative">
      {/* Skip navigation link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white dark:focus:bg-slate-800 focus:text-gray-900 dark:focus:text-slate-100 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Background watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${branding.logoUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'clamp(280px, 55vw, 700px) auto',
          opacity: 0.06,
        }}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div role="alert" className="bg-yellow-500 text-white text-center py-2 text-sm font-medium relative z-10">
          You are offline. Changes are saved locally and will sync when reconnected.
        </div>
      )}

      {/* Header — compact single row */}
      <header className="sticky top-0 z-10 shadow-md" style={{ background: branding.headerGradient }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <img
            src={branding.logoUrl}
            alt={branding.companyName}
            className="h-10 sm:h-14 w-auto object-contain brightness-0 invert flex-shrink-0"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              aria-label="Help and guide"
              className="w-7 h-7 rounded-full border border-white/30 text-white/80 hover:bg-white/10 text-xs font-bold flex items-center justify-center transition-colors"
            >
              ?
            </button>
            {darkMode && (
              <ThemeToggle mode={darkMode.mode} onChange={darkMode.setMode} />
            )}
            {authUser && (
              <>
                <img
                  src={authUser.picture}
                  alt=""
                  className="w-6 h-6 rounded-full border border-white/30"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs text-white hidden sm:inline">{authUser.name}</span>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-white/20 text-white/90 hover:bg-white/10 transition-all min-h-[36px]"
                  >
                    Sign Out
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-[1]">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)] dark:text-slate-100">
            {authUser ? `Welcome, ${authUser.name.split(' ')[0]}` : 'Welcome'}
          </h1>
          {orgName && (
            <p className="text-[var(--brand-primary)] dark:text-slate-300 mt-1 text-sm font-medium opacity-70">
              {orgName}
            </p>
          )}
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
            Select an option to get started
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
          <DashboardCard
            title="New Assessment"
            subtitle="Start a client intake assessment"
            icon="📋"
            onClick={() => handleNew('assessment', { screen: 'assessment' })}
          />
          <DashboardCard
            title="Service Contract"
            subtitle="Create a new service agreement"
            icon="📄"
            onClick={() => handleNew('serviceContract', { screen: 'serviceContract' })}
          />
          <DashboardCard
            title="Resume Draft"
            subtitle="Continue a saved assessment or contract"
            icon="📂"
            onClick={() => onNavigate({ screen: 'drafts' })}
            badge={draftCount}
          />
          <DashboardCard
            title="Admin / Settings"
            subtitle="Manage configuration and data sync"
            icon="⚙️"
            onClick={() => onNavigate({ screen: 'settings' })}
          />
          {isSuperAdmin && (
            <DashboardCard
              title="Tenant Admin"
              subtitle="Manage organizations and users"
              icon="🛡️"
              onClick={() => onNavigate({ screen: 'admin' })}
            />
          )}
        </div>
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
