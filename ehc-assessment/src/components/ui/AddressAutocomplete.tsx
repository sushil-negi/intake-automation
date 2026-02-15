import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  postcode?: string;
}

interface NominatimResult {
  display_name: string;
  place_id: number;
  address: NominatimAddress;
}

type CachedResult = { formatted: string; raw: NominatimResult }[];

/** Format a Nominatim result into a clean US address string */
function formatAddress(addr: NominatimAddress): string {
  const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || addr.hamlet || '';
  const parts = [street, city, addr.state].filter(Boolean);
  const line = parts.join(', ');
  return addr.postcode ? `${line} ${addr.postcode}` : line;
}

/** Simple LRU cache for query results (keeps last 20 queries) */
const queryCache = new Map<string, CachedResult>();
const MAX_CACHE = 20;

function getCached(key: string): CachedResult | undefined {
  return queryCache.get(key);
}

function setCache(key: string, value: CachedResult) {
  if (queryCache.size >= MAX_CACHE) {
    // Delete oldest entry
    const first = queryCache.keys().next().value;
    if (first !== undefined) queryCache.delete(first);
  }
  queryCache.set(key, value);
}

/** Debounced address autocomplete using OpenStreetMap Nominatim with offline fallback to free-text */
export function AddressAutocomplete({ label, value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<CachedResult>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Skip API call if offline
    if (!navigator.onLine) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    const cacheKey = query.trim().toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setShowDropdown(cached.length > 0);
      setActiveIndex(-1);
      return;
    }

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const encoded = encodeURIComponent(query);
      // Bias toward Chester County PA area (lat ~39.97, lon ~-75.60) with a viewbox
      // but don't restrict — bounded=0 allows results outside the box too
      const res = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=6&countrycodes=us&viewbox=-76.1,40.3,-75.1,39.6&bounded=0`,
        { headers: { 'Accept': 'application/json' }, signal: controller.signal },
        3000,
      );

      // If this request was aborted, don't update state
      if (controller.signal.aborted) return;

      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data: NominatimResult[] = await res.json();

      // Format and deduplicate
      const seen = new Set<string>();
      const results: CachedResult = [];
      for (const item of data) {
        const formatted = formatAddress(item.address);
        if (!formatted || seen.has(formatted.toLowerCase())) continue;
        seen.add(formatted.toLowerCase());
        results.push({ formatted, raw: item });
      }

      // Cache the result
      setCache(cacheKey, results);

      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveIndex(-1);
    } catch (e) {
      // Ignore abort errors, handle others
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // Network error or timeout — fall back to free-text
      setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  }, [onChange, fetchSuggestions]);

  const handleSelect = useCallback((result: { formatted: string }) => {
    onChange(result.formatted);
    setShowDropdown(false);
    setSuggestions([]);
  }, [onChange]);

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
          {suggestions.map((result, i) => (
            <button
              key={result.raw.place_id}
              id={`${id}-option-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(result)}
              className={`block w-full text-left px-3 py-2 text-sm border-b border-gray-50 dark:border-slate-700 last:border-0 ${i === activeIndex ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-amber-50 dark:hover:bg-slate-700'}`}
            >
              <span className="text-gray-900 dark:text-slate-100">{result.formatted}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
