import { describe, it, expect } from 'vitest';
import {
  clientHelpListSchema,
  clientHistorySchema,
  clientAssessmentSchema,
  medicationListSchema,
  consentSchema,
  STEP_SCHEMAS,
} from '../validation/schemas';

describe('clientHelpListSchema (Step 0)', () => {
  it('passes with valid client name and DOB', () => {
    const result = clientHelpListSchema.safeParse({
      clientName: 'John Doe',
      dateOfBirth: '1950-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('fails when client name is empty', () => {
    const result = clientHelpListSchema.safeParse({
      clientName: '',
      dateOfBirth: '1950-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('fails when DOB is empty', () => {
    const result = clientHelpListSchema.safeParse({
      clientName: 'John Doe',
      dateOfBirth: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails when both are empty', () => {
    const result = clientHelpListSchema.safeParse({
      clientName: '',
      dateOfBirth: '',
    });
    expect(result.success).toBe(false);
  });

  it('passes through extra properties', () => {
    const result = clientHelpListSchema.safeParse({
      clientName: 'Jane',
      dateOfBirth: '1980-05-15',
      clientAddress: '123 Main St',
    });
    expect(result.success).toBe(true);
  });
});

describe('clientHistorySchema (Step 1)', () => {
  it('passes with assessment reason provided', () => {
    const result = clientHistorySchema.safeParse({
      assessmentReason: 'initial',
    });
    expect(result.success).toBe(true);
  });

  it('fails when assessment reason is empty', () => {
    const result = clientHistorySchema.safeParse({
      assessmentReason: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientAssessmentSchema (Step 2)', () => {
  const emptyAssessment = {
    bathing: [], dressing: [], hairCare: [], teethAndGums: [],
    shaving: [], mobility: [], falls: [], mobilityAids: [],
    nutritionHydration: [], bedRails: [], hearingAids: [],
    toileting: [], medicationReminder: [], exerciseReminders: [],
    housekeeping: [], transportation: [],
  };

  it('fails when no items are selected', () => {
    const result = clientAssessmentSchema.safeParse(emptyAssessment);
    expect(result.success).toBe(false);
  });

  it('passes when at least one item is selected in any category', () => {
    const result = clientAssessmentSchema.safeParse({
      ...emptyAssessment,
      bathing: ['bathes_self'],
    });
    expect(result.success).toBe(true);
  });

  it('passes with items across multiple categories', () => {
    const result = clientAssessmentSchema.safeParse({
      ...emptyAssessment,
      mobility: ['walks_independently'],
      toileting: ['uses_toilet'],
      housekeeping: ['light_housekeeping'],
    });
    expect(result.success).toBe(true);
  });
});

describe('medicationListSchema (Step 3)', () => {
  it('passes when noMedications is checked', () => {
    const result = medicationListSchema.safeParse({
      noMedications: true,
      medications: [{ name: '', dosage: '', frequency: '', route: '', updates: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('passes when at least one medication has a name', () => {
    const result = medicationListSchema.safeParse({
      noMedications: false,
      medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'daily', route: 'oral', updates: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('fails when noMedications is false and no medications have names', () => {
    const result = medicationListSchema.safeParse({
      noMedications: false,
      medications: [{ name: '', dosage: '', frequency: '', route: '', updates: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('passes when noMedications is false but second med has a name', () => {
    const result = medicationListSchema.safeParse({
      noMedications: false,
      medications: [
        { name: '', dosage: '', frequency: '', route: '', updates: '' },
        { name: 'Aspirin', dosage: '81mg', frequency: 'daily', route: 'oral', updates: '' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('consentSchema (Step 5)', () => {
  const validConsent = {
    consentTreatment: { checked: true, timestamp: '2025-01-01T00:00:00.000Z' },
    consentInfoSharing: { checked: true, timestamp: '2025-01-01T00:00:00.000Z' },
    consentElectronicRecords: { checked: true, timestamp: '2025-01-01T00:00:00.000Z' },
    consentDataRetention: { checked: true, timestamp: '2025-01-01T00:00:00.000Z' },
    hipaaSignature: 'data:image/png;base64,abc123',
  };

  it('passes when all consents checked and HIPAA signature is present', () => {
    const result = consentSchema.safeParse(validConsent);
    expect(result.success).toBe(true);
  });

  it('fails when HIPAA signature is empty', () => {
    const result = consentSchema.safeParse({
      ...validConsent,
      hipaaSignature: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails when a consent checkbox is not checked', () => {
    const result = consentSchema.safeParse({
      ...validConsent,
      consentTreatment: { checked: false, timestamp: '' },
    });
    expect(result.success).toBe(false);
  });
});

describe('STEP_SCHEMAS array', () => {
  it('has 7 entries (one per wizard step)', () => {
    expect(STEP_SCHEMAS).toHaveLength(7);
  });

  it('has schemas for steps 0-5 and null for step 6 (Review)', () => {
    for (let i = 0; i < 6; i++) {
      expect(STEP_SCHEMAS[i]).not.toBeNull();
    }
    expect(STEP_SCHEMAS[6]).toBeNull();
  });
});
