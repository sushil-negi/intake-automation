/**
 * ConflictResolutionModal — shown when a sync conflict is detected.
 *
 * A conflict occurs when two devices edit the same draft simultaneously
 * and the version number on the remote has changed since we last read it.
 *
 * Options:
 * - "Keep Mine" — force-overwrite remote with local data
 * - "Use Theirs" — discard local changes and reload from remote
 * - "Cancel" — dismiss and continue editing (will re-conflict on next sync)
 */

import { useEffect, useRef } from 'react';

export interface ConflictResolutionModalProps {
  /** Client name for context. */
  clientName?: string;
  /** When the remote was last updated. */
  remoteUpdatedAt?: string;
  /** Called when user chooses to force-push local data. */
  onKeepMine: () => void;
  /** Called when user chooses to reload remote data. */
  onUseTheirs: () => void;
  /** Called when user dismisses the modal. */
  onCancel: () => void;
}

export function ConflictResolutionModal({
  clientName,
  remoteUpdatedAt,
  onKeepMine,
  onUseTheirs,
  onCancel,
}: ConflictResolutionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus first button on mount, trap Tab
  useEffect(() => {
    firstBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Icon + Title */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">⚠️</div>
          <h2
            id="conflict-title"
            className="text-lg font-semibold text-gray-900 dark:text-slate-100"
          >
            Sync Conflict
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 text-center">
          {clientName
            ? `The draft for "${clientName}" was updated on another device.`
            : 'This draft was updated on another device.'}
        </p>
        {remoteUpdatedAt && (
          <p className="text-xs text-gray-500 dark:text-slate-500 text-center mb-4">
            Remote updated: {new Date(remoteUpdatedAt).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-slate-500 text-center mb-6">
          Choose which version to keep:
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            ref={firstBtnRef}
            type="button"
            onClick={onKeepMine}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/50 transition-all min-h-[44px]"
          >
            Keep Mine — overwrite remote
          </button>
          <button
            type="button"
            onClick={onUseTheirs}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/50 transition-all min-h-[44px]"
          >
            Use Theirs — reload remote version
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-all min-h-[44px]"
          >
            Cancel — continue editing
          </button>
        </div>
      </div>
    </div>
  );
}
