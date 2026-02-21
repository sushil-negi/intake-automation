import { z } from 'zod';

/** yyyy-MM-dd format — required for HTML date inputs and Supabase storage */
const dateString = z.string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a complete date (yyyy-MM-dd)');

// Step 0: Client Help List — require client name and DOB
export const clientHelpListSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(500, 'Name is too long'),
  dateOfBirth: dateString,
}).passthrough();

// Step 1: Client History — require assessment reason
export const clientHistorySchema = z.object({
  assessmentReason: z.string().min(1, 'Assessment reason is required').max(500),
}).passthrough();

// Step 2: Client Assessment — at least 1 item selected across all categories
export const clientAssessmentSchema = z.object({
  bathing: z.array(z.string().max(200)),
  dressing: z.array(z.string().max(200)),
  hairCare: z.array(z.string().max(200)),
  teethAndGums: z.array(z.string().max(200)),
  shaving: z.array(z.string().max(200)),
  mobility: z.array(z.string().max(200)),
  falls: z.array(z.string().max(200)),
  mobilityAids: z.array(z.string().max(200)),
  nutritionHydration: z.array(z.string().max(200)),
  bedRails: z.array(z.string().max(200)),
  hearingAids: z.array(z.string().max(200)),
  toileting: z.array(z.string().max(200)),
  medicationReminder: z.array(z.string().max(200)),
  exerciseReminders: z.array(z.string().max(200)),
  housekeeping: z.array(z.string().max(200)),
  transportation: z.array(z.string().max(200)),
}).passthrough().refine(
  (data) => {
    const total = [
      ...data.bathing, ...data.dressing, ...data.hairCare,
      ...data.teethAndGums, ...data.shaving, ...data.mobility,
      ...data.falls, ...data.mobilityAids, ...data.nutritionHydration,
      ...data.bedRails, ...data.hearingAids, ...data.toileting,
      ...data.medicationReminder, ...data.exerciseReminders,
      ...data.housekeeping, ...data.transportation,
    ];
    return total.length > 0;
  },
  { message: 'At least one assessment item must be selected' }
);

// Step 3: Medication List — either noMedications checked OR at least one med with a name
export const medicationListSchema = z.object({
  noMedications: z.boolean(),
  medications: z.array(z.object({
    name: z.string().max(500),
    dosage: z.string().max(200),
    frequency: z.string().max(200),
    route: z.string().max(200),
    updates: z.string().max(2000),
  })),
}).passthrough().refine(
  (data) => data.noMedications || data.medications.some(m => m.name.trim() !== ''),
  { message: 'Add at least one medication or check "No medications"' }
);

// Concern-answer lookup: maps item ID to which answer triggers a concern flag.
// Mirrors the SAFETY_SECTIONS definitions in HomeSafetyChecklist.tsx.
const CONCERN_ANSWERS: Record<string, 'yes' | 'no'> = {
  // Entrance
  outsideLights: 'no', stepsCondition: 'no', railingsSecure: 'no', peephole: 'no', deadbolt: 'no',
  // General
  evacuationPlan: 'no', smokeDetectors: 'no', fireExtinguisher: 'no', hallsFreeClutter: 'no',
  throwRugs: 'yes', handrails: 'no', electricalCords: 'no', coverPlates: 'no', areaRugsSecured: 'no',
  hazardousProducts: 'no', stoolNeeded: 'yes', smokeInHome: 'yes', oxygenUse: 'yes', petsInHome: 'yes',
  pestFree: 'no', materialsProperHeight: 'no', emergencyResponse: 'no',
  // Medications
  medsMarkedClearly: 'no', pillBox: 'no', expiredMeds: 'yes', skippingMeds: 'yes', medsEasyReach: 'no', moreThan5Meds: 'yes',
  // Medical Equipment
  sharpsContainer: 'no', oxygenTubing: 'no', equipmentStored: 'no',
  // Living Areas
  doorwaysWide: 'no', lightSwitches: 'no', sofasChairsHeight: 'no', telephone: 'no', emergencyNumbers: 'no',
  cordsAcrossWalking: 'yes', castorsWheels: 'yes', armrests: 'no',
  // Bathroom
  glassDoors: 'yes', nonSkidSurface: 'no', grabBars: 'no', raisedToilet: 'no', waterHeater: 'no',
  showerBench: 'no', bathroomNightLight: 'no',
  // Bedroom
  scatterRugs: 'yes', bedHeight: 'yes', chairArmrests: 'no', furnitureCastors: 'no', bedroomPhone: 'no',
  bedroomEmergencyNumbers: 'no', flashlightBed: 'no', bedroomNightLight: 'no',
  // Kitchen
  floorSlippery: 'yes', flammableItems: 'yes', applianceButtons: 'no', itemsStoredProperly: 'no', unclutteredWorkspace: 'no',
  // Lighting
  nightLightsStairs: 'no', lightSwitchStairs: 'no', lightSwitchDoorway: 'no',
  // Security
  securityCompany: 'no', doorWindowAlarms: 'no',
  // Ancillary
  lifeAid: 'no', medicationStation: 'no',
};

