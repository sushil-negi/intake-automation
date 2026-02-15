/**
 * Shared PHI field detection functions.
 * Used by both sheetsApi.ts (sanitization) and exportFilters.ts (field exclusion).
 */

// --- PHI Field Key Patterns ---

const NAME_KEYS = [
  'clientName', 'consumerName', 'ehcRepName', 'ehcStaffName',
  'emergencyContact', 'doctor', 'neighbor', 'medication',
];

const ADDRESS_KEYS = ['clientAddress', 'Address', 'address'];
const PHONE_KEYS = ['Phone', 'phone'];
const DOB_KEYS = ['dateOfBirth', 'dob'];
const SSN_KEYS = ['ssn', 'socialSecurity'];
const SIGNATURE_KEYS = ['Signature', 'signature', 'hipaaSignature'];
const EMAIL_KEYS = ['email', 'Email'];
const INSURANCE_KEYS = ['insurancePolicyNumber', 'policyNumber', 'insurancePolicy'];

export function isNameField(key: string): boolean {
  return NAME_KEYS.some(p => key.includes(p) && !key.includes('timestamp'));
}
export function isAddressField(key: string): boolean {
  return ADDRESS_KEYS.some(p => key.includes(p));
}
export function isPhoneField(key: string): boolean {
  return PHONE_KEYS.some(p => key.includes(p));
}
export function isDobField(key: string): boolean {
  return DOB_KEYS.some(p => key.includes(p));
}
export function isSsnField(key: string): boolean {
  return SSN_KEYS.some(p => key.toLowerCase().includes(p.toLowerCase()));
}
export function isSignatureField(key: string): boolean {
  return SIGNATURE_KEYS.some(p => key.includes(p));
}
export function isEmailField(key: string): boolean {
  return EMAIL_KEYS.some(p => key.includes(p));
}
export function isInsuranceField(key: string): boolean {
  return INSURANCE_KEYS.some(p => key.includes(p));
}

/** Returns true if the given key matches any PHI field pattern */
export function isPhiField(key: string): boolean {
  return isNameField(key) || isAddressField(key) || isPhoneField(key) ||
    isDobField(key) || isSsnField(key) || isSignatureField(key) ||
    isEmailField(key) || isInsuranceField(key);
}
