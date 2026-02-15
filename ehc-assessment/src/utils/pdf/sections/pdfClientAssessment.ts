import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClientAssessmentData } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, HEADER_HEIGHT, checkPageBreak, drawContentBoxFill, drawContentBoxBorder, TABLE_FONT_SIZE, TABLE_CELL_PADDING, ALTERNATE_ROW_COLOR, TABLE_LINE_COLOR, TABLE_LINE_WIDTH } from '../pdfStyles';
import { renderSectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

const CATEGORY_LABELS: { key: keyof ClientAssessmentData; label: string }[] = [
  { key: 'bathing', label: 'Bathing / Shower' },
  { key: 'dressing', label: 'Dressing / Undressing' },
  { key: 'hairCare', label: 'Hair Care' },
  { key: 'teethAndGums', label: 'Teeth and Gums' },
  { key: 'shaving', label: 'Shaving' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'falls', label: 'Falls' },
  { key: 'mobilityAids', label: 'Mobility Aids' },
  { key: 'nutritionHydration', label: 'Nutrition / Hydration' },
  { key: 'bedRails', label: 'Bed Rails' },
  { key: 'hearingAids', label: 'Hearing Aids' },
  { key: 'toileting', label: 'Toileting' },
  { key: 'medicationReminder', label: 'Medication Reminder' },
  { key: 'exerciseReminders', label: 'Exercise & Treatment Reminders' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'transportation', label: 'Transportation & Errands' },
];

export function renderClientAssessment(doc: jsPDF, data: ClientAssessmentData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '3. Client Needs Assessment', y);

  // Assessment type in a box
  const assessBoxTop = y;
  drawContentBoxFill(doc, assessBoxTop);
  y += 4;
  const typeLabel = data.assessmentType === 'initial' ? 'Initial' : data.assessmentType === 'revised' ? `Revised (replaces ${data.revisedDate || 'N/A'})` : '—';
  y = renderField(doc, 'Assessment Type', typeLabel, y);
  y += 3;
  drawContentBoxBorder(doc, assessBoxTop, y - assessBoxTop);

  // Build table data: Category | Selected Items
  // Filter out corrupted values (day names, times, booleans) that may leak in from import
  const REJECT_VALUES = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'yes', 'no', 'true', 'false', 'na', 'n/a', 'initial', 'revised',
  ];
  const TIME_RE = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;

  const tableBody: string[][] = [];
  for (const cat of CATEGORY_LABELS) {
    const raw = (data[cat.key] || []) as string[];
    const items = raw.filter(v => v && !REJECT_VALUES.includes(v.toLowerCase()) && !TIME_RE.test(v));
    if (items.length > 0) {
      tableBody.push([cat.label, items.join(', ')]);
    }
  }

  if (tableBody.length === 0) {
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(...PDF_COLORS.label);
    doc.text('No assessment items selected.', PDF_MARGIN.left + 2, y + 3);
    y += 8;
  } else {
    y = checkPageBreak(doc, y, 20);
    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      head: [['Category', 'Selected Items']],
      body: tableBody,
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, overflow: 'linebreak', lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontStyle: 'bold',
        fontSize: TABLE_FONT_SIZE,
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: CONTENT_WIDTH - 45 },
      },
      alternateRowStyles: { fillColor: ALTERNATE_ROW_COLOR },
      tableWidth: CONTENT_WIDTH,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // EHC Signature
  if (data.ehcStaffName || data.ehcRepSignature) {
    y = checkPageBreak(doc, y, 25);
    if (data.ehcStaffName) y = renderField(doc, 'EHC Staff', data.ehcStaffName, y);
    if (data.ehcRepSignature) {
      y += 2;
      y = renderSignatureBlock(doc, data.ehcRepSignature, 'EHC Representative Signature', data.ehcRepSignatureMeta?.timestamp || '', y);
    }
  }

  return y + 4;
}
