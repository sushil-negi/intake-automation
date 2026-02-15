interface InitialsInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function InitialsInput({ label, value, onChange, error }: InitialsInputProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <label className="text-xs text-gray-600 dark:text-slate-400 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase().slice(0, 4))}
        maxLength={4}
        placeholder="____"
        className={`w-16 text-center text-lg font-bold border-b-2 ${
          error ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-slate-500'
        } bg-transparent dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-300 rounded-sm py-1`}
        aria-label={label}
      />
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
