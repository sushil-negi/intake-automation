import { useState, useId } from 'react';

interface StaffNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function StaffNoteField({ value, onChange }: StaffNoteFieldProps) {
  const [expanded, setExpanded] = useState(!!value);
  const id = useId();

  return (
    <div className="mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors min-h-[44px] py-2"
      >
        <span
          className="transition-transform duration-200 inline-block text-[10px]"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9654;
        </span>
        Staff Notes
        {value && !expanded && (
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Has notes" />
        )}
      </button>
      {expanded && (
        <div className="mt-2">
          <label htmlFor={id} className="sr-only">Staff notes for this section</label>
          <textarea
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={3}
            placeholder="Internal notes for EHC staff (not visible to client)..."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-amber-50/30 dark:bg-slate-800 text-gray-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">These notes are included in the PDF export as a Staff Notes appendix.</p>
        </div>
      )}
    </div>
  );
}
