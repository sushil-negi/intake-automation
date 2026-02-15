import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClientHistoryData } from '../../../types/forms';
import {
  PDF_MARGIN, PDF_COLORS, CONTENT_WIDTH, HEADER_HEIGHT,
  checkPageBreak, drawContentBoxFill, drawContentBoxBorder,
  TABLE_FONT_SIZE, TABLE_CELL_PADDING, ALTERNATE_ROW_COLOR, TABLE_LINE_COLOR, TABLE_LINE_WIDTH,
  COL_WIDTH, COL_LEFT_X, COL_RIGHT_X, COL_GUTTER,
} from '../pdfStyles';
import {
  renderSectionTitle, renderSubsectionTitle,
  renderSubsectionTitleTwoCol, renderFieldTwoCol,
  renderField, renderSignatureBlock,
} from './pdfHeader';

/** Convert 24-hour time string ("09:00", "17:30") to 12-hour format ("9:00 AM", "5:30 PM"). */
function formatTime(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr || '00'} ${suffix}`;
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

export function renderClientHistory(doc: jsPDF, data: ClientHistoryData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '2. Client History', y);

  // Assessment Info in a box (full-width)
  {
    const boxTop = y;
    drawContentBoxFill(doc, boxTop);
    y += 4;
    const has90day = data.assessmentReason === '90day' && data.reAssessmentReasons.length > 0;
    const reasonLabel = data.assessmentReason === 'initial' ? 'Initial' : data.assessmentReason === '90day' ? '90 Day Supervisory' : '—';
    y = renderField(doc, 'Assessment Reason', reasonLabel, y);
    if (has90day) {
      y = renderField(doc, 'Re-assessment Due To', data.reAssessmentReasons.join(', '), y);
      if (data.reAssessmentOtherReason) {
        y = renderField(doc, 'Other Reason', data.reAssessmentOtherReason, y);
      }
    }
    y += 3;
    drawContentBoxBorder(doc, boxTop, y - boxTop);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TWO-COLUMN SECTION
  // Left: Service Preferences, Medical Flags, Language
  // Right: Medical Information (Dx), Advance Directive,
  //        Vision/Hearing/Speech, Living Situation
  // ═══════════════════════════════════════════════════════════════════════════

  const colStartY = y;
  let leftY = y;
  let rightY = y;

  // ── LEFT COLUMN ──────────────────────────────────────────────────────────

  // Service Preferences
  leftY = renderSubsectionTitleTwoCol(doc, 'Service Preferences', leftY, COL_LEFT_X, COL_WIDTH);
  {
    const flags: string[] = [];
    if (data.overnight) flags.push('Overnight');
    if (data.liveIn) flags.push('Live-in');
    if (data.is24x7) flags.push('24×7');
    if (flags.length) leftY = renderFieldTwoCol(doc, 'Service Type', flags.join(', '), leftY, COL_LEFT_X, COL_WIDTH);
    if (data.serviceStartDate) leftY = renderFieldTwoCol(doc, 'Start Date', data.serviceStartDate, leftY, COL_LEFT_X, COL_WIDTH);
    if (data.is24x7 || data.liveIn) {
      leftY = renderFieldTwoCol(doc, 'Schedule', data.is24x7 ? '24×7 — all days' : 'Live-in — all days', leftY, COL_LEFT_X, COL_WIDTH);
    } else if (data.serviceDays.length > 0) {
      const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const realDays = data.serviceDays.filter(d => VALID_DAYS.includes(d));
      leftY = renderFieldTwoCol(doc, 'Service Days', realDays.join(', '), leftY, COL_LEFT_X, COL_WIDTH);

      // Per-day hours from daySchedules
      const dayTimes = realDays
        .filter(day => data.daySchedules[day]?.from || data.daySchedules[day]?.to)
        .map(day => ({ day, sch: data.daySchedules[day] }));

      if (dayTimes.length > 0) {
        const allSame = dayTimes.every(
          d => d.sch.from === dayTimes[0].sch.from && d.sch.to === dayTimes[0].sch.to
        );
        if (allSame) {
          const from = formatTime(dayTimes[0].sch.from) || '?';
          const to = formatTime(dayTimes[0].sch.to) || '?';
          leftY = renderFieldTwoCol(doc, 'Hours', `${from} – ${to}`, leftY, COL_LEFT_X, COL_WIDTH);
        } else {
          for (const d of dayTimes) {
            const from = formatTime(d.sch.from) || '?';
            const to = formatTime(d.sch.to) || '?';
            leftY = renderFieldTwoCol(doc, `  ${d.day}`, `${from} – ${to}`, leftY, COL_LEFT_X, COL_WIDTH);
          }
        }
      }
    }
    if (data.servicesPerWeek) leftY = renderFieldTwoCol(doc, 'Service Notes', data.servicesPerWeek, leftY, COL_LEFT_X, COL_WIDTH);
    leftY += 2;
  }

  // Medical Flags (falls, hospital, surgery, etc.)
  {
    const yesNo = (v: string) => v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '—';
    let mfc = 0;
    if (data.lastFallDate) mfc++;
    if (data.hospitalizations) mfc++;
    if (data.recentSurgery) mfc++;
    if (data.recentHipSurgery && data.recentHipSurgery !== 'na') mfc++;
    if (data.smoker) mfc++;
    if (data.oxygenInHome) mfc++;
    if (data.recentInfections) mfc++;
    if (mfc > 0) {
      leftY = renderSubsectionTitleTwoCol(doc, 'Medical Flags', leftY, COL_LEFT_X, COL_WIDTH);
      if (data.lastFallDate) leftY = renderFieldTwoCol(doc, 'Last Fall', data.lastFallDate, leftY, COL_LEFT_X, COL_WIDTH);
      if (data.hospitalizations) leftY = renderFieldTwoCol(doc, 'Hospitalizations', data.hospitalizations, leftY, COL_LEFT_X, COL_WIDTH);
      if (data.recentSurgery) leftY = renderFieldTwoCol(doc, 'Recent Surgery', data.recentSurgery, leftY, COL_LEFT_X, COL_WIDTH);
      if (data.recentHipSurgery && data.recentHipSurgery !== 'na') {
        leftY = renderFieldTwoCol(doc, 'Hip Surgery', `${data.recentHipSurgery === 'yes' ? 'Yes' : 'No'}${data.recentHipSurgeryDate ? ` (${data.recentHipSurgeryDate})` : ''}`, leftY, COL_LEFT_X, COL_WIDTH);
      }
      if (data.smoker) leftY = renderFieldTwoCol(doc, 'Smoker', `${yesNo(data.smoker)}${data.smokerNotes ? ` — ${data.smokerNotes}` : ''}`, leftY, COL_LEFT_X, COL_WIDTH);
      if (data.oxygenInHome) leftY = renderFieldTwoCol(doc, 'Oxygen', yesNo(data.oxygenInHome), leftY, COL_LEFT_X, COL_WIDTH);
      if (data.recentInfections) leftY = renderFieldTwoCol(doc, 'Infections', data.recentInfections, leftY, COL_LEFT_X, COL_WIDTH);
      leftY += 2;
    }
  }

  // Language
  {
    leftY = renderSubsectionTitleTwoCol(doc, 'Language', leftY, COL_LEFT_X, COL_WIDTH);
    const langLabel = data.primaryLanguage === 'english' ? 'English' : data.primaryLanguage === 'spanish' ? 'Spanish' : data.primaryLanguageOther || '—';
    leftY = renderFieldTwoCol(doc, 'Primary Language', langLabel, leftY, COL_LEFT_X, COL_WIDTH);
    if (data.understandsEnglish) leftY = renderFieldTwoCol(doc, 'Understands Eng.', data.understandsEnglish === 'yes' ? 'Yes' : data.understandsEnglish === 'no' ? 'No' : 'Limited', leftY, COL_LEFT_X, COL_WIDTH);
    leftY += 2;
  }

  // (Diet & Allergies moved to full-width section below columns)

  // ── RIGHT COLUMN ─────────────────────────────────────────────────────────

  // Medical Information
  rightY = renderSubsectionTitleTwoCol(doc, 'Medical Information', rightY, COL_RIGHT_X, COL_WIDTH);
  if (data.primaryDiagnosis) rightY = renderFieldTwoCol(doc, 'Primary Dx', data.primaryDiagnosis, rightY, COL_RIGHT_X, COL_WIDTH);
  rightY += 2;

  // Advance Directive
  if (data.advanceDirective) {
    rightY = renderSubsectionTitleTwoCol(doc, 'Advance Directive', rightY, COL_RIGHT_X, COL_WIDTH);
    const adMap: Record<string, string> = {
      has: 'Has Advance Directive',
      doesNotHave: 'Does not have',
      wants: 'Wants information',
      doesNotComprehend: 'Does not comprehend',
    };
    rightY = renderFieldTwoCol(doc, 'Status', adMap[data.advanceDirective] || '—', rightY, COL_RIGHT_X, COL_WIDTH);
    rightY += 2;
  }

  // Vision / Hearing / Speech
  rightY = renderSubsectionTitleTwoCol(doc, 'Vision, Hearing & Speech', rightY, COL_RIGHT_X, COL_WIDTH);
  {
    const visionItems: string[] = [];
    if (data.visionImpaired) visionItems.push('Impaired');
    if (data.visionBothEyes) visionItems.push('Both eyes');
    if (data.visionRightOnly) visionItems.push('Right eye');
    if (data.visionLeftOnly) visionItems.push('Left eye');
    if (data.visionGlasses) visionItems.push('Glasses');
    if (data.visionContacts) visionItems.push('Contacts');
    rightY = renderFieldTwoCol(doc, 'Vision', visionItems.length > 0 ? visionItems.join(', ') : 'No issues', rightY, COL_RIGHT_X, COL_WIDTH);

    const hearingItems: string[] = [];
    if (data.hearingAids) hearingItems.push('Hearing aids');
    if (data.hearingBothEars) hearingItems.push('Both ears');
    if (data.hearingRightEar) hearingItems.push('Right ear');
    if (data.hearingLeftEar) hearingItems.push('Left ear');
    if (data.hearingSignLanguage) hearingItems.push('Sign language');
    if (data.hearingTablet) hearingItems.push('Tablet');
    rightY = renderFieldTwoCol(doc, 'Hearing', hearingItems.length > 0 ? hearingItems.join(', ') : 'No issues', rightY, COL_RIGHT_X, COL_WIDTH);

    if (data.speechImpaired) rightY = renderFieldTwoCol(doc, 'Speech', data.speechImpaired, rightY, COL_RIGHT_X, COL_WIDTH);
    rightY += 2;
  }

  // Living Situation
  rightY = renderSubsectionTitleTwoCol(doc, 'Living Situation', rightY, COL_RIGHT_X, COL_WIDTH);
  {
    const yesNo = (v: string) => v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '—';
    rightY = renderFieldTwoCol(doc, 'Lives Alone', yesNo(data.livesAlone), rightY, COL_RIGHT_X, COL_WIDTH);
    if (data.livesAlone === 'no') {
      if (data.peopleInHome) rightY = renderFieldTwoCol(doc, 'People in Home', data.peopleInHome, rightY, COL_RIGHT_X, COL_WIDTH);
      if (data.whoAreThey) rightY = renderFieldTwoCol(doc, 'Who Are They', data.whoAreThey, rightY, COL_RIGHT_X, COL_WIDTH);
      if (data.whenOthersHome) rightY = renderFieldTwoCol(doc, 'When Home', data.whenOthersHome, rightY, COL_RIGHT_X, COL_WIDTH);
    }
    if (data.pets) {
      rightY = renderFieldTwoCol(doc, 'Pets', `${yesNo(data.pets)}${data.petKind ? ` — ${data.petKind}` : ''}${data.petCount ? ` (${data.petCount})` : ''}`, rightY, COL_RIGHT_X, COL_WIDTH);
    }
    rightY += 2;
  }

  // Draw column divider
  const colBottomY = Math.max(leftY, rightY);
  drawColumnDivider(doc, colStartY, colBottomY);

  y = colBottomY + 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL-WIDTH SECTIONS BELOW COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Diet & Allergies (full-width for compact layout)
  {
    const hasDiet = data.diet.length > 0 || data.drugAllergies || data.foodAllergies;
    if (hasDiet) {
      y = checkPageBreak(doc, y, 16);
      y = renderSubsectionTitle(doc, 'Diet & Allergies', y);
      if (data.diet.length > 0) y = renderField(doc, 'Diet', data.diet.join(', ') + (data.dietOther ? `, ${data.dietOther}` : ''), y);
      if (data.drugAllergies) y = renderField(doc, 'Drug Allergies', data.drugAllergies, y);
      if (data.foodAllergies) y = renderField(doc, 'Food Allergies', data.foodAllergies, y);
      y += 2;
    }
  }

  // Health History table (full-width — benefits from wider columns)
  if (data.healthHistory.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = renderSubsectionTitle(doc, 'Health History', y);

    // Render as a compact two-column table
    const midpoint = Math.ceil(data.healthHistory.length / 2);
    const col1 = data.healthHistory.slice(0, midpoint);
    const col2 = data.healthHistory.slice(midpoint);
    const rows: string[][] = [];
    for (let i = 0; i < midpoint; i++) {
      rows.push([col1[i] || '', col2[i] || '']);
    }

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      body: rows,
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
      columnStyles: {
        0: { cellWidth: CONTENT_WIDTH / 2 },
        1: { cellWidth: CONTENT_WIDTH / 2 },
      },
      alternateRowStyles: { fillColor: ALTERNATE_ROW_COLOR },
      tableWidth: CONTENT_WIDTH,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }

  // Other Providers table (full-width)
  const providers = data.otherProviders.filter(p => p.agencyName);
  if (providers.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = renderSubsectionTitle(doc, 'Other Providers in Home', y);

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      head: [['Agency', 'Type', 'Phone', 'Email']],
      body: providers.map(p => [p.agencyName, p.typeOfAgency, p.phone, p.email]),
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: TABLE_FONT_SIZE },
      alternateRowStyles: { fillColor: ALTERNATE_ROW_COLOR },
      tableWidth: CONTENT_WIDTH,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }

  // EHC Signature (full-width)
  if (data.ehcStaffName || data.ehcRepSignature) {
    y = checkPageBreak(doc, y, 25);
    y += 3;
    if (data.ehcStaffName) y = renderField(doc, 'EHC Staff', data.ehcStaffName, y);
    if (data.ehcRepSignature) {
      y += 2;
      y = renderSignatureBlock(doc, data.ehcRepSignature, 'EHC Representative Signature', data.ehcRepSignatureMeta?.timestamp || '', y);
    }
  }

  return y + 4;
}
