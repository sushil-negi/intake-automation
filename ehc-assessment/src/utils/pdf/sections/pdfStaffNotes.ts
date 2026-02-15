import type { jsPDF } from 'jspdf';
import type { StaffNotes } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, checkPageBreak, drawContentBoxFill, drawContentBoxBorder } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle } from './pdfHeader';

const SECTION_LABELS: Record<keyof StaffNotes, string> = {
  clientHelpList: 'Client Help List',
  clientHistory: 'Client History',
  clientAssessment: 'Client Assessment',
  homeSafetyChecklist: 'Home Safety Checklist',
  medicationList: 'Medication List',
  consent: 'Consent & Signatures',
};

/** Render a Staff Notes appendix page. Returns early if no notes exist. */
export function renderStaffNotes(doc: jsPDF, notes: StaffNotes, startY: number): number {
  const hasAny = Object.values(notes).some(v => v.trim());
  if (!hasAny) return startY;

  let y = startY;
  y = renderSectionTitle(doc, 'Staff Notes (Internal — Not Client-Facing)', y);

  const keys = Object.keys(SECTION_LABELS) as (keyof StaffNotes)[];
  for (const key of keys) {
    const text = notes[key]?.trim();
    if (!text) continue;

    y = checkPageBreak(doc, y, 20);

    y = renderSubsectionTitle(doc, SECTION_LABELS[key], y);

    const boxTop = y;
    drawContentBoxFill(doc, boxTop);
    y += 4;

    // Note text
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    const maxW = CONTENT_WIDTH - 6;
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      y = checkPageBreak(doc, y, 5);
      doc.text(line, PDF_MARGIN.left + 3, y);
      y += 4;
    }

    y += 3;
    drawContentBoxBorder(doc, boxTop, y - boxTop);
    y += 4;
  }

  return y;
}
