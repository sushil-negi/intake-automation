import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { AssessmentFormData } from '../../types/forms';
import type { BrandingConfig } from '../../types/branding';
import { HEADER_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT } from './pdfStyles';
import { prefetchLogo, stampHeaderOnCurrentPage, renderPageFooter } from './sections/pdfHeader';
import { renderClientHelpList } from './sections/pdfClientHelpList';
import { renderClientHistory } from './sections/pdfClientHistory';
import { renderClientAssessment } from './sections/pdfClientAssessment';
import { renderMedicationList } from './sections/pdfMedicationList';
import { renderHomeSafety } from './sections/pdfHomeSafety';
import { renderConsent } from './sections/pdfConsent';
import { renderStaffNotes } from './sections/pdfStaffNotes';

/** Check whether all required sections of the assessment are filled in */
export function isAssessmentComplete(data: AssessmentFormData): boolean {
  const { clientHelpList, clientHistory, clientAssessment, medicationList, homeSafetyChecklist, consent } = data;

  const hasClientInfo = !!clientHelpList.clientName && !!clientHelpList.dateOfBirth;
  const hasHistory = !!clientHistory.assessmentReason;
  const hasAssessment = [
    ...clientAssessment.bathing, ...clientAssessment.dressing, ...clientAssessment.hairCare,
    ...clientAssessment.teethAndGums, ...clientAssessment.shaving, ...clientAssessment.mobility,
    ...clientAssessment.falls, ...clientAssessment.mobilityAids, ...clientAssessment.nutritionHydration,
    ...clientAssessment.toileting, ...clientAssessment.medicationReminder,
    ...clientAssessment.housekeeping, ...clientAssessment.transportation,
  ].length > 0;
  const hasMeds = medicationList.noMedications || medicationList.medications.some(m => m.name);
  const hasSafetySignatures = !!homeSafetyChecklist.clientSignature && !!homeSafetyChecklist.representativeSignature;
  const hasConsentSignature = !!consent.hipaaSignature;

  return hasClientInfo && hasHistory && hasAssessment && hasMeds && hasSafetySignatures && hasConsentSignature;
}

/** Stamp a diagonal "DRAFT" watermark on the current page */
function stampDraftWatermark(doc: jsPDF): void {
  doc.saveGraphicsState();
  // Semi-transparent light gray text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.setGState(new (doc.GState as any)({ opacity: 0.08 }));
  doc.setFontSize(90);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 0, 0); // red tint (but very transparent)

  // Rotate and center the text
  const cx = PAGE_WIDTH / 2;
  const cy = PAGE_HEIGHT / 2;
  doc.text('DRAFT', cx, cy, {
    align: 'center',
    angle: 45,
  });
  doc.restoreGraphicsState();
}

/** Build the assessment PDF document and return it (without saving). */
export async function buildAssessmentPdf(
  data: AssessmentFormData,
  branding?: BrandingConfig | null,
): Promise<jsPDF> {
  await prefetchLogo(branding);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const clientName = data.clientHelpList.clientName || 'Unknown';
  const age = data.clientHistory.age || '';
  const address = data.clientHelpList.clientAddress || '';
  const date = data.clientHelpList.date || '';

  // Each major section starts on its own page for cleaner layout.
  renderClientHelpList(doc, data.clientHelpList, HEADER_HEIGHT);
  doc.addPage();
  renderClientHistory(doc, data.clientHistory, HEADER_HEIGHT);
  doc.addPage();
  renderClientAssessment(doc, data.clientAssessment, HEADER_HEIGHT);
  doc.addPage();
  renderMedicationList(doc, data.medicationList, HEADER_HEIGHT);
  doc.addPage();
  renderHomeSafety(doc, data.homeSafetyChecklist, HEADER_HEIGHT);
  doc.addPage();
  renderConsent(doc, data.consent, HEADER_HEIGHT);

  // Staff Notes appendix (only added if any notes exist)
  const hasStaffNotes = Object.values(data.staffNotes).some(v => v.trim());
  if (hasStaffNotes) {
    doc.addPage();
    renderStaffNotes(doc, data.staffNotes, HEADER_HEIGHT);
  }

  // Stamp headers + footers + optional DRAFT watermark on ALL pages retroactively
  const isDraft = !isAssessmentComplete(data);
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    stampHeaderOnCurrentPage(doc, clientName, age, address, date, 'Client Intake Assessment', branding);
    renderPageFooter(doc, i, totalPages, branding);
    if (isDraft) {
      stampDraftWatermark(doc);
    }
  }

  return doc;
}

/** Get the suggested filename for an assessment PDF. */
export function getAssessmentFilename(clientName: string): string {
  const safeName = (clientName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const dateStr = new Date().toLocaleDateString('en-CA');
  return `EHC_Assessment_${safeName}_${dateStr}.pdf`;
}

/** Build and immediately save the assessment PDF (backward-compat wrapper). */
export async function generatePdf(data: AssessmentFormData): Promise<void> {
  const doc = await buildAssessmentPdf(data);
  doc.save(getAssessmentFilename(data.clientHelpList.clientName));
}
