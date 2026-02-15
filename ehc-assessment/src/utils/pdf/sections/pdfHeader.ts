import type { jsPDF } from 'jspdf';
import {
  PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, HEADER_HEIGHT,
  FIELD_LABEL_WIDTH, FIELD_LINE_HEIGHT, FIELD_GAP,
  SIGNATURE_WIDTH, SIGNATURE_HEIGHT, SIGNATURE_META_FONT,
} from '../pdfStyles';

let cachedLogo: string | null = null;

async function fetchLogo(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch('/ehc-watermark-h.png');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogo = reader.result as string;
        resolve(cachedLogo);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Pre-fetch the logo so it's cached before page rendering starts */
export async function prefetchLogo(): Promise<void> {
  await fetchLogo();
}

/**
 * Stamp the header band + logo + client banner onto the current page.
 * Called retroactively on every page after all content is rendered,
 * so pages added by autoTable also get the header.
 */
export function stampHeaderOnCurrentPage(
  doc: jsPDF,
  clientName: string,
  age: string,
  address: string,
  date: string,
  documentTitle = 'Client Intake Assessment',
): void {
  const logo = cachedLogo;
  const pageW = 215.9;
  const rightX = pageW - PDF_MARGIN.right;

  // --- Measure banner height, capped so it never overflows into page content ---
  doc.setFontSize(FONT_SIZES.small);
  const bannerTop = 19;
  const padV = 1.5;          // vertical padding inside banner (compact)
  const padH = 2;            // horizontal padding for text inset
  const addrLabelText = 'Address: ';
  const addrLabelW = doc.getTextWidth(addrLabelText);
  const addrMaxW = CONTENT_WIDTH - addrLabelW - padH * 2;
  const addrLines = doc.splitTextToSize(address || '—', addrMaxW);
  const addrLineHeight = 3.5;
  const row1Height = 4;
  const maxAddrLines = 2; // cap address to 2 lines to fit within HEADER_HEIGHT
  const row2Height = Math.min(addrLines.length, maxAddrLines) * addrLineHeight;
  const rawBannerHeight = padV + row1Height + 0.5 + row2Height + padV;
  // Cap banner so it never extends past HEADER_HEIGHT - 1mm (leaves 1mm clearance)
  const maxBannerHeight = HEADER_HEIGHT - bannerTop - 1;
  const bannerHeight = Math.min(rawBannerHeight, maxBannerHeight);
  const bannerBottom = bannerTop + bannerHeight;

  // White-out strip: covers logo + banner area. Capped below HEADER_HEIGHT.
  const whiteOutHeight = Math.min(bannerBottom + 0.5, HEADER_HEIGHT - 0.5);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, whiteOutHeight, 'F');

  // Logo on white background
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', PDF_MARGIN.left, 2, 40, 14);
    } catch {
      renderFallbackLogoText(doc);
    }
  } else {
    renderFallbackLogoText(doc);
  }

  // Title + date right-aligned
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(documentTitle, rightX, 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(`Assessment Date: ${date || 'N/A'}`, rightX, 13, { align: 'right' });

  // Thin teal accent bar
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(PDF_MARGIN.left, 17, CONTENT_WIDTH, 1.2, 'F');

  // Client banner — light teal tint
  doc.setFontSize(FONT_SIZES.small);
  doc.setFillColor(237, 246, 249); // very light teal
  doc.roundedRect(PDF_MARGIN.left, bannerTop, CONTENT_WIDTH, bannerHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(180, 215, 226); // soft teal border
  doc.setLineWidth(0.3);
  doc.roundedRect(PDF_MARGIN.left, bannerTop, CONTENT_WIDTH, bannerHeight, 1.5, 1.5, 'S');

  // --- Row 1: Client Name (left) | Age (center) | Date (right) ---
  const row1Y = bannerTop + padV + 2.5;

  // Client name — left aligned
  const clientLabelText = 'Client: ';
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(clientLabelText, PDF_MARGIN.left + padH, row1Y);
  const clientLabelW = doc.getTextWidth(clientLabelText);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName || '—', PDF_MARGIN.left + padH + clientLabelW, row1Y);
  doc.setFont('helvetica', 'normal');

  // Age — center aligned
  const ageLabelText = 'Age: ';
  const ageValText = age || '—';
  const ageFullText = ageLabelText + ageValText;
  const centerX = PDF_MARGIN.left + CONTENT_WIDTH / 2;
  const ageStartX = centerX - doc.getTextWidth(ageFullText) / 2;
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(ageLabelText, ageStartX, row1Y);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(ageValText, ageStartX + doc.getTextWidth(ageLabelText), row1Y);
  doc.setFont('helvetica', 'normal');

  // Date — right aligned
  const dateLabelText = 'Date: ';
  const dateValText = date || '—';
  const rightEdge = PDF_MARGIN.left + CONTENT_WIDTH - padH;
  const dateFullW = doc.getTextWidth(dateLabelText + dateValText);
  const dateStartX = rightEdge - dateFullW;
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(dateLabelText, dateStartX, row1Y);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(dateValText, dateStartX + doc.getTextWidth(dateLabelText), row1Y);
  doc.setFont('helvetica', 'normal');

  // --- Row 2: Address (full width, wrapping — max 2 lines to fit banner) ---
  const row2Y = row1Y + row1Height;
  const displayAddrLines = addrLines.slice(0, 2) as string[];
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(addrLabelText, PDF_MARGIN.left + padH, row2Y);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(displayAddrLines, PDF_MARGIN.left + padH + addrLabelW, row2Y);
  doc.setFont('helvetica', 'normal');
}

