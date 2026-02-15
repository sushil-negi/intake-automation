import { TextInput, TextArea, RadioGroup, YesNoToggle, SectionHeader, SelectInput } from '../ui/FormFields';
import { ToggleCard } from '../ui/ToggleCard';
import { ToggleCardGroup } from '../ui/ToggleCardGroup';
import { CategoryCard } from '../ui/CategoryCard';
import { SignaturePad } from '../ui/SignaturePad';
import { PhoneInput } from '../ui/PhoneInput';
import type { ClientHistoryData } from '../../types/forms';

interface Props {
  data: ClientHistoryData;
  onChange: (data: Partial<ClientHistoryData>) => void;
  errors?: Record<string, string>;
}

const HEALTH_CONDITIONS = [
  'Short term memory loss', "Alzheimer's", 'Dementia', 'Epilepsy/Seizure',
  'High Blood Pressure', 'Stroke', 'Cataract', 'Heart Problems', 'Diabetes',
  'Osteoporosis', 'Fractures', 'Blood clots', 'Cancer', 'Arthritis',
  'Emphysema', 'COPD', "Parkinson's Disease", 'Multiple Sclerosis', 'MRSA',
  'C-Diff', 'Infectious Disease', 'History of tuberculosis (TB)',
];

const RE_ASSESSMENT_REASONS = [
  { value: 'changeInCondition', label: 'Change in condition/status' },
  { value: 'postFall', label: 'Post-fall' },
  { value: 'postHospitalization', label: 'Post-hospitalization' },
  { value: 'postERVisit', label: 'Post ER Visit' },
  { value: 'incident', label: 'Incident' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'other', label: 'Other' },
];

const DIET_OPTIONS = ['Reg', 'Diabetic', 'Low sodium', 'Kosher'];

