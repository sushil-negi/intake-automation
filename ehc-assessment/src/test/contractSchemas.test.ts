import { describe, it, expect } from 'vitest';
import {
  serviceAgreementSchema,
  termsConditionsSchema,
  consumerRightsSchema,
  directCareWorkerSchema,
  transportationRequestSchema,
  customerPacketSchema,
  CONTRACT_STEP_SCHEMAS,
} from '../validation/contractSchemas';

describe('serviceAgreementSchema (Step 0)', () => {
  it('passes with required fields', () => {
    const result = serviceAgreementSchema.safeParse({
      customerInfo: { firstName: 'John', lastName: 'Doe', phone: '555-1234' },
      clientSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('fails when firstName is empty', () => {
    const result = serviceAgreementSchema.safeParse({
      customerInfo: { firstName: '', lastName: 'Doe', phone: '555-1234' },
      clientSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when clientSignature is empty', () => {
    const result = serviceAgreementSchema.safeParse({
      customerInfo: { firstName: 'John', lastName: 'Doe', phone: '555-1234' },
      clientSignature: '',
    });
    expect(result.success).toBe(false);
  });

  it('passes through extra properties', () => {
    const result = serviceAgreementSchema.safeParse({
      customerInfo: { firstName: 'John', lastName: 'Doe', phone: '555-1234', address: '123 Main' },
      clientSignature: 'data:image/png;base64,abc',
      serviceDeposit: '$100',
    });
    expect(result.success).toBe(true);
  });
});

describe('termsConditionsSchema (Step 1)', () => {
  const validTerms = {
    nonSolicitationInitial: 'JD',
    termsOfPaymentInitial: 'JD',
    cardSurchargeInitial: 'JD',
    terminationInitial: 'JD',
    authorizationConsentInitial: 'JD',
    relatedDocumentsInitial: 'JD',
  };

  it('passes with all six initials', () => {
    const result = termsConditionsSchema.safeParse(validTerms);
    expect(result.success).toBe(true);
  });

  it('fails when nonSolicitationInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, nonSolicitationInitial: '' });
    expect(result.success).toBe(false);
  });

  it('fails when termsOfPaymentInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, termsOfPaymentInitial: '' });
    expect(result.success).toBe(false);
  });

  it('fails when cardSurchargeInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, cardSurchargeInitial: '' });
    expect(result.success).toBe(false);
  });

  it('fails when terminationInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, terminationInitial: '' });
    expect(result.success).toBe(false);
  });

  it('fails when authorizationConsentInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, authorizationConsentInitial: '' });
    expect(result.success).toBe(false);
  });

  it('fails when relatedDocumentsInitial is empty', () => {
    const result = termsConditionsSchema.safeParse({ ...validTerms, relatedDocumentsInitial: '' });
    expect(result.success).toBe(false);
  });
});

describe('consumerRightsSchema (Step 2)', () => {
  it('passes with signature', () => {
    const result = consumerRightsSchema.safeParse({
      acknowledgeSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('fails when signature is empty', () => {
    const result = consumerRightsSchema.safeParse({
      acknowledgeSignature: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('directCareWorkerSchema (Step 3)', () => {
  it('passes with employee + liability initials and signature', () => {
    const result = directCareWorkerSchema.safeParse({
      employeeOfEhcInitial: 'JD',
      liabilityInsuranceInitial: 'JD',
      consumerSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('passes even with registryNotEmployeeInitial empty (N/A section)', () => {
    const result = directCareWorkerSchema.safeParse({
      employeeOfEhcInitial: 'JD',
      registryNotEmployeeInitial: '',
      liabilityInsuranceInitial: 'JD',
      consumerSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('fails when employee initial is missing', () => {
    const result = directCareWorkerSchema.safeParse({
      employeeOfEhcInitial: '',
      liabilityInsuranceInitial: 'JD',
      consumerSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when consumer signature is missing', () => {
    const result = directCareWorkerSchema.safeParse({
      employeeOfEhcInitial: 'JD',
      liabilityInsuranceInitial: 'JD',
      consumerSignature: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('transportationRequestSchema (Step 4)', () => {
  it('passes with vehicle choice and signature', () => {
    const result = transportationRequestSchema.safeParse({
      vehicleChoice: 'clientVehicle',
      clientSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('passes when declined', () => {
    const result = transportationRequestSchema.safeParse({
      declined: true,
      vehicleChoice: '',
      clientSignature: '',
    });
    expect(result.success).toBe(true);
  });

  it('fails when not declined and vehicle choice is empty', () => {
    const result = transportationRequestSchema.safeParse({
      declined: false,
      vehicleChoice: '',
      clientSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when not declined and signature is empty', () => {
    const result = transportationRequestSchema.safeParse({
      declined: false,
      vehicleChoice: 'clientVehicle',
      clientSignature: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('customerPacketSchema (Step 5)', () => {
  const checked = { checked: true, timestamp: '2025-01-01T00:00:00.000Z' };
  const unchecked = { checked: false, timestamp: '' };

  it('passes with all acknowledgments and signature', () => {
    const result = customerPacketSchema.safeParse({
      acknowledgeHipaa: checked,
      acknowledgeHiringStandards: checked,
      acknowledgeCaregiverIntro: checked,
      acknowledgeComplaintProcedures: checked,
      acknowledgeSatisfactionSurvey: checked,
      acknowledgeSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(true);
  });

  it('fails when one acknowledgment is unchecked', () => {
    const result = customerPacketSchema.safeParse({
      acknowledgeHipaa: checked,
      acknowledgeHiringStandards: unchecked,
      acknowledgeCaregiverIntro: checked,
      acknowledgeComplaintProcedures: checked,
      acknowledgeSatisfactionSurvey: checked,
      acknowledgeSignature: 'data:image/png;base64,abc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when signature is empty', () => {
    const result = customerPacketSchema.safeParse({
      acknowledgeHipaa: checked,
      acknowledgeHiringStandards: checked,
      acknowledgeCaregiverIntro: checked,
      acknowledgeComplaintProcedures: checked,
      acknowledgeSatisfactionSurvey: checked,
      acknowledgeSignature: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('CONTRACT_STEP_SCHEMAS array', () => {
  it('has 7 entries (one per wizard step)', () => {
    expect(CONTRACT_STEP_SCHEMAS).toHaveLength(7);
  });

  it('has schemas for steps 0-5 and null for step 6 (Review)', () => {
    for (let i = 0; i < 6; i++) {
      expect(CONTRACT_STEP_SCHEMAS[i]).not.toBeNull();
    }
    expect(CONTRACT_STEP_SCHEMAS[6]).toBeNull();
  });
});
