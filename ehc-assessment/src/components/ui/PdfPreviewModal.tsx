import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface PdfPreviewModalProps {
  pdfBlob: Blob;
  filename: string;
  onDownload: () => void;
  onClose: () => void;
}

export function PdfPreviewModal({ pdfBlob, filename, onDownload, onClose }: PdfPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  // Create a blob URL for the iframe — much more reliable than data: URLs for large PDFs
  const blobUrl = useMemo(() => URL.createObjectURL(pdfBlob), [pdfBlob]);

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PDF Preview"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      {/* Modal — wider on desktop, near-full on mobile */}
      <div ref={modalRef} className="relative flex flex-col w-full max-w-6xl h-[95vh] sm:h-[92vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 bg-sky-50 dark:bg-slate-900">
          <span className="text-sm font-medium truncate mr-4 text-[#1a3a4a] dark:text-slate-100">
            {filename}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => { onDownload(); onClose(); }}
              aria-label="Download PDF"
              className="px-4 py-1.5 text-sm font-semibold rounded-lg text-white bg-[#1a3a4a] dark:bg-amber-600 hover:bg-[#163440] dark:hover:bg-amber-700 transition-colors min-h-[36px]"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-h-[36px]"
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF iframe — fills remaining height */}
        <iframe
          src={blobUrl}
          title="PDF Preview"
          className="w-full flex-1 border-0"
        />
      </div>
    </div>,
    document.body,
  );
}
