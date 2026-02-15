import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextInput({ label, error, className = '', required, ...props }: TextInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px]
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100`}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-500"><span aria-hidden="true">&#9888; </span>{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextArea({ label, error, className = '', required, ...props }: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100`}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-500"><span aria-hidden="true">&#9888; </span>{error}</p>}
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function SelectInput({ label, options, error, className = '', required, ...props }: SelectInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <select
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] bg-white dark:bg-slate-800 dark:text-slate-100
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent`}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-500"><span aria-hidden="true">&#9888; </span>{error}</p>}
    </div>
  );
}

interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  inline?: boolean;
  error?: string;
}

export function RadioGroup({ label, name, value, options, onChange, inline = false, error }: RadioGroupProps) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</legend>
      <div className={`${inline ? 'flex flex-wrap gap-4' : 'space-y-2'}`}>
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${value === opt.value
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                : error
                ? 'border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 hover:border-red-300 dark:hover:border-red-700'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-amber-600 w-4 h-4"
            />
            <span className="dark:text-slate-200">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-500"><span aria-hidden="true">&#9888; </span>{error}</p>}
    </fieldset>
  );
}

interface YesNoToggleProps {
  label: string;
  value: 'yes' | 'no' | '';
  onChange: (value: 'yes' | 'no') => void;
}

export function YesNoToggle({ label, value, onChange }: YesNoToggleProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <label id={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</label>
      <div className="flex gap-2">
        {(['yes', 'no'] as const).map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all min-h-[44px] flex-1 cursor-pointer
              ${value === opt
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            {opt === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700 pb-2 mb-4 mt-8 first:mt-0">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

interface ThreeWayToggleProps {
  label: string;
  value: 'yes' | 'no' | 'na' | '';
  note?: string;
  concernAnswer?: 'yes' | 'no';
  onChange: (value: 'yes' | 'no' | 'na') => void;
  onNoteChange?: (note: string) => void;
}

export function ThreeWayToggle({ label, value, note = '', concernAnswer = 'no', onChange, onNoteChange }: ThreeWayToggleProps) {
  const id = useId();
  // Determine button colors based on which answer is the "concern" answer
  const yesColor = concernAnswer === 'yes' ? 'red' : 'green';
  const noColor = concernAnswer === 'yes' ? 'green' : 'red';

  const isConcern = value !== '' && value !== 'na' && value === concernAnswer;

  function activeStyle(color: string) {
    if (color === 'green') return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-2 border-green-400 dark:border-green-600';
    if (color === 'red') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-2 border-red-400 dark:border-red-600';
    return 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300 border-2 border-gray-400 dark:border-slate-500';
  }

  return (
    <div className={`py-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${isConcern ? 'bg-red-50/50 dark:bg-red-900/20 -mx-2 px-2 rounded' : ''}`}>
      <div className="flex items-center justify-between gap-4" role="group" aria-labelledby={id}>
        <span id={id} className="text-sm text-gray-700 dark:text-slate-300 flex-1">
          {label}
          {isConcern && <span className="ml-1.5 text-red-500 text-xs font-medium" role="img" aria-label="Flagged concern">&#9888;</span>}
        </span>
        <div className="flex gap-1 flex-shrink-0">
          {([
            { val: 'yes' as const, label: 'Yes', color: yesColor },
            { val: 'no' as const, label: 'No', color: noColor },
            { val: 'na' as const, label: 'N/A', color: 'gray' },
          ]).map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => onChange(opt.val)}
              aria-pressed={value === opt.val}
              className={`px-2.5 py-1.5 rounded text-xs font-medium min-w-[44px] min-h-[44px] transition-all cursor-pointer
                ${value === opt.val
                  ? activeStyle(opt.color)
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {isConcern && onNoteChange && (
        <div className="mt-2 ml-0 sm:ml-4">
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add details for this concern..."
            aria-label={`Details for: ${label}`}
            className="w-full px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/30 text-gray-800 dark:text-slate-200
              focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent
              placeholder:text-red-400 dark:placeholder:text-red-500 min-h-[44px]"
          />
        </div>
      )}
    </div>
  );
}
