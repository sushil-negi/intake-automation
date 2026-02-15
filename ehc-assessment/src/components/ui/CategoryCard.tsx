import { useId, useState } from 'react';
import type { ReactNode } from 'react';

interface CategoryCardProps {
  title: string;
  selectedCount: number;
  totalCount: number;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CategoryCard({ title, selectedCount, totalCount, children, defaultOpen = false }: CategoryCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{title}</h3>
          {selectedCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {selectedCount}/{totalCount}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div id={panelId} className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
