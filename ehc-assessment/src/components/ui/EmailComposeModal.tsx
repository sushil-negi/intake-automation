import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { isValidEmail } from '../../utils/emailApi';

export interface EmailComposeData {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

interface EmailComposeModalProps {
  /** Pre-filled subject line */
  defaultSubject: string;
  /** Pre-filled body text */
  defaultBody: string;
  /** Pre-filled CC address from email settings (optional) */
  defaultCc?: string;
  /** Whether the send operation is in progress */
  sending: boolean;
  /** Called when user clicks Send */
  onSend: (data: EmailComposeData) => void;
  /** Called when user closes the modal */
  onClose: () => void;
}

export function EmailComposeModal({
  defaultSubject,
  defaultBody,
  defaultCc,
  sending,
  onSend,
  onClose,
}: EmailComposeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState(defaultCc || '');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [errors, setErrors] = useState<{ to?: string; cc?: string }>({});

  const toId = useId();
  const ccId = useId();
  const subjectId = useId();
  const bodyId = useId();

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, sending]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const validate = (): boolean => {
    const newErrors: { to?: string; cc?: string } = {};
    if (!to.trim()) {
      newErrors.to = 'Recipient email is required';
    } else if (!isValidEmail(to)) {
      newErrors.to = 'Please enter a valid email address';
    }
    if (cc.trim() && !isValidEmail(cc)) {
      newErrors.cc = 'Please enter a valid CC email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSend({ to: to.trim(), cc: cc.trim(), subject, body });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Email PDF"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!sending) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Email PDF
          </h3>
        </div>

        {/* Form fields */}
        <div className="px-5 py-4 space-y-3">
          {/* To */}
          <div>
            <label
              htmlFor={toId}
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              To <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={toId}
              type="email"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                if (errors.to) setErrors((prev) => ({ ...prev, to: undefined }));
              }}
              placeholder="recipient@email.com"
              required
              aria-required="true"
              aria-invalid={!!errors.to || undefined}
              aria-describedby={errors.to ? `${toId}-error` : undefined}
              disabled={sending}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] ${
                errors.to
                  ? 'border-red-400 focus:ring-red-500'
                  : 'border-gray-300 dark:border-slate-600 focus:ring-amber-500'
              } focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-50`}
            />
            {errors.to && (
              <p id={`${toId}-error`} role="alert" className="mt-1 text-xs text-red-500">
                <span aria-hidden="true">&#9888; </span>
                {errors.to}
              </p>
            )}
          </div>

          {/* CC */}
          <div>
            <label
              htmlFor={ccId}
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              CC <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id={ccId}
              type="email"
              value={cc}
              onChange={(e) => {
                setCc(e.target.value);
                if (errors.cc) setErrors((prev) => ({ ...prev, cc: undefined }));
              }}
              placeholder="office@ehc.com"
              aria-invalid={!!errors.cc || undefined}
              aria-describedby={errors.cc ? `${ccId}-error` : undefined}
              disabled={sending}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] ${
                errors.cc
                  ? 'border-red-400 focus:ring-red-500'
                  : 'border-gray-300 dark:border-slate-600 focus:ring-amber-500'
              } focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-50`}
            />
            {errors.cc && (
              <p id={`${ccId}-error`} role="alert" className="mt-1 text-xs text-red-500">
                <span aria-hidden="true">&#9888; </span>
                {errors.cc}
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor={subjectId}
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Subject
            </label>
            <input
              id={subjectId}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 min-h-[44px] disabled:opacity-50"
            />
          </div>

          {/* Body */}
          <div>
            <label
              htmlFor={bodyId}
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Message
            </label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              disabled={sending}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-50"
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-slate-500">
            The PDF will be attached automatically.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#1a3a4a] dark:bg-amber-600 text-white hover:bg-[#15303d] dark:hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait min-h-[44px]"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
