import type { jsPDF } from 'jspdf';
import type { TransportationRequestData } from '../../../types/serviceContract';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, checkPageBreak } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

const VEHICLE_LABELS: Record<string, string> = {
  clientVehicle: "Client's Vehicle",
  caregiverVehicle: "Caregiver's Vehicle",
};

export function renderTransportation(doc: jsPDF, data: TransportationRequestData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '4. Transportation Request', y);

  if (data.consumerName) {
    y = renderField(doc, 'Consumer Name', data.consumerName, y);
    y += 2;
  }

  // --- Declined ---
  if (data.declined) {
    y = checkPageBreak(doc, y, 12);
    y = renderField(doc, 'Status', 'Transportation Services Declined', y);
    if (data.date) y = renderField(doc, 'Date', data.date, y);
    return y + 4;
  }

  // --- Vehicle Choice ---
  y = checkPageBreak(doc, y, 12);
  y = renderField(doc, 'Vehicle Choice', VEHICLE_LABELS[data.vehicleChoice] || '—', y);
  y += 2;

  // --- Employee Names ---
  y = checkPageBreak(doc, y, 8);
  y = renderField(doc, 'Employee Name(s)', data.employeeNames || '—', y);
  y += 3;

  // --- Indemnification ---
  y = checkPageBreak(doc, y, 20);
  y = renderSubsectionTitle(doc, 'Indemnification', y);

  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);
  const indText = 'The undersigned agrees to indemnify and hold harmless Executive Home Care from any and all claims, damages, and expenses arising out of transportation services provided.';
  const indLines = doc.splitTextToSize(indText, CONTENT_WIDTH - 6);
  doc.text(indLines, PDF_MARGIN.left + 4, y);
  y += indLines.length * 3.2 + 4;

  // --- Client Signature ---
  y = checkPageBreak(doc, y, 30);

  if (data.clientRelationship) y = renderField(doc, 'Relationship', data.clientRelationship, y);

  if (data.clientSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.clientSignature, 'Client Signature', data.clientSignatureMeta?.timestamp || '', y);
  }

  // --- EHC Rep Signature ---
  y = checkPageBreak(doc, y, 30);

  if (data.ehcRepName) y = renderField(doc, 'EHC Representative', data.ehcRepName, y);
  if (data.ehcRepTitle) y = renderField(doc, 'Title', data.ehcRepTitle, y);
  if (data.date) y = renderField(doc, 'Date', data.date, y);

  if (data.ehcRepSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.ehcRepSignature, 'EHC Representative Signature', data.ehcRepSignatureMeta?.timestamp || '', y);
  }

  return y + 6;
}
