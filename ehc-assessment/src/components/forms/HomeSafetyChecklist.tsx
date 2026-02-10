import { TextArea, SectionHeader, ThreeWayToggle } from '../ui/FormFields';
import type { HomeSafetyChecklistData, SafetyAnswer } from '../../types/forms';

interface Props {
  data: HomeSafetyChecklistData;
  onChange: (data: Partial<HomeSafetyChecklistData>) => void;
}

interface SafetySection {
  key: keyof HomeSafetyChecklistData;
  title: string;
  items: { id: string; label: string }[];
}

const SAFETY_SECTIONS: SafetySection[] = [
  {
    key: 'entrance',
    title: 'Entrance to the Home',
    items: [
      { id: 'outsideLights', label: 'Are there outside lights covering the sidewalks and/or other entrance ways?' },
      { id: 'stepsCondition', label: 'Do steps & sidewalks seem to be in good condition & free from debris?' },
      { id: 'railingsSecure', label: 'Do the railings on the outside steps seem secure?' },
      { id: 'peephole', label: 'Is there a functional peephole in the front door?' },
      { id: 'deadbolt', label: 'Does the door have a deadbolt lock that does not require a key to open from inside?' },
    ],
  },
  {
    key: 'general',
    title: 'General',
    items: [
      { id: 'evacuationPlan', label: 'Is there an emergency evacuation plan in place?' },
      { id: 'smokeDetectors', label: 'Does the home have working smoke detectors?' },
      { id: 'fireExtinguisher', label: 'Is there a "ready-to-use" fire extinguisher on the premises?' },
      { id: 'hallsFreeClutter', label: 'Are inside halls and stairways free of clutter/debris?' },
      { id: 'throwRugs', label: 'Are there throw rugs in the home in client areas?' },
      { id: 'handrails', label: 'Are there handrails or banisters by all steps and stairs?' },
      { id: 'electricalCords', label: 'Are electrical cords un-frayed and placed to avoid tripping?' },
      { id: 'coverPlates', label: 'Are there cover plates on the electric outlets in client areas?' },
      { id: 'areaRugsSecured', label: 'Are area rugs secured around the edges?' },
      { id: 'hazardousProducts', label: 'Are hazardous products labeled and kept in a secure place?' },
      { id: 'stoolNeeded', label: 'Is there a need for a stool to reach high shelves/cupboards?' },
      { id: 'smokeInHome', label: 'Does anyone smoke in the home?' },
      { id: 'oxygenUse', label: 'Does the client or anyone in the home use oxygen?' },
      { id: 'petsInHome', label: 'Are there pets in the home?' },
      { id: 'pestFree', label: 'Does the home appear to be pest free?' },
      { id: 'materialsProperHeight', label: 'Do materials needed for care appear to be at a proper height?' },
      { id: 'emergencyResponse', label: 'Does the client wear an emergency response necklace/bracelet?' },
    ],
  },
  {
    key: 'medications',
    title: 'Medications',
    items: [
      { id: 'medsMarkedClearly', label: 'Are all medications marked clearly, such as by the pharmacy?' },
      { id: 'pillBox', label: 'Does the client use a pill box or pill minder?' },
      { id: 'expiredMeds', label: 'Does the client/family have concerns about expired medications?' },
      { id: 'skippingMeds', label: 'Is there a concern about client skipping or missing regular medications?' },
      { id: 'medsEasyReach', label: 'Are medications stored within easy reach?' },
      { id: 'moreThan5Meds', label: 'Does the client take more than 5 medicines every day?' },
    ],
  },
  {
    key: 'medicalEquipment',
    title: 'Medical Equipment / Supplies',
    items: [
      { id: 'sharpsContainer', label: 'Are used needles placed in a sharp container, such as insulin syringes?' },
      { id: 'oxygenTubing', label: 'Is oxygen tubing kept off the walking path?' },
      { id: 'equipmentStored', label: 'Is medical equipment properly stored and out of the walking paths?' },
    ],
  },
  {
    key: 'livingAreas',
    title: 'Living Areas',
    items: [
      { id: 'doorwaysWide', label: 'Are doorways wide enough for wheelchair/walker?' },
      { id: 'lightSwitches', label: 'Are light switches accessible without walking across a dark room?' },
      { id: 'sofasChairsHeight', label: 'Are sofas & chairs high and firm enough for easy sitting and rising?' },
      { id: 'telephone', label: 'Is there a telephone in the home?' },
      { id: 'emergencyNumbers', label: 'Is a list of emergency telephone numbers by the telephone?' },
      { id: 'cordsAcrossWalking', label: 'Do telephone cords/electronic wires run across walking areas?' },
      { id: 'castorsWheels', label: 'Are there castors or wheels on furniture?' },
      { id: 'armrests', label: 'Does sitting furniture have armrests to help client get in/out?' },
    ],
  },
  {
    key: 'bathroom',
    title: 'Bathroom',
    items: [
      { id: 'glassDoors', label: 'Are there glass doors on the bathtub/shower?' },
      { id: 'nonSkidSurface', label: 'Is there a non-skid surface/mat in the bathtub/shower?' },
      { id: 'grabBars', label: 'Are there grab-bars on the bathtub/shower and adjacent to the toilet?' },
      { id: 'raisedToilet', label: 'Is there a raised toilet seat (if client has trouble getting on/off)?' },
      { id: 'waterHeater', label: 'Has the water heater temperature been checked lately?' },
      { id: 'showerBench', label: 'Is there a shower bench/bath seat with a hand-held shower wand?' },
      { id: 'bathroomNightLight', label: 'Does the bathroom have a night light?' },
    ],
  },
  {
    key: 'bedroom',
    title: 'Bedroom',
    items: [
      { id: 'scatterRugs', label: 'Are there any scatter rugs?' },
      { id: 'bedHeight', label: 'Is the bed lower than "back-of-the-knee" height?' },
      { id: 'chairArmrests', label: 'Is there a chair with armrests & firm seat?' },
      { id: 'furnitureCastors', label: 'Does furniture have castors or wheels that lock?' },
      { id: 'bedroomPhone', label: 'Is there a telephone accessible from the bed?' },
      { id: 'bedroomEmergencyNumbers', label: 'Is a list of emergency numbers by the telephone?' },
      { id: 'flashlightBed', label: 'Is there a flashlight, light switch or lamp beside the bed?' },
      { id: 'bedroomNightLight', label: 'Is there a night light?' },
    ],
  },
  {
    key: 'kitchen',
    title: 'Kitchen',
    items: [
      { id: 'floorSlippery', label: 'Is the floor waxed or otherwise slippery?' },
      { id: 'flammableItems', label: 'Are there any flammable items near the heat source?' },
      { id: 'applianceButtons', label: 'Do the "ON" buttons work on appliances commonly used?' },
      { id: 'itemsStoredProperly', label: 'Are items used the most stored between eye and knee level?' },
      { id: 'unclutteredWorkspace', label: 'Is there an uncluttered work space near the cooking area?' },
    ],
  },
  {
    key: 'lighting',
    title: 'Lighting',
    items: [
      { id: 'nightLightsStairs', label: 'Are there night lights in stairways and hallways?' },
      { id: 'lightSwitchStairs', label: 'Is there a light switch at both the top and bottom of stairs?' },
      { id: 'lightSwitchDoorway', label: 'Is there a light switch by the doorway of each room?' },
    ],
  },
  {
    key: 'security',
    title: 'Security',
    items: [
      { id: 'securityCompany', label: 'Is there a security company providing services to the home?' },
      { id: 'doorWindowAlarms', label: 'Are there door and window alarms?' },
    ],
  },
  {
    key: 'ancillaryServices',
    title: 'Ancillary Services',
    items: [
      { id: 'lifeAid', label: 'LifeAid' },
      { id: 'medicationStation', label: 'Medication Station' },
    ],
  },
];

export function HomeSafetyChecklist({ data, onChange }: Props) {
  const updateItem = (section: keyof HomeSafetyChecklistData, itemId: string, value: SafetyAnswer) => {
    const current = (data[section] as Record<string, SafetyAnswer>) || {};
    onChange({ [section]: { ...current, [itemId]: value } });
  };

  return (
    <div className="space-y-6 pt-4">
      <p className="text-sm text-gray-500 italic bg-yellow-50 rounded-lg p-3 border border-yellow-200">
        This is not meant to be a substitute for a professional safety inspection, it's a guide.
      </p>

      {SAFETY_SECTIONS.map(section => {
        const sectionData = (data[section.key] as Record<string, SafetyAnswer>) || {};
        const answeredCount = Object.values(sectionData).filter(v => v !== '').length;

        return (
          <div key={section.key}>
            <SectionHeader
              title={section.title}
              subtitle={`${answeredCount} of ${section.items.length} answered`}
            />
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {section.items.map(item => (
                <ThreeWayToggle
                  key={item.id}
                  label={item.label}
                  value={sectionData[item.id] || ''}
                  onChange={val => updateItem(section.key, item.id, val)}
                />
              ))}
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
