import { TextInput, SectionHeader } from '../../ui/FormFields';
import { SignaturePad } from '../../ui/SignaturePad';
import type { ConsumerRightsData } from '../../../types/serviceContract';

interface Props {
  data: ConsumerRightsData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

const RIGHTS = [
  'The primary objective of Executive Home Care is to provide quality care to each client according to the established plan of care.',
  'Privacy shall be maintained for each client at all times.',
  'Client records are legal and confidential files. All information pertaining to client care and services is treated as privileged.',
  'Each client has the right of access to accurate information, and to participate in the planning of their services.',
  'No client shall be subjected to discrimination on the basis of race, color, religion, national origin, sex, age, handicap, or sexual orientation.',
  'Each client has the right to choice of approved care providers when available.',
  'Each client has the right to be promptly informed of changes to the plan of services.',
  'Each client has the right to be treated with courtesy, respect, and dignity.',
  'Each client has the right to accept or refuse services at any time.',
  'Each client has the right to be fully informed of charges for services.',
  'Each client has the right to be informed of the name and contact information of the supervisor responsible for their services.',
  'Each client has the right to submit complaints without fear of retaliation.',
  'Each client has the right to be advised in advance of the caregiver(s) who will be providing services.',
  'Each client has the right to review their record upon written request.',
  'Each client has the right to have their property and residence treated with respect.',
  'Each client has the right to receive written notice of the state licensing authority and contact information for filing complaints.',
];

const RESPONSIBILITIES = [
  'Truthfully reveal all conditions and circumstances that may affect the services provided.',
  'Treat all Executive Home Care staff courteously and respectfully.',
  'Participate in decisions regarding service planning to the best of their ability.',
  'Comply with the agreed-upon service plan.',
  'Notify Executive Home Care of any changes in condition that may affect services.',
  'Maintain a safe home environment for all personnel providing services.',
  'Not hold Executive Home Care responsible for property damage resulting from normal use of the home.',
  'Be available at scheduled service times or provide adequate notice of cancellation.',
  'Report complaints to Executive Home Care so they may be addressed for quality monitoring.',
  'Communicate questions and concerns to Executive Home Care staff promptly.',
];

export function ConsumerRights({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6 pt-4">
      <SectionHeader
        title="Consumer Bill of Rights"
        subtitle="Please review and acknowledge the following rights and responsibilities"
      />

      {/* Consumer Rights */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-slate-100 mb-3">Consumer Rights</h4>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
          <ol className="list-decimal list-outside ml-5 space-y-2">
            {RIGHTS.map((right, i) => (
              <li key={i}>{right}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Consumer Responsibilities */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-slate-100 mb-3">Consumer Responsibilities</h4>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
          <p className="mb-2">Each consumer/client is responsible for the following:</p>
          <ol className="list-decimal list-outside ml-5 space-y-2">
            {RESPONSIBILITIES.map((resp, i) => (
              <li key={i}>{resp}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Acknowledgment */}
      <SectionHeader title="Acknowledgment" />

      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
        <p>
          I acknowledge that I have received, read, and understand the Consumer Bill of Rights
          and Consumer Responsibilities as outlined above. I understand my rights and agree to
          uphold my responsibilities as a client of Executive Home Care.
        </p>
      </div>

      <SignaturePad
        label="Acknowledgment Signature (Client/Consumer or Responsible Party)"
        value={data.acknowledgeSignature}
        onChange={val => onChange({ acknowledgeSignature: val })}
        signerRole="Client/Consumer"
        metadata={data.acknowledgeSignatureMeta}
        onMetadataChange={meta => onChange({ acknowledgeSignatureMeta: meta })}
        error={errors?.acknowledgeSignature}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Date"
          type="date"
          value={data.acknowledgeDate}
          onChange={e => onChange({ acknowledgeDate: e.target.value })}
          error={errors?.acknowledgeDate}
        />
        <TextInput
          label="Responsible Party Relationship (if applicable)"
          value={data.responsiblePartyRelationship}
          onChange={e => onChange({ responsiblePartyRelationship: e.target.value })}
          placeholder="e.g. Spouse, Son, Daughter, POA"
          error={errors?.responsiblePartyRelationship}
        />
      </div>
    </div>
  );
}
