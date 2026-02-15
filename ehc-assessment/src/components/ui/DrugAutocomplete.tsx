import { useState, useEffect, useRef, useId } from 'react';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface DrugResult {
  brand_name: string;
  generic_name: string;
}

/** Debounced drug name autocomplete using OpenFDA API with offline fallback to free-text */
export function DrugAutocomplete({ label, value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<DrugResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Skip API call if offline
    if (!navigator.onLine) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetchWithTimeout(
        `https://api.fda.gov/drug/drugsfda.json?search=(openfda.brand_name:${encoded}*+openfda.generic_name:${encoded}*)&limit=8`,
        {},
        3000,
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      const results: DrugResult[] = [];
      const seen = new Set<string>();

      for (const item of data.results || []) {
        const brand = item.openfda?.brand_name?.[0] || '';
        const generic = item.openfda?.generic_name?.[0] || '';
        const key = `${brand}|${generic}`.toLowerCase();
        if (!seen.has(key) && (brand || generic)) {
          seen.add(key);
          results.push({ brand_name: brand, generic_name: generic });
        }
        if (results.length >= 6) break;
      }

      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveIndex(-1);
    } catch {
      // Network error or timeout — fall back to free-text
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelect = (drug: DrugResult) => {
    // Prefer brand name, append generic in parentheses
    const display = drug.brand_name
      ? `${drug.brand_name}${drug.generic_name ? ` (${drug.generic_name})` : ''}`
      : drug.generic_name;
    onChange(display);
    setShowDropdown(false);
    setSuggestions([]);
  };

  // v4-7: Keyboard navigation for combobox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isExpanded) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setActiveIndex(-1);
        break;
    }
  };

  const isExpanded = showDropdown && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 bg-white dark:bg-slate-800 dark:text-slate-100 transition-colors"
          autoComplete="off"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-slate-400 animate-pulse" aria-live="polite" aria-label="Loading suggestions">
            ...
          </span>
        )}
      </div>
      {isExpanded && (
        <div id={listboxId} role="listbox" aria-label={`${label} suggestions`} className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((drug, i) => (
            <button
              key={i}
              id={`${id}-option-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(drug)}
              className={`block w-full text-left px-3 py-2 text-sm border-b border-gray-50 dark:border-slate-700 last:border-0 ${i === activeIndex ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-amber-50 dark:hover:bg-slate-700'}`}
            >
              <span className="font-medium text-gray-900 dark:text-slate-100">{drug.brand_name || drug.generic_name}</span>
              {drug.brand_name && drug.generic_name && (
                <span className="text-gray-500 dark:text-slate-400 ml-1 text-xs">({drug.generic_name})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
