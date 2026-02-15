import { useId, useCallback } from 'react';

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

/** Format raw digits into (555) 555-5555 */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Strip formatting to raw digits */
function stripPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function PhoneInput({ label, value, onChange, error, placeholder = '(555) 555-5555' }: PhoneInputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(stripPhone(e.target.value));
  }, [onChange]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={formatPhone(value)}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100 ${
          error ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-slate-600'
        }`}
      />
      {error && <p id={errorId} role="alert" className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
