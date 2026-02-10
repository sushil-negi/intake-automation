interface ToggleCardProps {
  label: string;
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
}

export function ToggleCard({ label, selected, onChange, disabled = false }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!selected)}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm cursor-pointer
        ${selected
          ? 'border-amber-500 bg-amber-50 text-amber-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        active:scale-[0.98] min-h-[44px] flex items-center gap-2`}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          selected
            ? 'bg-amber-500 border-amber-500'
            : 'border-gray-300 bg-white'
        }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
