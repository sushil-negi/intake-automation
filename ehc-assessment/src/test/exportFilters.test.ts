import { describe, it, expect } from 'vitest';
import { applyExportFilters } from '../utils/exportFilters';
import type { ExportPrivacyConfig } from '../types/sheetsConfig';
import { DEFAULT_EXPORT_PRIVACY } from '../types/sheetsConfig';

const SAMPLE_FLAT: Record<string, string> = {
  clientName: 'John Smith',
  dateOfBirth: '1954-03-15',
  clientPhone: '(610) 555-1234',
  clientAddress: '123 Main St, West Chester, PA 19380',
  'emergencyContact1_email': 'jane@example.com',
  insurancePolicyNumber: 'BCBS123456789',
  hipaaSignature: 'data:image/png;base64,abc123',
  primaryDiagnosis: 'Diabetes Type 2',
  assessment_bathing: 'Standby assist; Verbal cues',
  assessmentReason: 'Initial assessment',
  healthHistory: 'Hypertension; COPD',
};

describe('applyExportFilters', () => {
  it('includes all fields when all toggles are true', () => {
    const result = applyExportFilters(SAMPLE_FLAT, DEFAULT_EXPORT_PRIVACY);
    // SSN is always excluded, but no SSN in sample so all should pass
    expect(Object.keys(result).length).toBe(Object.keys(SAMPLE_FLAT).length);
    expect(result.clientName).toBe('John Smith');
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('excludes name fields when includeNames is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeNames: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.clientName).toBeUndefined();
    // emergencyContact1_email also matches name pattern (contains 'emergencyContact')
    expect(result['emergencyContact1_email']).toBeUndefined();
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('excludes address fields when includeAddresses is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeAddresses: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.clientAddress).toBeUndefined();
    expect(result.clientName).toBe('John Smith');
  });

  it('excludes phone fields when includePhones is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includePhones: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.clientPhone).toBeUndefined();
    expect(result.clientName).toBe('John Smith');
  });

  it('excludes DOB fields when includeDob is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeDob: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.dateOfBirth).toBeUndefined();
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('excludes email fields when includeEmails is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeEmails: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result['emergencyContact1_email']).toBeUndefined();
    expect(result.clientName).toBe('John Smith');
  });

  it('excludes insurance fields when includeInsurance is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeInsurance: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.insurancePolicyNumber).toBeUndefined();
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('excludes signature fields when includeSignatures is false', () => {
    const config: ExportPrivacyConfig = { ...DEFAULT_EXPORT_PRIVACY, includeSignatures: false };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.hipaaSignature).toBeUndefined();
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('always excludes SSN fields regardless of config', () => {
    const flat = { ...SAMPLE_FLAT, ssn: '123-45-6789' };
    const result = applyExportFilters(flat, DEFAULT_EXPORT_PRIVACY);
    expect(result.ssn).toBeUndefined();
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });

  it('always passes through clinical/assessment data unchanged', () => {
    const config: ExportPrivacyConfig = {
      includeNames: false,
      includeAddresses: false,
      includePhones: false,
      includeDob: false,
      includeEmails: false,
      includeInsurance: false,
      includeSignatures: false,
    };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
    expect(result.assessment_bathing).toBe('Standby assist; Verbal cues');
    expect(result.assessmentReason).toBe('Initial assessment');
    expect(result.healthHistory).toBe('Hypertension; COPD');
  });

  it('handles combined filters correctly', () => {
    const config: ExportPrivacyConfig = {
      ...DEFAULT_EXPORT_PRIVACY,
      includeNames: false,
      includePhones: false,
    };
    const result = applyExportFilters(SAMPLE_FLAT, config);
    expect(result.clientName).toBeUndefined();
    expect(result.clientPhone).toBeUndefined();
    expect(result.clientAddress).toBe('123 Main St, West Chester, PA 19380');
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
  });
});
