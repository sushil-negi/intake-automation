import { useEffect, useCallback, useRef, useState } from 'react';
import { encryptObject, decryptObject, isEncrypted } from '../utils/crypto';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/auditLog';

const DEFAULT_STORAGE_KEY = 'ehc-assessment-draft';
const SAVE_DEBOUNCE_MS = 500;

/** Deep merge two objects up to 2 levels, using initial values as defaults for missing keys */
function deepMerge2(initial: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const result = { ...initial };
  for (const key of Object.keys(initial)) {
    if (saved[key] !== undefined) {
      const initVal = initial[key];
      const savedVal = saved[key];
      if (typeof initVal === 'object' && initVal !== null && !Array.isArray(initVal)
          && typeof savedVal === 'object' && savedVal !== null && !Array.isArray(savedVal)) {
        // 2nd level: merge sub-objects so new fields get defaults
        result[key] = { ...(initVal as Record<string, unknown>), ...(savedVal as Record<string, unknown>) };
      } else {
        result[key] = savedVal;
      }
    }
  }
  return result;
}

/** Migrate stale localStorage data to current schema */
function migrateData(saved: Record<string, unknown>, initial: Record<string, unknown>): Record<string, unknown> {
  const result = { ...initial };
  for (const key of Object.keys(initial)) {
    if (saved[key] !== undefined) {
      const initVal = initial[key];
      const savedVal = saved[key];
      // Deep merge nested objects (form sections) so new fields get defaults
      if (typeof initVal === 'object' && initVal !== null && !Array.isArray(initVal)
          && typeof savedVal === 'object' && savedVal !== null && !Array.isArray(savedVal)) {
        // Use 2-level deep merge to handle serviceAgreement.paymentTerms, etc.
        result[key] = deepMerge2(initVal as Record<string, unknown>, savedVal as Record<string, unknown>);
      } else {
        result[key] = savedVal;
      }
    }
  }

  // Migrate clientHelpList: old scalar hospital/neighbor fields → new arrays
  const chl = result.clientHelpList as Record<string, unknown> | undefined;
  if (chl) {
    // Hospitals: migrate from hospitalPreference1/2 to hospitals[]
    if (!Array.isArray(chl.hospitals) || chl.hospitals.length === 0) {
      const h1 = (chl.hospitalPreference1 as string) || '';
      const h2 = (chl.hospitalPreference2 as string) || '';
      const hospitals = [{ name: h1 }];
      if (h2) hospitals.push({ name: h2 });
      chl.hospitals = hospitals;
    }
    delete chl.hospitalPreference1;
    delete chl.hospitalPreference2;

    // Neighbors: migrate from neighborName/Phone/HasKeys to neighbors[]
    if (!Array.isArray(chl.neighbors) || chl.neighbors.length === 0) {
      const name = (chl.neighborName as string) || '';
      const phone = (chl.neighborPhone as string) || '';
      const hasKeys = (chl.neighborHasKeys as string) || '';
      chl.neighbors = [{ name, phone, hasKeys }];
    }
    delete chl.neighborName;
    delete chl.neighborPhone;
    delete chl.neighborHasKeys;

    // Ensure emergency contacts have email field
    if (Array.isArray(chl.emergencyContacts)) {
      chl.emergencyContacts = (chl.emergencyContacts as Record<string, unknown>[]).map(c => ({
        email: '',
        ...c,
      }));
    }
  }

  // Migrate serviceAgreement: consolidate old representativeSignature/Address into client signature
  const sa = result.serviceAgreement as Record<string, unknown> | undefined;
  if (sa) {
    // If there was a separate representativeSignature, migrate it to clientSignature if client sig is empty
    if (sa.representativeSignature && !sa.clientSignature) {
      sa.clientSignature = sa.representativeSignature;
      sa.clientSignatureMeta = sa.representativeSignatureMeta ?? null;
      sa.signerIsRepresentative = true;
    }
    delete sa.representativeSignature;
    delete sa.representativeSignatureMeta;
    delete sa.representativeAddress;
    // Ensure new fields exist
    if (typeof sa.signerIsRepresentative !== 'boolean') {
      sa.signerIsRepresentative = false;
    }
    if (sa.representativeRelationship === undefined) {
      sa.representativeRelationship = '';
    }
  }

  // Migrate clientHistory: old preferredTimes → new serviceDays/daySchedules/is24x7
  const ch = result.clientHistory as Record<string, unknown> | undefined;
  if (ch) {
    // Remove old preferredTimes field
    delete ch.preferredTimes;
    // Ensure new fields exist with defaults
    if (!Array.isArray(ch.serviceDays)) {
      ch.serviceDays = [];
    }
    if (typeof ch.daySchedules !== 'object' || ch.daySchedules === null || Array.isArray(ch.daySchedules)) {
      ch.daySchedules = {};
    }
    if (typeof ch.is24x7 !== 'boolean') {
      ch.is24x7 = false;
    }
    // Migrate abbreviated day names (Mon, Tue, …) → full names (Monday, Tuesday, …)
    const abbrToFull: Record<string, string> = {
      Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
      Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
    };
    if (Array.isArray(ch.serviceDays)) {
      const days = ch.serviceDays as string[];
      const schedules = ch.daySchedules as Record<string, unknown>;
      let migrated = false;
      for (let i = 0; i < days.length; i++) {
        const full = abbrToFull[days[i]];
        if (full) {
          // Move schedule entry from abbreviated key to full name key
          if (schedules[days[i]] && !schedules[full]) {
            schedules[full] = schedules[days[i]];
          }
          delete schedules[days[i]];
          days[i] = full;
          migrated = true;
        }
      }
      if (migrated) {
        ch.serviceDays = days;
        ch.daySchedules = schedules;
      }
    }
  }

  // Migrate customerPacket: old boolean acknowledge fields → ConsentCheckbox objects
  const cp = result.customerPacket as Record<string, unknown> | undefined;
  if (cp) {
    const ackKeys = ['acknowledgeHipaa', 'acknowledgeHiringStandards', 'acknowledgeCaregiverIntro', 'acknowledgeComplaintProcedures', 'acknowledgeSatisfactionSurvey'];
    for (const key of ackKeys) {
      if (typeof cp[key] === 'boolean') {
        cp[key] = { checked: cp[key] as boolean, timestamp: cp[key] ? new Date().toISOString() : '' };
      }
    }
  }

  return result;
}

