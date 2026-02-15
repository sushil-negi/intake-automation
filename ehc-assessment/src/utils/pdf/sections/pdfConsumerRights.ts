import type { jsPDF } from 'jspdf';
import type { ConsumerRightsData } from '../../../types/serviceContract';
import {
  PDF_COLORS,
  checkPageBreak, COL_WIDTH, COL_LEFT_X, COL_RIGHT_X, COL_GUTTER,
} from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

const CONSUMER_RIGHTS = [
  '1. Quality care delivered by qualified staff',
  '2. Privacy in the delivery of services',
  '3. Confidential treatment of personal and medical records',
  '4. Access to information about care and treatment',
  '5. Non-discrimination regardless of race, color, religion, sex, or national origin',
  '6. Choice of service providers',
  '7. Notification of changes in services or charges',
  '8. Courtesy and respect from all staff',
  '9. Accept or refuse services and be informed of consequences',
  '10. Be informed of all charges and payment obligations',
  '11. Information about supervising physician or nurse',
  '12. Submit complaints without fear of reprisal',
  '13. Advance notice of assigned caregivers',
  '14. Review clinical records upon request',
  '15. Respect of personal property',
  '16. Information about state licensing and regulatory agencies',
];

const CONSUMER_RESPONSIBILITIES = [
  '1. Reveal all conditions and information relevant to care',
  '2. Treat agency staff with respect and courtesy',
  '3. Participate in the development of the care plan',
  '4. Comply with the agreed-upon plan of care',
  '5. Notify the agency of changes in condition or needs',
  '6. Maintain a safe home environment for caregivers',
  '7. Understand the agency is not liable for property damage',
  '8. Be available at scheduled service times',
  '9. Report complaints or concerns promptly',
  '10. Communicate any concerns about care or caregivers',
];

/**
 * Render a list of items in two columns, splitting the array in half.
 * Returns the Y position after the last item in either column.
 */
function renderTwoColumnList(
  doc: jsPDF,
  items: string[],
  startY: number,
  colWidth: number,
): number {
  const midpoint = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, midpoint);
  const rightItems = items.slice(midpoint);

  doc.setFontSize(9); // 9pt for readability
  doc.setTextColor(...PDF_COLORS.text);

  let leftY = startY;
  let rightY = startY;

  // Render left column items
  for (const item of leftItems) {
    const lines = doc.splitTextToSize(item, colWidth - 4);
    doc.text(lines, COL_LEFT_X + 2, leftY);
    leftY += lines.length * 3.5;
  }

  // Render right column items
  for (const item of rightItems) {
    const lines = doc.splitTextToSize(item, colWidth - 4);
    doc.text(lines, COL_RIGHT_X + 2, rightY);
    rightY += lines.length * 3.5;
  }

  return Math.max(leftY, rightY);
}

/**
 * Draw a thin vertical divider between the two columns.
 */
function drawColumnDivider(doc: jsPDF, topY: number, bottomY: number): void {
  const divX = COL_LEFT_X + COL_WIDTH + COL_GUTTER / 2;
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.2);
  doc.line(divX, topY, divX, bottomY);
}

export function renderConsumerRights(doc: jsPDF, data: ConsumerRightsData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '2. Consumer Rights & Responsibilities', y);

  // --- Consumer Rights (two-column) ---
  y = checkPageBreak(doc, y, 20);
  y = renderSubsectionTitle(doc, 'Consumer Rights', y);

  const rightsStartY = y;
  y = renderTwoColumnList(doc, CONSUMER_RIGHTS, y, COL_WIDTH);
  drawColumnDivider(doc, rightsStartY, y);

  y += 3;

  // --- Consumer Responsibilities (two-column) ---
  y = checkPageBreak(doc, y, 20);
  y = renderSubsectionTitle(doc, 'Consumer Responsibilities', y);

  const respStartY = y;
  y = renderTwoColumnList(doc, CONSUMER_RESPONSIBILITIES, y, COL_WIDTH);
  drawColumnDivider(doc, respStartY, y);

  y += 3;

  // --- Acknowledgment (full-width) ---
  y = checkPageBreak(doc, y, 30);
  y = renderSubsectionTitle(doc, 'Acknowledgment', y);

  if (data.consumerName) y = renderField(doc, 'Consumer Name', data.consumerName, y);
  if (data.acknowledgeDate) y = renderField(doc, 'Date', data.acknowledgeDate, y);
  if (data.responsiblePartyRelationship) y = renderField(doc, 'Relationship', data.responsiblePartyRelationship, y);

  if (data.acknowledgeSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.acknowledgeSignature, 'Acknowledgment Signature', data.acknowledgeSignatureMeta?.timestamp || '', y);
  }

  return y + 6;
}
