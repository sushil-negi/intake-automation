import type { SignatureMetadata, ConsentCheckbox } from './forms';

// ===== Step 0: Service Agreement =====

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  address: string;          // single-line: "123 Main St, Exton, PA 19341"
  phone: string;
  ssnLast4: string;
  dateOfBirth: string;
  startOfCareDate: string;
  daysPerWeek: string;
  hoursPerDay: string;
  liveIn: 'yes' | 'no' | '';
}

export type HourlyRateOption = '35/38' | '38/40' | 'custom';

export interface PaymentTerms {
  rateType: 'hourly' | 'liveIn' | '';       // driven by assessment liveIn flag
  hourlyRateOption: HourlyRateOption | '';   // dropdown: 35/38, 38/40, custom
  customHourlyRate: string;                  // only when hourlyRateOption === 'custom'
  liveInRate: string;
  holidayRatesApply: boolean;
}

export interface LevelOfService {
  cna: boolean;
  chha: boolean;
  other: boolean;
  otherText: string;
}

export interface MethodOfPayment {
  check: boolean;
  creditCard: boolean;
  achEft: boolean;
  longTermCareInsurance: boolean;
  insurancePolicyName: string;
  insurancePolicyNumber: string;
  insuranceContactName: string;
  insuranceContactAddress: string;
  insuranceContactPhone: string;
  insuranceContactRelationship: string;
}

export interface ContactPerson {
  name: string;
  address: string;
  phone: string;
  relationship: string;
}

export interface ServicesSelected {
  selfAdminMeds: boolean;
  personalCare: boolean;
  homemaking: boolean;
  transportation: boolean;
  companionship: boolean;
  respiteCare: boolean;
  otherNonSkilled: boolean;
  otherNonSkilledText: string;
}

export interface ServiceFrequency {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  orAsRequested: boolean;
  duration: string;
  startTime: string;
  startAmPm: 'AM' | 'PM' | '';
  endTime: string;
  endAmPm: 'AM' | 'PM' | '';
  available24x7: boolean;
  overnight: boolean;
  liveIn: boolean;
  daySchedules: Record<string, { from: string; to: string }>;
}

export interface ServiceAgreementData {
  date: string;
  customerInfo: CustomerInfo;
  paymentTerms: PaymentTerms;
  levelOfService: LevelOfService;
  methodOfPayment: MethodOfPayment;
  contactPerson: ContactPerson;
  billingPerson: ContactPerson;
  services: ServicesSelected;
  frequency: ServiceFrequency;
  assignedCaregiver: string;
  serviceDeposit: string;
  // Client / Authorized Representative — one consolidated signature
  clientSignature: string;
  clientSignatureMeta: SignatureMetadata | null;
  clientPrintName: string;
  signerIsRepresentative: boolean;
  representativeName: string;
  representativeRelationship: string;
  // EHC Representative
  ehcRepName: string;
  ehcRepSignature: string;
  ehcRepSignatureMeta: SignatureMetadata | null;
}

// ===== Step 1: Service Agreement Terms & Conditions =====

export interface TermsConditionsData {
  /** Initials confirming Non-Solicitation Agreement read */
  nonSolicitationInitial: string;
  /** Initials confirming Terms of Payment read */
  termsOfPaymentInitial: string;
  /** Initials confirming Card Payment Surcharge read */
  cardSurchargeInitial: string;
  /** Initials confirming Termination terms read */
  terminationInitial: string;
  /** Initials confirming Authorization & Consent read */
  authorizationConsentInitial: string;
  /** Initials confirming Related Documents / general T&C read (bottom of page 3) */
  relatedDocumentsInitial: string;
}

// ===== Step 2: Consumer Rights & Responsibilities =====

export interface ConsumerRightsData {
  consumerName: string;
  acknowledgeSignature: string;
  acknowledgeSignatureMeta: SignatureMetadata | null;
  acknowledgeDate: string;
  responsiblePartyRelationship: string;
}

// ===== Step 3: Direct Care Worker Notice =====

export interface DirectCareWorkerData {
  consumerName: string;
  employeeOfEhcInitial: string;
  registryNotEmployeeInitial: string;
  liabilityInsuranceInitial: string;
  consumerSignature: string;
  consumerSignatureMeta: SignatureMetadata | null;
  agencyRepSignature: string;
  agencyRepSignatureMeta: SignatureMetadata | null;
  date: string;
}

// ===== Step 4: Transportation Request =====

export interface TransportationRequestData {
  consumerName: string;
  declined: boolean;
  vehicleChoice: 'clientVehicle' | 'caregiverVehicle' | '';
  employeeNames: string;
  clientSignature: string;
  clientSignatureMeta: SignatureMetadata | null;
  clientRelationship: string;
  ehcRepName: string;
  ehcRepTitle: string;
  ehcRepSignature: string;
  ehcRepSignatureMeta: SignatureMetadata | null;
  date: string;
}

// ===== Step 5: Customer Packet Acknowledgment =====

export interface CustomerPacketData {
  consumerName: string;
  acknowledgeHipaa: ConsentCheckbox;
  acknowledgeHiringStandards: ConsentCheckbox;
  acknowledgeCaregiverIntro: ConsentCheckbox;
  acknowledgeComplaintProcedures: ConsentCheckbox;
  acknowledgeSatisfactionSurvey: ConsentCheckbox;
  acknowledgeSignature: string;
  acknowledgeSignatureMeta: SignatureMetadata | null;
  acknowledgeDate: string;
}

// ===== Top-level composite =====

export interface ServiceContractFormData {
  serviceAgreement: ServiceAgreementData;
  termsConditions: TermsConditionsData;
  consumerRights: ConsumerRightsData;
  directCareWorker: DirectCareWorkerData;
  transportationRequest: TransportationRequestData;
  customerPacket: CustomerPacketData;
}
