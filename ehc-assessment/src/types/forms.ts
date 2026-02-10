export interface EmergencyContact {
  name: string;
  relationship: string;
  address: string;
  phone1: string;
  phone2: string;
}

export interface DoctorInfo {
  name: string;
  type: string;
  phone: string;
}

export interface ClientHelpListData {
  clientName: string;
  dateOfBirth: string;
  clientAddress: string;
  goals: string;
  clientPhone: string;
  referralAgency: string;
  date: string;
  emergencyContacts: EmergencyContact[];
  doctors: DoctorInfo[];
  hospitalPreference1: string;
  hospitalPreference2: string;
  neighborName: string;
  neighborPhone: string;
  neighborHasKeys: 'yes' | 'no' | '';
  healthRecentlyEvents: string;
}

export interface OtherProvider {
  agencyName: string;
  typeOfAgency: string;
  phone: string;
  address: string;
  email: string;
}

export interface ClientHistoryData {
  clientName: string;
  date: string;
  age: string;
  assessmentReason: 'initial' | '90day' | '';
  reAssessmentReasons: string[];
  reAssessmentOtherReason: string;
  servicesPerWeek: string;
  overnight: boolean;
  liveIn: boolean;
  serviceStartDate: string;
  preferredTimes: { from: string; to: string }[];
  primaryDiagnosis: string;
  healthHistory: string[];
  lastFallDate: string;
  hospitalizations: string;
  recentSurgery: string;
  recentHipSurgery: 'na' | 'yes' | 'no' | '';
  recentHipSurgeryDate: string;
  smoker: 'yes' | 'no' | '';
  oxygenInHome: 'yes' | 'no' | '';
  recentInfections: string;
  otherProviders: OtherProvider[];
  advanceDirective: 'has' | 'doesNotHave' | 'wants' | 'doesNotComprehend' | '';
  visionImpaired: boolean;
  visionBothEyes: boolean;
  visionRightOnly: boolean;
  visionLeftOnly: boolean;
  visionGlasses: boolean;
  visionContacts: boolean;
  hearingAids: boolean;
  hearingBothEars: boolean;
  hearingRightEar: boolean;
  hearingLeftEar: boolean;
  hearingSignLanguage: boolean;
  hearingTablet: boolean;
  speechImpaired: string;
  primaryLanguage: 'english' | 'spanish' | 'other' | '';
  primaryLanguageOther: string;
  understandsEnglish: 'yes' | 'no' | 'limited' | '';
  diet: string[];
  dietOther: string;
  drugAllergies: string;
  foodAllergies: string;
  livesAlone: 'yes' | 'no' | '';
  peopleInHome: string;
  whoAreThey: string;
  whenOthersHome: string;
  pets: 'yes' | 'no' | '';
  petKind: string;
  petCount: string;
}

export interface ClientAssessmentData {
  clientName: string;
  date: string;
  assessmentType: 'initial' | 'revised' | '';
  revisedDate: string;
  bathing: string[];
  dressing: string[];
  hairCare: string[];
  teethAndGums: string[];
  shaving: string[];
  mobility: string[];
  falls: string[];
  mobilityAids: string[];
  nutritionHydration: string[];
  bedRails: string[];
  hearingAids: string[];
  toileting: string[];
  medicationReminder: string[];
  exerciseReminders: string[];
  housekeeping: string[];
  transportation: string[];
}

export type SafetyAnswer = 'yes' | 'no' | 'na' | '';

export interface SafetyItem {
  answer: SafetyAnswer;
  note: string;
}

export interface HomeSafetyChecklistData {
  clientName: string;
  date: string;
  clientAddress: string;
  entrance: Record<string, SafetyItem>;
  general: Record<string, SafetyItem>;
  medications: Record<string, SafetyItem>;
  medicalEquipment: Record<string, SafetyItem>;
  livingAreas: Record<string, SafetyItem>;
  bathroom: Record<string, SafetyItem>;
  bedroom: Record<string, SafetyItem>;
  kitchen: Record<string, SafetyItem>;
  lighting: Record<string, SafetyItem>;
  security: Record<string, SafetyItem>;
  ancillaryServices: Record<string, SafetyItem>;
  comments: string;
  itemsNeedingAttention: string;
  signerName: string;
  ehcStaffName: string;
  clientSignature: string;
  representativeSignature: string;
  representativeName: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  updates: string;
}

export interface MedicationListData {
  clientName: string;
  date: string;
  clientAddress: string;
  age: string;
  medicationAllergies: string;
  medications: Medication[];
  noMedications: boolean;
}

export interface ConsentData {
  clientName: string;
  date: string;
  clientAddress: string;
  age: string;
  signerName: string;
  ehcStaffName: string;
  hipaaSignature: string;
  hipaaSignatureDate: string;
  benefitsSignature: string;
  benefitsSignatureDate: string;
}

export interface AssessmentFormData {
  clientHelpList: ClientHelpListData;
  clientHistory: ClientHistoryData;
  clientAssessment: ClientAssessmentData;
  homeSafetyChecklist: HomeSafetyChecklistData;
  medicationList: MedicationListData;
  consent: ConsentData;
}

export interface WizardStep {
  id: string;
  title: string;
  shortTitle: string;
  component: React.ComponentType<StepProps>;
}

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}
