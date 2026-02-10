import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextInput({ label, error, className = '', ...props }: TextInputProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px]
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent bg-white`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent bg-white`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function SelectInput({ label, options, error, className = '', ...props }: SelectInputProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] bg-white
          ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'}
          focus:outline-none focus:ring-2 focus:border-transparent`}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
}

export function RadioGroup({ label, name, value, options, onChange, inline = false }: RadioGroupProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className={`${inline ? 'flex flex-wrap gap-4' : 'space-y-2'}`}>
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${value === opt.value
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
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
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface YesNoToggleProps {
  label: string;
  value: 'yes' | 'no' | '';
  onChange: (value: 'yes' | 'no') => void;
}

export function YesNoToggle({ label, value, onChange }: YesNoToggleProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {(['yes', 'no'] as const).map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all min-h-[44px] flex-1 cursor-pointer
              ${value === opt
                ? 'border-amber-500 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
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
    <div className="border-b border-gray-200 pb-2 mb-4 mt-8 first:mt-0">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

interface ThreeWayToggleProps {
  label: string;
  value: 'yes' | 'no' | 'na' | '';
  onChange: (value: 'yes' | 'no' | 'na') => void;
}

export function ThreeWayToggle({ label, value, onChange }: ThreeWayToggleProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 gap-4">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex gap-1 flex-shrink-0">
        {([
          { val: 'yes' as const, label: 'Yes', color: 'green' },
          { val: 'no' as const, label: 'No', color: 'red' },
          { val: 'na' as const, label: 'N/A', color: 'gray' },
        ]).map(opt => (
          <button
            key={opt.val}
            type="button"
            onClick={() => onChange(opt.val)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium min-w-[40px] min-h-[36px] transition-all cursor-pointer
              ${value === opt.val
                ? opt.color === 'green'
                  ? 'bg-green-100 text-green-700 border-2 border-green-400'
                  : opt.color === 'red'
                  ? 'bg-red-100 text-red-700 border-2 border-red-400'
                  : 'bg-gray-200 text-gray-600 border-2 border-gray-400'
                : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
