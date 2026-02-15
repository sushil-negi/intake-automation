import { describe, it, expect } from 'vitest';
import { sanitizeForSync } from '../utils/sheetsApi';

describe('sanitizeForSync', () => {
  it('masks name fields to initials', () => {
    const flat = { clientName: 'John Smith', someOtherField: 'Clinical data' };
    const result = sanitizeForSync(flat);
    expect(result.clientName).toBe('J.S.');
    expect(result.someOtherField).toBe('Clinical data');
  });

  it('masks date of birth to year only', () => {
    const flat = { dateOfBirth: '1954-03-15' };
    const result = sanitizeForSync(flat);
    expect(result.dateOfBirth).toBe('1954');
  });

  it('masks phone to last 4 digits', () => {
    const flat = { clientPhone: '(610) 555-1234' };
    const result = sanitizeForSync(flat);
    expect(result.clientPhone).toBe('***-***-1234');
  });

  it('masks addresses to city/state', () => {
    const flat = { clientAddress: '123 Main St, West Chester, PA 19380' };
    const result = sanitizeForSync(flat);
    expect(result.clientAddress).toContain('West Chester');
    expect(result.clientAddress).not.toContain('123 Main');
  });

  it('masks signatures to [SIGNED]', () => {
    const flat = { hipaaSignature: 'data:image/png;base64,abc123...' };
    const result = sanitizeForSync(flat);
    expect(result.hipaaSignature).toBe('[SIGNED]');
  });

  it('passes through clinical/assessment data unchanged', () => {
    const flat = {
      primaryDiagnosis: 'Diabetes Type 2',
      assessment_bathing: 'Standby assist; Verbal cues',
      assessmentReason: 'Initial assessment',
      healthHistory: 'Hypertension; COPD',
    };
    const result = sanitizeForSync(flat);
    expect(result.primaryDiagnosis).toBe('Diabetes Type 2');
    expect(result.assessment_bathing).toBe('Standby assist; Verbal cues');
    expect(result.assessmentReason).toBe('Initial assessment');
    expect(result.healthHistory).toBe('Hypertension; COPD');
  });

  it('handles empty values gracefully', () => {
    const flat = { clientName: '', dateOfBirth: '', clientPhone: '' };
    const result = sanitizeForSync(flat);
    expect(result.clientName).toBe('');
    expect(result.dateOfBirth).toBe('');
    expect(result.clientPhone).toBe('');
  });

  it('masks emergency contact names', () => {
    const flat = { 'emergencyContact1_name': 'Jane Doe' };
    const result = sanitizeForSync(flat);
    expect(result['emergencyContact1_name']).toBe('J.D.');
  });

  // v4-5: Email field sanitization
  it('masks email addresses', () => {
    const flat = { 'emergencyContact1_email': 'jane.doe@example.com' };
    const result = sanitizeForSync(flat);
    expect(result['emergencyContact1_email']).toBe('j***@example.com');
  });

  it('masks caregiver email addresses', () => {
    const flat = { caregiverEmail: 'caregiver@agency.org' };
    const result = sanitizeForSync(flat);
    expect(result.caregiverEmail).toBe('c***@agency.org');
  });

  // v4-6: Insurance policy number sanitization
  it('masks insurance policy numbers', () => {
    const flat = { insurancePolicyNumber: 'BCBS123456789' };
    const result = sanitizeForSync(flat);
    expect(result.insurancePolicyNumber).toBe('***6789');
  });

  it('masks short insurance policy numbers', () => {
    const flat = { insurancePolicyNumber: 'AB' };
    const result = sanitizeForSync(flat);
    expect(result.insurancePolicyNumber).toBe('***');
  });
});
