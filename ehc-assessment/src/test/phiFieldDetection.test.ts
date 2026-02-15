import { describe, it, expect } from 'vitest';
import {
  isNameField, isAddressField, isPhoneField, isDobField,
  isSsnField, isSignatureField, isEmailField, isInsuranceField,
  isPhiField,
} from '../utils/phiFieldDetection';

describe('PHI Field Detection', () => {
  // --- Name fields ---
  describe('isNameField', () => {
    it('detects clientName', () => expect(isNameField('clientName')).toBe(true));
    it('detects ehcStaffName', () => expect(isNameField('ehcStaffName')).toBe(true));
    it('detects emergencyContact', () => expect(isNameField('emergencyContact')).toBe(true));
    it('detects doctor', () => expect(isNameField('doctor')).toBe(true));
    it('excludes lowercase timestamp fields', () => expect(isNameField('clientNametimestamp')).toBe(false));
    it('includes capitalized Timestamp fields (case-sensitive check)', () => expect(isNameField('clientNameTimestamp')).toBe(true));
    it('excludes unrelated fields', () => expect(isNameField('bathing')).toBe(false));
  });

  // --- Address fields ---
  describe('isAddressField', () => {
    it('detects clientAddress', () => expect(isAddressField('clientAddress')).toBe(true));
    it('detects Address suffix', () => expect(isAddressField('homeAddress')).toBe(true));
    it('excludes unrelated fields', () => expect(isAddressField('assessmentDate')).toBe(false));
  });

  // --- Phone fields ---
  describe('isPhoneField', () => {
    it('detects Phone suffix', () => expect(isPhoneField('homePhone')).toBe(true));
    it('detects phone lowercase', () => expect(isPhoneField('emergencyPhone')).toBe(true));
    it('matches substring (phonetics contains "phone")', () => expect(isPhoneField('phonetics')).toBe(true));
    it('excludes unrelated fields', () => expect(isPhoneField('bathing')).toBe(false));
  });

  // --- DOB fields ---
  describe('isDobField', () => {
    it('detects dateOfBirth', () => expect(isDobField('dateOfBirth')).toBe(true));
    it('detects dob (exact key)', () => expect(isDobField('dob')).toBe(true));
    it('matches substring (doberman contains "dob")', () => expect(isDobField('doberman')).toBe(true));
    it('excludes unrelated date fields', () => expect(isDobField('assessmentDate')).toBe(false));
  });

  // --- SSN fields ---
  describe('isSsnField', () => {
    it('detects ssn (case-insensitive)', () => expect(isSsnField('SSN')).toBe(true));
    it('detects ssnLast4', () => expect(isSsnField('ssnLast4')).toBe(true));
    it('detects socialSecurity', () => expect(isSsnField('socialSecurityNumber')).toBe(true));
    it('excludes unrelated fields', () => expect(isSsnField('session')).toBe(false));
  });

  // --- Signature fields ---
  describe('isSignatureField', () => {
    it('detects hipaaSignature', () => expect(isSignatureField('hipaaSignature')).toBe(true));
    it('detects clientSignature', () => expect(isSignatureField('clientSignature')).toBe(true));
    it('detects Signature suffix', () => expect(isSignatureField('ehcRepSignature')).toBe(true));
    it('excludes unrelated fields', () => expect(isSignatureField('signedDate')).toBe(false));
  });

  // --- Email fields ---
  describe('isEmailField', () => {
    it('detects email', () => expect(isEmailField('contactEmail')).toBe(true));
    it('detects Email suffix', () => expect(isEmailField('clientEmail')).toBe(true));
    it('matches substring (emailing contains "email")', () => expect(isEmailField('emailing')).toBe(true));
    it('excludes unrelated fields', () => expect(isEmailField('bathing')).toBe(false));
  });

  // --- Insurance fields ---
  describe('isInsuranceField', () => {
    it('detects insurancePolicyNumber', () => expect(isInsuranceField('insurancePolicyNumber')).toBe(true));
    it('detects policyNumber', () => expect(isInsuranceField('policyNumber')).toBe(true));
    it('excludes unrelated fields', () => expect(isInsuranceField('policyAgreement')).toBe(false));
  });

  // --- Composite isPhiField ---
  describe('isPhiField', () => {
    it('returns true for any PHI category', () => {
      expect(isPhiField('clientName')).toBe(true);
      expect(isPhiField('clientAddress')).toBe(true);
      expect(isPhiField('homePhone')).toBe(true);
      expect(isPhiField('dateOfBirth')).toBe(true);
      expect(isPhiField('ssn')).toBe(true);
      expect(isPhiField('hipaaSignature')).toBe(true);
      expect(isPhiField('contactEmail')).toBe(true);
      expect(isPhiField('insurancePolicyNumber')).toBe(true);
    });

    it('returns false for clinical/non-PHI fields', () => {
      expect(isPhiField('bathing')).toBe(false);
      expect(isPhiField('assessmentReason')).toBe(false);
      expect(isPhiField('mobilityAids')).toBe(false);
      expect(isPhiField('noMedications')).toBe(false);
    });
  });
});
