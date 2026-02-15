import { describe, it, expect } from 'vitest';
import { isAssessmentComplete, getAssessmentFilename } from '../utils/pdf/generatePdf';
import { isContractComplete, getContractFilename } from '../utils/pdf/generateContractPdf';
import { INITIAL_DATA } from '../utils/initialData';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import type { AssessmentFormData } from '../types/forms';
import type { ServiceContractFormData } from '../types/serviceContract';

// --- Helpers ---

function makeCompleteAssessment(): AssessmentFormData {
  return {
    ...INITIAL_DATA,
    clientHelpList: { ...INITIAL_DATA.clientHelpList, clientName: 'Jane Doe', dateOfBirth: '1950-01-01' },
    clientHistory: { ...INITIAL_DATA.clientHistory, assessmentReason: 'initial' },
    clientAssessment: { ...INITIAL_DATA.clientAssessment, bathing: ['bathes_self'] },
    medicationList: { ...INITIAL_DATA.medicationList, medications: [{ name: 'Aspirin', dosage: '81mg', frequency: 'daily', route: 'oral', updates: '' }] },
    homeSafetyChecklist: { ...INITIAL_DATA.homeSafetyChecklist, clientSignature: 'data:image/png;base64,sig', representativeSignature: 'data:image/png;base64,sig2' },
    consent: { ...INITIAL_DATA.consent, hipaaSignature: 'data:image/png;base64,sig3' },
  };
}

function makeCompleteContract(): ServiceContractFormData {
  return {
    ...SERVICE_CONTRACT_INITIAL_DATA,
    serviceAgreement: {
      ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
      customerInfo: { ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo, firstName: 'John', lastName: 'Smith' },
      clientSignature: 'data:image/png;base64,sig',
    },
    termsConditions: {
      ...SERVICE_CONTRACT_INITIAL_DATA.termsConditions,
      nonSolicitationInitial: 'JS',
      termsOfPaymentInitial: 'JS',
      cardSurchargeInitial: 'JS',
      terminationInitial: 'JS',
      authorizationConsentInitial: 'JS',
      relatedDocumentsInitial: 'JS',
    },
    consumerRights: {
      ...SERVICE_CONTRACT_INITIAL_DATA.consumerRights,
      acknowledgeSignature: 'data:image/png;base64,ack',
    },
  };
}

// ─── isAssessmentComplete ──────────────────────────────────────────────

describe('isAssessmentComplete', () => {
  it('returns true for fully filled assessment', () => {
    expect(isAssessmentComplete(makeCompleteAssessment())).toBe(true);
  });

  it('returns false for empty initial data', () => {
    expect(isAssessmentComplete(INITIAL_DATA)).toBe(false);
  });

  it('returns false when clientName is missing', () => {
    const data = makeCompleteAssessment();
    data.clientHelpList.clientName = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when consent signature is missing', () => {
    const data = makeCompleteAssessment();
    data.consent.hipaaSignature = '';
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns false when no medications and noMedications not checked', () => {
    const data = makeCompleteAssessment();
    data.medicationList.medications = [];
    data.medicationList.noMedications = false;
    expect(isAssessmentComplete(data)).toBe(false);
  });

  it('returns true when noMedications is checked (no individual meds needed)', () => {
    const data = makeCompleteAssessment();
    data.medicationList.medications = [];
    data.medicationList.noMedications = true;
    expect(isAssessmentComplete(data)).toBe(true);
  });
});

// ─── isContractComplete ────────────────────────────────────────────────

describe('isContractComplete', () => {
  it('returns true for fully filled contract', () => {
    expect(isContractComplete(makeCompleteContract())).toBe(true);
  });

  it('returns false for empty initial data', () => {
    expect(isContractComplete(SERVICE_CONTRACT_INITIAL_DATA)).toBe(false);
  });

  it('returns false when firstName is missing', () => {
    const data = makeCompleteContract();
    data.serviceAgreement.customerInfo.firstName = '';
    expect(isContractComplete(data)).toBe(false);
  });

  it('returns false when any terms initial is missing', () => {
    const data = makeCompleteContract();
    data.termsConditions.nonSolicitationInitial = '';
    expect(isContractComplete(data)).toBe(false);
  });

  it('returns false when acknowledge signature is missing', () => {
    const data = makeCompleteContract();
    data.consumerRights.acknowledgeSignature = '';
    expect(isContractComplete(data)).toBe(false);
  });
});

// ─── Filename generators ───────────────────────────────────────────────

describe('getAssessmentFilename', () => {
  it('generates filename with sanitized client name', () => {
    const filename = getAssessmentFilename('Jane Doe');
    expect(filename).toMatch(/^EHC_Assessment_Jane_Doe_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('uses Unknown for empty name', () => {
    const filename = getAssessmentFilename('');
    expect(filename).toContain('Unknown');
  });

  it('truncates long names to 30 chars', () => {
    const longName = 'A'.repeat(50);
    const filename = getAssessmentFilename(longName);
    // Sanitized name portion should be max 30 chars
    const namePart = filename.replace('EHC_Assessment_', '').split('_202')[0];
    expect(namePart.length).toBeLessThanOrEqual(30);
  });

  it('strips special characters from name', () => {
    const filename = getAssessmentFilename("O'Brien-Smith (Jr.)");
    expect(filename).not.toContain("'");
    expect(filename).not.toContain('(');
  });
});

describe('getContractFilename', () => {
  it('generates filename with sanitized customer name', () => {
    const filename = getContractFilename('John Smith');
    expect(filename).toMatch(/^EHC_ServiceContract_John_Smith_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('uses Unknown for empty name', () => {
    const filename = getContractFilename('');
    expect(filename).toContain('Unknown');
  });
});
