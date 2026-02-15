import type { AssessmentFormData } from '../types/forms';
import type { DraftRecord } from './db';
import type { ExportPrivacyConfig } from '../types/sheetsConfig';
import { INITIAL_DATA } from './initialData';
import { applyExportFilters } from './exportFilters';

/** Flatten nested assessment data into a single-level key-value object for CSV export */
export function flattenData(data: AssessmentFormData): Record<string, string> {
  // Defensive guard: reject non-assessment data before accessing nested properties
  if (!data || typeof data !== 'object' || !('clientHelpList' in data) || !data.clientHelpList) {
    throw new Error(
      'flattenData received invalid data: missing clientHelpList. '
      + 'This data may be a service contract rather than an assessment. '
      + `Received keys: ${data ? Object.keys(data).slice(0, 5).join(', ') : 'undefined'}`
    );
  }

  const flat: Record<string, string> = {};

  // Client Help List
  const h = data.clientHelpList;
  flat['clientName'] = h.clientName;
  flat['dateOfBirth'] = h.dateOfBirth;
  flat['clientAddress'] = h.clientAddress;
  flat['clientPhone'] = h.clientPhone;
  flat['referralAgency'] = h.referralAgency;
  flat['date'] = h.date;
  flat['goals'] = h.goals;
  flat['healthRecentlyEvents'] = h.healthRecentlyEvents;

  h.emergencyContacts.forEach((c, i) => {
    if (!c.name) return;
    flat[`emergencyContact${i + 1}_name`] = c.name;
    flat[`emergencyContact${i + 1}_relationship`] = c.relationship;
    flat[`emergencyContact${i + 1}_address`] = c.address;
    flat[`emergencyContact${i + 1}_phone`] = c.phone1;
    flat[`emergencyContact${i + 1}_email`] = c.email;
  });

  h.doctors.forEach((d, i) => {
    if (!d.name) return;
    flat[`doctor${i + 1}_name`] = d.name;
    flat[`doctor${i + 1}_type`] = d.type;
    flat[`doctor${i + 1}_phone`] = d.phone;
  });

  h.hospitals.forEach((hp, i) => {
    if (!hp.name) return;
    flat[`hospital${i + 1}`] = hp.name;
  });

  h.neighbors.forEach((n, i) => {
    if (!n.name) return;
    flat[`neighbor${i + 1}_name`] = n.name;
    flat[`neighbor${i + 1}_phone`] = n.phone;
    flat[`neighbor${i + 1}_hasKeys`] = n.hasKeys;
  });

  // Client History
  const ch = data.clientHistory;
  flat['assessmentReason'] = ch.assessmentReason;
  flat['reAssessmentReasons'] = ch.reAssessmentReasons.join('; ');
  flat['primaryDiagnosis'] = ch.primaryDiagnosis;
  flat['healthHistory'] = ch.healthHistory.join('; ');
  flat['lastFallDate'] = ch.lastFallDate;
  flat['hospitalizations'] = ch.hospitalizations;
  flat['recentSurgery'] = ch.recentSurgery;
  flat['smoker'] = ch.smoker;
  flat['oxygenInHome'] = ch.oxygenInHome;
  flat['recentInfections'] = ch.recentInfections;
  flat['advanceDirective'] = ch.advanceDirective;
  flat['primaryLanguage'] = ch.primaryLanguage === 'other' ? ch.primaryLanguageOther : ch.primaryLanguage;
  flat['drugAllergies'] = ch.drugAllergies;
  flat['foodAllergies'] = ch.foodAllergies;
  flat['livesAlone'] = ch.livesAlone;
  flat['pets'] = ch.pets;
  flat['serviceStartDate'] = ch.serviceStartDate;
  flat['overnight'] = ch.overnight ? 'Yes' : 'No';
  flat['liveIn'] = ch.liveIn ? 'Yes' : 'No';
  flat['is24x7'] = ch.is24x7 ? 'Yes' : 'No';
  flat['serviceDays'] = ch.serviceDays.join('; ');
  for (const day of ch.serviceDays) {
    const schedule = ch.daySchedules[day];
    if (schedule) {
      flat[`schedule_${day}`] = `${schedule.from || '?'} - ${schedule.to || '?'}`;
    }
  }
  flat['serviceNotes'] = ch.servicesPerWeek;

  // Client Assessment — selected items per category
  const ca = data.clientAssessment;
  flat['assessmentType'] = ca.assessmentType;
  const categories = [
    'bathing', 'dressing', 'hairCare', 'teethAndGums', 'shaving', 'mobility',
    'falls', 'mobilityAids', 'nutritionHydration', 'bedRails', 'hearingAids',
    'toileting', 'medicationReminder', 'exerciseReminders', 'housekeeping', 'transportation',
  ] as const;
  for (const cat of categories) {
    flat[`assessment_${cat}`] = ca[cat].join('; ');
  }

  // Medication List
  const ml = data.medicationList;
  flat['noMedications'] = ml.noMedications ? 'Yes' : 'No';
  flat['medicationAllergies'] = ml.medicationAllergies;
  ml.medications.forEach((m, i) => {
    if (!m.name) return;
    flat[`medication${i + 1}_name`] = m.name;
    flat[`medication${i + 1}_dosage`] = m.dosage;
    flat[`medication${i + 1}_frequency`] = m.frequency;
    flat[`medication${i + 1}_route`] = m.route;
  });

  // Home Safety — summarize flagged concerns
  const hs = data.homeSafetyChecklist;
  const safetySections = [
    'entrance', 'general', 'medications', 'medicalEquipment', 'livingAreas',
    'bathroom', 'bedroom', 'kitchen', 'lighting', 'security', 'ancillaryServices',
  ] as const;
  for (const section of safetySections) {
    const items = hs[section];
    const answered = Object.entries(items).filter(([, v]) => v.answer);
    flat[`safety_${section}_total`] = String(answered.length);
    flat[`safety_${section}_concerns`] = answered
      .filter(([, v]) => v.note)
      .map(([k, v]) => `${k}: ${v.note}`)
      .join('; ');
  }
  flat['safetyComments'] = hs.comments;
  flat['safetyItemsNeedingAttention'] = hs.itemsNeedingAttention;

  // Consent
  flat['consentTreatment'] = data.consent.consentTreatment?.checked ? 'Yes' : 'No';
  flat['consentTreatment_timestamp'] = data.consent.consentTreatment?.timestamp || '';
  flat['consentInfoSharing'] = data.consent.consentInfoSharing?.checked ? 'Yes' : 'No';
  flat['consentInfoSharing_timestamp'] = data.consent.consentInfoSharing?.timestamp || '';
  flat['consentElectronicRecords'] = data.consent.consentElectronicRecords?.checked ? 'Yes' : 'No';
  flat['consentElectronicRecords_timestamp'] = data.consent.consentElectronicRecords?.timestamp || '';
  flat['consentDataRetention'] = data.consent.consentDataRetention?.checked ? 'Yes' : 'No';
  flat['consentDataRetention_timestamp'] = data.consent.consentDataRetention?.timestamp || '';
  flat['consentSigned'] = data.consent.hipaaSignature ? 'Yes' : 'No';
  flat['consentDate'] = data.consent.hipaaSignatureDate;

  // Staff Notes (may be missing in legacy drafts saved before staffNotes was added)
  const sn = data.staffNotes;
  if (sn) {
    if (sn.clientHelpList) flat['staffNote_clientHelpList'] = sn.clientHelpList;
    if (sn.clientHistory) flat['staffNote_clientHistory'] = sn.clientHistory;
    if (sn.clientAssessment) flat['staffNote_clientAssessment'] = sn.clientAssessment;
    if (sn.homeSafetyChecklist) flat['staffNote_homeSafetyChecklist'] = sn.homeSafetyChecklist;
    if (sn.medicationList) flat['staffNote_medicationList'] = sn.medicationList;
    if (sn.consent) flat['staffNote_consent'] = sn.consent;
  }

  return flat;
}

