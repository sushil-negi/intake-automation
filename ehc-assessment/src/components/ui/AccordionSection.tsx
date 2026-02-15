import { useState, useId } from 'react';

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionSection({ title, children, defaultOpen = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{title}</span>
        <span
          className="text-gray-500 dark:text-slate-400 text-xs transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed border-t border-gray-100 dark:border-slate-700"
        >
          {children}
        </div>
      )}
    </div>
  );
}
