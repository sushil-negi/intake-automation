import { useEffect, useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'ehc-assessment-draft';
const SAVE_DEBOUNCE_MS = 500;

export function useAutoSave<T>(initialData: T) {
  const [data, setData] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...initialData, ...JSON.parse(saved) };
      }
    } catch {
      // ignore parse errors
    }
    return initialData;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((newData: T) => {
    setIsSaving(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        setLastSaved(new Date());
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
      setIsSaving(false);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const updateData = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setData(prev => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T) => T)(prev)
        : { ...prev, ...updater };
      save(next);
      return next;
    });
  }, [save]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(initialData);
    setLastSaved(null);
  }, [initialData]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { data, updateData, lastSaved, isSaving, clearDraft, hasDraft };
}
