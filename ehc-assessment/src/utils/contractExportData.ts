import type { ServiceContractFormData } from '../types/serviceContract';
import type { HourlyRateOption } from '../types/serviceContract';
import type { ExportPrivacyConfig } from '../types/sheetsConfig';
import { csvEscape, safeName } from './exportData';
import { applyExportFilters } from './exportFilters';
import { SERVICE_CONTRACT_INITIAL_DATA } from './contractInitialData';

/** Flatten nested contract data into a single-level key-value object for CSV export */
export function flattenContractData(data: ServiceContractFormData): Record<string, string> {
  // Defensive guard: reject non-contract data before accessing nested properties
  if (!data || typeof data !== 'object' || !('serviceAgreement' in data) || !data.serviceAgreement) {
    throw new Error(
      'flattenContractData received invalid data: missing serviceAgreement. '
      + 'This data may be an assessment rather than a service contract. '
      + `Received keys: ${data ? Object.keys(data).slice(0, 5).join(', ') : 'undefined'}`
    );
  }

  const flat: Record<string, string> = {};

  // Service Agreement
  const sa = data.serviceAgreement;
  const ci = sa.customerInfo;
  flat['firstName'] = ci.firstName;
  flat['lastName'] = ci.lastName;
  flat['address'] = ci.address;
  flat['phone'] = ci.phone;
  flat['dateOfBirth'] = ci.dateOfBirth;
  flat['startOfCareDate'] = ci.startOfCareDate;
  flat['daysPerWeek'] = ci.daysPerWeek;
  flat['hoursPerDay'] = ci.hoursPerDay;
  flat['liveIn'] = ci.liveIn;
  flat['agreementDate'] = sa.date;

  // Payment Terms
  flat['rateType'] = sa.paymentTerms.rateType || 'hourly';
  if (sa.paymentTerms.rateType === 'liveIn') {
    flat['liveInRate'] = sa.paymentTerms.liveInRate;
  } else {
    const rateLabel = sa.paymentTerms.hourlyRateOption === '35/38' ? '$35/$38'
      : sa.paymentTerms.hourlyRateOption === '38/40' ? '$38/$40'
      : sa.paymentTerms.hourlyRateOption === 'custom' ? sa.paymentTerms.customHourlyRate
      : '';
    flat['hourlyRate'] = rateLabel;
  }
  flat['holidayRatesApply'] = sa.paymentTerms.holidayRatesApply ? 'Yes' : 'No';

  // Level of Service
  const los: string[] = [];
  if (sa.levelOfService.cna) los.push('CNA');
  if (sa.levelOfService.chha) los.push('CHHA');
  if (sa.levelOfService.other) los.push(sa.levelOfService.otherText || 'Other');
  flat['levelOfService'] = los.join('; ');

  // Method of Payment
  const mop: string[] = [];
  if (sa.methodOfPayment.check) mop.push('Check');
  if (sa.methodOfPayment.creditCard) mop.push('Credit Card');
  if (sa.methodOfPayment.achEft) mop.push('ACH/EFT');
  if (sa.methodOfPayment.longTermCareInsurance) mop.push('Long-Term Care Insurance');
  flat['methodOfPayment'] = mop.join('; ');

  if (sa.methodOfPayment.longTermCareInsurance) {
    flat['insurancePolicyName'] = sa.methodOfPayment.insurancePolicyName;
    flat['insurancePolicyNumber'] = sa.methodOfPayment.insurancePolicyNumber;
  }

  // Contact Person
  flat['contactPerson'] = sa.contactPerson.name;
  flat['contactAddress'] = sa.contactPerson.address;
  flat['contactPhone'] = sa.contactPerson.phone;
  flat['contactRelationship'] = sa.contactPerson.relationship;

  // Billing Person
  flat['billingPerson'] = sa.billingPerson.name;
  flat['billingAddress'] = sa.billingPerson.address;
  flat['billingPhone'] = sa.billingPerson.phone;

  // Services Selected
  const services: string[] = [];
  if (sa.services.selfAdminMeds) services.push('Self-Admin Meds');
  if (sa.services.personalCare) services.push('Personal Care');
  if (sa.services.homemaking) services.push('Homemaking');
  if (sa.services.transportation) services.push('Transportation');
  if (sa.services.companionship) services.push('Companionship');
  if (sa.services.respiteCare) services.push('Respite Care');
  if (sa.services.otherNonSkilled) services.push(sa.services.otherNonSkilledText || 'Other');
  flat['servicesSelected'] = services.join('; ');

  // Frequency
  flat['overnight'] = sa.frequency.overnight ? 'Yes' : 'No';
  flat['frequencyLiveIn'] = sa.frequency.liveIn ? 'Yes' : 'No';
  flat['available24x7'] = sa.frequency.available24x7 ? 'Yes' : 'No';
  const days: string[] = [];
  if (sa.frequency.monday) days.push('Mon');
  if (sa.frequency.tuesday) days.push('Tue');
  if (sa.frequency.wednesday) days.push('Wed');
  if (sa.frequency.thursday) days.push('Thu');
  if (sa.frequency.friday) days.push('Fri');
  if (sa.frequency.saturday) days.push('Sat');
  if (sa.frequency.sunday) days.push('Sun');
  flat['scheduleDays'] = days.join('; ');
  flat['additionalNotes'] = sa.frequency.duration;

  flat['assignedCaregiver'] = sa.assignedCaregiver;
  flat['serviceDeposit'] = sa.serviceDeposit;

  // Signatures
  flat['signerIsRepresentative'] = sa.signerIsRepresentative ? 'Yes' : 'No';
  flat['clientSignatureSigned'] = sa.clientSignature ? 'Yes' : 'No';
  flat['clientPrintName'] = sa.clientPrintName;
  if (sa.signerIsRepresentative) {
    flat['representativeName'] = sa.representativeName;
    flat['representativeRelationship'] = sa.representativeRelationship;
  }
  flat['ehcRepSignatureSigned'] = sa.ehcRepSignature ? 'Yes' : 'No';

  // Terms & Conditions
  flat['termsNonSolicitationInitial'] = data.termsConditions.nonSolicitationInitial;
  flat['termsPaymentInitial'] = data.termsConditions.termsOfPaymentInitial;
  flat['termsCardSurchargeInitial'] = data.termsConditions.cardSurchargeInitial;
  flat['termsTerminationInitial'] = data.termsConditions.terminationInitial;
  flat['termsAuthConsentInitial'] = data.termsConditions.authorizationConsentInitial;
  flat['termsRelatedDocsInitial'] = data.termsConditions.relatedDocumentsInitial;

  // Consumer Rights
  flat['consumerRightsAcknowledged'] = data.consumerRights.acknowledgeSignature ? 'Yes' : 'No';
  flat['consumerRightsDate'] = data.consumerRights.acknowledgeDate;

  // Direct Care Worker (Registry section is N/A — all caregivers are EHC employees)
  flat['dcwEmployeeInitial'] = data.directCareWorker.employeeOfEhcInitial;
  flat['dcwLiabilityInitial'] = data.directCareWorker.liabilityInsuranceInitial;
  flat['dcwConsumerSigned'] = data.directCareWorker.consumerSignature ? 'Yes' : 'No';

  // Transportation
  flat['transportDeclined'] = data.transportationRequest.declined ? 'Yes' : 'No';
  if (!data.transportationRequest.declined) {
    flat['vehicleChoice'] = data.transportationRequest.vehicleChoice;
    flat['transportEmployees'] = data.transportationRequest.employeeNames;
    flat['transportClientSigned'] = data.transportationRequest.clientSignature ? 'Yes' : 'No';
  }

  // Customer Packet — ConsentCheckbox fields with checked + timestamp
  flat['packetHipaa'] = data.customerPacket.acknowledgeHipaa?.checked ? 'Yes' : 'No';
  flat['packetHipaaTimestamp'] = data.customerPacket.acknowledgeHipaa?.timestamp || '';
  flat['packetHiringStandards'] = data.customerPacket.acknowledgeHiringStandards?.checked ? 'Yes' : 'No';
  flat['packetHiringStandardsTimestamp'] = data.customerPacket.acknowledgeHiringStandards?.timestamp || '';
  flat['packetCaregiverIntro'] = data.customerPacket.acknowledgeCaregiverIntro?.checked ? 'Yes' : 'No';
  flat['packetCaregiverIntroTimestamp'] = data.customerPacket.acknowledgeCaregiverIntro?.timestamp || '';
  flat['packetComplaint'] = data.customerPacket.acknowledgeComplaintProcedures?.checked ? 'Yes' : 'No';
  flat['packetComplaintTimestamp'] = data.customerPacket.acknowledgeComplaintProcedures?.timestamp || '';
  flat['packetSurvey'] = data.customerPacket.acknowledgeSatisfactionSurvey?.checked ? 'Yes' : 'No';
  flat['packetSurveyTimestamp'] = data.customerPacket.acknowledgeSatisfactionSurvey?.timestamp || '';
  flat['packetSigned'] = data.customerPacket.acknowledgeSignature ? 'Yes' : 'No';
  flat['packetDate'] = data.customerPacket.acknowledgeDate;

  return flat;
}

