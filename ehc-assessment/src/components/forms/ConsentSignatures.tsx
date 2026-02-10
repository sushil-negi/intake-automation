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

      {/* Assignment of Benefits */}
      <SectionHeader title="Assignment of Benefits" />

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
        <p>
          <strong>Assignment of Insurance Benefits:</strong> I hereby authorize payment directly
          to Executive Home Care (EHC), on any and all insurance benefits for services otherwise
          payable to or on behalf of the client-consumer or to me, and authorize release of
          information requested by the client-consumer's insurance company(ies).
        </p>
      </div>

      <SignaturePad
        label="Signature of Client/Consumer or Personal Representative"
        value={data.benefitsSignature}
        onChange={val => onChange({ benefitsSignature: val })}
      />
      <TextInput
        label="Date"
        type="date"
        value={data.benefitsSignatureDate}
        onChange={e => onChange({ benefitsSignatureDate: e.target.value })}
      />
    </div>
  );
}