const SAFETY_SECTION_KEYS = [
  'entrance', 'general', 'medications', 'medicalEquipment', 'livingAreas',
  'bathroom', 'bedroom', 'kitchen', 'lighting', 'security', 'ancillaryServices',
] as const;

// Step 4: Home Safety Checklist — require both signatures + notes on all flagged concerns
export const homeSafetyChecklistSchema = z.object({
  clientSignature: z.string().min(1, 'Client signature is required').max(200000),
  representativeSignature: z.string().min(1, 'EHC representative signature is required').max(200000),
}).passthrough().refine(
  (data) => {
    // Check all safety sections for flagged concerns missing notes
    for (const sectionKey of SAFETY_SECTION_KEYS) {
      const sectionData = (data as Record<string, unknown>)[sectionKey] as Record<string, { answer?: string; note?: string }> | undefined;
      if (!sectionData) continue;
      for (const [itemId, item] of Object.entries(sectionData)) {
        if (!item || typeof item !== 'object' || !item.answer) continue;
        const concernAnswer = CONCERN_ANSWERS[itemId];
        if (concernAnswer && item.answer === concernAnswer && (!item.note || item.note.trim() === '')) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'All flagged safety concerns require a note explaining the issue' }
).refine(
  (data) => {
    // If there are any flagged concerns, itemsNeedingAttention must be filled in
    const rec = data as Record<string, unknown>;
    let hasConcern = false;
    for (const sectionKey of SAFETY_SECTION_KEYS) {
      const sectionData = rec[sectionKey] as Record<string, { answer?: string; note?: string }> | undefined;
      if (!sectionData) continue;
      for (const [itemId, item] of Object.entries(sectionData)) {
        if (!item || typeof item !== 'object' || !item.answer) continue;
        const concernAnswer = CONCERN_ANSWERS[itemId];
        if (concernAnswer && item.answer === concernAnswer) {
          hasConcern = true;
          break;
        }
      }
      if (hasConcern) break;
    }
    if (!hasConcern) return true;
    const notes = (rec.itemsNeedingAttention as string) || '';
    return notes.trim().length > 0;
  },
  { message: 'Recommendations must be copied to Comments & Notes before continuing (use "Copy to Notes" button)' }
);

// Step 5: Consent — require all acknowledgments + HIPAA signature
const consentCheckboxSchema = z.object({
  checked: z.literal(true, { error: 'All acknowledgments must be checked before signing' }),
  timestamp: z.string().min(1),
});

export const consentSchema = z.object({
  consentTreatment: consentCheckboxSchema,
  consentInfoSharing: consentCheckboxSchema,
  consentElectronicRecords: consentCheckboxSchema,
  consentDataRetention: consentCheckboxSchema,
  hipaaSignature: z.string().min(1, 'HIPAA acknowledgment signature is required').max(200000),
}).passthrough();

// Indexed by wizard step number. Step 6 (Review) has no schema.
export const STEP_SCHEMAS: (z.ZodType | null)[] = [
  clientHelpListSchema,      // step 0
  clientHistorySchema,       // step 1
  clientAssessmentSchema,    // step 2
  medicationListSchema,      // step 3
  homeSafetyChecklistSchema, // step 4
  consentSchema,             // step 5
  null,                      // step 6 (Review)
];