/** Helper: parse 'Yes'/'No' strings to boolean */
function yesNo(val: string | undefined): boolean {
  return val?.trim().toLowerCase() === 'yes';
}

/** Helper: split semicolon-separated string, trim items, drop empties */
function splitSemicolon(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(';').map(s => s.trim()).filter(Boolean);
}

/**
 * Reconstruct a ServiceContractFormData from a flat key-value map
 * (the inverse of flattenContractData).
 * Missing keys fall back to SERVICE_CONTRACT_INITIAL_DATA defaults.
 */
export function unflattenContractData(flat: Record<string, string>): ServiceContractFormData {
  // Deep-clone defaults so we don't mutate the original
  const data: ServiceContractFormData = JSON.parse(JSON.stringify(SERVICE_CONTRACT_INITIAL_DATA));

  // --- Service Agreement: Customer Info ---
  const ci = data.serviceAgreement.customerInfo;
  ci.firstName = flat['firstName'] || '';
  ci.lastName = flat['lastName'] || '';
  ci.address = flat['address'] || '';
  ci.phone = flat['phone'] || '';
  ci.dateOfBirth = flat['dateOfBirth'] || '';
  ci.startOfCareDate = flat['startOfCareDate'] || '';
  ci.daysPerWeek = flat['daysPerWeek'] || '';
  ci.hoursPerDay = flat['hoursPerDay'] || '';
  const liveInVal = (flat['liveIn'] || '').toLowerCase();
  ci.liveIn = liveInVal === 'yes' ? 'yes' : liveInVal === 'no' ? 'no' : '';
  data.serviceAgreement.date = flat['agreementDate'] || data.serviceAgreement.date;

  // --- Payment Terms ---
  const pt = data.serviceAgreement.paymentTerms;
  const rateType = flat['rateType'] || '';
  pt.rateType = rateType === 'hourly' || rateType === 'liveIn' ? rateType : '';
  if (pt.rateType === 'liveIn') {
    pt.liveInRate = flat['liveInRate'] || '';
  } else {
    // Reverse hourly rate label: '$35/$38' → '35/38', '$38/$40' → '38/40', else custom
    const hrLabel = flat['hourlyRate'] || '';
    if (hrLabel === '$35/$38') {
      pt.hourlyRateOption = '35/38';
    } else if (hrLabel === '$38/$40') {
      pt.hourlyRateOption = '38/40';
    } else if (hrLabel) {
      pt.hourlyRateOption = 'custom' as HourlyRateOption;
      pt.customHourlyRate = hrLabel;
    }
  }
  pt.holidayRatesApply = flat['holidayRatesApply'] !== undefined ? yesNo(flat['holidayRatesApply']) : true;

  // --- Level of Service ---
  const los = data.serviceAgreement.levelOfService;
  const losItems = splitSemicolon(flat['levelOfService']);
  for (const item of losItems) {
    if (item === 'CNA') los.cna = true;
    else if (item === 'CHHA') los.chha = true;
    else { los.other = true; los.otherText = item; }
  }

  // --- Method of Payment ---
  const mop = data.serviceAgreement.methodOfPayment;
  const mopItems = splitSemicolon(flat['methodOfPayment']);
  for (const item of mopItems) {
    if (item === 'Check') mop.check = true;
    else if (item === 'Credit Card') mop.creditCard = true;
    else if (item === 'ACH/EFT') mop.achEft = true;
    else if (item === 'Long-Term Care Insurance') mop.longTermCareInsurance = true;
  }
  mop.insurancePolicyName = flat['insurancePolicyName'] || '';
  mop.insurancePolicyNumber = flat['insurancePolicyNumber'] || '';

  // --- Contact Person ---
  data.serviceAgreement.contactPerson.name = flat['contactPerson'] || '';
  data.serviceAgreement.contactPerson.address = flat['contactAddress'] || '';
  data.serviceAgreement.contactPerson.phone = flat['contactPhone'] || '';
  data.serviceAgreement.contactPerson.relationship = flat['contactRelationship'] || '';

  // --- Billing Person ---
  data.serviceAgreement.billingPerson.name = flat['billingPerson'] || '';
  data.serviceAgreement.billingPerson.address = flat['billingAddress'] || '';
  data.serviceAgreement.billingPerson.phone = flat['billingPhone'] || '';

  // --- Services Selected ---
  const svc = data.serviceAgreement.services;
  const svcItems = splitSemicolon(flat['servicesSelected']);
  for (const item of svcItems) {
    if (item === 'Self-Admin Meds') svc.selfAdminMeds = true;
    else if (item === 'Personal Care') svc.personalCare = true;
    else if (item === 'Homemaking') svc.homemaking = true;
    else if (item === 'Transportation') svc.transportation = true;
    else if (item === 'Companionship') svc.companionship = true;
    else if (item === 'Respite Care') svc.respiteCare = true;
    else { svc.otherNonSkilled = true; svc.otherNonSkilledText = item; }
  }

  // --- Frequency / Schedule ---
  const freq = data.serviceAgreement.frequency;
  freq.overnight = yesNo(flat['overnight']);
  freq.liveIn = yesNo(flat['frequencyLiveIn']);
  freq.available24x7 = yesNo(flat['available24x7']);
  freq.duration = flat['additionalNotes'] || '';

  const DAY_MAP: Record<string, keyof typeof freq> = {
    'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday',
    'Thu': 'thursday', 'Fri': 'friday', 'Sat': 'saturday', 'Sun': 'sunday',
  };
  const dayItems = splitSemicolon(flat['scheduleDays']);
  for (const abbr of dayItems) {
    const key = DAY_MAP[abbr];
    if (key) (freq as Record<string, unknown>)[key] = true;
  }

  data.serviceAgreement.assignedCaregiver = flat['assignedCaregiver'] || '';
  data.serviceAgreement.serviceDeposit = flat['serviceDeposit'] || '';

  // --- Signatures (status only — actual signature data is not in flat export) ---
  data.serviceAgreement.signerIsRepresentative = yesNo(flat['signerIsRepresentative']);
  data.serviceAgreement.clientPrintName = flat['clientPrintName'] || '';
  data.serviceAgreement.representativeName = flat['representativeName'] || '';
  data.serviceAgreement.representativeRelationship = flat['representativeRelationship'] || '';

  // --- Terms & Conditions ---
  data.termsConditions.nonSolicitationInitial = flat['termsNonSolicitationInitial'] || '';
  data.termsConditions.termsOfPaymentInitial = flat['termsPaymentInitial'] || '';
  data.termsConditions.cardSurchargeInitial = flat['termsCardSurchargeInitial'] || '';
  data.termsConditions.terminationInitial = flat['termsTerminationInitial'] || '';
  data.termsConditions.authorizationConsentInitial = flat['termsAuthConsentInitial'] || '';
  data.termsConditions.relatedDocumentsInitial = flat['termsRelatedDocsInitial'] || '';

  // --- Consumer Rights ---
  data.consumerRights.acknowledgeDate = flat['consumerRightsDate'] || data.consumerRights.acknowledgeDate;

  // --- Direct Care Worker ---
  data.directCareWorker.employeeOfEhcInitial = flat['dcwEmployeeInitial'] || '';
  data.directCareWorker.liabilityInsuranceInitial = flat['dcwLiabilityInitial'] || '';

  // --- Transportation ---
  data.transportationRequest.declined = yesNo(flat['transportDeclined']);
  const vc = flat['vehicleChoice'] || '';
  data.transportationRequest.vehicleChoice = vc === 'clientVehicle' || vc === 'caregiverVehicle' ? vc : '';
  data.transportationRequest.employeeNames = flat['transportEmployees'] || '';

  // --- Customer Packet ---
  data.customerPacket.acknowledgeHipaa = { checked: yesNo(flat['packetHipaa']), timestamp: flat['packetHipaaTimestamp'] || '' };
  data.customerPacket.acknowledgeHiringStandards = { checked: yesNo(flat['packetHiringStandards']), timestamp: flat['packetHiringStandardsTimestamp'] || '' };
  data.customerPacket.acknowledgeCaregiverIntro = { checked: yesNo(flat['packetCaregiverIntro']), timestamp: flat['packetCaregiverIntroTimestamp'] || '' };
  data.customerPacket.acknowledgeComplaintProcedures = { checked: yesNo(flat['packetComplaint']), timestamp: flat['packetComplaintTimestamp'] || '' };
  data.customerPacket.acknowledgeSatisfactionSurvey = { checked: yesNo(flat['packetSurvey']), timestamp: flat['packetSurveyTimestamp'] || '' };
  data.customerPacket.acknowledgeDate = flat['packetDate'] || data.customerPacket.acknowledgeDate;

  // --- Propagate consumer name to all sub-sections ---
  const fullName = `${ci.firstName} ${ci.lastName}`.trim();
  if (fullName) {
    data.consumerRights.consumerName = fullName;
    data.directCareWorker.consumerName = fullName;
    data.transportationRequest.consumerName = fullName;
    data.customerPacket.consumerName = fullName;
  }

  return data;
}

/** Export contract data as a JSON file download */
export function exportContractJSON(data: ServiceContractFormData, clientName: string, privacyConfig?: ExportPrivacyConfig): void {
  let flat = flattenContractData(data);
  if (privacyConfig) flat = applyExportFilters(flat, privacyConfig);
  const json = JSON.stringify(flat, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${safeName(clientName)}_service_contract.json`);
}

/** Export contract data as a flat CSV file download */
export function exportContractCSV(data: ServiceContractFormData, clientName: string, privacyConfig?: ExportPrivacyConfig): void {
  let flat = flattenContractData(data);
  if (privacyConfig) flat = applyExportFilters(flat, privacyConfig);
  const headers = Object.keys(flat);
  const values = headers.map(h => csvEscape(flat[h]));
  const csv = headers.join(',') + '\n' + values.join(',');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${safeName(clientName)}_service_contract.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