function renderFallbackLogoText(doc: jsPDF): void {
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Home Care', PDF_MARGIN.left, 10);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.accent);
  doc.text('of Chester County', PDF_MARGIN.left, 14);
  doc.setFont('helvetica', 'normal');
}

export function renderSectionTitle(doc: jsPDF, title: string, y: number): number {
  // Light teal background band
  doc.setFillColor(237, 246, 249);
  doc.rect(PDF_MARGIN.left, y, CONTENT_WIDTH, 8, 'F');
  // Bold teal left accent bar
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(PDF_MARGIN.left, y, 3, 8, 'F');
  // Title text in teal
  doc.setFontSize(FONT_SIZES.sectionHeader);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PDF_MARGIN.left + 6, y + 5.5);
  doc.setFont('helvetica', 'normal');
  return y + 13; // 8 banner + 5 gap (10pt text ascenders are ~3mm above baseline)
}

export function renderSubsectionTitle(doc: jsPDF, title: string, y: number): number {
  // Light amber background tint
  doc.setFillColor(255, 249, 235);
  doc.rect(PDF_MARGIN.left, y, CONTENT_WIDTH, 7, 'F');
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PDF_MARGIN.left + 2, y + 4.5);
  doc.setFont('helvetica', 'normal');
  // Thicker amber underline
  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.6);
  doc.line(PDF_MARGIN.left, y + 7, PDF_MARGIN.left + CONTENT_WIDTH, y + 7);
  return y + 12; // 7 box + 5 gap below line
}

export function renderField(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  options?: { labelWidth?: number },
): number {
  doc.setFontSize(FONT_SIZES.body);

  // Measure actual label width and use whichever is larger: measured or default
  const labelText = `${label}:`;
  doc.setFont('helvetica', 'normal');
  const measuredLabelW = doc.getTextWidth(labelText) + 3; // 3mm gap after label
  const labelWidth = Math.max(options?.labelWidth ?? FIELD_LABEL_WIDTH, measuredLabelW);

  doc.setTextColor(...PDF_COLORS.label);
  doc.text(labelText, PDF_MARGIN.left + 2, y);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont('helvetica', 'bold');

  // Wrap long values
  const maxW = CONTENT_WIDTH - labelWidth - 4;
  const lines = doc.splitTextToSize(value || '—', maxW);
  doc.text(lines, PDF_MARGIN.left + labelWidth, y);
  doc.setFont('helvetica', 'normal');
  return y + lines.length * FIELD_LINE_HEIGHT + FIELD_GAP;
}

