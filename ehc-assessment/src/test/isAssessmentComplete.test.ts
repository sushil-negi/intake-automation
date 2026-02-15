import { describe, it, expect } from 'vitest';
import { isAssessmentComplete } from '../utils/pdf/generatePdf';
import { INITIAL_DATA } from '../utils/initialData';
import type { AssessmentFormData } from '../types/forms';

function makeComplete(): AssessmentFormData {
  return {
    ...INITIAL_DATA,
    clientHelpList: {
      ...INITIAL_DATA.clientHelpList,
      clientName: 'John Doe',
      dateOfBirth: '1950-01-01',
    },
    clientHistory: {
      ...INITIAL_DATA.clientHistory,
      assessmentReason: 'initial',
    },
    clientAssessment: {
      ...INITIAL_DATA.clientAssessment,
      bathing: ['bathes_self'],
    },
    medicationList: {
      ...INITIAL_DATA.medicationList,
      medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'daily', route: 'oral', updates: '' }],
    },
    homeSafetyChecklist: {
      ...INITIAL_DATA.homeSafetyChecklist,
      clientSignature: 'data:image/png;base64,sig1',
      representativeSignature: 'data:image/png;base64,sig2',
    },
    consent: {
      ...INITIAL_DATA.consent,
      hipaaSignature: 'data:image/png;base64,sig3',
    },
  };
}

describe('isAssessmentComplete', () => {
  it('returns true for a fully complete assessment', () => {
    expect(isAssessmentComplete(makeComplete())).toBe(true);
  });

  it('returns false when client name is missing', () => {
    const data = makeComplete();
    data.clientHelpList.clientName = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when DOB is missing', () => {
    const data = makeComplete();
    data.clientHelpList.dateOfBirth = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when assessment reason is missing', () => {
    const data = makeComplete();
    data.clientHistory.assessmentReason = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when no assessment items are selected', () => {
    const data = makeComplete();
    data.clientAssessment.bathing = [];
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when medications not filled and noMedications unchecked', () => {
    const data = makeComplete();
    data.medicationList.noMedications = false;
    data.medicationList.medications = [{ name: '', dosage: '', frequency: '', route: '', updates: '' }];
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns true when noMedications is checked', () => {
    const data = makeComplete();
    data.medicationList.noMedications = true;
    data.medicationList.medications = [{ name: '', dosage: '', frequency: '', route: '', updates: '' }];
    expect(isAssessmentComplete(data)).toBe(true);
  });

  it('returns false when safety client signature is missing', () => {
    const data = makeComplete();
    data.homeSafetyChecklist.clientSignature = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when safety rep signature is missing', () => {
    const data = makeComplete();
    data.homeSafetyChecklist.representativeSignature = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when HIPAA signature is missing', () => {
    const data = makeComplete();
    data.consent.hipaaSignature = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false for completely empty initial data', () => {
    expect(isAssessmentComplete(INITIAL_DATA)).toBe(false);
  });
});
