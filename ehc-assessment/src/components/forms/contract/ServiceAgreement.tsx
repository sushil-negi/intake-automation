import { TextInput, SectionHeader, YesNoToggle, SelectInput } from '../../ui/FormFields';
import { SignaturePad } from '../../ui/SignaturePad';
import { MaskedInput } from '../../ui/MaskedInput';
import { PhoneInput } from '../../ui/PhoneInput';
import type { ServiceAgreementData, HourlyRateOption } from '../../../types/serviceContract';

interface Props {
  data: ServiceAgreementData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

const WEEKDAYS = [
  { key: 'monday' as const, label: 'Mon' },
  { key: 'tuesday' as const, label: 'Tue' },
  { key: 'wednesday' as const, label: 'Wed' },
  { key: 'thursday' as const, label: 'Thu' },
  { key: 'friday' as const, label: 'Fri' },
  { key: 'saturday' as const, label: 'Sat' },
  { key: 'sunday' as const, label: 'Sun' },
];

const SERVICE_OPTIONS = [
  { key: 'selfAdminMeds' as const, label: 'Assistance with self-administered medications' },
  { key: 'personalCare' as const, label: 'Personal care' },
  { key: 'homemaking' as const, label: 'Homemaking' },
  { key: 'transportation' as const, label: 'Transportation' },
  { key: 'companionship' as const, label: 'Companionship' },
  { key: 'respiteCare' as const, label: 'Respite care' },
  { key: 'otherNonSkilled' as const, label: 'Other non-skilled services' },
];

export function ServiceAgreement({ data, onChange, errors }: Props) {
  /* ---- helpers for nested updates ---- */
  const updateCustomerInfo = (fields: Record<string, unknown>) => {
    onChange({ customerInfo: { ...data.customerInfo, ...fields } });
  };

  const updatePaymentTerms = (fields: Record<string, unknown>) => {
    onChange({ paymentTerms: { ...data.paymentTerms, ...fields } });
  };

  const updateLevelOfService = (fields: Record<string, unknown>) => {
    onChange({ levelOfService: { ...data.levelOfService, ...fields } });
  };

  const updateMethodOfPayment = (fields: Record<string, unknown>) => {
    onChange({ methodOfPayment: { ...data.methodOfPayment, ...fields } });
  };

  const updateContactPerson = (fields: Record<string, unknown>) => {
    onChange({ contactPerson: { ...data.contactPerson, ...fields } });
  };

  const updateBillingPerson = (fields: Record<string, unknown>) => {
    onChange({ billingPerson: { ...data.billingPerson, ...fields } });
  };

  const updateServices = (fields: Record<string, unknown>) => {
    onChange({ services: { ...data.services, ...fields } });
  };

  const updateFrequency = (fields: Record<string, unknown>) => {
    onChange({ frequency: { ...data.frequency, ...fields } });
  };

  /* ---- "Same as Contact" handler ---- */
  const handleSameAsContact = (checked: boolean) => {
    if (checked) {
      onChange({ billingPerson: { ...data.contactPerson } });
    }
  };

  const isBillingSameAsContact =
    data.billingPerson.name === data.contactPerson.name &&
    data.billingPerson.address === data.contactPerson.address &&
    data.billingPerson.phone === data.contactPerson.phone &&
    data.billingPerson.relationship === data.contactPerson.relationship &&
    data.contactPerson.name !== '';

  return (
    <div className="space-y-6 pt-4">
      {/* ========== 1. Customer Information ========== */}
      <SectionHeader title="Customer Information" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="First Name"
          value={data.customerInfo.firstName}
          onChange={e => updateCustomerInfo({ firstName: e.target.value })}
          error={errors?.['customerInfo.firstName']}
        />
        <TextInput
          label="Last Name"
          value={data.customerInfo.lastName}
          onChange={e => updateCustomerInfo({ lastName: e.target.value })}
          error={errors?.['customerInfo.lastName']}
        />
      </div>

      <TextInput
        label="Address"
        value={data.customerInfo.address}
        onChange={e => updateCustomerInfo({ address: e.target.value })}
        error={errors?.['customerInfo.address']}
      />

      <PhoneInput
        label="Phone"
        value={data.customerInfo.phone}
        onChange={val => updateCustomerInfo({ phone: val })}
        error={errors?.['customerInfo.phone']}
      />

      <MaskedInput
        label="SSN (Last 4 Digits)"
        value={data.customerInfo.ssnLast4}
        onChange={val => updateCustomerInfo({ ssnLast4: val })}
        error={errors?.['customerInfo.ssnLast4']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Date of Birth"
          type="date"
          value={data.customerInfo.dateOfBirth}
          onChange={e => updateCustomerInfo({ dateOfBirth: e.target.value })}
          error={errors?.['customerInfo.dateOfBirth']}
        />
        <TextInput
          label="Start of Care Date"
          type="date"
          value={data.customerInfo.startOfCareDate}
          onChange={e => updateCustomerInfo({ startOfCareDate: e.target.value })}
          error={errors?.['customerInfo.startOfCareDate']}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Days Per Week"
          type="number"
          value={data.customerInfo.daysPerWeek}
          onChange={e => updateCustomerInfo({ daysPerWeek: e.target.value })}
          error={errors?.['customerInfo.daysPerWeek']}
        />
        <TextInput
          label="Hours Per Day"
          type="number"
          value={data.customerInfo.hoursPerDay}
          onChange={e => updateCustomerInfo({ hoursPerDay: e.target.value })}
          error={errors?.['customerInfo.hoursPerDay']}
        />
      </div>

      <YesNoToggle
        label="Live-In"
        value={data.customerInfo.liveIn}
        onChange={val => updateCustomerInfo({ liveIn: val })}
      />

      {/* ========== 2. Payment Terms ========== */}
      <SectionHeader title="Payment Terms" />

      {data.paymentTerms.rateType === 'liveIn' ? (
        /* --- Live-In Rate (shown when assessment flagged liveIn) --- */
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
            Live-in service requested — enter the live-in daily rate.
          </div>
          <TextInput
            label="Live-In Daily Rate"
            value={data.paymentTerms.liveInRate}
            onChange={e => updatePaymentTerms({ liveInRate: e.target.value })}
            placeholder="e.g., $350/day"
            error={errors?.['paymentTerms.liveInRate']}
          />
        </div>
      ) : (
        /* --- Hourly Rate (default / hourly service) --- */
        <div className="space-y-4">
          <SelectInput
            label="Hourly Rate"
            value={data.paymentTerms.hourlyRateOption}
            onChange={e => updatePaymentTerms({ hourlyRateOption: e.target.value as HourlyRateOption | '' })}
            options={[
              { value: '35/38', label: '$35 weekday / $38 weekend' },
              { value: '38/40', label: '$38 weekday / $40 weekend' },
              { value: 'custom', label: 'Custom rate' },
            ]}
            error={errors?.['paymentTerms.hourlyRateOption']}
          />

          {data.paymentTerms.hourlyRateOption === 'custom' && (
            <TextInput
              label="Custom Hourly Rate"
              value={data.paymentTerms.customHourlyRate}
              onChange={e => updatePaymentTerms({ customHourlyRate: e.target.value })}
              placeholder="e.g., $42 weekday / $45 weekend"
              error={errors?.['paymentTerms.customHourlyRate']}
            />
          )}
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
        <input
          type="checkbox"
          checked={data.paymentTerms.holidayRatesApply}
          onChange={e => updatePaymentTerms({ holidayRatesApply: e.target.checked })}
          className="accent-amber-600 w-4 h-4"
        />
        Holiday and Special Rates may apply
      </label>

      {/* ========== 3. Level of Service ========== */}
      <SectionHeader title="Level of Service" />

      <div className="grid grid-cols-3 gap-2">
        {([
          { key: 'cna' as const, label: 'CNA' },
          { key: 'chha' as const, label: 'CHHA' },
          { key: 'other' as const, label: 'Other' },
        ]).map(item => (
          <label
            key={item.key}
            className={`flex items-center justify-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${data.levelOfService[item.key]
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            <input
              type="checkbox"
              checked={data.levelOfService[item.key]}
              onChange={e => updateLevelOfService({ [item.key]: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            {item.label}
          </label>
        ))}
      </div>

      {data.levelOfService.other && (
        <TextInput
          label="Other (specify)"
          value={data.levelOfService.otherText}
          onChange={e => updateLevelOfService({ otherText: e.target.value })}
          error={errors?.['levelOfService.otherText']}
        />
      )}

      {/* ========== 4. Method of Payment ========== */}
      <SectionHeader title="Method of Payment" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          { key: 'check' as const, label: 'Check' },
          { key: 'creditCard' as const, label: 'Credit Card' },
          { key: 'achEft' as const, label: 'ACH/EFT' },
          { key: 'longTermCareInsurance' as const, label: 'Long Term Care Insurance' },
        ]).map(item => (
          <label
            key={item.key}
            className={`flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${data.methodOfPayment[item.key]
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            <input
              type="checkbox"
              checked={data.methodOfPayment[item.key]}
              onChange={e => updateMethodOfPayment({ [item.key]: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            {item.label}
          </label>
        ))}
      </div>

      {data.methodOfPayment.longTermCareInsurance && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 space-y-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Insurance Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Insurance Policy Name"
              value={data.methodOfPayment.insurancePolicyName}
              onChange={e => updateMethodOfPayment({ insurancePolicyName: e.target.value })}
              error={errors?.['methodOfPayment.insurancePolicyName']}
            />
            <TextInput
              label="Insurance Policy Number"
              value={data.methodOfPayment.insurancePolicyNumber}
              onChange={e => updateMethodOfPayment({ insurancePolicyNumber: e.target.value })}
              error={errors?.['methodOfPayment.insurancePolicyNumber']}
            />
          </div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Insurance Contact</p>
          <TextInput
            label="Contact Name"
            value={data.methodOfPayment.insuranceContactName}
            onChange={e => updateMethodOfPayment({ insuranceContactName: e.target.value })}
          />
          <TextInput
            label="Address"
            value={data.methodOfPayment.insuranceContactAddress}
            onChange={e => updateMethodOfPayment({ insuranceContactAddress: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput
              label="Phone"
              value={data.methodOfPayment.insuranceContactPhone}
              onChange={val => updateMethodOfPayment({ insuranceContactPhone: val })}
            />
            <TextInput
              label="Relationship"
              value={data.methodOfPayment.insuranceContactRelationship}
              onChange={e => updateMethodOfPayment({ insuranceContactRelationship: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* ========== 5. Contact Information ========== */}
      <SectionHeader title="Contact Information" />

      <TextInput
        label="Name"
        value={data.contactPerson.name}
        onChange={e => updateContactPerson({ name: e.target.value })}
        error={errors?.['contactPerson.name']}
      />

      <TextInput
        label="Address"
        value={data.contactPerson.address}
        onChange={e => updateContactPerson({ address: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhoneInput
          label="Phone"
          value={data.contactPerson.phone}
          onChange={val => updateContactPerson({ phone: val })}
        />
        <TextInput
          label="Relationship"
          value={data.contactPerson.relationship}
          onChange={e => updateContactPerson({ relationship: e.target.value })}
        />
      </div>

      {/* ========== 6. Billing Information ========== */}
      <SectionHeader title="Billing Information" />

      <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
        <input
          type="checkbox"
          checked={isBillingSameAsContact}
          onChange={e => handleSameAsContact(e.target.checked)}
          className="accent-amber-600 w-4 h-4"
        />
        Same as Contact
      </label>

      <TextInput
        label="Name"
        value={data.billingPerson.name}
        onChange={e => updateBillingPerson({ name: e.target.value })}
        error={errors?.['billingPerson.name']}
      />

      <TextInput
        label="Address"
        value={data.billingPerson.address}
        onChange={e => updateBillingPerson({ address: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhoneInput
          label="Phone"
          value={data.billingPerson.phone}
          onChange={val => updateBillingPerson({ phone: val })}
        />
        <TextInput
          label="Relationship"
          value={data.billingPerson.relationship}
          onChange={e => updateBillingPerson({ relationship: e.target.value })}
        />
      </div>

      {/* ========== 7. Services to be Provided ========== */}
      <SectionHeader title="Services to be Provided" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SERVICE_OPTIONS.map(item => (
          <label
            key={item.key}
            className={`flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${data.services[item.key]
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            <input
              type="checkbox"
              checked={data.services[item.key]}
              onChange={e => updateServices({ [item.key]: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            {item.label}
          </label>
        ))}
      </div>

      {data.services.otherNonSkilled && (
        <TextInput
          label="Other Non-Skilled Services (specify)"
          value={data.services.otherNonSkilledText}
          onChange={e => updateServices({ otherNonSkilledText: e.target.value })}
          error={errors?.['services.otherNonSkilledText']}
        />
      )}

      {/* ========== 8. Frequency of Services ========== */}
      <SectionHeader title="Frequency of Services" />

      {/* Service type flags */}
      <div className="flex flex-wrap gap-3">
        {([
          { key: 'overnight' as const, label: 'Overnight' },
          { key: 'liveIn' as const, label: 'Live-in' },
          { key: 'available24x7' as const, label: '24x7' },
        ]).map(item => (
          <label
            key={item.key}
            className={`flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${data.frequency[item.key]
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
          >
            <input
              type="checkbox"
              checked={data.frequency[item.key]}
              onChange={e => updateFrequency({ [item.key]: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            {item.label}
          </label>
        ))}
      </div>

      {(data.frequency.available24x7 || data.frequency.liveIn) && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
          {data.frequency.available24x7 ? '24x7 service selected — covers all days and hours.' : 'Live-in service selected — covers all days and hours.'}
        </div>
      )}

      {!data.frequency.available24x7 && !data.frequency.liveIn && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {WEEKDAYS.map(day => (
              <label
                key={day.key}
                className={`flex items-center justify-center gap-1 cursor-pointer min-h-[44px] px-2 py-2 rounded-lg border-2 transition-all text-sm
                  ${data.frequency[day.key]
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                    : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={data.frequency[day.key]}
                  onChange={e => updateFrequency({ [day.key]: e.target.checked })}
                  className="accent-amber-600 w-4 h-4"
                />
                {day.label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
            <input
              type="checkbox"
              checked={data.frequency.orAsRequested}
              onChange={e => updateFrequency({ orAsRequested: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            Or as requested
          </label>

          {/* Per-day schedules (from assessment or manual entry) */}
          {WEEKDAYS.filter(day => data.frequency[day.key]).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Schedule per day</p>
              {WEEKDAYS.filter(day => data.frequency[day.key]).map(day => {
                const sch = data.frequency.daySchedules[day.key] || { from: '', to: '' };
                return (
                  <div key={day.key} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 w-12 shrink-0">{day.label}</span>
                    <TextInput
                      label=""
                      type="time"
                      value={sch.from}
                      onChange={e => {
                        const schedules = { ...data.frequency.daySchedules };
                        schedules[day.key] = { ...sch, from: e.target.value };
                        updateFrequency({ daySchedules: schedules });
                      }}
                      className="flex-1"
                    />
                    <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
                    <TextInput
                      label=""
                      type="time"
                      value={sch.to}
                      onChange={e => {
                        const schedules = { ...data.frequency.daySchedules };
                        schedules[day.key] = { ...sch, to: e.target.value };
                        updateFrequency({ daySchedules: schedules });
                      }}
                      className="flex-1"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <TextInput
            label="Additional Notes"
            value={data.frequency.duration}
            onChange={e => updateFrequency({ duration: e.target.value })}
            placeholder="e.g., ongoing, temporary, seasonal"
            error={errors?.['frequency.duration']}
          />
        </>
      )}

      {/* ========== 9. Additional Details ========== */}
      <SectionHeader title="Additional Details" />

      <TextInput
        label="Assigned Caregiver"
        value={data.assignedCaregiver}
        onChange={e => onChange({ assignedCaregiver: e.target.value })}
        error={errors?.assignedCaregiver}
      />

      <TextInput
        label="Service Deposit"
        value={data.serviceDeposit}
        onChange={e => onChange({ serviceDeposit: e.target.value })}
        placeholder="$"
        error={errors?.serviceDeposit}
      />

      {/* ========== 10. Signatures ========== */}
      <SectionHeader title="Signatures" />

      <div className="space-y-6">
        {/* Client / Authorized Representative — single consolidated signature */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-all text-sm border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500">
            <input
              type="checkbox"
              checked={data.signerIsRepresentative}
              onChange={e => onChange({ signerIsRepresentative: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            Signing on behalf of the client (Authorized Representative)
          </label>

          <SignaturePad
            label={data.signerIsRepresentative ? 'Authorized Representative Signature' : 'Client Signature'}
            value={data.clientSignature}
            onChange={val => onChange({ clientSignature: val })}
            signerRole={data.signerIsRepresentative ? 'Authorized Representative' : 'Client'}
            metadata={data.clientSignatureMeta}
            onMetadataChange={meta => onChange({ clientSignatureMeta: meta })}
            error={errors?.clientSignature}
          />

          <TextInput
            label={data.signerIsRepresentative ? 'Representative Print Name' : 'Client Print Name'}
            value={data.clientPrintName}
            onChange={e => onChange({ clientPrintName: e.target.value })}
            error={errors?.clientPrintName}
          />

          {data.signerIsRepresentative && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label="Representative Name"
                value={data.representativeName}
                onChange={e => onChange({ representativeName: e.target.value })}
                error={errors?.representativeName}
              />
              <TextInput
                label="Relationship to Client"
                value={data.representativeRelationship}
                onChange={e => onChange({ representativeRelationship: e.target.value })}
                error={errors?.representativeRelationship}
              />
            </div>
          )}
        </div>

        {/* EHC Representative signature */}
        <div className="space-y-4">
          <SignaturePad
            label="EHC Representative Signature"
            value={data.ehcRepSignature}
            onChange={val => onChange({ ehcRepSignature: val })}
            signerRole="EHC Representative"
            metadata={data.ehcRepSignatureMeta}
            onMetadataChange={meta => onChange({ ehcRepSignatureMeta: meta })}
            error={errors?.ehcRepSignature}
          />
          <TextInput
            label="EHC Representative Name"
            value={data.ehcRepName}
            onChange={e => onChange({ ehcRepName: e.target.value })}
            error={errors?.ehcRepName}
          />
        </div>
      </div>
    </div>
  );
}
