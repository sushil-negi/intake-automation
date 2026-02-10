import { TextInput, SectionHeader } from '../ui/FormFields';
import { SignaturePad } from '../ui/SignaturePad';
import type { ConsentData } from '../../types/forms';

interface Props {
  data: ConsentData;
  onChange: (data: Partial<ConsentData>) => void;
}

export function ConsentSignatures({ data, onChange }: Props) {
  return (
    <div className="space-y-6 pt-4">
      {/* Client banner — auto-populated from Step 1 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-sm">
        <span><span className="text-gray-500">Client:</span> <span className="font-medium text-gray-900">{data.clientName || '—'}</span></span>
        <span><span className="text-gray-500">Age:</span> <span className="font-medium text-gray-900">{data.age || '—'}</span></span>
        <span><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{data.clientAddress || '—'}</span></span>
        <span><span className="text-gray-500">Assessment Date:</span> <span className="font-medium text-gray-900">{data.date || '—'}</span></span>
      </div>

      {/* HIPAA Notice */}
      <SectionHeader title="Receipt of Notice of Privacy Practices (HIPAA Notice)" />

      <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          I have received a copy of the EHC Notice of Privacy Practices (HIPAA Notice).
        </p>
        <p>
          I consent to the use and disclosure of my protected health information by EHC for the
          purpose of providing services to me, obtaining payment for my home services bills,
          and/or to conduct business operations.
        </p>
        <p>
          I understand that I have a right to request a restriction as to how my protected health
          information is used or disclosed to carry out services, payment or business operations
          of EHC. EHC is not required to agree to the restrictions that I may request. However,
          if EHC agrees to a restriction that I request, the restriction is binding.
        </p>
        <p>
          I have the right to revoke this consent, in writing, at any time, except to the extent
          that EHC has taken action in reliance on this consent.
        </p>
      </div>

      <TextInput
        label="Signing Party Full Name"
        value={data.signerName}
        onChange={e => onChange({ signerName: e.target.value })}
        placeholder="Full name of client/consumer or personal representative"
      />
      <SignaturePad
        label="Signature of Client/Consumer or Personal Representative"
        value={data.hipaaSignature}
        onChange={val => onChange({ hipaaSignature: val })}
      />
      <TextInput
        label="Date"
        type="date"
        value={data.hipaaSignatureDate}
        onChange={e => onChange({ hipaaSignatureDate: e.target.value })}
      />
    </div>
  );
}
