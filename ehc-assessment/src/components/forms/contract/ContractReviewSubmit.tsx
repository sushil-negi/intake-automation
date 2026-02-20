import { useState, useRef, useEffect } from 'react';
import { SectionHeader } from '../../ui/FormFields';
import { PdfPreviewModal } from '../../ui/PdfPreviewModal';
import { EmailComposeModal } from '../../ui/EmailComposeModal';
import { logger } from '../../../utils/logger';
import { getEmailConfig } from '../../../utils/db';
import { resolveTemplate, resolveEmailBody } from '../../../utils/emailTemplates';
import type { EmailConfig } from '../../../types/emailConfig';
import { DEFAULT_EMAIL_CONFIG } from '../../../types/emailConfig';
import type { ServiceContractFormData } from '../../../types/serviceContract';
import type { jsPDF } from 'jspdf';
import { useBranding } from '../../../contexts/BrandingContext';

interface Props {
  data: ServiceContractFormData;
  onGoToStep: (step: number) => void;
  linkedAssessmentId?: string;
  onSubmit?: () => Promise<void>;
}

// Step indices for the contract wizard
const STEP = {
  agreement: 0,
  terms: 1,
  rights: 2,
  dcwNotice: 3,
  transportation: 4,
  packet: 5,
};

function ReviewSection({
  title,
  stepIndex,
  status,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  status?: 'complete' | 'incomplete' | 'warning';
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  const borderColor =
    status === 'incomplete'
      ? 'border-red-200 dark:border-red-800'
      : status === 'warning'
      ? 'border-yellow-200 dark:border-yellow-800'
      : 'border-gray-200 dark:border-slate-700';
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${borderColor} overflow-hidden`}>
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${borderColor} ${
          status === 'incomplete'
            ? 'bg-red-50 dark:bg-red-900/30'
            : status === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/30'
            : 'bg-gray-50 dark:bg-slate-700/50'
        }`}
      >
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
      <div className="px-4 py-3 space-y-1 text-sm text-gray-700 dark:text-slate-300">{children}</div>
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

function SignatureStatus({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${signed ? 'bg-green-500' : 'bg-red-400'}`} />
      <span className="text-xs">
        {label}: {signed ? 'Signed' : 'Not signed'}
      </span>
    </div>
  );
}

export function ContractReviewSubmit({ data, onGoToStep, linkedAssessmentId, onSubmit }: Props) {
  const branding = useBranding();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; filename: string } | null>(null);
  const pdfDocRef = useRef<jsPDF | null>(null);
  const [assessmentPdfLoading, setAssessmentPdfLoading] = useState(false);
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
  const { serviceAgreement, termsConditions, consumerRights, directCareWorker, transportationRequest, customerPacket } = data;

  // Build customer full name
  const customerName = [serviceAgreement.customerInfo.firstName, serviceAgreement.customerInfo.lastName]
    .filter(Boolean)
    .join(' ');
  const customerAddress = serviceAgreement.customerInfo.address;

  // Services selected
  const servicesLabels: string[] = [];
  if (serviceAgreement.services.selfAdminMeds) servicesLabels.push('Self-Admin Meds');
  if (serviceAgreement.services.personalCare) servicesLabels.push('Personal Care');
  if (serviceAgreement.services.homemaking) servicesLabels.push('Homemaking');
  if (serviceAgreement.services.transportation) servicesLabels.push('Transportation');
  if (serviceAgreement.services.companionship) servicesLabels.push('Companionship');
  if (serviceAgreement.services.respiteCare) servicesLabels.push('Respite Care');
  if (serviceAgreement.services.otherNonSkilled) servicesLabels.push(serviceAgreement.services.otherNonSkilledText || 'Other');

  // Level of service
  const levelLabels: string[] = [];
  if (serviceAgreement.levelOfService.cna) levelLabels.push('CNA');
  if (serviceAgreement.levelOfService.chha) levelLabels.push('CHHA');
  if (serviceAgreement.levelOfService.other) levelLabels.push(serviceAgreement.levelOfService.otherText || 'Other');

  // Payment method
  const paymentLabels: string[] = [];
  if (serviceAgreement.methodOfPayment.check) paymentLabels.push('Check');
  if (serviceAgreement.methodOfPayment.creditCard) paymentLabels.push('Credit Card');
  if (serviceAgreement.methodOfPayment.achEft) paymentLabels.push('ACH/EFT');
  if (serviceAgreement.methodOfPayment.longTermCareInsurance) paymentLabels.push('Long-Term Care Insurance');

  // Schedule days
  const freq = serviceAgreement.frequency;
  const scheduleDays: string[] = [];
  if (freq.monday) scheduleDays.push('Mon');
  if (freq.tuesday) scheduleDays.push('Tue');
  if (freq.wednesday) scheduleDays.push('Wed');
  if (freq.thursday) scheduleDays.push('Thu');
  if (freq.friday) scheduleDays.push('Fri');
  if (freq.saturday) scheduleDays.push('Sat');
  if (freq.sunday) scheduleDays.push('Sun');
  if (freq.orAsRequested) scheduleDays.push('As Requested');

  // Completion checks
  const hasAgreement = !!customerName && !!serviceAgreement.clientSignature;
  const hasTerms =
    !!termsConditions.nonSolicitationInitial &&
    !!termsConditions.termsOfPaymentInitial &&
    !!termsConditions.cardSurchargeInitial &&
    !!termsConditions.terminationInitial &&
    !!termsConditions.authorizationConsentInitial &&
    !!termsConditions.relatedDocumentsInitial;
  const hasRights = !!consumerRights.acknowledgeSignature;
  const hasDcw =
    !!directCareWorker.employeeOfEhcInitial &&
    !!directCareWorker.liabilityInsuranceInitial &&
    !!directCareWorker.consumerSignature;
  const hasTransportation = transportationRequest.declined || (!!transportationRequest.vehicleChoice && !!transportationRequest.clientSignature);
  const hasPacket =
    customerPacket.acknowledgeHipaa?.checked &&
    customerPacket.acknowledgeHiringStandards?.checked &&
    customerPacket.acknowledgeCaregiverIntro?.checked &&
    customerPacket.acknowledgeComplaintProcedures?.checked &&
    customerPacket.acknowledgeSatisfactionSurvey?.checked &&
    !!customerPacket.acknowledgeSignature;

  const incomplete: { label: string; step: number }[] = [];
  if (!hasAgreement) incomplete.push({ label: 'Service Agreement', step: STEP.agreement });
  if (!hasTerms) incomplete.push({ label: 'Terms & Conditions', step: STEP.terms });
  if (!hasRights) incomplete.push({ label: 'Consumer Rights', step: STEP.rights });
  if (!hasDcw) incomplete.push({ label: 'Direct Care Worker Notice', step: STEP.dcwNotice });
  if (!hasTransportation) incomplete.push({ label: 'Transportation Request', step: STEP.transportation });
  if (!hasPacket) incomplete.push({ label: 'Customer Packet', step: STEP.packet });

  return (
    <div className="space-y-4 pt-4">
      {incomplete.length > 0 ? (
        <div className="rounded-xl p-4 text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
          <p className="font-medium mb-2">The following sections need attention:</p>
          <ul className="space-y-1">
            {incomplete.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <button
                  type="button"
                  onClick={() => onGoToStep(item.step)}
                  className="text-amber-700 underline hover:text-amber-800"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl p-4 text-sm bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
          All contract sections complete. Review the information below.
        </div>
      )}

      <SectionHeader title="Contract Review" subtitle="Click Edit on any section to make changes" />

      {/* Section 0: Service Agreement */}
      <ReviewSection
        title="Service Agreement"
        stepIndex={STEP.agreement}
        onEdit={onGoToStep}
        status={hasAgreement ? 'complete' : 'incomplete'}
      >
        <Field label="Customer" value={customerName} />
        <Field label="Address" value={customerAddress} />
        <Field label="Phone" value={serviceAgreement.customerInfo.phone} />
        <Field label="Date of Birth" value={serviceAgreement.customerInfo.dateOfBirth} />
        <Field label="Start of Care" value={serviceAgreement.customerInfo.startOfCareDate} />
        <Field label="Level of Service" value={levelLabels.join(', ') || undefined} />
        <Field label="Payment Method" value={paymentLabels.join(', ') || undefined} />
        <Field label="Services" value={servicesLabels.join(', ') || undefined} />
        {scheduleDays.length > 0 && (
          <div className="mt-1">
            <span className="text-gray-500 dark:text-slate-400">Schedule:</span>
            <span className="ml-1">{scheduleDays.join(', ')}</span>
            {freq.startTime && (
              <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">
                {freq.startTime} {freq.startAmPm} - {freq.endTime} {freq.endAmPm}
              </span>
            )}
          </div>
        )}
        <SignatureStatus
          label={serviceAgreement.signerIsRepresentative ? 'Authorized Rep signature' : 'Client signature'}
          signed={!!serviceAgreement.clientSignature}
        />
        <SignatureStatus label="EHC Rep signature" signed={!!serviceAgreement.ehcRepSignature} />
      </ReviewSection>

      {/* Section 1: Terms & Conditions */}
      <ReviewSection
        title="Terms & Conditions"
        stepIndex={STEP.terms}
        onEdit={onGoToStep}
        status={hasTerms ? 'complete' : 'incomplete'}
      >
        <div className="space-y-1">
          {[
            { label: 'Non-Solicitation', initialed: termsConditions.nonSolicitationInitial },
            { label: 'Terms of Payment', initialed: termsConditions.termsOfPaymentInitial },
            { label: 'Card Surcharge', initialed: termsConditions.cardSurchargeInitial },
            { label: 'Termination', initialed: termsConditions.terminationInitial },
            { label: 'Authorization & Consent', initialed: termsConditions.authorizationConsentInitial },
            { label: 'Related Documents', initialed: termsConditions.relatedDocumentsInitial },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${item.initialed ? 'bg-green-500' : 'bg-red-400'}`}
              />
              <span className="text-xs">
                {item.label}: {item.initialed || 'Not initialed'}
              </span>
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Section 2: Consumer Rights */}
      <ReviewSection
        title="Consumer Rights & Responsibilities"
        stepIndex={STEP.rights}
        onEdit={onGoToStep}
        status={hasRights ? 'complete' : 'incomplete'}
      >
        <p className="text-gray-500 dark:text-slate-400 text-xs">Consumer Rights acknowledged</p>
        <SignatureStatus label="Acknowledgment signature" signed={!!consumerRights.acknowledgeSignature} />
        <Field label="Date" value={consumerRights.acknowledgeDate} />
        <Field label="Relationship" value={consumerRights.responsiblePartyRelationship} />
      </ReviewSection>

      {/* Section 3: Direct Care Worker Notice */}
      <ReviewSection
        title="Direct Care Worker Notice"
        stepIndex={STEP.dcwNotice}
        onEdit={onGoToStep}
        status={hasDcw ? 'complete' : 'warning'}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                directCareWorker.employeeOfEhcInitial ? 'bg-green-500' : 'bg-red-400'
              }`}
            />
            <span className="text-xs">
              Employee of EHC: {directCareWorker.employeeOfEhcInitial || 'Not initialed'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Registry Info: N/A
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                directCareWorker.liabilityInsuranceInitial ? 'bg-green-500' : 'bg-red-400'
              }`}
            />
            <span className="text-xs">
              Liability Insurance: {directCareWorker.liabilityInsuranceInitial || 'Not initialed'}
            </span>
          </div>
        </div>
        <SignatureStatus label="Consumer signature" signed={!!directCareWorker.consumerSignature} />
        <SignatureStatus label="Agency Rep signature" signed={!!directCareWorker.agencyRepSignature} />
      </ReviewSection>

      {/* Section 4: Transportation */}
      <ReviewSection
        title="Transportation Request"
        stepIndex={STEP.transportation}
        onEdit={onGoToStep}
        status={hasTransportation ? 'complete' : 'warning'}
      >
        {transportationRequest.declined ? (
          <p className="text-gray-500 dark:text-slate-400 text-xs italic">Transportation services declined</p>
        ) : (
          <>
            <Field
              label="Vehicle Choice"
              value={
                transportationRequest.vehicleChoice === 'clientVehicle'
                  ? 'Client provides vehicle'
                  : transportationRequest.vehicleChoice === 'caregiverVehicle'
                  ? "Caregiver's vehicle (IRS mileage rate)"
                  : undefined
              }
            />
            <Field label="Employee(s)" value={transportationRequest.employeeNames} />
            <SignatureStatus label="Client signature" signed={!!transportationRequest.clientSignature} />
            <SignatureStatus label="EHC Rep signature" signed={!!transportationRequest.ehcRepSignature} />
          </>
        )}
      </ReviewSection>

      {/* Section 5: Customer Packet */}
      <ReviewSection
        title="Customer Packet Acknowledgment"
        stepIndex={STEP.packet}
        onEdit={onGoToStep}
        status={hasPacket ? 'complete' : 'incomplete'}
      >
        <div className="space-y-1">
          {[
            { label: 'HIPAA Notice', checked: customerPacket.acknowledgeHipaa?.checked },
            { label: 'Hiring Standards', checked: customerPacket.acknowledgeHiringStandards?.checked },
            { label: 'Caregiver Intro', checked: customerPacket.acknowledgeCaregiverIntro?.checked },
            { label: 'Complaint Procedures', checked: customerPacket.acknowledgeComplaintProcedures?.checked },
            { label: 'Satisfaction Survey', checked: customerPacket.acknowledgeSatisfactionSurvey?.checked },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${item.checked ? 'bg-green-500' : 'bg-red-400'}`}
              />
              <span className="text-xs">
                {item.label}: {item.checked ? 'Acknowledged' : 'Not acknowledged'}
              </span>
            </div>
          ))}
        </div>
        <SignatureStatus label="Acknowledgment signature" signed={!!customerPacket.acknowledgeSignature} />
        <Field label="Date" value={customerPacket.acknowledgeDate} />
      </ReviewSection>

      {/* Export PDF + Email */}
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
              const { buildContractPdf, getContractFilename } = await import('../../../utils/pdf/generateContractPdf');
              const doc = await buildContractPdf(data, branding);
              const name = [serviceAgreement.customerInfo.firstName, serviceAgreement.customerInfo.lastName].filter(Boolean).join(' ') || 'Unknown';
              const filename = getContractFilename(name);
              pdfDocRef.current = doc;
              setPreview({ blob: doc.output('blob'), filename });
            } catch (err) {
              logger.error('Contract PDF generation failed:', err);
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
              const { buildContractPdf, getContractFilename } = await import('../../../utils/pdf/generateContractPdf');
              const doc = await buildContractPdf(data, branding);
              const name = [serviceAgreement.customerInfo.firstName, serviceAgreement.customerInfo.lastName].filter(Boolean).join(' ') || 'Unknown';
              const filename = getContractFilename(name);
              setEmailBlob({ blob: doc.output('blob'), filename });
              setShowEmailCompose(true);
            } catch (err) {
              logger.error('Contract PDF generation failed:', err);
              alert('PDF generation failed. Please try again.');
            } finally {
              setPdfLoading(false);
            }
          }}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-colors border-2 border-amber-500 text-amber-600 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:active:bg-amber-900/50 disabled:opacity-50 disabled:cursor-wait"
        >
          {emailSending ? 'Sending...' : pdfLoading ? 'Generating PDF...' : 'Email PDF'}
        </button>
        {linkedAssessmentId && (
          <button
            type="button"
            disabled={assessmentPdfLoading}
            onClick={async () => {
              setAssessmentPdfLoading(true);
              try {
                const { getDraft } = await import('../../../utils/db');
                const draft = await getDraft(linkedAssessmentId);
                if (!draft) {
                  alert('Linked assessment not found. It may have been deleted.');
                  return;
                }
                const { buildAssessmentPdf, getAssessmentFilename } = await import('../../../utils/pdf/generatePdf');
                const assessmentData = draft.data as import('../../../types/forms').AssessmentFormData;
                const doc = await buildAssessmentPdf(assessmentData, branding);
                const filename = getAssessmentFilename(assessmentData.clientHelpList.clientName);
                pdfDocRef.current = doc;
                setPreview({ blob: doc.output('blob'), filename });
              } catch (err) {
                logger.error('Assessment PDF generation failed:', err);
                alert('Assessment PDF generation failed. Please try again.');
              } finally {
                setAssessmentPdfLoading(false);
              }
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors border-2 border-amber-500 text-amber-600 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:active:bg-amber-900/50 disabled:opacity-50 disabled:cursor-wait"
          >
            {assessmentPdfLoading ? 'Loading Assessment...' : 'View Linked Assessment PDF'}
          </button>
        )}
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
                alert('Failed to submit contract. Please try again.');
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
          {submitting ? 'Submitting...' : 'Submit Contract'}
        </button>
        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Preview PDF generates a downloadable copy. Data is automatically synced to the cloud.
        </p>
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
          clientName: customerName || 'Customer',
          date: new Date().toLocaleDateString(),
          staffName: serviceAgreement.ehcRepName || '',
        };
        return (
        <EmailComposeModal
          defaultSubject={resolveTemplate(emailConfig.contractSubjectTemplate, templateVars)}
          defaultBody={resolveEmailBody(emailConfig.contractBodyTemplate, templateVars, emailConfig.emailSignature)}
          defaultCc={emailConfig.defaultCc}
          sending={emailSending}
          onSend={async (composeData) => {
            setEmailSending(true);
            try {
              const { sendPdfEmail } = await import('../../../utils/emailApi');
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
                { documentType: 'Service Contract' },
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
