import { z } from 'zod';

// Reusable consent-checkbox schema: checked must be true + timestamp present
const consentCheckboxSchema = z.object({
  checked: z.literal(true, { error: 'All acknowledgments must be checked before signing' }),
  timestamp: z.string().min(1),
});

// Step 0: Service Agreement — require customer name, phone, and client/representative signature
export const serviceAgreementSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(1, 'First name is required').max(200),
    lastName: z.string().min(1, 'Last name is required').max(200),
    phone: z.string().min(1, 'Phone number is required').max(30),
  }).passthrough(),
  clientSignature: z.string().min(1, 'Client or representative signature is required').max(200000),
}).passthrough();

// Step 1: Terms & Conditions — require all six initials
export const termsConditionsSchema = z.object({
  nonSolicitationInitial: z.string().min(1, 'Initials required for Non-Solicitation section').max(10),
  termsOfPaymentInitial: z.string().min(1, 'Initials required for Terms of Payment section').max(10),
  cardSurchargeInitial: z.string().min(1, 'Initials required for Card Payment Surcharge section').max(10),
  terminationInitial: z.string().min(1, 'Initials required for Termination section').max(10),
  authorizationConsentInitial: z.string().min(1, 'Initials required for Authorization & Consent section').max(10),
  relatedDocumentsInitial: z.string().min(1, 'Initials required for Related Documents section').max(10),
}).passthrough();

// Step 2: Consumer Rights — require acknowledgment signature
export const consumerRightsSchema = z.object({
  acknowledgeSignature: z.string().min(1, 'Acknowledgment signature is required').max(200000),
}).passthrough();

// Step 3: Direct Care Worker Notice — require Employee + Liability initials + consumer signature
// Registry section is N/A (all caregivers are EHC employees), so registryNotEmployeeInitial is not validated.
export const directCareWorkerSchema = z.object({
  employeeOfEhcInitial: z.string().min(1, 'Initials required for Employee Status section').max(10),
  liabilityInsuranceInitial: z.string().min(1, 'Initials required for Liability Insurance section').max(10),
  consumerSignature: z.string().min(1, 'Consumer signature is required').max(200000),
}).passthrough();

// Step 4: Transportation Request — require vehicle choice + client signature, OR declined
export const transportationRequestSchema = z.object({
  declined: z.boolean().optional(),
  vehicleChoice: z.string().max(200).optional(),
  clientSignature: z.string().max(200000).optional(),
}).passthrough().refine(
  (data) => data.declined || (!!data.vehicleChoice && !!data.clientSignature),
  {
    message: 'Select a vehicle option and sign, or decline transportation services',
    path: ['vehicleChoice'],
  },
);

// Step 5: Customer Packet — require all acknowledgments (with timestamps) + signature
export const customerPacketSchema = z.object({
  acknowledgeHipaa: consentCheckboxSchema,
  acknowledgeHiringStandards: consentCheckboxSchema,
  acknowledgeCaregiverIntro: consentCheckboxSchema,
  acknowledgeComplaintProcedures: consentCheckboxSchema,
  acknowledgeSatisfactionSurvey: consentCheckboxSchema,
  acknowledgeSignature: z.string().min(1, 'Acknowledgment signature is required').max(200000),
}).passthrough();

// Indexed by wizard step number. Step 6 (Review) has no schema.
export const CONTRACT_STEP_SCHEMAS: (z.ZodType | null)[] = [
  serviceAgreementSchema,       // step 0
  termsConditionsSchema,        // step 1
  consumerRightsSchema,         // step 2
  directCareWorkerSchema,       // step 3
  transportationRequestSchema,  // step 4
  customerPacketSchema,         // step 5
  null,                         // step 6 (Review)
];
