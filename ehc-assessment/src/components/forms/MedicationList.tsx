import { TextInput, SectionHeader, SelectInput } from '../ui/FormFields';
import type { MedicationListData } from '../../types/forms';

interface Props {
  data: MedicationListData;
  onChange: (data: Partial<MedicationListData>) => void;
}

const ROUTE_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'injection', label: 'Injection' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'ophthalmic', label: 'Ophthalmic (eye)' },
  { value: 'otic', label: 'Otic (ear)' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'transdermal', label: 'Transdermal (patch)' },
  { value: 'other', label: 'Other' },
];

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_daily', label: 'Three times daily' },
  { value: 'four_daily', label: 'Four times daily' },
  { value: 'as_needed', label: 'As needed (PRN)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'other', label: 'Other' },
];

export function MedicationList({ data, onChange }: Props) {
  const updateMed = (index: number, field: string, value: string) => {
    const meds = [...data.medications];
    meds[index] = { ...meds[index], [field]: value };
    onChange({ medications: meds });
  };

  const addMed = () => {
    onChange({
      medications: [
        ...data.medications,
        { name: '', dosage: '', frequency: '', route: '', updates: '' },
      ],
    });
  };

  const removeMed = (index: number) => {
    onChange({ medications: data.medications.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Client banner — auto-populated from Step 1 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span><span className="text-gray-500">Client:</span> <span className="font-medium text-gray-900">{data.clientName || '—'}</span></span>
      </div>

      <SectionHeader title="Medication Allergies" />
      <TextInput
        label="Medication Allergies"
        value={data.medicationAllergies}
        onChange={e => onChange({ medicationAllergies: e.target.value })}
        placeholder="List any medication allergies..."
      />

      <SectionHeader title="Medications" subtitle="Add all current medications" />

      <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-sm">
        <input
          type="checkbox"
          checked={data.noMedications}
          onChange={e => onChange({ noMedications: e.target.checked })}
          className="accent-amber-600 w-4 h-4"
        />
        Client is not currently taking any medications
      </label>

      {!data.noMedications && (
        <>
          {data.medications.map((med, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700">Medication {index + 1}</p>
                {data.medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMed(index)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              <TextInput
                label="Medication Name"
                value={med.name}
                onChange={e => updateMed(index, 'name', e.target.value)}
                placeholder="e.g., Lisinopril"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput
                  label="Dosage"
                  value={med.dosage}
                  onChange={e => updateMed(index, 'dosage', e.target.value)}
                  placeholder="e.g., 10mg"
                />
                <SelectInput
                  label="Frequency"
                  value={med.frequency}
                  options={FREQUENCY_OPTIONS}
                  onChange={e => updateMed(index, 'frequency', e.target.value)}
                />
                <SelectInput
                  label="Route"
                  value={med.route}
                  options={ROUTE_OPTIONS}
                  onChange={e => updateMed(index, 'route', e.target.value)}
                />
              </div>
              <TextInput
                label="Updates / Changes"
                value={med.updates}
                onChange={e => updateMed(index, 'updates', e.target.value)}
                placeholder="Any recent changes..."
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addMed}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors font-medium"
          >
            + Add Medication
          </button>
        </>
      )}

      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        Inform Executive Home Care if medications have been added, changed, or discontinued.
      </p>
    </div>
  );
}
