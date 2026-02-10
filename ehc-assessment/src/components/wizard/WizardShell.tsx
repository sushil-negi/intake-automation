import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';

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
  children,
}: WizardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Executive Home Care</h1>
                <p className="text-xs text-gray-500">Client Intake Assessment</p>
              </div>
            </div>
            <SaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
          </div>
          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            steps={steps}
            onStepClick={onStepClick}
          />
        </div>
      </header>

      {/* Step Title */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep]?.title}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto px-4 pb-32">
        {children}
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={onBack}
            disabled={isFirst}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              isFirst
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            Back
          </button>
          <span className="text-xs text-gray-400 hidden sm:block">
            {currentStep + 1} / {totalSteps}
          </span>
          <button
            onClick={onNext}
            className="px-6 py-2.5 rounded-lg font-medium text-sm bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-all"
          >
            {isLast ? 'Review & Submit' : 'Continue'}
          </button>
        </div>
      </footer>
    </div>
  );
}

function SaveIndicator({ lastSaved, isSaving }: { lastSaved: Date | null; isSaving: boolean }) {
  if (isSaving) {
    return <span className="text-xs text-gray-400 animate-pulse">Saving...</span>;
  }
  if (lastSaved) {
    return (
      <span className="text-xs text-green-600">
        Saved {lastSaved.toLocaleTimeString()}
      </span>
    );
  }
  return null;
}