export function useAutoSave<T>(initialData: T, storageKey = DEFAULT_STORAGE_KEY) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDataRef = useRef(initialData);

  // Async initialization: load + decrypt + migrate from localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          let parsed: Record<string, unknown>;
          if (isEncrypted(raw)) {
            parsed = await decryptObject<Record<string, unknown>>(raw);
          } else {
            // Plaintext migration: parse JSON, then encrypt in place
            parsed = JSON.parse(raw);
            try {
              const encrypted = await encryptObject(parsed);
              localStorage.setItem(storageKey, encrypted);
            } catch (encErr) {
              // Keep plaintext to avoid data loss, but log the failure
              logAudit('error', storageKey, `PHI migration encryption failed: ${encErr instanceof Error ? encErr.message : String(encErr)}`, 'failure');
            }
          }
          if (!cancelled) {
            setData(migrateData(parsed, initialDataRef.current as Record<string, unknown>) as T);
            setIsDirty(true);
          }
        }
      } catch (e) {
        logger.error('Failed to load auto-saved data:', e);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storageKey]);

  const save = useCallback((newData: T) => {
    setIsSaving(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const encrypted = await encryptObject(newData);
        localStorage.setItem(storageKey, encrypted);
        setLastSaved(new Date());
      } catch (e) {
        logger.error('Auto-save failed:', e);
        logAudit('error', storageKey, `Auto-save encryption failed: ${e instanceof Error ? e.message : String(e)}`, 'failure');
      }
      setIsSaving(false);
    }, SAVE_DEBOUNCE_MS);
  }, [storageKey]);

  const updateData = useCallback((updater: Partial<T> | ((prev: T) => T), options?: { silent?: boolean }) => {
    setData(prev => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T) => T)(prev)
        : { ...prev, ...updater };
      save(next);
      if (!options?.silent) {
        setIsDirty(true);
      }
      return next;
    });
  }, [save]);

  const clearDraft = useCallback(() => {
    // Cancel pending debounced save to prevent write-back after clear
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    localStorage.removeItem(storageKey);
    setData(initialDataRef.current);
    setLastSaved(null);
    setIsDirty(false);
    setIsSaving(false);
  }, [storageKey]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { data, updateData, lastSaved, isSaving, isLoading, isDirty, clearDraft, hasDraft };
}
