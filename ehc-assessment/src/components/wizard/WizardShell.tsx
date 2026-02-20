import { useState, type ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useBranding } from '../../contexts/BrandingContext';

interface WizardShellProps {
  currentStep: number;
  totalSteps: number;
  steps: { shortTitle: string; title: string }[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  onShowDrafts?: () => void;
  onSaveDraft?: () => void | Promise<void>;
  showDrafts?: boolean;
  title?: string;
  onGoHome?: () => void;
  /** Whether the form has unsaved changes worth saving. When false, Home navigates directly without confirmation. */
  hasUnsavedChanges?: boolean;
  /** Called when user chooses "Discard & Exit" — use to clear localStorage */
  onDiscard?: () => void;
  children: ReactNode;
}

export function WizardShell({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  onNext,
  onBack,
  isFirst,
  isLast,
  lastSaved,
  isSaving,
  onShowDrafts,
  onSaveDraft,
  showDrafts,
  title = 'Client Intake Assessment',
  onGoHome,
  hasUnsavedChanges = true,
  onDiscard,
  children,
}: WizardShellProps) {
  const branding = useBranding();
  const isOnline = useOnlineStatus();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleHomeClick = () => {
    if (onGoHome) {
      if (hasUnsavedChanges) {
        setShowExitConfirm(true);
      } else {
        onDiscard?.();
        onGoHome();
      }
    }
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

      {/* Background watermark — horizontal logo, responsive sizing */}
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
        <div data-print-hide role="alert" className="bg-yellow-500 text-white text-center py-2 text-sm font-medium relative z-10">
          You are offline. Changes are saved locally and will sync when reconnected.
        </div>
      )}

      {/* Header — compact layout */}
      <header className="sticky top-0 z-10 shadow-md" style={{ background: 'var(--brand-gradient)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
          {/* Single row: logo + title left, utilities right */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="h-10 sm:h-14 w-auto object-contain brightness-0 invert flex-shrink-0"
              />
              <p className="text-xs sm:text-sm font-medium tracking-wide text-amber-400 truncate">
                {title}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
              {onGoHome && (
                <button
                  type="button"
                  onClick={handleHomeClick}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all min-h-[36px]"
                >
                  Home
                </button>
              )}
              {onShowDrafts && (
                <button
                  type="button"
                  onClick={onShowDrafts}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all min-h-[36px] ${
                    showDrafts
                      ? 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10'
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  {showDrafts ? 'Back to Form' : 'Drafts'}
                </button>
              )}
            </div>
          </div>
          {!showDrafts && (
            <ProgressBar
              currentStep={currentStep}
              totalSteps={totalSteps}
              steps={steps}
              onStepClick={onStepClick}
            />
          )}
        </div>
      </header>

      {/* Step Title */}
      {!showDrafts && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2 relative z-[1]">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{steps[currentStep]?.title}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
      )}

      {/* Form Content */}
      <main id="main-content" className={`max-w-4xl mx-auto px-4 sm:px-6 relative z-[1] ${showDrafts ? 'pb-8' : 'pb-32'}`}>
        {children}
      </main>

      {/* Navigation Footer — hidden when viewing drafts */}
      {!showDrafts && (
        <footer className="fixed bottom-0 left-0 right-0 shadow-lg z-10" style={{ background: 'var(--brand-gradient)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center">
            <button
              onClick={onBack}
              disabled={isFirst}
              aria-label="Go to previous step"
              className={`px-5 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all min-h-[44px] ${
                isFirst
                  ? 'text-white/70 cursor-not-allowed'
                  : 'text-white bg-white/10 hover:bg-white/20 active:bg-white/30'
              }`}
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/90 hidden sm:block">
                {currentStep + 1} / {totalSteps}
              </span>
              {onSaveDraft && (
                <button
                  type="button"
                  onClick={onSaveDraft}
                  className="px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm text-white border border-white/20 hover:bg-white/10 active:bg-white/20 transition-all min-h-[44px]"
                >
                  Save Draft
                </button>
              )}
            </div>
            <button
              onClick={onNext}
              aria-label={isLast ? 'Review and submit assessment' : 'Go to next step'}
              className="px-5 sm:px-6 py-2.5 rounded-lg font-medium text-sm text-white transition-all min-h-[44px]"
              style={{ backgroundColor: '#8a6212' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6e4e0e')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8a6212')}
            >
              {isLast ? 'Review & Submit' : 'Continue'}
            </button>
          </div>
        </footer>
      )}

      {/* Exit confirmation dialog */}
      {showExitConfirm && onGoHome && (
        <ConfirmDialog
          title="Leave Form?"
          message="You have unsaved progress. Would you like to save a draft before leaving?"
          actions={[
            ...(onSaveDraft ? [{
              label: 'Save Draft & Exit',
              variant: 'primary' as const,
              onClick: async () => { await onSaveDraft(); setShowExitConfirm(false); onDiscard?.(); onGoHome(); },
            }] : []),
            {
              label: 'Discard & Exit',
              variant: 'danger' as const,
              onClick: () => { onDiscard?.(); setShowExitConfirm(false); onGoHome(); },
            },
            {
              label: 'Cancel',
              variant: 'secondary' as const,
              onClick: () => setShowExitConfirm(false),
            },
          ]}
          onClose={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  );
}

function SaveIndicator({ lastSaved, isSaving }: { lastSaved: Date | null; isSaving: boolean }) {
  return (
    <span role="status" aria-live="polite">
      {isSaving ? (
        <span className="text-xs text-white animate-pulse">Saving...</span>
      ) : lastSaved ? (
        <span className="text-xs text-green-300">
          Saved {lastSaved.toLocaleTimeString()}
        </span>
      ) : null}
    </span>
  );
}
