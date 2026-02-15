import { TextInput, SectionHeader, SelectInput } from '../ui/FormFields';
import { DrugAutocomplete } from '../ui/DrugAutocomplete';
import type { MedicationListData } from '../../types/forms';

interface Props {
  data: MedicationListData;
  onChange: (data: Partial<MedicationListData>) => void;
  errors?: Record<string, string>;
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

export function MedicationList({ data, onChange, errors: _errors }: Props) {
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
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-sm">
        <span><span className="text-gray-500 dark:text-slate-400">Client:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.clientName || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Age:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.age || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Address:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.clientAddress || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Assessment Date:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.date || '—'}</span></span>
      </div>

      <SectionHeader title="Medication Allergies" />
      <TextInput
        label="Medication Allergies"
        value={data.medicationAllergies}
        onChange={e => onChange({ medicationAllergies: e.target.value })}
        placeholder="List any medication allergies..."
      />

      <SectionHeader title="Medications" subtitle="Add all current medications" />

      <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
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
            <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Medication {index + 1}</p>
                {data.medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMed(index)}
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium min-h-[44px] px-2 py-2"
                  >
                    Remove
                  </button>
                )}
              </div>
              <DrugAutocomplete
                label="Medication Name"
                value={med.name}
                onChange={val => updateMed(index, 'name', val)}
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
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-500 dark:text-slate-400 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium"
          >
            + Add Medication
          </button>
        </>
      )}

      <p className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
        Inform Executive Home Care if medications have been added, changed, or discontinued.
      </p>
    </div>
  );
}
