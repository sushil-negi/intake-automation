import { RadioGroup, SectionHeader } from '../ui/FormFields';
import { TextInput } from '../ui/FormFields';
import { ToggleCard } from '../ui/ToggleCard';
import { CategoryCard } from '../ui/CategoryCard';
import type { ClientAssessmentData } from '../../types/forms';

interface Props {
  data: ClientAssessmentData;
  onChange: (data: Partial<ClientAssessmentData>) => void;
}

const ASSESSMENT_CATEGORIES: {
  key: keyof ClientAssessmentData;
  title: string;
  options: string[];
}[] = [
  {
    key: 'bathing',
    title: 'Bathing / Shower',
    options: [
      'Bathes self',
      'Wants help with bathing',
      'Assistance with shower/tub combo',
      'Assistance with tub bath',
      'Sponge/Chair bath',
    ],
  },
  {
    key: 'dressing',
    title: 'Dressing / Undressing',
    options: ['Wants help with dressing/undressing'],
  },
  {
    key: 'hairCare',
    title: 'Hair Care',
    options: [
      'Brushes & styles own hair',
      'Wants help brushing & combing hair',
      'Shampoos own hair & styles',
      'Wants help shampooing & styling',
    ],
  },
  {
    key: 'teethAndGums',
    title: 'Teeth and Gums',
    options: [
      'Brushes own teeth',
      'Wants help with oral hygiene',
      'Wears dentures - uppers',
      'Wears dentures - lowers',
      'Prosthetic Oral Appliance (crown, bridge)',
    ],
  },
  {
    key: 'shaving',
    title: 'Shaving',
    options: [
      'Wants help shaving, safety razor',
      'Wants help shaving, electric razor',
      'Female - underarm',
      'Female - legs',
    ],
  },
  {
    key: 'mobility',
    title: 'Mobility',
    options: [
      'Walks by self with no problems',
      'Uses a mobility aid',
      'Needs stand-by-assist with mobility',
      'Needs stand-by-assist bed/chair/ambulation',
      'Needs help positioning for comfort',
      'Can pivot - Both legs',
      'Can pivot - R only',
      'Can pivot - L only',
      'Immobile/bedbound',
    ],
  },
  {
    key: 'falls',
    title: 'Falls',
    options: [
      'Has fallen recently',
      'Has been to ER for falls',
      'Has had fall near misses',
    ],
  },
  {
    key: 'mobilityAids',
    title: 'Mobility Aids',
    options: [
      'Cane',
      'Walker',
      'Wheel Chair',
      'Scooter',
      'Ramp',
      'Motorized Lift (e.g., Hoyer)',
    ],
  },
  {
    key: 'nutritionHydration',
    title: 'Nutrition / Hydration',
    options: [
      'Can cook meals/cleans up without help',
      'Needs help with cooking/clean-up',
      'Grocery shops by self',
      'Needs help grocery shopping',
      'Can get fluids by self',
      'Needs help getting enough fluids',
      'Feeds self',
      'Needs help eating',
      'Has no trouble swallowing',
    ],
  },
  {
    key: 'bedRails',
    title: 'Bed Rails',
    options: ['Bed rails (risk-benefit analysis)'],
  },
  {
    key: 'hearingAids',
    title: 'Hearing Aids',
    options: ['Self-care', 'Needs help cleaning'],
  },
  {
    key: 'toileting',
    title: 'Toileting',
    options: [
      'Can toilet by self',
      'Needs stand-by assist to bathroom',
      'Uses bedside commode',
      'Uses bedpan',
      'Uses urinal',
      'Raised toilet seat',
      'Continent bladder',
      'Continent bowel',
      'Incontinent bladder',
      'Incontinent bowel',
      'Incontinent both',
      'Uses Depends/diapers',
      'Uses pads',
      'Colostomy pouch',
      'Ileostomy pouch',
      'Foley (emptying)',
      'Needs pericare assistance',
      'Self-catheterizes',
    ],
  },
  {
    key: 'medicationReminder',
    title: 'Medication Reminder',
    options: [
      'Able to take medicine with no help',
      'Family handles all medicines',
      'Uses pre-filled pill box',
      'Uses pharmacy blister packs',
      'Needs medicine container brought for self-medication',
    ],
  },
  {
    key: 'exerciseReminders',
    title: 'Exercise & Treatment Reminders',
    options: [
      'Oxygen - Visual reminder',
      'Oxygen - Verbal reminder',
      'Self-test: Glucose - Visual',
      'Self-test: Glucose - Verbal',
      'Self-test: B/P - Visual',
      'Self-test: B/P - Verbal',
      'Exercise Reminder - Visual',
      'Exercise Reminder - Verbal',
    ],
  },
  {
    key: 'housekeeping',
    title: 'Housekeeping',
    options: [
      'Does own housekeeping',
      'Needs help with vacuuming/sweeping/mopping',
      'Wants help with laundry',
      'Needs help dusting, organizing',
      'Needs help with changing bed linen',
      'Needs help shopping',
      'Needs help with laundry/folding/putting away',
      'Needs help feeding/watering pets',
      'Needs help watering plants',
    ],
  },
  {
    key: 'transportation',
    title: 'Transportation & Errands',
    options: [
      'Drives self or family transports to appointments',
      'Wants prescriptions picked up from pharmacy',
      'Wants help to get to doctor appointments',
      'Wants agency to use client car',
      'Wants caregiver to drive them in caregiver\'s vehicle',
      'Wants help to get to church services',
      'Has handicap parking permit',
      'Special event transportation',
      'Uses public transportation',
    ],
  },
];

