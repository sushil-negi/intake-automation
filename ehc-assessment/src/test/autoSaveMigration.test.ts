import { describe, it, expect } from 'vitest';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import { INITIAL_DATA } from '../utils/initialData';

/**
 * We can't easily import migrateData because it's not exported.
 * Instead, test the useAutoSave hook's initialization behavior by
 * simulating what it does: write to localStorage, then read + merge.
 *
 * The hook calls: migrateData(JSON.parse(saved), initialData)
 * Which does a deep-merge of saved data over initial data, ensuring
 * new fields get their defaults.
 *
 * Since migrateData is internal, we'll extract a testable version here.
 */

/** 2-level deep merge (mirroring useAutoSave's internal deepMerge2) */
function deepMerge2(initial: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const result = { ...initial };
  for (const key of Object.keys(initial)) {
    if (saved[key] !== undefined) {
      const initVal = initial[key];
      const savedVal = saved[key];
      if (typeof initVal === 'object' && initVal !== null && !Array.isArray(initVal)
          && typeof savedVal === 'object' && savedVal !== null && !Array.isArray(savedVal)) {
        result[key] = { ...(initVal as Record<string, unknown>), ...(savedVal as Record<string, unknown>) };
      } else {
        result[key] = savedVal;
      }
    }
  }
  return result;
}

/** migrateData (mirroring useAutoSave's internal function, simplified) */
function migrateData(saved: Record<string, unknown>, initial: Record<string, unknown>): Record<string, unknown> {
  const result = { ...initial };
  for (const key of Object.keys(initial)) {
    if (saved[key] !== undefined) {
      const initVal = initial[key];
      const savedVal = saved[key];
      if (typeof initVal === 'object' && initVal !== null && !Array.isArray(initVal)
          && typeof savedVal === 'object' && savedVal !== null && !Array.isArray(savedVal)) {
        result[key] = deepMerge2(initVal as Record<string, unknown>, savedVal as Record<string, unknown>);
      } else {
        result[key] = savedVal;
      }
    }
  }
  return result;
}

describe('Auto-save migration: service contract', () => {
  it('should fill in missing termsConditions when loading old draft', () => {
    // Simulate an old draft saved before termsConditions step existed
    const oldDraft: Record<string, unknown> = {
      serviceAgreement: {
        ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement,
        customerInfo: {
          ...SERVICE_CONTRACT_INITIAL_DATA.serviceAgreement.customerInfo,
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
      // No termsConditions!
      consumerRights: SERVICE_CONTRACT_INITIAL_DATA.consumerRights,
      directCareWorker: SERVICE_CONTRACT_INITIAL_DATA.directCareWorker,
      transportationRequest: SERVICE_CONTRACT_INITIAL_DATA.transportationRequest,
      customerPacket: SERVICE_CONTRACT_INITIAL_DATA.customerPacket,
    };

    const migrated = migrateData(oldDraft, SERVICE_CONTRACT_INITIAL_DATA as unknown as Record<string, unknown>);

    // termsConditions should be populated with defaults
    expect(migrated.termsConditions).toBeDefined();
    const tc = migrated.termsConditions as Record<string, unknown>;
    expect(tc.nonSolicitationInitial).toBe('');
    expect(tc.termsOfPaymentInitial).toBe('');
    expect(tc.cardSurchargeInitial).toBe('');
    expect(tc.terminationInitial).toBe('');
    expect(tc.authorizationConsentInitial).toBe('');
    expect(tc.relatedDocumentsInitial).toBe('');

    // Original data should be preserved
    const sa = migrated.serviceAgreement as Record<string, unknown>;
    const ci = sa.customerInfo as Record<string, unknown>;
    expect(ci.firstName).toBe('Jane');
    expect(ci.lastName).toBe('Smith');
  });

  it('should merge partially-filled termsConditions with defaults', () => {
    // Old draft has termsConditions but missing some newer fields
    const partialTerms = {
      nonSolicitationInitial: 'JS',
      termsOfPaymentInitial: 'JS',
      // Missing: cardSurchargeInitial, terminationInitial, authorizationConsentInitial, relatedDocumentsInitial
    };

    const oldDraft: Record<string, unknown> = {
      ...SERVICE_CONTRACT_INITIAL_DATA,
      termsConditions: partialTerms,
    };

    const migrated = migrateData(oldDraft as Record<string, unknown>, SERVICE_CONTRACT_INITIAL_DATA as unknown as Record<string, unknown>);

    const tc = migrated.termsConditions as Record<string, unknown>;
    // Saved values preserved
    expect(tc.nonSolicitationInitial).toBe('JS');
    expect(tc.termsOfPaymentInitial).toBe('JS');
    // Missing fields get defaults
    expect(tc.cardSurchargeInitial).toBe('');
    expect(tc.terminationInitial).toBe('');
    expect(tc.authorizationConsentInitial).toBe('');
    expect(tc.relatedDocumentsInitial).toBe('');
  });

  it('should preserve fully-filled termsConditions', () => {
    const fullTerms = {
      nonSolicitationInitial: 'AB',
      termsOfPaymentInitial: 'AB',
      cardSurchargeInitial: 'AB',
      terminationInitial: 'AB',
      authorizationConsentInitial: 'AB',
      relatedDocumentsInitial: 'AB',
    };

    const draft: Record<string, unknown> = {
      ...SERVICE_CONTRACT_INITIAL_DATA,
      termsConditions: fullTerms,
    };

    const migrated = migrateData(draft as Record<string, unknown>, SERVICE_CONTRACT_INITIAL_DATA as unknown as Record<string, unknown>);

    const tc = migrated.termsConditions as Record<string, unknown>;
    expect(tc.nonSolicitationInitial).toBe('AB');
    expect(tc.termsOfPaymentInitial).toBe('AB');
    expect(tc.cardSurchargeInitial).toBe('AB');
    expect(tc.terminationInitial).toBe('AB');
    expect(tc.authorizationConsentInitial).toBe('AB');
    expect(tc.relatedDocumentsInitial).toBe('AB');
  });
});

describe('Auto-save migration: assessment', () => {
  it('should handle old assessment draft missing new fields', () => {
    // Simulate old draft without consent.age field (added later)
    const oldDraft: Record<string, unknown> = {
      ...INITIAL_DATA,
      consent: {
        clientName: 'Test',
        date: '2026-01-15',
        signerName: 'John',
        hipaaSignature: 'data:image/png;base64,test',
        hipaaSignatureMeta: null,
        hipaaSignatureDate: '2026-01-15',
        // Missing: clientAddress, age (added in later schema updates)
      },
    };

    const migrated = migrateData(oldDraft as Record<string, unknown>, INITIAL_DATA as unknown as Record<string, unknown>);

    const consent = migrated.consent as Record<string, unknown>;
    // Original values preserved
    expect(consent.clientName).toBe('Test');
    expect(consent.hipaaSignature).toBe('data:image/png;base64,test');
    // New fields should get defaults from initial data
    expect(consent.clientAddress).toBe('');
    expect(consent.age).toBe('');
  });
});
