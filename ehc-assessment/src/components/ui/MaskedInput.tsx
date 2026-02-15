import { useState } from 'react';

interface MaskedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function MaskedInput({ label, value, onChange, error }: MaskedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused ? value : (value ? `***-**-${value.slice(-4).padStart(4, '*')}` : '');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={isFocused ? 'text' : 'text'}
        inputMode="numeric"
        value={displayValue}
        onChange={e => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
          onChange(raw);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Last 4 digits of SSN"
        maxLength={isFocused ? 4 : 11}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100 ${
          error ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-slate-600'
        }`}
        aria-label={label}
      />
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Only the last 4 digits are stored for security.</p>
    </div>
  );
}
