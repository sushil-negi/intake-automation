import { TextInput, SectionHeader } from '../../ui/FormFields';
import { SignaturePad } from '../../ui/SignaturePad';
import { InitialsInput } from '../../ui/InitialsInput';
import type { DirectCareWorkerData } from '../../../types/serviceContract';

interface Props {
  data: DirectCareWorkerData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function DirectCareWorkerNotice({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6 pt-4">
      <SectionHeader
        title="Direct Care Worker Notice"
        subtitle="Please read each section and initial to acknowledge"
      />

      {/* Section 1: Employee of EHC */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#1a3a4a] dark:text-slate-100 mb-2">Employee Status</h4>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              <p>
                The direct care worker who will be providing services in my home is an employee
                of Executive Home Care. As such, Executive Home Care is responsible for
                withholding and payment of all applicable federal and state taxes, providing
                workers' compensation insurance coverage, and maintaining compliance with all
                applicable labor laws and regulations.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 pt-8">
            <InitialsInput
              label="Initials"
              value={data.employeeOfEhcInitial}
              onChange={val => onChange({ employeeOfEhcInitial: val })}
              error={errors?.employeeOfEhcInitial}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Registry - Not Employee (N/A for this company) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 opacity-50">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#1a3a4a] dark:text-slate-100 mb-2">Registry Information</h4>
            <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              <p>
                The direct care worker who will be providing services in my home is not an
                employee of Executive Home Care but is referred through an approved registry.
                The registry worker is an independent contractor. Executive Home Care does not
                withhold taxes, provide workers' compensation, or assume employer liability for
                registry workers. I understand this distinction and the implications for my care.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 italic">Not applicable — all caregivers are employees of Executive Home Care.</p>
          </div>
        </div>
      </div>

      {/* Section 3: Liability Insurance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#1a3a4a] dark:text-slate-100 mb-2">Liability Insurance</h4>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              <p>
                I have been informed that Executive Home Care maintains general and professional
                liability insurance to cover claims arising from services provided by its
                employees. This coverage is intended to protect both the client and the
                organization in the event of an incident related to the delivery of home care
                services.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 pt-8">
            <InitialsInput
              label="Initials"
              value={data.liabilityInsuranceInitial}
              onChange={val => onChange({ liabilityInsuranceInitial: val })}
              error={errors?.liabilityInsuranceInitial}
            />
          </div>
        </div>
      </div>

      {/* Signatures */}
      <SectionHeader title="Signatures" />

      <SignaturePad
        label="Consumer / Client Signature"
        value={data.consumerSignature}
        onChange={val => onChange({ consumerSignature: val })}
        signerRole="Consumer/Client"
        metadata={data.consumerSignatureMeta}
        onMetadataChange={meta => onChange({ consumerSignatureMeta: meta })}
        error={errors?.consumerSignature}
      />

      <SignaturePad
        label="Agency Representative Signature"
        value={data.agencyRepSignature}
        onChange={val => onChange({ agencyRepSignature: val })}
        signerRole="Agency Representative"
        metadata={data.agencyRepSignatureMeta}
        onMetadataChange={meta => onChange({ agencyRepSignatureMeta: meta })}
        error={errors?.agencyRepSignature}
      />

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
