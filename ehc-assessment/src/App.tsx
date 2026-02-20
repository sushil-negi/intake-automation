import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { AssessmentWizard } from './components/AssessmentWizard';
import { ServiceContractWizard } from './components/ServiceContractWizard';
import { DraftManager } from './components/DraftManager';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { mapAssessmentToContract } from './utils/prefill';
import { saveDraft, getSheetsConfig, saveSheetsConfig, purgeOldDrafts } from './utils/db';
import { purgeOldLogs } from './utils/auditLog';
import { googleSignOut } from './utils/googleAuth';
import { writeEncryptedLocalStorage } from './utils/crypto';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useDarkMode } from './hooks/useDarkMode';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { logger } from './utils/logger';
import { logAudit } from './utils/auditLog';
import { resolveConfig } from './utils/remoteConfig';
import type { AppView } from './types/navigation';
import type { AssessmentFormData } from './types/forms';
import type { DraftRecord } from './utils/db';
import type { AuthUser, AuthConfig } from './types/auth';
import { DEFAULT_AUTH_CONFIG } from './types/auth';
import type { ConfigSource } from './types/remoteConfig';

const SESSION_KEY = 'ehc-auth-user';
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // 8-hour absolute max session

function getSessionUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    // Enforce max session duration on load
    if (user.loginTime && Date.now() - user.loginTime >= MAX_SESSION_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function App() {
  const [view, setView] = useState<AppView>({ screen: 'dashboard' });
  const [gisAuthUser, setGisAuthUser] = useState<AuthUser | null>(getSessionUser);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const [clientId, setClientId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [configSource, setConfigSource] = useState<ConfigSource>('local');
  const darkMode = useDarkMode();

  // Supabase auth — returns non-null user when Supabase is configured + user is signed in
  const {
    supabaseUser,
    loading: supabaseLoading,
    configured: supabaseConfigured,
    signOut: supabaseSignOut,
  } = useSupabaseAuth();

  // Determine the effective auth user:
  // If Supabase is configured → use Supabase user (null until OAuth redirect resolves)
  // Otherwise → use legacy GIS user from sessionStorage
  const authUser = supabaseConfigured ? supabaseUser : gisAuthUser;

  // Load auth config + client ID on mount (try remote first, fall back to local)
  useEffect(() => {
    (async () => {
      try {
        const resolved = await resolveConfig();
        setAuthConfig(resolved.authConfig);
        setClientId(resolved.sheetsConfig.oauthClientId);
        setConfigSource(resolved.source);
      } catch (err) {
        logger.error('Failed to load config:', err);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Log Supabase sign-in when user first appears
  useEffect(() => {
    if (supabaseConfigured && supabaseUser) {
      logAudit('login', undefined, undefined, 'success', supabaseUser.email);
    }
    // Only fire when supabaseUser goes from null → defined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUser?.email]);

  // Legacy GIS login handler
  const handleLogin = useCallback((user: AuthUser) => {
    const withTime = { ...user, loginTime: Date.now() };
    setGisAuthUser(withTime);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(withTime));
    logAudit('login', undefined, undefined, 'success', user.email);
  }, []);

  const handleSignOut = useCallback(async () => {
    logAudit('logout', undefined, undefined, 'success', authUser?.email);

    if (supabaseConfigured) {
      await supabaseSignOut();
    } else {
      setGisAuthUser(null);
      sessionStorage.removeItem(SESSION_KEY);
      googleSignOut();
    }

    // Clear stored OAuth tokens
    try {
      const config = await getSheetsConfig();
      if (config.oauthAccessToken) {
        await saveSheetsConfig({ ...config, oauthAccessToken: '', oauthExpiresAt: '' });
      }
    } catch { /* ignore — config may not exist yet */ }
    setView({ screen: 'dashboard' });
  }, [authUser?.email, supabaseConfigured, supabaseSignOut]);

  // Idle timeout — only active when auth is required and user is logged in
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const { resetTimer, remainingSeconds } = useIdleTimeout({
    timeoutMs: (authConfig.idleTimeoutMinutes || 15) * 60 * 1000,
    warningMs: 2 * 60 * 1000,
    onWarning: () => setShowIdleWarning(true),
    onTimeout: () => {
      setShowIdleWarning(false);
      logAudit('idle_timeout', undefined, undefined, 'info', authUser?.email);
      handleSignOut();
    },
    enabled: authConfig.requireAuth && !!authUser,
  });

  // Absolute session expiry timer (8 hours max)
  useEffect(() => {
    if (!authUser?.loginTime) return;
    const elapsed = Date.now() - authUser.loginTime;
    if (elapsed >= MAX_SESSION_MS) {
      logAudit('logout', undefined, 'Session expired (8hr max)', 'info', authUser.email);
      handleSignOut();
      return;
    }
    const remaining = MAX_SESSION_MS - elapsed;
    const timer = setTimeout(() => {
      logAudit('logout', undefined, 'Session expired (8hr max)', 'info', authUser?.email);
      handleSignOut();
    }, remaining);
    return () => clearTimeout(timer);
  }, [authUser?.loginTime, authUser?.email, handleSignOut]);

  const goHome = () => {
    setView({ screen: 'dashboard' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reload config when returning from settings (config may have changed)
  useEffect(() => {
    if (view.screen === 'dashboard') {
      resolveConfig().then(resolved => {
        setAuthConfig(resolved.authConfig);
        setClientId(resolved.sheetsConfig.oauthClientId);
        setConfigSource(resolved.source);
      }).catch(() => {});
    }
  }, [view.screen]);

  // S5: Data retention — auto-purge drafts and audit logs older than 90 days
  useEffect(() => {
    purgeOldDrafts(90)
      .then(count => { if (count) logAudit('data_purge', 'drafts', `Purged ${count} drafts older than 90 days`); })
      .catch(() => {});
    purgeOldLogs(90)
      .then(count => { if (count) logAudit('data_purge', 'auditLogs', `Purged ${count} audit logs older than 90 days`); })
      .catch(() => {});
  }, []);

  // I1: IndexedDB quota monitoring — warn at 80% usage
  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        if (usage && quota && usage / quota > 0.8) {
          logger.warn(`IndexedDB storage usage high: ${Math.round(usage / 1024 / 1024)}MB / ${Math.round(quota / 1024 / 1024)}MB (${Math.round(usage / quota * 100)}%)`);
        }
      }).catch(() => {});
    }
  }, []);

  // Show loading while checking auth config or Supabase session
  if (authLoading || (supabaseConfigured && supabaseLoading)) {
    return (
      <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Auth gate: if requireAuth is on and user not logged in, show login screen.
  // When Supabase is configured, the login screen shows Supabase OAuth button (no clientId needed).
  // When Supabase is NOT configured, bypass when no clientId — admin must access Settings first.
  if (authConfig.requireAuth && !authUser && (supabaseConfigured || clientId)) {
    return (
      <LoginScreen
        clientId={clientId}
        allowedEmails={authConfig.allowedEmails}
        onLogin={handleLogin}
        supabaseLoading={supabaseLoading}
      />
    );
  }

  const handleContinueToContract = async (assessmentData: AssessmentFormData) => {
    const assessmentId = `assessment-${Date.now()}`;
    try {
      await saveDraft({
        id: assessmentId,
        clientName: assessmentData.clientHelpList.clientName || 'Unnamed Client',
        type: 'assessment',
        data: assessmentData,
        lastModified: new Date().toISOString(),
        status: 'draft',
      });
    } catch (err) {
      logger.error('Failed to save linked assessment:', err);
    }
    setView({ screen: 'serviceContract', prefillFrom: assessmentData, linkedAssessmentId: assessmentId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const idleWarningDialog = showIdleWarning ? (
    <ConfirmDialog
      title="Session Timeout Warning"
      message={`Your session will expire in ${remainingSeconds} seconds due to inactivity. Move your mouse or press a key to stay signed in.`}
      actions={[
        { label: 'Stay Signed In', variant: 'primary' as const, onClick: () => { resetTimer(); setShowIdleWarning(false); } },
        { label: 'Sign Out Now', variant: 'secondary' as const, onClick: () => { setShowIdleWarning(false); handleSignOut(); } },
      ]}
      onClose={() => { resetTimer(); setShowIdleWarning(false); }}
    />
  ) : null;

  let content: React.ReactNode;

  switch (view.screen) {
    case 'dashboard':
      content = <Dashboard onNavigate={setView} authUser={authUser} onSignOut={authConfig.requireAuth ? handleSignOut : undefined} darkMode={darkMode} />;
      break;

    case 'assessment':
      content = (
        <ErrorBoundary fallbackTitle="Assessment form error">
          <AssessmentWizard
            onGoHome={goHome}
            onContinueToContract={handleContinueToContract}
            resumeStep={view.resumeStep}
            draftId={view.draftId}
            authUserName={authUser?.name}
          />
        </ErrorBoundary>
      );
      break;

    case 'serviceContract':
      content = (
        <ErrorBoundary fallbackTitle="Service contract form error">
          <ServiceContractWizard
            onGoHome={goHome}
            prefillData={view.prefillFrom ? mapAssessmentToContract(view.prefillFrom) : undefined}
            resumeStep={view.resumeStep}
            draftId={view.draftId}
            linkedAssessmentId={view.linkedAssessmentId}
            authUserName={authUser?.name}
          />
        </ErrorBoundary>
      );
      break;

    case 'drafts':
      content = (
        <div className="min-h-screen bg-sky-50/60 dark:bg-slate-900 relative">
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
          <header className="sticky top-0 z-10 shadow-md" style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #1f4f5f 50%, #1a3a4a 100%)' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
              <img
                src="/ehc-watermark-h.png"
                alt="Executive Home Care of Chester County"
                className="h-10 sm:h-14 w-auto object-contain brightness-0 invert"
              />
              <button
                type="button"
                onClick={goHome}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-all min-h-[36px]"
              >
                Home
              </button>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8 relative z-[1]">
            <DraftManager
              currentData={null}
              currentStep={0}
              onResumeDraft={async (draft: DraftRecord) => {
                if (draft.type === 'serviceContract') {
                  await writeEncryptedLocalStorage('ehc-service-contract-draft', draft.data);
                  setView({
                    screen: 'serviceContract',
                    draftId: draft.id,
                    resumeStep: draft.currentStep,
                    linkedAssessmentId: draft.linkedAssessmentId,
                  });
                } else {
                  await writeEncryptedLocalStorage('ehc-assessment-draft', draft.data);
                  setView({
                    screen: 'assessment',
                    draftId: draft.id,
                    resumeStep: draft.currentStep,
                  });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNewAssessment={() => setView({ screen: 'assessment' })}
            />
          </main>
        </div>
      );
      break;

    case 'settings':
      content = <SettingsScreen onGoHome={goHome} authUserEmail={authUser?.email} configSource={configSource} />;
      break;

    default:
      content = <Dashboard onNavigate={setView} authUser={authUser} onSignOut={authConfig.requireAuth ? handleSignOut : undefined} darkMode={darkMode} />;
  }

  return (
    <>
      {content}
      {idleWarningDialog}
    </>
  );
}

export default App;