export function ClientHistory({ data, onChange, errors }: Props) {
  const toggleHealthCondition = (condition: string) => {
    const current = data.healthHistory;
    const updated = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    onChange({ healthHistory: updated });
  };

  const toggleReAssessmentReason = (reason: string) => {
    const current = data.reAssessmentReasons;
    const updated = current.includes(reason)
      ? current.filter(r => r !== reason)
      : [...current, reason];
    onChange({ reAssessmentReasons: updated });
  };

  const toggleDiet = (item: string) => {
    const current = data.diet;
    const updated = current.includes(item)
      ? current.filter(d => d !== item)
      : [...current, item];
    onChange({ diet: updated });
  };

  const updateProvider = (index: number, field: string, value: string) => {
    const providers = [...data.otherProviders];
    providers[index] = { ...providers[index], [field]: value };
    onChange({ otherProviders: providers });
  };

  const addProvider = () => {
    onChange({
      otherProviders: [
        ...data.otherProviders,
        { agencyName: '', typeOfAgency: '', phone: '', address: '', email: '' },
      ],
    });
  };

  const removeProvider = (index: number) => {
    onChange({ otherProviders: data.otherProviders.filter((_, i) => i !== index) });
  };

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

  const toggleServiceDay = (day: string) => {
    const current = data.serviceDays;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    // Clean up daySchedules for removed days
    const schedules = { ...data.daySchedules };
    if (current.includes(day)) {
      delete schedules[day];
    } else if (!schedules[day]) {
      schedules[day] = { from: '', to: '' };
    }
    onChange({ serviceDays: updated, daySchedules: schedules });
  };

  const updateDaySchedule = (day: string, field: 'from' | 'to', value: string) => {
    const schedules = { ...data.daySchedules };
    schedules[day] = { ...schedules[day], [field]: value };
    onChange({ daySchedules: schedules });
  };

  const isFullTime = data.is24x7 || data.liveIn;

  return (
    <div className="space-y-6 pt-4">
      {/* Client banner — auto-populated from Step 1 */}
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-sm">
        <span><span className="text-gray-500 dark:text-slate-400">Client:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.clientName || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Age:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.age || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Address:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.clientAddress || '—'}</span></span>
        <span><span className="text-gray-500 dark:text-slate-400">Assessment Date:</span> <span className="font-medium text-gray-900 dark:text-slate-100">{data.date || '—'}</span></span>
      </div>

      <SectionHeader title="Assessment Information" />

      <RadioGroup
        label="Reason for Assessment"
        name="assessmentReason"
        value={data.assessmentReason}
        options={[
          { value: 'initial', label: 'Initial' },
          { value: '90day', label: '90 Day Supervisory' },
        ]}
        onChange={val => onChange({ assessmentReason: val as 'initial' | '90day' })}
        inline
        error={errors?.assessmentReason}
      />

      {/* Conditional: Re-assessment reasons */}
      {data.assessmentReason === '90day' && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Re-assessment visit due to:</p>
          <ToggleCardGroup label="Re-assessment reasons" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RE_ASSESSMENT_REASONS.map(reason => (
              <ToggleCard
                key={reason.value}
                label={reason.label}
                selected={data.reAssessmentReasons.includes(reason.value)}
                onChange={() => toggleReAssessmentReason(reason.value)}
              />
            ))}
          </ToggleCardGroup>
          {data.reAssessmentReasons.includes('other') && (
            <TextInput
              label="Other Reason"
              value={data.reAssessmentOtherReason}
              onChange={e => onChange({ reAssessmentOtherReason: e.target.value })}
            />
          )}
        </div>
      )}

      {/* Primary Diagnosis */}
      <TextInput label="Primary Diagnosis" value={data.primaryDiagnosis} onChange={e => onChange({ primaryDiagnosis: e.target.value })} />

      {/* Health History */}
      <SectionHeader title="Health History" subtitle="Select all that apply" />
      <CategoryCard title="Health Conditions" selectedCount={data.healthHistory.length} totalCount={HEALTH_CONDITIONS.length} defaultOpen>
        <ToggleCardGroup label="Health conditions" className="space-y-1">
          {HEALTH_CONDITIONS.map(condition => (
            <ToggleCard
              key={condition}
              label={condition}
              selected={data.healthHistory.includes(condition)}
              onChange={() => toggleHealthCondition(condition)}
            />
          ))}
        </ToggleCardGroup>
      </CategoryCard>

      {/* Conditional: fall/hospitalization fields show when Fractures, Osteoporosis, or fall-related conditions are selected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Last Fall Date" type="date" value={data.lastFallDate} onChange={e => onChange({ lastFallDate: e.target.value })} />
        <TextInput label="Hospitalizations" value={data.hospitalizations} onChange={e => onChange({ hospitalizations: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Recent Surgery" value={data.recentSurgery} onChange={e => onChange({ recentSurgery: e.target.value })} />
        <div>
          <RadioGroup
            label="Recent Hip Surgery?"
            name="recentHipSurgery"
            value={data.recentHipSurgery}
            options={[
              { value: 'na', label: 'N/A' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            onChange={val => onChange({ recentHipSurgery: val as 'na' | 'yes' | 'no' })}
            inline
          />
          {data.recentHipSurgery === 'yes' && (
            <TextInput label="Date" type="date" value={data.recentHipSurgeryDate} onChange={e => onChange({ recentHipSurgeryDate: e.target.value })} className="mt-2" />
          )}
        </div>
      </div>

      {/* Conditional: Surgery details shown when recent surgery is entered */}
      {data.recentSurgery && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
          <TextInput label="Surgery Details / Recovery Notes" value={data.hospitalizations} onChange={e => onChange({ hospitalizations: e.target.value })} placeholder="Details about surgery, recovery status, restrictions..." />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <YesNoToggle label="Smoker?" value={data.smoker} onChange={val => onChange({ smoker: val })} />
        <YesNoToggle label="Oxygen in use in the home?" value={data.oxygenInHome} onChange={val => onChange({ oxygenInHome: val })} />
        <TextInput label="Recent Infections?" value={data.recentInfections} onChange={e => onChange({ recentInfections: e.target.value })} />
      </div>

      {/* Conditional: Smoker notes when smoker is Yes */}
      {data.smoker === 'yes' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
          <TextInput label="Smoking Notes" value={data.smokerNotes} onChange={e => onChange({ smokerNotes: e.target.value })} placeholder="Pack frequency, cessation efforts, restrictions near oxygen..." />
        </div>
      )}

      {/* Other Providers */}
      <SectionHeader title="Other Providers in the Home" />
      {data.otherProviders.map((provider, index) => (
        <div key={index} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Provider {index + 1}</p>
            {data.otherProviders.length > 1 && (
              <button type="button" onClick={() => removeProvider(index)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 min-h-[44px] px-2 py-2">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput label="Agency Name" value={provider.agencyName} onChange={e => updateProvider(index, 'agencyName', e.target.value)} />
            <TextInput label="Type of Agency" value={provider.typeOfAgency} onChange={e => updateProvider(index, 'typeOfAgency', e.target.value)} />
            <PhoneInput label="Phone" value={provider.phone} onChange={val => updateProvider(index, 'phone', val)} />
            <TextInput label="Email" type="email" value={provider.email} onChange={e => updateProvider(index, 'email', e.target.value)} />
          </div>
          <TextInput label="Address" value={provider.address} onChange={e => updateProvider(index, 'address', e.target.value)} />
        </div>
      ))}
      <button type="button" onClick={addProvider} className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium min-h-[44px] px-2 py-2">
        + Add another provider
      </button>

      {/* Advance Directive */}
      <SectionHeader title="Advance Directive" />
      <RadioGroup
        label="Advance Directive Status"
        name="advanceDirective"
        value={data.advanceDirective}
        options={[
          { value: 'has', label: 'Has Advance Directive' },
          { value: 'doesNotHave', label: 'Does not have Advance Directive' },
          { value: 'wants', label: 'Wants Advance Directive information' },
          { value: 'doesNotComprehend', label: 'Does not comprehend Adv. Directive question' },
        ]}
        onChange={val => onChange({ advanceDirective: val as ClientHistoryData['advanceDirective'] })}
      />

      {/* Vision */}
      <SectionHeader title="Vision" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { key: 'visionImpaired' as const, label: 'Impaired Vision' },
          { key: 'visionBothEyes' as const, label: 'Both eyes' },
          { key: 'visionRightOnly' as const, label: 'Right eye only' },
          { key: 'visionLeftOnly' as const, label: 'Left eye only' },
          { key: 'visionGlasses' as const, label: 'Glasses' },
          { key: 'visionContacts' as const, label: 'Contacts' },
        ].map(item => (
          <ToggleCard
            key={item.key}
            label={item.label}
            selected={data[item.key]}
            onChange={val => onChange({ [item.key]: val })}
          />
        ))}
      </div>

      {/* Hearing */}
      <SectionHeader title="Hearing" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { key: 'hearingAids' as const, label: 'Wears hearing aids' },
          { key: 'hearingBothEars' as const, label: 'Both ears' },
          { key: 'hearingRightEar' as const, label: 'Right ear' },
          { key: 'hearingLeftEar' as const, label: 'Left ear' },
          { key: 'hearingSignLanguage' as const, label: 'Uses sign language' },
          { key: 'hearingTablet' as const, label: 'Uses tablet' },
        ].map(item => (
          <ToggleCard
            key={item.key}
            label={item.label}
            selected={data[item.key]}
            onChange={val => onChange({ [item.key]: val })}
          />
        ))}
      </div>

      <TextArea label="Speech Impaired" value={data.speechImpaired} onChange={e => onChange({ speechImpaired: e.target.value })} rows={2} />

      {/* Language */}
      <SectionHeader title="Language" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RadioGroup
          label="Primary Language"
          name="primaryLanguage"
          value={data.primaryLanguage}
          options={[
            { value: 'english', label: 'English' },
            { value: 'spanish', label: 'Spanish' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={val => onChange({ primaryLanguage: val as ClientHistoryData['primaryLanguage'] })}
          inline
        />
        {data.primaryLanguage === 'other' && (
          <TextInput label="Other Language" value={data.primaryLanguageOther} onChange={e => onChange({ primaryLanguageOther: e.target.value })} />
        )}
      </div>
      <SelectInput
        label="Understands English?"
        value={data.understandsEnglish}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'limited', label: 'Limited' },
        ]}
        onChange={e => onChange({ understandsEnglish: e.target.value as ClientHistoryData['understandsEnglish'] })}
      />

      {/* Diet */}
      <SectionHeader title="Diet" />
      <ToggleCardGroup label="Diet options" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DIET_OPTIONS.map(item => (
          <ToggleCard key={item} label={item} selected={data.diet.includes(item)} onChange={() => toggleDiet(item)} />
        ))}
      </ToggleCardGroup>
      <TextInput label="Other Diet" value={data.dietOther} onChange={e => onChange({ dietOther: e.target.value })} />

      {/* Allergies */}
      <SectionHeader title="Allergies" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Drug Allergies" value={data.drugAllergies} onChange={e => onChange({ drugAllergies: e.target.value })} />
        <TextInput label="Food Allergies" value={data.foodAllergies} onChange={e => onChange({ foodAllergies: e.target.value })} />
      </div>

      {/* Living Situation */}
      <SectionHeader title="Living Situation" />
      <YesNoToggle label="Does client live alone?" value={data.livesAlone} onChange={val => onChange({ livesAlone: val })} />

      {/* Conditional: Show only if not living alone */}
      {data.livesAlone === 'no' && (
        <div className="space-y-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
          <TextInput label="How many people live in the home?" type="number" value={data.peopleInHome} onChange={e => onChange({ peopleInHome: e.target.value })} />
          <TextInput label="Who are they?" value={data.whoAreThey} onChange={e => onChange({ whoAreThey: e.target.value })} />
          <TextInput label="When are other people in the home?" value={data.whenOthersHome} onChange={e => onChange({ whenOthersHome: e.target.value })} />
        </div>
      )}

      {/* Pets */}
      <YesNoToggle label="Pets in the home?" value={data.pets} onChange={val => onChange({ pets: val })} />
      {data.pets === 'yes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
          <TextInput label="What kind?" value={data.petKind} onChange={e => onChange({ petKind: e.target.value })} />
          <TextInput label="How many?" type="number" value={data.petCount} onChange={e => onChange({ petCount: e.target.value })} />
        </div>
      )}

      {/* Service Preferences */}
      <SectionHeader title="Service Preferences" />
      <TextInput
        label="When does the client want services to begin?"
        type="date"
        value={data.serviceStartDate}
        onChange={e => onChange({ serviceStartDate: e.target.value })}
      />

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
          border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
          <input type="checkbox" checked={data.overnight} onChange={e => onChange({ overnight: e.target.checked })} className="accent-amber-600 w-4 h-4" />
          Overnight
        </label>
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
          border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
          <input type="checkbox" checked={data.liveIn} onChange={e => onChange({ liveIn: e.target.checked, ...((!data.liveIn) ? { serviceDays: [], daySchedules: {} } : {}) })} className="accent-amber-600 w-4 h-4" />
          Live-in
        </label>
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
          border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
          <input type="checkbox" checked={data.is24x7} onChange={e => onChange({ is24x7: e.target.checked, ...((!data.is24x7) ? { serviceDays: [], daySchedules: {} } : {}) })} className="accent-amber-600 w-4 h-4" />
          24×7
        </label>
      </div>

      {isFullTime && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
          {data.is24x7 ? '24×7 service selected — covers all days and hours.' : 'Live-in service selected — covers all days and hours.'}
        </div>
      )}

      {!isFullTime && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Select service days</p>
          <ToggleCardGroup label="Service days" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WEEKDAYS.map(day => (
              <ToggleCard
                key={day}
                label={day}
                selected={data.serviceDays.includes(day)}
                onChange={() => toggleServiceDay(day)}
              />
            ))}
          </ToggleCardGroup>

          {data.serviceDays.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Set hours for each day</p>
              {/* Apply same time to all selected days */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300 w-24 shrink-0">All days</span>
                <TextInput label="" type="time" value={data.daySchedules._all?.from || ''} onChange={e => {
                  const schedules = { ...data.daySchedules };
                  schedules._all = { ...schedules._all, from: e.target.value, to: schedules._all?.to || '' };
                  onChange({ daySchedules: schedules });
                }} className="flex-1" />
                <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
                <TextInput label="" type="time" value={data.daySchedules._all?.to || ''} onChange={e => {
                  const schedules = { ...data.daySchedules };
                  schedules._all = { ...schedules._all, from: schedules._all?.from || '', to: e.target.value };
                  onChange({ daySchedules: schedules });
                }} className="flex-1" />
                <button
                  type="button"
                  onClick={() => {
                    const allFrom = data.daySchedules._all?.from || '';
                    const allTo = data.daySchedules._all?.to || '';
                    if (!allFrom && !allTo) return;
                    const schedules = { ...data.daySchedules };
                    for (const day of data.serviceDays) {
                      schedules[day] = { from: allFrom, to: allTo };
                    }
                    onChange({ daySchedules: schedules });
                  }}
                  className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
              {WEEKDAYS.filter(day => data.serviceDays.includes(day)).map(day => (
                <div key={day} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 w-24 shrink-0">{day}</span>
                  <TextInput label="" type="time" value={data.daySchedules[day]?.from || ''} onChange={e => updateDaySchedule(day, 'from', e.target.value)} className="flex-1" />
                  <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
                  <TextInput label="" type="time" value={data.daySchedules[day]?.to || ''} onChange={e => updateDaySchedule(day, 'to', e.target.value)} className="flex-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TextInput
        label="Additional service notes"
        value={data.servicesPerWeek}
        onChange={e => onChange({ servicesPerWeek: e.target.value })}
        placeholder="e.g., preferred caregiver, special requirements..."
      />

      {/* EHC Representative Signature */}
      <SectionHeader title="EHC Representative Signature" />
      <div className="space-y-4">
        <TextInput
          label="EHC Staff Name"
          value={data.ehcStaffName}
          onChange={e => onChange({ ehcStaffName: e.target.value })}
          placeholder="Full name of EHC staff member"
        />
        <SignaturePad
          label="EHC Representative Signature"
          value={data.ehcRepSignature}
          onChange={val => onChange({ ehcRepSignature: val })}
          signerRole="EHC Representative"
          metadata={data.ehcRepSignatureMeta}
          onMetadataChange={meta => onChange({ ehcRepSignatureMeta: meta })}
        />
      </div>
    </div>
  );
}
