import type { BrandingConfig } from '../../types/branding';

export const PDF_MARGIN = { top: 15, bottom: 20, left: 20, right: 20 };

export const PDF_COLORS = {
  primary: [26, 58, 74] as [number, number, number],       // #1a3a4a (header teal)
  accent: [212, 145, 42] as [number, number, number],      // #d4912a (EHC amber)
  text: [55, 65, 81] as [number, number, number],          // gray-700
  label: [107, 114, 128] as [number, number, number],      // gray-500
  lightGray: [229, 231, 235] as [number, number, number],  // gray-200
  white: [255, 255, 255] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
};

export type PdfColors = typeof PDF_COLORS;

/**
 * Get PDF colors from branding config, falling back to defaults.
 * Only primary and accent colors are overridden — text, label, and
 * other structural colors stay constant for readability.
 */
export function getPdfColors(branding?: BrandingConfig | null): PdfColors {
  if (!branding) return PDF_COLORS;
  return {
    ...PDF_COLORS,
    primary: branding.primaryColorRgb,
    accent: branding.accentColorRgb,
  };
}

export const FONT_SIZES = {
  title: 15,
  sectionHeader: 12,
  body: 10,
  small: 8,
};

export const PAGE_WIDTH = 215.9; // letter width in mm
export const PAGE_HEIGHT = 279.4; // letter height in mm
export const CONTENT_WIDTH = PAGE_WIDTH - PDF_MARGIN.left - PDF_MARGIN.right;

// Header layout (stamped retroactively on all pages):
//   Logo area:  0–18mm (white strip covers underlying content)
//   Accent bar: 17–18.2mm
//   Banner:     starts at 19mm, dynamic height based on address wrapping
//
// Compact banner: bannerTop=19, padV=1.5, row1=4, gap=0.5, addr capped at 2 lines
//   1-line addr: banner bottom = 19 + 1.5 + 4 + 0.5 + 3.5 + 1.5 = 30.0mm
//   2-line addr: banner bottom = 19 + 1.5 + 4 + 0.5 + 7.0 + 1.5 = 33.5mm (max)
//
// HEADER_HEIGHT = content start position on each page.
// Banner height is hard-capped at HEADER_HEIGHT - bannerTop - 1 (= 15mm).
// White-out strip is capped below HEADER_HEIGHT so it never erases content.
//   1-line addr: banner bottom = 30.0mm → 5.0mm clearance ✓
//   2-line addr: banner bottom = 33.5mm → 1.5mm clearance ✓
export const HEADER_HEIGHT = 35;

// ─── Table Constants ────────────────────────────────────────────────────────
export const TABLE_FONT_SIZE = 8;
export const TABLE_CELL_PADDING = 2.5;
export const ALTERNATE_ROW_COLOR: [number, number, number] = [240, 244, 248];
export const TABLE_LINE_COLOR: [number, number, number] = [220, 225, 230];
export const TABLE_LINE_WIDTH = 0.2;

// ─── Field Rendering ────────────────────────────────────────────────────────
export const FIELD_LABEL_WIDTH = 48;  // default label column width (wider for 10pt font)
export const FIELD_LINE_HEIGHT = 4.5;
export const FIELD_GAP = 2;

// ─── Signature Constants ────────────────────────────────────────────────────
export const SIGNATURE_WIDTH = 55;
export const SIGNATURE_HEIGHT = 18;
export const SIGNATURE_META_FONT = 7;

// ─── Checkbox Characters ────────────────────────────────────────────────────
export const CHECKBOX_CHECKED = '\u2713';   // ✓ checkmark
export const CHECKBOX_UNCHECKED = '\u25CB'; // ○ open circle

// ─── Two-Column Layout ───────────────────────────────────────────────────────
export const COL_GUTTER = 5.9;
export const COL_WIDTH = (CONTENT_WIDTH - COL_GUTTER) / 2; // ~85mm
export const COL_LEFT_X = PDF_MARGIN.left;                  // 20mm
export const COL_RIGHT_X = PDF_MARGIN.left + COL_WIDTH + COL_GUTTER; // ~110.9mm

// ─── Content Box Styling ────────────────────────────────────────────────────
export const CONTENT_BOX_FILL: [number, number, number] = [245, 248, 250];
export const CONTENT_BOX_BORDER_WIDTH = 0.5;
export const CONTENT_BOX_RADIUS = 2.5;

// Check if we need a new page and add one if so. Returns the new y position.
// New pages start at HEADER_HEIGHT to leave room for the header stamped retroactively.
export function checkPageBreak(doc: import('jspdf').jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight > PAGE_HEIGHT - PDF_MARGIN.bottom) {
    doc.addPage();
    return HEADER_HEIGHT;
  }
  return y;
}

/**
 * Draw a light background box with subtle border around a content area.
 * Uses a very light gray fill + thin gray border.
 *
 * PREFERRED USAGE — two-pass (content-aware sizing):
 *   const boxTop = y;
 *   drawContentBoxFill(doc, boxTop);   // light fill, tall enough
 *   y += 4;                            // top padding
 *   y = renderField(doc, ...);         // render content
 *   y += 4;                            // bottom padding
 *   drawContentBoxBorder(doc, boxTop, y - boxTop);  // precise border
 *
 * LEGACY USAGE — single-pass (pre-calculated height):
 *   drawContentBox(doc, y, height);
 */
export function drawContentBox(doc: import('jspdf').jsPDF, topY: number, height: number): void {
  const x = PDF_MARGIN.left;
  const w = CONTENT_WIDTH;
  doc.setFillColor(...CONTENT_BOX_FILL);
  doc.roundedRect(x, topY, w, height, CONTENT_BOX_RADIUS, CONTENT_BOX_RADIUS, 'F');
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(CONTENT_BOX_BORDER_WIDTH);
  doc.roundedRect(x, topY, w, height, CONTENT_BOX_RADIUS, CONTENT_BOX_RADIUS, 'S');
}

/**
 * Draw the light background fill for a content box (call BEFORE rendering content).
 * Uses a generous max height so it always covers the content area.
 * The fill color is near-white so any overshoot is invisible.
 */
export function drawContentBoxFill(doc: import('jspdf').jsPDF, topY: number, maxHeight = 120): void {
  const x = PDF_MARGIN.left;
  const w = CONTENT_WIDTH;
  doc.setFillColor(...CONTENT_BOX_FILL);
  doc.roundedRect(x, topY, w, maxHeight, CONTENT_BOX_RADIUS, CONTENT_BOX_RADIUS, 'F');
}

/**
 * Draw the precise border for a content box (call AFTER rendering content).
 * Uses the actual measured height for pixel-perfect borders.
 */
export function drawContentBoxBorder(doc: import('jspdf').jsPDF, topY: number, height: number): void {
  const x = PDF_MARGIN.left;
  const w = CONTENT_WIDTH;
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(CONTENT_BOX_BORDER_WIDTH);
  doc.roundedRect(x, topY, w, height, CONTENT_BOX_RADIUS, CONTENT_BOX_RADIUS, 'S');
}
