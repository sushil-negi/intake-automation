import { useState, useCallback } from 'react';
import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

/** Scroll the first validation error element into view after a short delay (for React to render error messages) */
export function scrollToFirstError() {
  requestAnimationFrame(() => {
    // Priority 1: find an element with aria-invalid="true"
    const invalid = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
    if (invalid) {
      invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      invalid.focus({ preventScroll: true });
      return;
    }
    // Priority 2: find the first role="alert" error message
    const alert = document.querySelector('[role="alert"]') as HTMLElement | null;
    if (alert) {
      alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  });
}

export function useStepValidation() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = useCallback((schema: z.ZodType | null, data: unknown): boolean => {
    if (!schema) {
      setErrors({});
      return true;
    }

    const result = schema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path && !newErrors[path]) {
        newErrors[path] = issue.message;
      }
      // Top-level refine errors (path=[]) use _form key
      if (issue.path.length === 0 && !newErrors._form) {
        newErrors._form = issue.message;
      }
    }
    setErrors(newErrors);
    return false;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors(prev => Object.keys(prev).length > 0 ? {} : prev);
  }, []);

  /** Clear errors for specific field(s) and any nested paths (e.g. 'customerInfo' clears 'customerInfo.firstName') */
  const clearFieldErrors = useCallback((fields: string[]) => {
    setErrors(prev => {
      const prevKeys = Object.keys(prev);
      const toClear = prevKeys.filter(k =>
        k === '_form' || fields.some(f => k === f || k.startsWith(f + '.'))
      );
      if (toClear.length === 0) return prev;
      const next = { ...prev };
      for (const k of toClear) delete next[k];
      return next;
    });
  }, []);

  return { errors, validate, clearErrors, clearFieldErrors };
}
