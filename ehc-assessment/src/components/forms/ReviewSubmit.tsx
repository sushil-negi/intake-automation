import { useState, useRef, useEffect } from 'react';
import { SectionHeader } from '../ui/FormFields';
import { PdfPreviewModal } from '../ui/PdfPreviewModal';
import { EmailComposeModal } from '../ui/EmailComposeModal';
import { logger } from '../../utils/logger';
import { getEmailConfig } from '../../utils/db';
import { resolveTemplate, resolveEmailBody } from '../../utils/emailTemplates';
import type { EmailConfig } from '../../types/emailConfig';
import { DEFAULT_EMAIL_CONFIG } from '../../types/emailConfig';
import type { AssessmentFormData } from '../../types/forms';
import type { jsPDF } from 'jspdf';
import { useBranding } from '../../contexts/BrandingContext';

interface Props {
  data: AssessmentFormData;
  onGoToStep: (step: number) => void;
  onContinueToContract?: () => void;
  onSubmit?: () => Promise<void>;
}

// Step indices (must match STEPS in App.tsx)
const STEP = { helpList: 0, history: 1, assessment: 2, medications: 3, safety: 4, consent: 5 };

function ReviewSection({ title, stepIndex, status, onEdit, children }: {
  title: string;
  stepIndex: number;
  status?: 'complete' | 'incomplete' | 'warning';
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  const borderColor = status === 'incomplete' ? 'border-red-200 dark:border-red-800' : status === 'warning' ? 'border-yellow-200 dark:border-yellow-800' : 'border-gray-200 dark:border-slate-700';
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${borderColor} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor} ${
        status === 'incomplete' ? 'bg-red-50 dark:bg-red-900/30' : status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-gray-50 dark:bg-slate-700/50'
      }`}>
        <div className="flex items-center gap-2">
          {status === 'complete' && <span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true" />}
          {status === 'incomplete' && <span className="w-2.5 h-2.5 rounded-full bg-red-400" aria-hidden="true" />}
          {status === 'warning' && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden="true" />}
          <span className="sr-only">{status === 'complete' ? 'Complete' : status === 'incomplete' ? 'Incomplete' : 'Warning'}</span>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3 space-y-1 text-sm text-gray-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-gray-500 dark:text-slate-400 flex-shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ReviewSubmit({ data, onGoToStep, onContinueToContract, onSubmit }: Props) {
  const branding = useBranding();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; filename: string } | null>(null);
  const pdfDocRef = useRef<jsPDF | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Email state
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailBlob, setEmailBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);

  // Load email config
  useEffect(() => {
    getEmailConfig().then(setEmailConfig).catch(() => {/* use defaults */});
  }, []);

  // Auto-dismiss email status after 4 seconds
  useEffect(() => {
    if (!emailStatus) return;
    const timer = setTimeout(() => setEmailStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [emailStatus]);
  const { clientHelpList, clientHistory, clientAssessment, medicationList, homeSafetyChecklist, consent } = data;

  const allCategoriesSelected = [
    ...clientAssessment.bathing, ...clientAssessment.dressing, ...clientAssessment.hairCare,
    ...clientAssessment.teethAndGums, ...clientAssessment.shaving, ...clientAssessment.mobility,
    ...clientAssessment.falls, ...clientAssessment.mobilityAids, ...clientAssessment.nutritionHydration,
    ...clientAssessment.toileting, ...clientAssessment.medicationReminder,
    ...clientAssessment.housekeeping, ...clientAssessment.transportation,
  ];

  // Completion checks
  const hasClientInfo = !!clientHelpList.clientName && !!clientHelpList.dateOfBirth;
  const hasHistory = !!clientHistory.assessmentReason;
  const hasAssessment = allCategoriesSelected.length > 0;
  const hasMeds = medicationList.noMedications || medicationList.medications.some(m => m.name);
  const hasSafetySignatures = !!homeSafetyChecklist.clientSignature && !!homeSafetyChecklist.representativeSignature;
  const hasConsentSignatures = !!consent.hipaaSignature;

  const incomplete: { label: string; step: number }[] = [];
  if (!hasClientInfo) incomplete.push({ label: 'Client Info', step: STEP.helpList });
  if (!hasHistory) incomplete.push({ label: 'Client History', step: STEP.history });
  if (!hasAssessment) incomplete.push({ label: 'Client Assessment', step: STEP.assessment });
  if (!hasMeds) incomplete.push({ label: 'Medication List', step: STEP.medications });
  if (!hasSafetySignatures) incomplete.push({ label: 'Home Safety signatures', step: STEP.safety });
  if (!hasConsentSignatures) incomplete.push({ label: 'Consent signatures', step: STEP.consent });

  return (
    <div className="space-y-4 pt-4">
      {incomplete.length > 0 ? (
        <div className="rounded-xl p-4 text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
          <p className="font-medium mb-2">The following sections need attention before submitting:</p>
          <ul className="space-y-1">
            {incomplete.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <button type="button" onClick={() => onGoToStep(item.step)} className="text-amber-700 underline hover:text-amber-800">{item.label}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl p-4 text-sm bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
          All sections complete. Review the information below and submit.
        </div>
      )}

      <SectionHeader title="Review All Information" subtitle="Click Edit on any section to make changes" />

      {/* Client Help List */}
      <ReviewSection title="Client Help List" stepIndex={STEP.helpList} onEdit={onGoToStep} status={hasClientInfo ? 'complete' : 'incomplete'}>
        <Field label="Client Name" value={clientHelpList.clientName} />
        <Field label="Date of Birth" value={clientHelpList.dateOfBirth} />
        <Field label="Address" value={clientHelpList.clientAddress} />
        <Field label="Phone" value={clientHelpList.clientPhone} />
        <Field label="Referral Agency" value={clientHelpList.referralAgency} />
        <Field label="Goals" value={clientHelpList.goals} />
        {clientHelpList.emergencyContacts.filter(c => c.name).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500 dark:text-slate-400">Emergency Contacts:</span>
            {clientHelpList.emergencyContacts.filter(c => c.name).map((c, i) => (
              <div key={i} className="ml-3 text-xs">{c.name} ({c.relationship}) - {c.phone1}{c.email ? ` - ${c.email}` : ''}</div>
            ))}
          </div>
        )}
        {clientHelpList.doctors.filter(d => d.name).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500 dark:text-slate-400">Doctors:</span>
            {clientHelpList.doctors.filter(d => d.name).map((d, i) => (
              <div key={i} className="ml-3 text-xs">{d.name} ({d.type}) - {d.phone}</div>
            ))}
          </div>
        )}
      </ReviewSection>

      {/* Client History */}
      <ReviewSection title="Client History" stepIndex={STEP.history} onEdit={onGoToStep} status={hasHistory ? 'complete' : 'incomplete'}>
        <Field label="Assessment Reason" value={clientHistory.assessmentReason === 'initial' ? 'Initial' : clientHistory.assessmentReason === '90day' ? '90 Day Supervisory' : ''} />
        <Field label="Primary Diagnosis" value={clientHistory.primaryDiagnosis} />
        {clientHistory.healthHistory.length > 0 && (
          <div className="mt-1">
            <span className="text-gray-500 dark:text-slate-400">Health History:</span>
            <span className="ml-1">{clientHistory.healthHistory.join(', ')}</span>
          </div>
        )}
        <Field label="Smoker" value={clientHistory.smoker === 'yes' ? 'Yes' : clientHistory.smoker === 'no' ? 'No' : ''} />
        <Field label="Oxygen" value={clientHistory.oxygenInHome === 'yes' ? 'Yes' : clientHistory.oxygenInHome === 'no' ? 'No' : ''} />
        <Field label="Lives Alone" value={clientHistory.livesAlone === 'yes' ? 'Yes' : clientHistory.livesAlone === 'no' ? 'No' : ''} />
        <Field label="Drug Allergies" value={clientHistory.drugAllergies} />
        <Field label="Food Allergies" value={clientHistory.foodAllergies} />
        {/* Service Preferences */}
        <Field label="Service Start" value={clientHistory.serviceStartDate} />
        <Field label="Service Type" value={[
          clientHistory.overnight && 'Overnight',
          clientHistory.liveIn && 'Live-in',
          clientHistory.is24x7 && '24×7',
        ].filter(Boolean).join(', ') || undefined} />
        {!clientHistory.is24x7 && !clientHistory.liveIn && clientHistory.serviceDays.length > 0 && (
          <div className="mt-1">
            <span className="text-gray-500 dark:text-slate-400">Service Days:</span>
            <span className="ml-1">{clientHistory.serviceDays.join(', ')}</span>
            {clientHistory.serviceDays.some(d => clientHistory.daySchedules[d]?.from) && (
              <div className="ml-3 text-xs space-y-0.5 mt-1">
                {clientHistory.serviceDays.map(d => {
                  const sch = clientHistory.daySchedules[d];
                  return sch?.from ? <div key={d}>{d}: {sch.from} – {sch.to}</div> : null;
                })}
              </div>
            )}
          </div>
        )}
        <Field label="Service Notes" value={clientHistory.servicesPerWeek} />
        {clientHistory.ehcStaffName && (
          <>
            <Field label="EHC Staff" value={clientHistory.ehcStaffName} />
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${clientHistory.ehcRepSignature ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-xs">EHC Rep signature: {clientHistory.ehcRepSignature ? 'Signed' : 'Not signed'}</span>
            </div>
          </>
        )}
      </ReviewSection>

      {/* Client Assessment */}
      <ReviewSection title="Client Assessment" stepIndex={STEP.assessment} onEdit={onGoToStep} status={hasAssessment ? 'complete' : 'incomplete'}>
        <Field label="Type" value={clientAssessment.assessmentType === 'initial' ? 'Initial' : clientAssessment.assessmentType === 'revised' ? 'Revised' : ''} />
        <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">{allCategoriesSelected.length} items selected across all categories</p>
        {allCategoriesSelected.length > 0 && (
          <p className="text-xs mt-1 text-gray-600 dark:text-slate-400">{allCategoriesSelected.slice(0, 10).join(', ')}{allCategoriesSelected.length > 10 ? ` ... and ${allCategoriesSelected.length - 10} more` : ''}</p>
        )}
        {clientAssessment.ehcStaffName && (
          <>
            <Field label="EHC Staff" value={clientAssessment.ehcStaffName} />
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${clientAssessment.ehcRepSignature ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-xs">EHC Rep signature: {clientAssessment.ehcRepSignature ? 'Signed' : 'Not signed'}</span>
            </div>
          </>
        )}
      </ReviewSection>

      {/* Medications (now step 3) */}
      <ReviewSection title="Medication List" stepIndex={STEP.medications} onEdit={onGoToStep} status={hasMeds ? 'complete' : 'incomplete'}>
        {medicationList.noMedications ? (
          <p>No medications reported</p>
        ) : (
          <>
            <Field label="Allergies" value={medicationList.medicationAllergies} />
            <p className="text-gray-500 dark:text-slate-400 text-xs">{medicationList.medications.filter(m => m.name).length} medication(s) listed</p>
            {medicationList.medications.filter(m => m.name).map((m, i) => (
              <div key={i} className="ml-3 text-xs">{m.name} - {m.dosage} ({m.frequency})</div>
            ))}
          </>
        )}
      </ReviewSection>

      {/* Home Safety (now step 4) */}
      <ReviewSection title="Home Safety Checklist" stepIndex={STEP.safety} onEdit={onGoToStep} status={hasSafetySignatures ? 'complete' : 'warning'}>
        <p className="text-gray-500 dark:text-slate-400 text-xs">Safety checklist completed</p>
        <Field label="Signing Party" value={homeSafetyChecklist.signerName} />
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-3 h-3 rounded-full ${homeSafetyChecklist.clientSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs">Client signature: {homeSafetyChecklist.clientSignature ? 'Signed' : 'Not signed'}</span>
        </div>
        <Field label="EHC Staff" value={homeSafetyChecklist.ehcStaffName} />
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${homeSafetyChecklist.representativeSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs">EHC Staff signature: {homeSafetyChecklist.representativeSignature ? 'Signed' : 'Not signed'}</span>
        </div>
      </ReviewSection>

      {/* Consent (step 5) */}
      <ReviewSection title="Consent & Signatures" stepIndex={STEP.consent} onEdit={onGoToStep} status={hasConsentSignatures ? 'complete' : 'incomplete'}>
        <Field label="Signing Party" value={consent.signerName} />
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${consent.hipaaSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span>HIPAA Acknowledgment: {consent.hipaaSignature ? 'Signed' : 'Not signed'}</span>
        </div>
      </ReviewSection>

      {/* Export PDF + Email + Submit */}
      <div className="pt-4 space-y-3">
        {emailStatus && (
          <div
            role="status"
            className={`rounded-xl p-3 text-sm font-medium ${
              emailStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
            }`}
          >
            {emailStatus.message}
          </div>
        )}
        <button
          type="button"
          disabled={pdfLoading}
          onClick={async () => {
            setPdfLoading(true);
            try {
              const { buildAssessmentPdf, getAssessmentFilename } = await import('../../utils/pdf/generatePdf');
              const doc = await buildAssessmentPdf(data, branding);
              const filename = getAssessmentFilename(data.clientHelpList.clientName);
              pdfDocRef.current = doc;
              setPreview({ blob: doc.output('blob'), filename });
            } catch (err) {
              logger.error('PDF generation failed:', err);
              alert('PDF generation failed. Please try again.');
            } finally {
              setPdfLoading(false);
            }
          }}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-colors border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white active:opacity-90 dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white dark:active:bg-slate-500 disabled:opacity-50 disabled:cursor-wait"
        >
          {pdfLoading ? 'Generating PDF...' : 'Preview PDF'}
        </button>
        <button
          type="button"
          disabled={pdfLoading || emailSending}
          onClick={async () => {
            setPdfLoading(true);
            try {
              const { buildAssessmentPdf, getAssessmentFilename } = await import('../../utils/pdf/generatePdf');
              const doc = await buildAssessmentPdf(data, branding);
              const filename = getAssessmentFilename(data.clientHelpList.clientName);
              setEmailBlob({ blob: doc.output('blob'), filename });
              setShowEmailCompose(true);
            } catch (err) {
              logger.error('PDF generation failed:', err);
              alert('PDF generation failed. Please try again.');
            } finally {
              setPdfLoading(false);
            }
          }}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-colors border-2 border-amber-500 text-amber-600 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:active:bg-amber-900/50 disabled:opacity-50 disabled:cursor-wait"
        >
          {emailSending ? 'Sending...' : pdfLoading ? 'Generating PDF...' : 'Email PDF'}
        </button>
        <button
          type="button"
          disabled={incomplete.length > 0 || submitting}
          aria-disabled={incomplete.length > 0 || submitting || undefined}
          onClick={async () => {
            if (incomplete.length > 0 || submitting) return;
            if (onSubmit) {
              setSubmitting(true);
              try {
                await onSubmit();
              } catch (err) {
                logger.error('Submit failed:', err);
                alert('Failed to submit assessment. Please try again.');
              } finally {
                setSubmitting(false);
              }
            }
          }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            incomplete.length > 0 || submitting
              ? 'bg-gray-300 text-gray-500 dark:bg-slate-600 dark:text-slate-400 cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Assessment'}
        </button>
        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Preview PDF generates a downloadable copy. Data is automatically synced to the cloud.
        </p>
        {onContinueToContract && (
          <button
            type="button"
            onClick={onContinueToContract}
            className="w-full py-3 mt-2 rounded-xl font-semibold text-sm transition-colors border-2 border-amber-500 text-amber-600 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:active:bg-amber-900/50"
          >
            Continue to Service Contract &rarr;
          </button>
        )}
      </div>

      {preview && (
        <PdfPreviewModal
          pdfBlob={preview.blob}
          filename={preview.filename}
          onDownload={() => {
            pdfDocRef.current?.save(preview.filename);
          }}
          onClose={() => {
            setPreview(null);
            pdfDocRef.current = null;
          }}
        />
      )}

      {showEmailCompose && emailBlob && (() => {
        const templateVars = {
          clientName: clientHelpList.clientName || 'Client',
          date: new Date().toLocaleDateString(),
          staffName: clientHistory.ehcStaffName || '',
        };
        return (
        <EmailComposeModal
          defaultSubject={resolveTemplate(emailConfig.assessmentSubjectTemplate, templateVars)}
          defaultBody={resolveEmailBody(emailConfig.assessmentBodyTemplate, templateVars, emailConfig.emailSignature)}
          defaultCc={emailConfig.defaultCc}
          sending={emailSending}
          onSend={async (composeData) => {
            setEmailSending(true);
            try {
              const { sendPdfEmail } = await import('../../utils/emailApi');
              const result = await sendPdfEmail(
                {
                  to: composeData.to,
                  cc: composeData.cc || undefined,
                  subject: composeData.subject,
                  body: composeData.body,
                  htmlEnabled: emailConfig.htmlEnabled,
                  pdfBlob: emailBlob.blob,
                  filename: emailBlob.filename,
                },
                { documentType: 'Assessment' },
              );
              if (result.ok) {
                setShowEmailCompose(false);
                setEmailBlob(null);
                setEmailStatus({ message: `PDF emailed successfully to ${composeData.to}`, type: 'success' });
              } else {
                setEmailStatus({ message: `Failed to send email: ${result.error}`, type: 'error' });
              }
            } catch {
              setEmailStatus({ message: 'Failed to send email. Please try again.', type: 'error' });
            } finally {
              setEmailSending(false);
            }
          }}
          onClose={() => {
            setShowEmailCompose(false);
            setEmailBlob(null);
          }}
        />
        );
      })()}
    </div>
  );
}
