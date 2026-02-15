import { TextInput, SectionHeader, RadioGroup } from '../../ui/FormFields';
import { SignaturePad } from '../../ui/SignaturePad';
import type { TransportationRequestData } from '../../../types/serviceContract';

interface Props {
  data: TransportationRequestData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function TransportationRequest({ data, onChange, errors }: Props) {
  const handleDecline = (checked: boolean) => {
    onChange({
      declined: checked,
      // Clear transport-specific fields when declining
      ...(checked
        ? {
            vehicleChoice: '',
            employeeNames: '',
            clientSignature: '',
            clientSignatureMeta: null,
            clientRelationship: '',
            ehcRepSignature: '',
            ehcRepSignatureMeta: null,
          }
        : {}),
    });
  };

  return (
    <div className="space-y-6 pt-4">
      <SectionHeader
        title="Transportation Request & Agreement"
        subtitle="Complete if transportation services are needed, or decline if not applicable"
      />

      <TextInput
        label="Consumer Name"
        value={data.consumerName}
        onChange={e => onChange({ consumerName: e.target.value })}
        placeholder="Client / Consumer full name"
        error={errors?.consumerName}
      />

      {/* Decline Option */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.declined}
            onChange={e => handleDecline(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="text-sm font-semibold text-[#1a3a4a] dark:text-slate-100">
              Decline Transportation Services
            </span>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Check this box if the client does not require transportation services at this time.
            </p>
          </div>
        </label>
      </div>

      {data.declined ? (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
          <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Transportation services declined</p>
          <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
            Uncheck the box above if transportation services are needed in the future.
          </p>
        </div>
      ) : (
        <>
          {/* Vehicle Choice */}
          <RadioGroup
            label="Vehicle Selection"
            name="vehicleChoice"
            value={data.vehicleChoice}
            options={[
              { value: 'clientVehicle', label: 'Client will provide a vehicle' },
              { value: 'caregiverVehicle', label: "Request that Caregiver's vehicle be used (IRS mileage rate will be calculated into service billing)" },
            ]}
            onChange={val => onChange({ vehicleChoice: val })}
            error={errors?.vehicleChoice}
          />

          {/* Indemnification Agreement */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-semibold text-[#1a3a4a] dark:text-slate-100 mb-2">Indemnification Agreement</h4>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              <p>
                I hereby request that Executive Home Care provide transportation services as part
                of my care plan. I understand that Executive Home Care and its employees will
                exercise reasonable care while transporting me. However, I agree to indemnify and
                hold harmless Executive Home Care, its officers, directors, employees, and agents
                from and against any and all claims, damages, losses, and expenses arising out of
                or resulting from transportation services, except to the extent caused by the gross
                negligence or willful misconduct of Executive Home Care or its employees.
              </p>
              <p className="mt-3">
                I understand that I am responsible for ensuring that any vehicle I provide for
                transportation is properly insured, registered, and in safe operating condition.
                If I request the use of a caregiver's vehicle, I understand that the IRS standard
                mileage rate will be applied and included in my service billing.
              </p>
            </div>
          </div>

          <TextInput
            label="Employee Name(s) Authorized to Transport"
            value={data.employeeNames}
            onChange={e => onChange({ employeeNames: e.target.value })}
            placeholder="Enter name(s) of authorized employee(s)"
            error={errors?.employeeNames}
          />

          {/* Driving Record Acknowledgment */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            <p>
              I acknowledge that Executive Home Care has reviewed the driving record of the
              employee(s) named above and has determined that they meet the organization's
              standards for providing transportation services. Executive Home Care requires all
              employees who provide transportation to maintain a valid driver's license and
              acceptable driving record.
            </p>
          </div>

          {/* Client Signature */}
          <SectionHeader title="Client / Responsible Party" />

          <SignaturePad
            label="Client / Responsible Party Signature"
            value={data.clientSignature}
            onChange={val => onChange({ clientSignature: val })}
            signerRole="Client/Responsible Party"
            metadata={data.clientSignatureMeta}
            onMetadataChange={meta => onChange({ clientSignatureMeta: meta })}
            error={errors?.clientSignature}
          />

          <TextInput
            label="Relationship to Client (if applicable)"
            value={data.clientRelationship}
            onChange={e => onChange({ clientRelationship: e.target.value })}
            placeholder="e.g. Self, Spouse, Son, Daughter, POA"
            error={errors?.clientRelationship}
          />

          {/* EHC Representative */}
          <SectionHeader title="EHC Representative" />

          <SignaturePad
            label="EHC Representative Signature"
            value={data.ehcRepSignature}
            onChange={val => onChange({ ehcRepSignature: val })}
            signerRole="EHC Representative"
            metadata={data.ehcRepSignatureMeta}
            onMetadataChange={meta => onChange({ ehcRepSignatureMeta: meta })}
            error={errors?.ehcRepSignature}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="EHC Representative Name"
              value={data.ehcRepName}
              onChange={e => onChange({ ehcRepName: e.target.value })}
              placeholder="Full name"
              error={errors?.ehcRepName}
            />
            <TextInput
              label="Title"
              value={data.ehcRepTitle}
              onChange={e => onChange({ ehcRepTitle: e.target.value })}
              placeholder="e.g. Care Coordinator"
              error={errors?.ehcRepTitle}
            />
          </div>
        </>
      )}

      <TextInput
        label="Date"
        type="date"
        value={data.date}
        onChange={e => onChange({ date: e.target.value })}
        error={errors?.date}
      />
    </div>
  );
}
