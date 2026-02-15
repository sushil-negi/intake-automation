import { TextInput, SectionHeader } from '../../ui/FormFields';
import { SignaturePad } from '../../ui/SignaturePad';
import { AccordionSection } from '../../ui/AccordionSection';
import { logAudit } from '../../../utils/auditLog';
import type { CustomerPacketData } from '../../../types/serviceContract';
import type { ConsentCheckbox } from '../../../types/forms';

interface Props {
  data: CustomerPacketData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

const PACKET_ITEMS: { key: keyof Pick<CustomerPacketData, 'acknowledgeHipaa' | 'acknowledgeHiringStandards' | 'acknowledgeCaregiverIntro' | 'acknowledgeComplaintProcedures' | 'acknowledgeSatisfactionSurvey'>; title: string; summary: string }[] = [
  {
    key: 'acknowledgeHipaa',
    title: 'HIPAA Notice of Privacy Practices',
    summary:
      'Executive Home Care maintains the privacy of your health information in accordance with HIPAA regulations. You have the right to access, correct, and control your health information. Our Notice of Privacy Practices describes how your medical information may be used and disclosed, and how you can access this information.',
  },
  {
    key: 'acknowledgeHiringStandards',
    title: 'Hiring Standards',
    summary:
      'Executive Home Care complies with the PA Department of Health regulations regarding hiring standards. All employees undergo comprehensive background checks, drug screening, TB testing, CPR certification, and skills assessment prior to providing care. These standards ensure the safety and quality of care provided to our clients.',
  },
  {
    key: 'acknowledgeCaregiverIntro',
    title: 'Caregiver Identification & Introduction',
    summary:
      'All Executive Home Care caregivers carry company identification. You will be notified in advance of your assigned caregiver and their qualifications. If a substitute caregiver is required, you will be informed as soon as possible. Caregivers are trained to present their identification upon arrival at your home.',
  },
  {
    key: 'acknowledgeComplaintProcedures',
    title: 'Complaint Procedures',
    summary:
      'Complaints regarding Executive Home Care services can be directed to the PA Department of Health at (866) 826-3644 or to Executive Home Care directly. We take all complaints seriously and will investigate and respond promptly. You will not be subject to retaliation for filing a complaint.',
  },
  {
    key: 'acknowledgeSatisfactionSurvey',
    title: 'Consumer Satisfaction Survey',
    summary:
      'Executive Home Care values your feedback. A satisfaction survey may be provided to help us maintain quality standards and continuously improve our services. Your responses are confidential and used solely for quality improvement purposes.',
  },
];

export function CustomerPacket({ data, onChange, errors }: Props) {
  const handleConsentToggle = (key: keyof CustomerPacketData, current: ConsentCheckbox) => {
    const next: ConsentCheckbox = current.checked
      ? { checked: false, timestamp: '' }
      : { checked: true, timestamp: new Date().toISOString() };
    onChange({ [key]: next });
    // S7: Consent audit trail
    logAudit(
      next.checked ? 'consent_grant' : 'consent_revoke',
      'customerPacket',
      `Contract ${key}: ${next.checked ? 'granted' : 'revoked'}`,
      'info',
    );
  };

  const allChecked = PACKET_ITEMS.every(item => data[item.key]?.checked);

  return (
    <div className="space-y-6 pt-4">
      <SectionHeader
        title="Customer Packet Acknowledgment"
        subtitle="Review each document summary and confirm receipt"
      />

      {/* Accordion Sections */}
      <div className="space-y-3">
        {PACKET_ITEMS.map(item => (
          <AccordionSection key={item.key} title={item.title}>
            <p>{item.summary}</p>
          </AccordionSection>
        ))}
      </div>

      {/* Acknowledgment Checkboxes */}
      <SectionHeader title="Acknowledgment of Receipt" />

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
          Please check each box to confirm you have received and reviewed the corresponding document:
        </p>
        {PACKET_ITEMS.map(item => {
          const cb = data[item.key] as ConsentCheckbox;
          // Zod nested errors produce dotted paths like "acknowledgeHipaa.checked"
          // Match both exact key and any nested path starting with the key
          const hasError = !cb?.checked && errors && Object.keys(errors).some(
            k => k === item.key || k.startsWith(item.key + '.')
          );
          return (
            <label
              key={item.key}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border-2 transition-all cursor-pointer min-h-[44px] text-sm ${
                cb?.checked
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
                  : hasError
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600'
                  : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <input
                type="checkbox"
                checked={cb?.checked ?? false}
                onChange={() => handleConsentToggle(item.key, cb ?? { checked: false, timestamp: '' })}
                className="mt-0.5 accent-amber-600 w-4 h-4 flex-shrink-0"
                aria-invalid={hasError ? 'true' : undefined}
              />
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 dark:text-slate-300">{item.title}</span>
                {cb?.checked && cb.timestamp && (
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Acknowledged {new Date(cb.timestamp).toLocaleString()}
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

      {/* Signature */}
      <SectionHeader title="Signature" />

      {!allChecked && (
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          Please acknowledge all items above before signing.
        </p>
      )}
      <SignaturePad
        label="Acknowledgment Signature"
        value={data.acknowledgeSignature}
        onChange={val => onChange({ acknowledgeSignature: val })}
        signerRole="Client/Consumer"
        metadata={data.acknowledgeSignatureMeta}
        onMetadataChange={meta => onChange({ acknowledgeSignatureMeta: meta })}
        error={errors?.acknowledgeSignature}
        disabled={!allChecked}
      />

      <TextInput
        label="Date"
        type="date"
        value={data.acknowledgeDate}
        onChange={e => onChange({ acknowledgeDate: e.target.value })}
        error={errors?.acknowledgeDate}
      />
    </div>
  );
}
