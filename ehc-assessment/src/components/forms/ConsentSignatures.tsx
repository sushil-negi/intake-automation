import { TextInput, SectionHeader } from '../ui/FormFields';
import { SignaturePad } from '../ui/SignaturePad';
import { logAudit } from '../../utils/auditLog';
import type { ConsentData, ConsentCheckbox } from '../../types/forms';

const CONSENT_ITEMS: { key: keyof Pick<ConsentData, 'consentTreatment' | 'consentInfoSharing' | 'consentElectronicRecords' | 'consentDataRetention'>; label: string }[] = [
  { key: 'consentTreatment', label: 'I consent to receive home care services from EHC as described in my service plan.' },
  { key: 'consentInfoSharing', label: 'I authorize EHC to share my protected health information with providers involved in my care.' },
  { key: 'consentElectronicRecords', label: 'I consent to the use of electronic records for my care documentation.' },
  { key: 'consentDataRetention', label: 'I understand that EHC will retain my records in accordance with applicable regulations.' },
];

interface Props {
  data: ConsentData;
  onChange: (data: Partial<ConsentData>) => void;
  errors?: Record<string, string>;
}

export function ConsentSignatures({ data, onChange, errors }: Props) {
  const allConsentsChecked = CONSENT_ITEMS.every(item => data[item.key]?.checked);

  const handleConsentToggle = (key: keyof ConsentData, current: ConsentCheckbox) => {
    const next: ConsentCheckbox = current.checked
      ? { checked: false, timestamp: '' }
      : { checked: true, timestamp: new Date().toISOString() };
    onChange({ [key]: next });
    // S7: Consent audit trail
    logAudit(
      next.checked ? 'consent_grant' : 'consent_revoke',
      'consent',
      `Assessment ${key}: ${next.checked ? 'granted' : 'revoked'}`,
      'info',
    );
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

      {/* HIPAA Notice */}
      <SectionHeader title="Receipt of Notice of Privacy Practices (HIPAA Notice)" />

      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
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

      {/* Granular consent acknowledgments */}
      <div className="space-y-3">
        <SectionHeader title="Acknowledgments" />
        {/* Show banner if any consent checkbox has a validation error */}
        {errors && Object.keys(errors).some(k => CONSENT_ITEMS.some(item => k === item.key || k.startsWith(item.key + '.'))) && (
          <div className="rounded-xl p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-400">
            All acknowledgments must be checked before signing.
          </div>
        )}
        {CONSENT_ITEMS.map(({ key, label }) => {
          const item = data[key] as ConsentCheckbox;
          // Zod nested errors produce dotted paths like "consentTreatment.checked"
          const hasError = !item?.checked && errors && Object.keys(errors).some(
            k => k === key || k.startsWith(key + '.')
          );
          return (
            <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              item?.checked
                ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/20'
                : hasError
                ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={item?.checked ?? false}
                onChange={() => handleConsentToggle(key, item ?? { checked: false, timestamp: '' })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                aria-invalid={hasError ? 'true' : undefined}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                {item?.checked && item.timestamp && (
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Acknowledged {new Date(item.timestamp).toLocaleString()}
                  </span>
                )}
                {hasError && (
                  <span role="alert" className="block text-xs text-red-500 dark:text-red-400 mt-0.5">
                    Please acknowledge this item
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <TextInput
        label="Signing Party Full Name"
        value={data.signerName}
        onChange={e => onChange({ signerName: e.target.value })}
        placeholder="Full name of client/consumer or personal representative"
      />
      {!allConsentsChecked && (
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          Please acknowledge all items above before signing.
        </p>
      )}
      <SignaturePad
        label="Signature of Client/Consumer or Personal Representative"
        value={data.hipaaSignature}
        onChange={val => onChange({ hipaaSignature: val })}
        signerRole="Client/Consumer"
        metadata={data.hipaaSignatureMeta}
        onMetadataChange={meta => onChange({ hipaaSignatureMeta: meta })}
        error={errors?.hipaaSignature}
        disabled={!allConsentsChecked}
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
