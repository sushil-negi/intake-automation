import { TextArea, SectionHeader, ThreeWayToggle } from '../ui/FormFields';
import type { HomeSafetyChecklistData, SafetyAnswer, SafetyItem } from '../../types/forms';

interface Props {
  data: HomeSafetyChecklistData;
  onChange: (data: Partial<HomeSafetyChecklistData>) => void;
}

// concernAnswer: which answer triggers a flag + note prompt
// 'no'  = normal question (Yes is good, No is a concern)
// 'yes' = inverted question (Yes is a concern, No is good)
interface SafetyQuestionItem {
  id: string;
  label: string;
  concernAnswer: 'yes' | 'no';
}

interface SafetySection {
  key: keyof HomeSafetyChecklistData;
  title: string;
  items: SafetyQuestionItem[];
}

const SAFETY_SECTIONS: SafetySection[] = [
  {
    key: 'entrance',
    title: 'Entrance to the Home',
    items: [
      { id: 'outsideLights', label: 'Are there outside lights covering the sidewalks and/or other entrance ways?', concernAnswer: 'no' },
      { id: 'stepsCondition', label: 'Do steps & sidewalks seem to be in good condition & free from debris?', concernAnswer: 'no' },
      { id: 'railingsSecure', label: 'Do the railings on the outside steps seem secure?', concernAnswer: 'no' },
      { id: 'peephole', label: 'Is there a functional peephole in the front door?', concernAnswer: 'no' },
      { id: 'deadbolt', label: 'Does the door have a deadbolt lock that does not require a key to open from inside?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'general',
    title: 'General',
    items: [
      { id: 'evacuationPlan', label: 'Is there an emergency evacuation plan in place?', concernAnswer: 'no' },
      { id: 'smokeDetectors', label: 'Does the home have working smoke detectors?', concernAnswer: 'no' },
      { id: 'fireExtinguisher', label: 'Is there a "ready-to-use" fire extinguisher on the premises?', concernAnswer: 'no' },
      { id: 'hallsFreeClutter', label: 'Are inside halls and stairways free of clutter/debris?', concernAnswer: 'no' },
      { id: 'throwRugs', label: 'Are there throw rugs in the home in client areas?', concernAnswer: 'yes' },
      { id: 'handrails', label: 'Are there handrails or banisters by all steps and stairs?', concernAnswer: 'no' },
      { id: 'electricalCords', label: 'Are electrical cords un-frayed and placed to avoid tripping?', concernAnswer: 'no' },
      { id: 'coverPlates', label: 'Are there cover plates on the electric outlets in client areas?', concernAnswer: 'no' },
      { id: 'areaRugsSecured', label: 'Are area rugs secured around the edges?', concernAnswer: 'no' },
      { id: 'hazardousProducts', label: 'Are hazardous products labeled and kept in a secure place?', concernAnswer: 'no' },
      { id: 'stoolNeeded', label: 'Is there a need for a stool to reach high shelves/cupboards?', concernAnswer: 'yes' },
      { id: 'smokeInHome', label: 'Does anyone smoke in the home?', concernAnswer: 'yes' },
      { id: 'oxygenUse', label: 'Does the client or anyone in the home use oxygen?', concernAnswer: 'yes' },
      { id: 'petsInHome', label: 'Are there pets in the home?', concernAnswer: 'yes' },
      { id: 'pestFree', label: 'Does the home appear to be pest free?', concernAnswer: 'no' },
      { id: 'materialsProperHeight', label: 'Do materials needed for care appear to be at a proper height?', concernAnswer: 'no' },
      { id: 'emergencyResponse', label: 'Does the client wear an emergency response necklace/bracelet?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'medications',
    title: 'Medications',
    items: [
      { id: 'medsMarkedClearly', label: 'Are all medications marked clearly, such as by the pharmacy?', concernAnswer: 'no' },
      { id: 'pillBox', label: 'Does the client use a pill box or pill minder?', concernAnswer: 'no' },
      { id: 'expiredMeds', label: 'Does the client/family have concerns about expired medications?', concernAnswer: 'yes' },
      { id: 'skippingMeds', label: 'Is there a concern about client skipping or missing regular medications?', concernAnswer: 'yes' },
      { id: 'medsEasyReach', label: 'Are medications stored within easy reach?', concernAnswer: 'no' },
      { id: 'moreThan5Meds', label: 'Does the client take more than 5 medicines every day?', concernAnswer: 'yes' },
    ],
  },
  {
    key: 'medicalEquipment',
    title: 'Medical Equipment / Supplies',
    items: [
      { id: 'sharpsContainer', label: 'Are used needles placed in a sharp container, such as insulin syringes?', concernAnswer: 'no' },
      { id: 'oxygenTubing', label: 'Is oxygen tubing kept off the walking path?', concernAnswer: 'no' },
      { id: 'equipmentStored', label: 'Is medical equipment properly stored and out of the walking paths?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'livingAreas',
    title: 'Living Areas',
    items: [
      { id: 'doorwaysWide', label: 'Are doorways wide enough for wheelchair/walker?', concernAnswer: 'no' },
      { id: 'lightSwitches', label: 'Are light switches accessible without walking across a dark room?', concernAnswer: 'no' },
      { id: 'sofasChairsHeight', label: 'Are sofas & chairs high and firm enough for easy sitting and rising?', concernAnswer: 'no' },
      { id: 'telephone', label: 'Is there a telephone in the home?', concernAnswer: 'no' },
      { id: 'emergencyNumbers', label: 'Is a list of emergency telephone numbers by the telephone?', concernAnswer: 'no' },
      { id: 'cordsAcrossWalking', label: 'Do telephone cords/electronic wires run across walking areas?', concernAnswer: 'yes' },
      { id: 'castorsWheels', label: 'Are there castors or wheels on furniture?', concernAnswer: 'yes' },
      { id: 'armrests', label: 'Does sitting furniture have armrests to help client get in/out?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'bathroom',
    title: 'Bathroom',
    items: [
      { id: 'glassDoors', label: 'Are there glass doors on the bathtub/shower?', concernAnswer: 'yes' },
      { id: 'nonSkidSurface', label: 'Is there a non-skid surface/mat in the bathtub/shower?', concernAnswer: 'no' },
      { id: 'grabBars', label: 'Are there grab-bars on the bathtub/shower and adjacent to the toilet?', concernAnswer: 'no' },
      { id: 'raisedToilet', label: 'Is there a raised toilet seat (if client has trouble getting on/off)?', concernAnswer: 'no' },
      { id: 'waterHeater', label: 'Has the water heater temperature been checked lately?', concernAnswer: 'no' },
      { id: 'showerBench', label: 'Is there a shower bench/bath seat with a hand-held shower wand?', concernAnswer: 'no' },
      { id: 'bathroomNightLight', label: 'Does the bathroom have a night light?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'bedroom',
    title: 'Bedroom',
    items: [
      { id: 'scatterRugs', label: 'Are there any scatter rugs?', concernAnswer: 'yes' },
      { id: 'bedHeight', label: 'Is the bed lower than "back-of-the-knee" height?', concernAnswer: 'yes' },
      { id: 'chairArmrests', label: 'Is there a chair with armrests & firm seat?', concernAnswer: 'no' },
      { id: 'furnitureCastors', label: 'Does furniture have castors or wheels that lock?', concernAnswer: 'no' },
      { id: 'bedroomPhone', label: 'Is there a telephone accessible from the bed?', concernAnswer: 'no' },
      { id: 'bedroomEmergencyNumbers', label: 'Is a list of emergency numbers by the telephone?', concernAnswer: 'no' },
      { id: 'flashlightBed', label: 'Is there a flashlight, light switch or lamp beside the bed?', concernAnswer: 'no' },
      { id: 'bedroomNightLight', label: 'Is there a night light?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'kitchen',
    title: 'Kitchen',
    items: [
      { id: 'floorSlippery', label: 'Is the floor waxed or otherwise slippery?', concernAnswer: 'yes' },
      { id: 'flammableItems', label: 'Are there any flammable items near the heat source?', concernAnswer: 'yes' },
      { id: 'applianceButtons', label: 'Do the "ON" buttons work on appliances commonly used?', concernAnswer: 'no' },
      { id: 'itemsStoredProperly', label: 'Are items used the most stored between eye and knee level?', concernAnswer: 'no' },
      { id: 'unclutteredWorkspace', label: 'Is there an uncluttered work space near the cooking area?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'lighting',
    title: 'Lighting',
    items: [
      { id: 'nightLightsStairs', label: 'Are there night lights in stairways and hallways?', concernAnswer: 'no' },
      { id: 'lightSwitchStairs', label: 'Is there a light switch at both the top and bottom of stairs?', concernAnswer: 'no' },
      { id: 'lightSwitchDoorway', label: 'Is there a light switch by the doorway of each room?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'security',
    title: 'Security',
    items: [
      { id: 'securityCompany', label: 'Is there a security company providing services to the home?', concernAnswer: 'no' },
      { id: 'doorWindowAlarms', label: 'Are there door and window alarms?', concernAnswer: 'no' },
    ],
  },
  {
    key: 'ancillaryServices',
    title: 'Ancillary Services',
    items: [
      { id: 'lifeAid', label: 'LifeAid', concernAnswer: 'no' },
      { id: 'medicationStation', label: 'Medication Station', concernAnswer: 'no' },
    ],
  },
];

// Build a lookup: itemId -> concernAnswer for quick access
const CONCERN_LOOKUP: Record<string, 'yes' | 'no'> = {};
for (const section of SAFETY_SECTIONS) {
  for (const item of section.items) {
    CONCERN_LOOKUP[item.id] = item.concernAnswer;
  }
}

export function HomeSafetyChecklist({ data, onChange }: Props) {
  const getItemData = (sectionData: Record<string, SafetyItem>, itemId: string): SafetyItem => {
    const raw = sectionData[itemId];
    if (raw && typeof raw === 'object' && 'answer' in raw) return raw;
    return { answer: (typeof raw === 'string' ? raw : '') as SafetyAnswer, note: '' };
  };

  const isConcernAnswer = (itemId: string, answer: SafetyAnswer): boolean => {
    return answer !== '' && answer !== 'na' && answer === CONCERN_LOOKUP[itemId];
  };

  const updateAnswer = (section: keyof HomeSafetyChecklistData, itemId: string, value: SafetyAnswer) => {
    const current = (data[section] as Record<string, SafetyItem>) || {};
    const existing = current[itemId] || { answer: '', note: '' };
    // Keep note only when switching to the concern answer; clear otherwise
    const note = isConcernAnswer(itemId, value) ? existing.note : '';
    onChange({ [section]: { ...current, [itemId]: { answer: value, note } } });
  };

  const updateNote = (section: keyof HomeSafetyChecklistData, itemId: string, note: string) => {
    const current = (data[section] as Record<string, SafetyItem>) || {};
    const existing = current[itemId] || { answer: '', note: '' };
    onChange({ [section]: { ...current, [itemId]: { ...existing, note } } });
  };

  const bulkSetSection = (section: SafetySection, value: SafetyAnswer) => {
    const updated: Record<string, SafetyItem> = {};
    for (const item of section.items) {
      updated[item.id] = { answer: value, note: '' };
    }
    onChange({ [section.key]: updated });
  };

  const clearSection = (section: SafetySection) => {
    onChange({ [section.key]: {} });
  };

  return (
    <div className="space-y-6 pt-4">
      <p className="text-sm text-gray-500 italic bg-yellow-50 rounded-lg p-3 border border-yellow-200">
        This is not meant to be a substitute for a professional safety inspection, it's a guide.
        Use the section buttons to set all items at once, then adjust individual exceptions.
        Flagged items will prompt for a brief note.
      </p>

      {SAFETY_SECTIONS.map(section => {
        const sectionData = (data[section.key] as Record<string, SafetyItem>) || {};
        const answeredCount = section.items.filter(item => getItemData(sectionData, item.id).answer !== '').length;
        // Count items where the answer is the concern answer for that item
        const flaggedCount = section.items.filter(item => {
          const itemData = getItemData(sectionData, item.id);
          return isConcernAnswer(item.id, itemData.answer);
        }).length;

        // Determine if all items in section share the same answer
        const allAnswers = section.items.map(item => getItemData(sectionData, item.id).answer);
        const allSame = answeredCount === section.items.length && allAnswers.every(a => a === allAnswers[0]);
        const bulkValue = allSame && answeredCount > 0 ? allAnswers[0] : '';

        return (
          <div key={section.key}>
            <SectionHeader
              title={section.title}
              subtitle={`${answeredCount} of ${section.items.length} answered${flaggedCount > 0 ? ` \u00b7 ${flaggedCount} flagged` : ''}`}
            />
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Bulk action bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 gap-3">
                <span className="text-xs font-medium text-gray-500">Set all items:</span>
                <div className="flex gap-1.5">
                  {([
                    { val: 'yes' as const, label: 'All Yes', active: 'bg-green-100 text-green-700 border-green-400', idle: 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600' },
                    { val: 'no' as const, label: 'All No', active: 'bg-red-100 text-red-700 border-red-400', idle: 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600' },
                    { val: 'na' as const, label: 'All N/A', active: 'bg-gray-200 text-gray-600 border-gray-400', idle: 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-600' },
                  ]).map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => bulkSetSection(section, opt.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all cursor-pointer min-h-[36px]
                        ${bulkValue === opt.val ? opt.active : opt.idle}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {answeredCount > 0 && (
                    <button
                      type="button"
                      onClick={() => clearSection(section)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all cursor-pointer min-h-[36px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {/* Individual items */}
              <div className="p-4">
                {section.items.map(item => {
                  const itemData = getItemData(sectionData, item.id);
                  return (
                    <ThreeWayToggle
                      key={item.id}
                      label={item.label}
                      value={itemData.answer}
                      note={itemData.note}
                      concernAnswer={item.concernAnswer}
                      onChange={val => updateAnswer(section.key, item.id, val)}
                      onNoteChange={note => updateNote(section.key, item.id, note)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <SectionHeader title="Comments" />
      <TextArea
        label="Comments"
        value={data.comments}
        onChange={e => onChange({ comments: e.target.value })}
        rows={4}
      />

      <SectionHeader title="Office Use" />
      <TextArea
        label="Items that need attention"
        value={data.itemsNeedingAttention}
        onChange={e => onChange({ itemsNeedingAttention: e.target.value })}
        rows={4}
      />
    </div>
  );
}