/** Export assessment data as a JSON file download */
export function exportJSON(data: AssessmentFormData, clientName: string, privacyConfig?: ExportPrivacyConfig): void {
  let flat = flattenData(data);
  if (privacyConfig) flat = applyExportFilters(flat, privacyConfig);
  const json = JSON.stringify(flat, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${safeName(clientName)}_assessment.json`);
}

/** Export assessment data as a flat CSV file download */
export function exportCSV(data: AssessmentFormData, clientName: string, privacyConfig?: ExportPrivacyConfig): void {
  let flat = flattenData(data);
  if (privacyConfig) flat = applyExportFilters(flat, privacyConfig);
  const headers = Object.keys(flat);
  const values = headers.map(h => csvEscape(flat[h]));
  const csv = headers.join(',') + '\n' + values.join(',');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${safeName(clientName)}_assessment.csv`);
}

/** Read a JSON file and return validated AssessmentFormData */
export function importJSON(file: File): Promise<AssessmentFormData> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      reject(new Error('Please select a .json file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);

        // Validate top-level keys
        const requiredKeys: (keyof AssessmentFormData)[] = [
          'clientHelpList', 'clientHistory', 'clientAssessment',
          'homeSafetyChecklist', 'medicationList', 'consent',
        ];
        const missing = requiredKeys.filter(k => !parsed[k] || typeof parsed[k] !== 'object');
        if (missing.length > 0) {
          reject(new Error(`Invalid assessment file. Missing sections: ${missing.join(', ')}`));
          return;
        }

        // Deep-merge with INITIAL_DATA defaults so new fields added since export are filled in
        const merged: AssessmentFormData = {
          clientHelpList: { ...INITIAL_DATA.clientHelpList, ...parsed.clientHelpList },
          clientHistory: { ...INITIAL_DATA.clientHistory, ...parsed.clientHistory },
          clientAssessment: { ...INITIAL_DATA.clientAssessment, ...parsed.clientAssessment },
          homeSafetyChecklist: { ...INITIAL_DATA.homeSafetyChecklist, ...parsed.homeSafetyChecklist },
          medicationList: { ...INITIAL_DATA.medicationList, ...parsed.medicationList },
          consent: { ...INITIAL_DATA.consent, ...parsed.consent },
          staffNotes: { ...INITIAL_DATA.staffNotes, ...parsed.staffNotes },
        };

        resolve(merged);
      } catch {
        reject(new Error('Failed to parse JSON file. Make sure it is a valid assessment export.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/** Reverse of flattenData — reconstruct AssessmentFormData from a flat key→value map.
 * Missing fields fall back to INITIAL_DATA defaults via deep-merge. */
export function unflattenAssessment(flat: Record<string, string>): AssessmentFormData {
  const data = JSON.parse(JSON.stringify(INITIAL_DATA)) as AssessmentFormData;

  // Client Help List — scalar fields
  if (flat['clientName']) data.clientHelpList.clientName = flat['clientName'];
  if (flat['dateOfBirth']) data.clientHelpList.dateOfBirth = flat['dateOfBirth'];
  if (flat['clientAddress']) data.clientHelpList.clientAddress = flat['clientAddress'];
  if (flat['clientPhone']) data.clientHelpList.clientPhone = flat['clientPhone'];
  if (flat['referralAgency']) data.clientHelpList.referralAgency = flat['referralAgency'];
  if (flat['date']) data.clientHelpList.date = flat['date'];
  if (flat['goals']) data.clientHelpList.goals = flat['goals'];
  if (flat['healthRecentlyEvents']) data.clientHelpList.healthRecentlyEvents = flat['healthRecentlyEvents'];

  // Emergency contacts (indexed)
  const contacts: typeof data.clientHelpList.emergencyContacts = [];
  for (let i = 1; i <= 10; i++) {
    const name = flat[`emergencyContact${i}_name`];
    if (!name) break;
    contacts.push({
      name,
      relationship: flat[`emergencyContact${i}_relationship`] || '',
      address: flat[`emergencyContact${i}_address`] || '',
      phone1: flat[`emergencyContact${i}_phone`] || '',
      phone2: '',
      email: flat[`emergencyContact${i}_email`] || '',
    });
  }
  if (contacts.length > 0) data.clientHelpList.emergencyContacts = contacts;

  // Doctors
  const doctors: typeof data.clientHelpList.doctors = [];
  for (let i = 1; i <= 10; i++) {
    const name = flat[`doctor${i}_name`];
    if (!name) break;
    doctors.push({
      name,
      type: flat[`doctor${i}_type`] || '',
      phone: flat[`doctor${i}_phone`] || '',
    });
  }
  if (doctors.length > 0) data.clientHelpList.doctors = doctors;

  // Hospitals
  const hospitals: typeof data.clientHelpList.hospitals = [];
  for (let i = 1; i <= 10; i++) {
    const name = flat[`hospital${i}`];
    if (!name) break;
    hospitals.push({ name });
  }
  if (hospitals.length > 0) data.clientHelpList.hospitals = hospitals;

  // Neighbors
  const neighbors: typeof data.clientHelpList.neighbors = [];
  for (let i = 1; i <= 10; i++) {
    const name = flat[`neighbor${i}_name`];
    if (!name) break;
    neighbors.push({
      name,
      phone: flat[`neighbor${i}_phone`] || '',
      hasKeys: flat[`neighbor${i}_hasKeys`] || '',
    });
  }
  if (neighbors.length > 0) data.clientHelpList.neighbors = neighbors;

  // Client History
  const ch = data.clientHistory;
  if (flat['assessmentReason']) ch.assessmentReason = flat['assessmentReason'];
  if (flat['reAssessmentReasons']) ch.reAssessmentReasons = flat['reAssessmentReasons'].split('; ').filter(Boolean);
  if (flat['primaryDiagnosis']) ch.primaryDiagnosis = flat['primaryDiagnosis'];
  if (flat['healthHistory']) ch.healthHistory = flat['healthHistory'].split('; ').filter(Boolean);
  if (flat['lastFallDate']) ch.lastFallDate = flat['lastFallDate'];
  if (flat['hospitalizations']) ch.hospitalizations = flat['hospitalizations'];
  if (flat['recentSurgery']) ch.recentSurgery = flat['recentSurgery'];
  if (flat['smoker']) ch.smoker = flat['smoker'];
  if (flat['oxygenInHome']) ch.oxygenInHome = flat['oxygenInHome'];
  if (flat['recentInfections']) ch.recentInfections = flat['recentInfections'];
  if (flat['advanceDirective']) ch.advanceDirective = flat['advanceDirective'];
  if (flat['primaryLanguage']) ch.primaryLanguage = flat['primaryLanguage'];
  if (flat['drugAllergies']) ch.drugAllergies = flat['drugAllergies'];
  if (flat['foodAllergies']) ch.foodAllergies = flat['foodAllergies'];
  if (flat['livesAlone']) ch.livesAlone = flat['livesAlone'];
  if (flat['pets']) ch.pets = flat['pets'];
  if (flat['serviceStartDate']) ch.serviceStartDate = flat['serviceStartDate'];
  ch.overnight = flat['overnight'] === 'Yes';
  ch.liveIn = flat['liveIn'] === 'Yes';
  ch.is24x7 = flat['is24x7'] === 'Yes';
  if (flat['serviceDays']) {
    const REJECT = ['yes', 'no', 'true', 'false', 'na', 'n/a', ''];
    ch.serviceDays = flat['serviceDays'].split('; ').filter(d => d && !REJECT.includes(d.toLowerCase()));
  }

  // Client Assessment
  const ca = data.clientAssessment;
  if (flat['assessmentType']) ca.assessmentType = flat['assessmentType'];
  const categories = [
    'bathing', 'dressing', 'hairCare', 'teethAndGums', 'shaving', 'mobility',
    'falls', 'mobilityAids', 'nutritionHydration', 'bedRails', 'hearingAids',
    'toileting', 'medicationReminder', 'exerciseReminders', 'housekeeping', 'transportation',
  ] as const;
  // Reject values that are clearly not assessment options (day names, times, booleans, etc.)
  const REJECT_ASSESSMENT = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'yes', 'no', 'true', 'false', 'na', 'n/a', 'initial', 'revised',
  ];
  const TIME_PATTERN = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;
  for (const cat of categories) {
    const val = flat[`assessment_${cat}`];
    if (val) {
      ca[cat] = val.split('; ').filter(item =>
        item && !REJECT_ASSESSMENT.includes(item.toLowerCase()) && !TIME_PATTERN.test(item),
      );
    }
  }

  // Medication List
  const ml = data.medicationList;
  ml.noMedications = flat['noMedications'] === 'Yes';
  if (flat['medicationAllergies']) ml.medicationAllergies = flat['medicationAllergies'];
  const meds: typeof ml.medications = [];
  for (let i = 1; i <= 50; i++) {
    const name = flat[`medication${i}_name`];
    if (!name) break;
    meds.push({
      name,
      dosage: flat[`medication${i}_dosage`] || '',
      frequency: flat[`medication${i}_frequency`] || '',
      route: flat[`medication${i}_route`] || '',
      updates: '',
    });
  }
  if (meds.length > 0) ml.medications = meds;

  // Propagate client info to other sections
  const clientName = data.clientHelpList.clientName;
  const date = data.clientHelpList.date;
  const address = data.clientHelpList.clientAddress;
  ch.clientName = clientName;
  ch.date = date;
  ch.clientAddress = address;
  ca.clientName = clientName;
  ca.date = date;
  ca.clientAddress = address;
  ml.clientName = clientName;
  ml.date = date;
  ml.clientAddress = address;
  data.homeSafetyChecklist.clientName = clientName;
  data.homeSafetyChecklist.date = date;
  data.homeSafetyChecklist.clientAddress = address;
  data.consent.clientName = clientName;
  data.consent.date = date;
  data.consent.clientAddress = address;

  // Staff Notes
  const noteKeys = ['clientHelpList', 'clientHistory', 'clientAssessment', 'homeSafetyChecklist', 'medicationList', 'consent'] as const;
  for (const key of noteKeys) {
    if (flat[`staffNote_${key}`]) data.staffNotes[key] = flat[`staffNote_${key}`];
  }

  return data;
}

export function csvEscape(val: string): string {
  if (!val) return '';
  // Neutralize CSV formula injection: prefix dangerous leading chars with a single quote
  let sanitized = val;
  const first = sanitized.charAt(0);
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    sanitized = "'" + sanitized;
  }
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function safeName(name: string): string {
  return (name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
}

/** Export all drafts as a single ZIP file containing one JSON per draft. */
export async function exportAllDraftsZip(drafts: DraftRecord[]): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const draft of drafts) {
    const typeLabel = draft.type === 'serviceContract' ? 'contract' : 'assessment';
    const name = safeName(draft.clientName);
    const filename = `${name}_${typeLabel}_${draft.id.substring(0, 8)}.json`;
    zip.file(filename, JSON.stringify(draft.data, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toLocaleDateString('en-CA');
  downloadBlob(blob, `EHC_Drafts_Backup_${dateStr}.zip`);
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