export function ClientAssessment({ data, onChange }: Props) {
  const toggleOption = (category: keyof ClientAssessmentData, option: string) => {
    const current = data[category] as string[];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    onChange({ [category]: updated });
  };

  // Conditional logic: check if mobility is self-sufficient
  const walksAlone = (data.mobility as string[]).includes('Walks by self with no problems');

  return (
    <div className="space-y-4 pt-4">
      {/* Client banner — auto-populated from Step 1 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span><span className="text-gray-500">Client:</span> <span className="font-medium text-gray-900">{data.clientName || '—'}</span></span>
        <span><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-900">{data.date || '—'}</span></span>
      </div>

      <SectionHeader title="Assessment Type" />
      <div className="flex items-end gap-4">
        <RadioGroup
          label=""
          name="assessmentType"
          value={data.assessmentType}
          options={[
            { value: 'initial', label: 'Initial' },
            { value: 'revised', label: 'Revised' },
          ]}
          onChange={val => onChange({ assessmentType: val as 'initial' | 'revised' })}
          inline
        />
        {data.assessmentType === 'revised' && (
          <TextInput
            label="Replaces former assessment dated"
            type="date"
            value={data.revisedDate}
            onChange={e => onChange({ revisedDate: e.target.value })}
          />
        )}
      </div>

      <SectionHeader title="Client Needs Assessment" subtitle="Select all that apply in each category. Categories with selections show a count badge." />

      <div className="space-y-3">
        {ASSESSMENT_CATEGORIES.map(category => {
          const values = (data[category.key] || []) as string[];
          // Conditional: dim mobility aids if walks alone
          const isDimmed = category.key === 'mobilityAids' && walksAlone;
          // Conditional: dim falls if walks alone
          const isFallsDimmed = category.key === 'falls' && walksAlone;

          return (
            <div key={category.key} className={isDimmed || isFallsDimmed ? 'opacity-50' : ''}>
              <CategoryCard
                title={category.title}
                selectedCount={values.length}
                totalCount={category.options.length}
                defaultOpen={values.length > 0}
              >
                {category.options.map(option => (
                  <ToggleCard
                    key={option}
                    label={option}
                    selected={values.includes(option)}
                    onChange={() => toggleOption(category.key, option)}
                  />
                ))}
              </CategoryCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
