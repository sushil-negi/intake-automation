import type { jsPDF } from 'jspdf';
import type { CustomerPacketData } from '../../../types/serviceContract';
import type { ConsentCheckbox } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, checkPageBreak, CHECKBOX_CHECKED, CHECKBOX_UNCHECKED, SIGNATURE_META_FONT } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

export function renderCustomerPacket(doc: jsPDF, data: CustomerPacketData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '5. Customer Packet Acknowledgment', y);

  if (data.consumerName) {
    y = renderField(doc, 'Consumer Name', data.consumerName, y);
    y += 2;
  }

  // --- Acknowledgments ---
  y = checkPageBreak(doc, y, 30);
  y = renderSubsectionTitle(doc, 'Documents Received', y);

  const acknowledgments: { cb: ConsentCheckbox | undefined; label: string }[] = [
    { cb: data.acknowledgeHipaa, label: 'HIPAA Notice of Privacy Practices' },
    { cb: data.acknowledgeHiringStandards, label: 'Hiring Standards' },
    { cb: data.acknowledgeCaregiverIntro, label: 'Caregiver Identification & Introduction' },
    { cb: data.acknowledgeComplaintProcedures, label: 'Complaint Form & Instructions' },
    { cb: data.acknowledgeSatisfactionSurvey, label: 'Consumer Satisfaction Survey' },
  ];

  for (const ack of acknowledgments) {
    y = checkPageBreak(doc, y, 8);
    const checked = ack.cb?.checked ?? false;
    const mark = checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`${mark}  ${ack.label}`, PDF_MARGIN.left + 4, y);
    y += 3.5;
    if (checked && ack.cb?.timestamp) {
      const ts = new Date(ack.cb.timestamp).toLocaleString();
      doc.setFontSize(SIGNATURE_META_FONT);
      doc.setTextColor(...PDF_COLORS.label);
      doc.text(`Acknowledged: ${ts}`, PDF_MARGIN.left + 10, y);
      y += 3;
    }
    y += 1.5;
  }

  y += 2;

  // --- Acknowledgment Signature ---
  y = checkPageBreak(doc, y, 30);

  if (data.acknowledgeDate) y = renderField(doc, 'Date', data.acknowledgeDate, y);

  if (data.acknowledgeSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.acknowledgeSignature, 'Acknowledgment Signature', data.acknowledgeSignatureMeta?.timestamp || '', y);
  }

  return y + 6;
}
