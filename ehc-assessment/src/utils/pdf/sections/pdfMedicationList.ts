import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MedicationListData } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, HEADER_HEIGHT, checkPageBreak, drawContentBoxFill, drawContentBoxBorder, TABLE_FONT_SIZE, TABLE_CELL_PADDING, ALTERNATE_ROW_COLOR, TABLE_LINE_COLOR, TABLE_LINE_WIDTH } from '../pdfStyles';
import { renderSectionTitle, renderField } from './pdfHeader';

const FREQUENCY_MAP: Record<string, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_daily: 'Three times daily',
  four_daily: 'Four times daily',
  as_needed: 'As needed (PRN)',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  other: 'Other',
};

const ROUTE_MAP: Record<string, string> = {
  oral: 'Oral',
  topical: 'Topical',
  injection: 'Injection',
  inhalation: 'Inhalation',
  sublingual: 'Sublingual',
  rectal: 'Rectal',
  ophthalmic: 'Ophthalmic',
  otic: 'Otic',
  nasal: 'Nasal',
  transdermal: 'Transdermal',
  other: 'Other',
};

export function renderMedicationList(doc: jsPDF, data: MedicationListData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '4. Medication List', y);

  // Allergies in a box
  if (data.medicationAllergies) {
    const allergyBoxTop = y;
    drawContentBoxFill(doc, allergyBoxTop);
    y += 4;
    y = renderField(doc, 'Medication Allergies', data.medicationAllergies, y);
    y += 3;
    drawContentBoxBorder(doc, allergyBoxTop, y - allergyBoxTop);
  }

  if (data.noMedications) {
    const noMedBoxTop = y;
    drawContentBoxFill(doc, noMedBoxTop);
    y += 4;
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text('Client is not currently taking any medications.', PDF_MARGIN.left + 4, y + 3);
    y += 7;
    drawContentBoxBorder(doc, noMedBoxTop, y - noMedBoxTop);
  } else {
    const meds = data.medications.filter(m => m.name);
    if (meds.length === 0) {
      doc.setFontSize(FONT_SIZES.body);
      doc.setTextColor(...PDF_COLORS.label);
      doc.text('No medications listed.', PDF_MARGIN.left + 2, y + 3);
      y += 8;
    } else {
      y = checkPageBreak(doc, y, 20);
      autoTable(doc, {
        startY: y,
        margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
        head: [['Medication', 'Dosage', 'Frequency', 'Route', 'Updates']],
        body: meds.map(m => [
          m.name,
          m.dosage,
          FREQUENCY_MAP[m.frequency] || m.frequency,
          ROUTE_MAP[m.route] || m.route,
          m.updates,
        ]),
        styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, overflow: 'linebreak', lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
        headStyles: {
          fillColor: PDF_COLORS.primary,
          textColor: PDF_COLORS.white,
          fontStyle: 'bold',
          fontSize: TABLE_FONT_SIZE,
        },
        alternateRowStyles: { fillColor: ALTERNATE_ROW_COLOR },
        tableWidth: CONTENT_WIDTH,
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }
  }

  return y + 2;
}