export function renderPageFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const footerY = 279.4 - 7;
  // Light background instead of heavy teal
  doc.setFillColor(245, 248, 250);
  doc.rect(0, footerY, 215.9, 7, 'F');
  // Thin teal top line
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN.left, footerY, 215.9 - PDF_MARGIN.right, footerY);
  // Page number centered
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(`Page ${pageNumber} of ${totalPages}`, 215.9 / 2, footerY + 4.5, { align: 'center' });
  // Confidential notice right-aligned
  doc.setTextColor(180, 190, 200);
  doc.text('Executive Home Care \u2014 Confidential', 215.9 - PDF_MARGIN.right, footerY + 4.5, { align: 'right' });
}

/**
 * Render a professional signature block with signature image, horizontal rule,
 * name label, and date. Shared across all PDF sections.
 *
 * Layout (top-to-bottom):
 *   ┌─────────────────────┐
 *   │  signature image     │  ← SIGNATURE_HEIGHT tall
 *   ├─────────────────────┤  ← signature line
 *   │  label    Date: ...  │  ← metadata row
 *   └─────────────────────┘
 */
export function renderSignatureBlock(
  doc: jsPDF,
  signatureDataUrl: string | undefined,
  label: string,
  date: string,
  y: number,
): number {
  // Signature image sits above the line
  if (signatureDataUrl) {
    try {
      doc.addImage(
        signatureDataUrl, 'PNG',
        PDF_MARGIN.left + 2, y,
        SIGNATURE_WIDTH, SIGNATURE_HEIGHT,
      );
    } catch { /* signature image failed, skip */ }
  }
  y += SIGNATURE_HEIGHT;

  // Signature line right below the image
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGIN.left + 2, y, PDF_MARGIN.left + 2 + SIGNATURE_WIDTH, y);

  // Label and date below the line
  y += 3.5;
  doc.setFontSize(SIGNATURE_META_FONT);
  doc.setTextColor(...PDF_COLORS.label);
  doc.text(label, PDF_MARGIN.left + 2, y);

  if (date) {
    doc.text(`Date: ${date}`, PDF_MARGIN.left + SIGNATURE_WIDTH + 10, y);
  }

  return y + 4;
}

// ─── Two-Column Layout Helpers ──────────────────────────────────────────────

/**
 * Render a subsection title scoped to a single column.
 * Same visual style as renderSubsectionTitle() but constrained to colX..colX+colWidth.
 */
export function renderSubsectionTitleTwoCol(
  doc: jsPDF,
  title: string,
  y: number,
  colX: number,
  colWidth: number,
): number {
  doc.setFillColor(255, 249, 235);
  doc.rect(colX, y, colWidth, 7, 'F');
  doc.setFontSize(9); // 9pt for readable column headers (between small 8pt and body 10pt)
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, colX + 2, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.6);
  doc.line(colX, y + 7, colX + colWidth, y + 7);
  return y + 12; // 7 box + 5 gap below line
}

/**
 * Render a label:value field within a column.
 * Same visual style as renderField() but constrained to colX..colX+colWidth.
 * Uses smaller font (FONT_SIZES.small) and proportional label width.
 */
export function renderFieldTwoCol(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  colX: number,
  colWidth: number,
): number {
  const fontSize = 9; // 9pt for readable columns
  doc.setFontSize(fontSize);

  const labelText = `${label}:`;
  doc.setFont('helvetica', 'normal');
  const measuredLabelW = doc.getTextWidth(labelText) + 2;
  // Proportional label width for narrower columns
  const defaultLabelW = Math.round(FIELD_LABEL_WIDTH * (colWidth / CONTENT_WIDTH));
  const labelWidth = Math.max(defaultLabelW, measuredLabelW);

  doc.setTextColor(...PDF_COLORS.label);
  doc.text(labelText, colX + 1, y);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont('helvetica', 'bold');

  const maxW = colWidth - labelWidth - 2;
  const lines = doc.splitTextToSize(value || '—', maxW > 10 ? maxW : 10);
  doc.text(lines, colX + labelWidth, y);
  doc.setFont('helvetica', 'normal');

  // Compact layout (3.8mm per line + 1.5mm gap) — 9pt font
  return y + lines.length * 3.8 + 1.5;
}
