import type { ThemeMode } from '../../hooks/useDarkMode';

interface ThemeToggleProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const icon = mode === 'dark' ? '\u{1F319}' : mode === 'light' ? '\u2600\uFE0F' : '\u{1F5A5}\uFE0F';
  const label = mode === 'dark' ? 'Dark mode' : mode === 'light' ? 'Light mode' : 'System theme';

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`${label} — click to switch`}
      title={`${label} — click to switch`}
      className="p-2 rounded-lg text-sm hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
