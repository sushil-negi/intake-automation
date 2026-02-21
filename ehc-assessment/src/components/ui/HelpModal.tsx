import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface HelpModalProps {
  onClose: () => void;
}

type HelpTab = 'getting-started' | 'keyboard' | 'features' | 'accessibility';

const TABS: { key: HelpTab; label: string }[] = [
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'features', label: 'Features' },
  { key: 'accessibility', label: 'Accessibility' },
];

export function HelpModal({ onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<HelpTab>('getting-started');
  useFocusTrap(modalRef);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Help & Guide"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div ref={modalRef} className="relative flex flex-col w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Help & Guide</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto flex-shrink-0" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                activeTab === tab.key
                  ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'getting-started' && <GettingStartedContent />}
          {activeTab === 'keyboard' && <KeyboardContent />}
          {activeTab === 'features' && <FeaturesContent />}
          {activeTab === 'accessibility' && <AccessibilityContent />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GettingStartedContent() {
  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Welcome to EHC Assessment</h3>
        <p>This application helps you create client intake assessments and service contracts for Executive Home Care.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Quick Start</h3>
        <ol className="list-decimal list-inside space-y-2 ml-1">
          <li><strong>New Assessment</strong> &mdash; Start a client intake assessment with 7 steps: Client Help List, History, Assessment, Medications, Home Safety, Consent & Signatures, and Review.</li>
          <li><strong>Service Contract</strong> &mdash; Create a service agreement. You can also start one directly from a completed assessment to auto-fill client information.</li>
          <li><strong>Resume Draft</strong> &mdash; Continue working on a previously saved assessment or contract.</li>
          <li><strong>Settings</strong> &mdash; Configure Google Sheets sync, cloud sync, authentication, email templates, and data management.</li>
        </ol>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Auto-Save</h3>
        <p>Your work is automatically saved and encrypted on your device as you type. When cloud sync is enabled, changes also sync to the server in the background. Look for the <span className="text-green-600 dark:text-green-400 font-medium">Saved</span> indicator in the header.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Saving Drafts</h3>
        <p>Click <strong>Save Draft</strong> in the footer to save a named draft you can resume later. Drafts are encrypted and stored securely on your device. When cloud sync is configured, drafts automatically sync across all devices in your organization.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">PDF Export</h3>
        <p>On the Review step, click <strong>Preview PDF</strong> to see the generated document. You can download it or go back to make changes.</p>
      </section>
    </div>
  );
}

function KeyboardContent() {
  const shortcuts: { keys: string; description: string }[] = [
    { keys: 'Arrow Up / Down', description: 'Navigate between toggle card options within a group' },
    { keys: 'Enter / Space', description: 'Select the focused toggle card option' },
    { keys: 'Tab', description: 'Move focus to the next form field or button' },
    { keys: 'Shift + Tab', description: 'Move focus to the previous field or button' },
    { keys: 'Escape', description: 'Close modals and dialogs' },
  ];

  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-start gap-3 py-1.5">
              <kbd className="flex-shrink-0 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-800 dark:text-slate-200">
                {s.keys}
              </kbd>
              <span>{s.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Signature Pad</h3>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Draw your signature using mouse or touch</li>
          <li>Click <strong>Undo</strong> to remove the last stroke</li>
          <li>Click <strong>Clear</strong> to start over</li>
          <li>All consent checkboxes must be acknowledged before signing</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Form Navigation</h3>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Use <strong>Continue</strong> and <strong>Back</strong> buttons to move between steps</li>
          <li>Click progress bar dots to jump to any step</li>
          <li>Validation errors will be shown when you try to proceed</li>
        </ul>
      </section>
    </div>
  );
}

function FeaturesContent() {
  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Dark Mode</h3>
        <p>Toggle between Light, Dark, and System themes using the theme button in the header. <strong>System</strong> follows your operating system&apos;s preference.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Offline Support</h3>
        <p>The app works offline. Your data is saved locally with AES-256 encryption. A yellow banner appears when you&apos;re disconnected. Any changes made offline are automatically synced to the cloud when your connection is restored.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Google Sheets Sync</h3>
        <p>Sync submitted assessments and contracts to Google Sheets. Configure this in <strong>Settings &gt; Google Sheets</strong>. Requires OAuth setup by an administrator.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Export Privacy Filters</h3>
        <p>Control which PHI categories are included in CSV/JSON exports. Configure 7 category toggles in <strong>Settings &gt; Export Privacy</strong>. Filters do not affect PDF exports.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Idle Timeout</h3>
        <p>For security, the app automatically signs you out after a period of inactivity. The default is 15 minutes, configurable in <strong>Settings</strong> (5, 10, 15, or 30 minutes). A warning appears 2 minutes before timeout.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Address & Drug Autocomplete</h3>
        <p>Address fields offer autocomplete suggestions via OpenStreetMap. Medication name fields suggest FDA-registered drugs. Both work online only and fall back to free-text input when offline.</p>
      </section>
    </div>
  );
}

function AccessibilityContent() {
  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Accessibility Statement</h3>
        <p>This application is designed to meet WCAG 2.1 AA accessibility standards.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Screen Readers</h3>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>All form fields have descriptive labels and aria attributes</li>
          <li>Error messages are announced via <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1 rounded">role=&quot;alert&quot;</code></li>
          <li>Save status is announced via <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1 rounded">aria-live=&quot;polite&quot;</code></li>
          <li>Skip-to-content links are provided on every page</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Visual Design</h3>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Minimum 4.5:1 contrast ratio for text</li>
          <li>44px minimum touch targets for all interactive elements</li>
          <li>Focus indicators on all interactive elements</li>
          <li>Dark mode with accessible slate color palette</li>
          <li>No information conveyed by color alone</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Motor Accessibility</h3>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Full keyboard navigation support</li>
          <li>No time-dependent interactions (except idle timeout, which is configurable)</li>
          <li>Large click targets throughout the application</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Need Help?</h3>
        <p>If you encounter any accessibility issues, please contact your system administrator.</p>
      </section>
    </div>
  );
}
