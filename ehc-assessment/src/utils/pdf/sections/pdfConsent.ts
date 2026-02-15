import type { jsPDF } from 'jspdf';
import type { ConsentData } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, checkPageBreak, drawContentBoxFill, drawContentBoxBorder, CONTENT_BOX_RADIUS, CONTENT_BOX_BORDER_WIDTH, CHECKBOX_CHECKED, CHECKBOX_UNCHECKED, SIGNATURE_META_FONT } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

const HIPAA_TEXT = [
  'I have received a copy of the EHC Notice of Privacy Practices (HIPAA Notice).',
  '',
  'I consent to the use and disclosure of my protected health information by EHC for the purpose of providing services to me, obtaining payment for my home services bills, and/or to conduct business operations.',
  '',
  'I understand that I have a right to request a restriction as to how my protected health information is used or disclosed to carry out services, payment or business operations of EHC. EHC is not required to agree to the restrictions that I may request. However, if EHC agrees to a restriction that I request, the restriction is binding.',
  '',
  'I have the right to revoke this consent, in writing, at any time, except to the extent that EHC has taken action in reliance on this consent.',
];

export function renderConsent(doc: jsPDF, data: ConsentData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '6. Receipt of Notice of Privacy Practices (HIPAA)', y);

  // HIPAA text block
  y = checkPageBreak(doc, y, 40);
  doc.setFillColor(249, 250, 251); // gray-50
  const textBlockX = PDF_MARGIN.left + 2;
  const textBlockW = CONTENT_WIDTH - 4;

  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);

  let textY = y + 3;
  for (const paragraph of HIPAA_TEXT) {
    if (paragraph === '') {
      textY += 2;
      continue;
    }
    const lines = doc.splitTextToSize(paragraph, textBlockW - 4);
    textY = checkPageBreak(doc, textY, lines.length * 3 + 2);
    doc.text(lines, textBlockX + 2, textY);
    textY += lines.length * 3;
  }

  // Draw background box
  const boxHeight = textY - y + 3;
  // We need to re-draw since text was already placed; use a subtle border instead
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(CONTENT_BOX_BORDER_WIDTH);
  doc.roundedRect(PDF_MARGIN.left, y, CONTENT_WIDTH, boxHeight, CONTENT_BOX_RADIUS, CONTENT_BOX_RADIUS, 'S');

  y = textY + 5;

  // Consent acknowledgments
  const consentItems: { key: keyof typeof data; label: string }[] = [
    { key: 'consentTreatment', label: 'Consent to receive home care services' },
    { key: 'consentInfoSharing', label: 'Authorization to share health information' },
    { key: 'consentElectronicRecords', label: 'Consent to electronic records' },
    { key: 'consentDataRetention', label: 'Understanding of record retention' },
  ];

  y = checkPageBreak(doc, y, consentItems.length * 8 + 6);
  y = renderSubsectionTitle(doc, 'Acknowledgments', y);

  for (const item of consentItems) {
    const cb = (data as unknown as Record<string, unknown>)[item.key] as { checked?: boolean; timestamp?: string } | undefined;
    const checked = cb?.checked ?? false;
    const mark = checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`${mark}  ${item.label}`, PDF_MARGIN.left + 4, y);
    y += 3.5;
    if (checked && cb?.timestamp) {
      const ts = new Date(cb.timestamp).toLocaleString();
      doc.setFontSize(SIGNATURE_META_FONT);
      doc.setTextColor(...PDF_COLORS.label);
      doc.text(`Acknowledged: ${ts}`, PDF_MARGIN.left + 10, y);
      y += 3;
    }
    y += 1.5;
  }

  y += 2;

  // Signer info in a box
  {
    if (data.signerName || data.hipaaSignatureDate) {
      const sigBoxTop = y;
      drawContentBoxFill(doc, sigBoxTop);
      y += 4;
      if (data.signerName) y = renderField(doc, 'Signing Party', data.signerName, y);
      if (data.hipaaSignatureDate) y = renderField(doc, 'Date', data.hipaaSignatureDate, y);
      y += 3;
      drawContentBoxBorder(doc, sigBoxTop, y - sigBoxTop);
    }
  }

  // Signature
  if (data.hipaaSignature) {
    y = checkPageBreak(doc, y, 25);
    y += 2;
    y = renderSignatureBlock(doc, data.hipaaSignature, 'Client/Consumer or Personal Representative', data.hipaaSignatureMeta?.timestamp || '', y);
  }

  return y + 4;
}
