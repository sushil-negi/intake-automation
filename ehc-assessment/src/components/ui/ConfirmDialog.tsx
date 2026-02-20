import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface DialogAction {
  label: string;
  variant: 'primary' | 'danger' | 'secondary';
  onClick: () => void;
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  actions: DialogAction[];
  onClose: () => void;
}

export function ConfirmDialog({ title, message, actions, onClose }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const variantClasses: Record<DialogAction['variant'], string> = {
    primary: 'bg-[var(--brand-primary)] dark:bg-slate-600 text-white hover:opacity-90 dark:hover:bg-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div ref={dialogRef} className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300">{message}</p>
        </div>
        <div className="flex flex-col gap-2 px-5 pb-5">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${variantClasses[action.variant]}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
