import type { AssessmentFormData } from '../types/forms';
import { INITIAL_DATA } from './initialData';

export interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  /** Partial overlay to deep-merge with INITIAL_DATA */
  overrides: DeepPartial<AssessmentFormData>;
}

/** Recursive partial — allows nested objects to be partially specified */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Deep merge: overlays a partial onto a full object, preserving structure */
function deepMerge<T extends Record<string, unknown>>(base: T, overlay: DeepPartial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(overlay) as (keyof T)[]) {
    const baseVal = base[key];
    const overlayVal = overlay[key];
    if (
      typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal) &&
      typeof overlayVal === 'object' && overlayVal !== null && !Array.isArray(overlayVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overlayVal as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else if (overlayVal !== undefined) {
      result[key] = overlayVal as T[keyof T];
    }
  }
  return result;
}

// ── Built-in Templates ──────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: AssessmentTemplate[] = [
  {
    id: 'standard-initial',
    name: 'Standard Initial Assessment',
    description: 'New client intake — sets assessment reason to Initial, weekday schedule, English-speaking.',
    overrides: {
      clientHistory: {
        assessmentReason: 'initial',
        primaryLanguage: 'english',
        understandsEnglish: 'yes',
        serviceDays: ['Monday', 'Wednesday', 'Friday'],
        smoker: 'no',
        oxygenInHome: 'no',
        pets: 'no',
      },
      clientAssessment: {
        assessmentType: 'initial',
      },
    },
  },
  {
    id: '90-day-supervisory',
    name: '90-Day Supervisory Review',
    description: 'Follow-up reassessment — sets reason to 90-Day Supervisory, pre-selects Change in condition.',
    overrides: {
      clientHistory: {
        assessmentReason: '90day',
        reAssessmentReasons: ['changeInCondition'],
      },
      clientAssessment: {
        assessmentType: 'revised',
      },
    },
  },
  {
    id: 'live-in-24x7',
    name: 'Live-In / 24x7 Care',
    description: 'Full-time care — sets 24x7 and live-in flags, all days of the week.',
    overrides: {
      clientHistory: {
        assessmentReason: 'initial',
        is24x7: true,
        liveIn: true,
        serviceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        primaryLanguage: 'english',
        understandsEnglish: 'yes',
        smoker: 'no',
        oxygenInHome: 'no',
        pets: 'no',
      },
      clientAssessment: {
        assessmentType: 'initial',
      },
    },
  },
  {
    id: 'post-hospital',
    name: 'Post-Hospitalization',
    description: 'Reassessment after hospital stay — sets 90-Day with Post-hospitalization reason.',
    overrides: {
      clientHistory: {
        assessmentReason: '90day',
        reAssessmentReasons: ['postHospitalization'],
        serviceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      clientAssessment: {
        assessmentType: 'revised',
      },
    },
  },
];

// ── Apply Template ──────────────────────────────────────────────────

/** Create a full AssessmentFormData by merging template overrides onto INITIAL_DATA */
export function applyTemplate(template: AssessmentTemplate): AssessmentFormData {
  return deepMerge(
    INITIAL_DATA as unknown as Record<string, unknown>,
    template.overrides as DeepPartial<Record<string, unknown>>,
  ) as unknown as AssessmentFormData;
}

/** Get a fresh INITIAL_DATA copy (no template = blank form) */
export function getBlankAssessment(): AssessmentFormData {
  return JSON.parse(JSON.stringify(INITIAL_DATA));
}
