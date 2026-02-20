import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { ServiceContractFormData } from '../../types/serviceContract';
import type { BrandingConfig } from '../../types/branding';
import { HEADER_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT } from './pdfStyles';
import { prefetchLogo, stampHeaderOnCurrentPage, renderPageFooter } from './sections/pdfHeader';
import { renderServiceAgreement } from './sections/pdfServiceAgreement';
import { renderServiceAgreementTerms } from './sections/pdfServiceAgreementTerms';
import { renderConsumerRights } from './sections/pdfConsumerRights';
import { renderDirectCareWorker } from './sections/pdfDirectCareWorker';
import { renderTransportation } from './sections/pdfTransportation';
import { renderCustomerPacket } from './sections/pdfCustomerPacket';

/** Check whether all required sections of the service contract are filled in */
export function isContractComplete(data: ServiceContractFormData): boolean {
  const { serviceAgreement, termsConditions, consumerRights } = data;

  const hasCustomerName =
    !!serviceAgreement.customerInfo.firstName && !!serviceAgreement.customerInfo.lastName;
  const hasClientSignature = !!serviceAgreement.clientSignature;
  const hasTermsInitials =
    !!termsConditions.nonSolicitationInitial &&
    !!termsConditions.termsOfPaymentInitial &&
    !!termsConditions.cardSurchargeInitial &&
    !!termsConditions.terminationInitial &&
    !!termsConditions.authorizationConsentInitial &&
    !!termsConditions.relatedDocumentsInitial;
  const hasAcknowledgeSignature = !!consumerRights.acknowledgeSignature;

  return hasCustomerName && hasClientSignature && hasTermsInitials && hasAcknowledgeSignature;
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

/** Build the contract PDF document and return it (without saving). */
export async function buildContractPdf(
  data: ServiceContractFormData,
  branding?: BrandingConfig | null,
): Promise<jsPDF> {
  await prefetchLogo(branding);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const { customerInfo } = data.serviceAgreement;
  const customerName =
    `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Unknown';
  const address = customerInfo.address || '';
  const date = data.serviceAgreement.date || '';

  // Compute age from date of birth
  let age = '';
  if (customerInfo.dateOfBirth) {
    const dob = new Date(customerInfo.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        years--;
      }
      if (years >= 0) age = String(years);
    }
  }

  // Each major section starts on its own page
  renderServiceAgreement(doc, data.serviceAgreement, HEADER_HEIGHT);
  doc.addPage();
  renderServiceAgreementTerms(doc, data.termsConditions, HEADER_HEIGHT);
  doc.addPage();
  renderConsumerRights(doc, data.consumerRights, HEADER_HEIGHT);
  doc.addPage();
  renderDirectCareWorker(doc, data.directCareWorker, HEADER_HEIGHT);
  doc.addPage();
  renderTransportation(doc, data.transportationRequest, HEADER_HEIGHT);
  doc.addPage();
  renderCustomerPacket(doc, data.customerPacket, HEADER_HEIGHT);

  // Stamp headers + footers + optional DRAFT watermark on ALL pages retroactively
  const isDraft = !isContractComplete(data);
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    stampHeaderOnCurrentPage(doc, customerName, age, address, date, 'Service Contract', branding);
    renderPageFooter(doc, i, totalPages, branding);
    if (isDraft) {
      stampDraftWatermark(doc);
    }
  }

  return doc;
}

/** Get the suggested filename for a contract PDF. */
export function getContractFilename(customerName: string): string {
  const safeName = (customerName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const dateStr = new Date().toLocaleDateString('en-CA');
  return `EHC_ServiceContract_${safeName}_${dateStr}.pdf`;
}

/** Build and immediately save the contract PDF (backward-compat wrapper). */
export async function generateContractPdf(data: ServiceContractFormData): Promise<void> {
  const doc = await buildContractPdf(data);
  const { customerInfo } = data.serviceAgreement;
  const customerName =
    `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Unknown';
  doc.save(getContractFilename(customerName));
}
