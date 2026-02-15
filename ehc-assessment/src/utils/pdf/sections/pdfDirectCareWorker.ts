import type { jsPDF } from 'jspdf';
import type { DirectCareWorkerData } from '../../../types/serviceContract';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, checkPageBreak } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

export function renderDirectCareWorker(doc: jsPDF, data: DirectCareWorkerData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '3. Direct Care Worker Notice', y);

  if (data.consumerName) {
    y = renderField(doc, 'Consumer Name', data.consumerName, y);
    y += 2;
  }

  // --- Employee Status ---
  y = checkPageBreak(doc, y, 22);
  y = renderSubsectionTitle(doc, 'Employee Status', y);

  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);
  const empText = 'The direct care worker assigned to you is an employee of Executive Home Care, not an independent contractor.';
  const empLines = doc.splitTextToSize(empText, CONTENT_WIDTH - 6);
  doc.text(empLines, PDF_MARGIN.left + 4, y);
  y += empLines.length * 3.2 + 3;

  y = renderField(doc, 'Initials', data.employeeOfEhcInitial || '—', y);
  y += 3;

  // --- Registry Information (N/A — all caregivers are EHC employees) ---
  y = checkPageBreak(doc, y, 10);
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.label);
  doc.setFont('helvetica', 'italic');
  doc.text('Registry Information: Not Applicable — all caregivers are employees of Executive Home Care.', PDF_MARGIN.left + 4, y);
  doc.setFont('helvetica', 'normal');
  y += 5;

  // --- Liability Insurance ---
  y = checkPageBreak(doc, y, 22);
  y = renderSubsectionTitle(doc, 'Liability Insurance', y);

  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);
  const liaText = 'The agency maintains liability insurance covering acts of its direct care workers.';
  const liaLines = doc.splitTextToSize(liaText, CONTENT_WIDTH - 6);
  doc.text(liaLines, PDF_MARGIN.left + 4, y);
  y += liaLines.length * 3.2 + 3;

  y = renderField(doc, 'Initials', data.liabilityInsuranceInitial || '—', y);
  y += 3;

  // --- Signatures ---
  y = checkPageBreak(doc, y, 45);

  if (data.date) y = renderField(doc, 'Date', data.date, y);

  // Consumer signature
  if (data.consumerSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.consumerSignature, 'Consumer Signature', data.consumerSignatureMeta?.timestamp || '', y);
  }

  // Agency Rep signature
  y = checkPageBreak(doc, y, 25);
  if (data.agencyRepSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.agencyRepSignature, 'Agency Representative Signature', data.agencyRepSignatureMeta?.timestamp || '', y);
  }

  return y + 6;
}
