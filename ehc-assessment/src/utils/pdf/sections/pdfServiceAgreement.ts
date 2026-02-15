import type { jsPDF } from 'jspdf';
import type { ServiceAgreementData } from '../../../types/serviceContract';
import {
  checkPageBreak, COL_WIDTH, COL_LEFT_X, COL_RIGHT_X, COL_GUTTER,
} from '../pdfStyles';
import {
  renderSectionTitle, renderSubsectionTitle,
  renderSubsectionTitleTwoCol, renderFieldTwoCol,
} from './pdfHeader';

/**
 * Render a compact comma-separated list of selected items as a single field.
 * Returns empty string if nothing is selected.
 */
function buildSelectedList(items: { selected: boolean; label: string }[]): string {
  return items.filter(i => i.selected).map(i => i.label).join(', ');
}

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
  doc.setDrawColor(220, 225, 230); // subtle gray
  doc.setLineWidth(0.2);
  doc.line(divX, topY, divX, bottomY);
}

export function renderServiceAgreement(doc: jsPDF, data: ServiceAgreementData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '1. Service Agreement', y);

  // ═══════════════════════════════════════════════════════════════════════════
  // TWO-COLUMN SECTION: Customer Info + Contact on left; Payment/Service on right
  // ═══════════════════════════════════════════════════════════════════════════

  const colStartY = y;
  let leftY = y;
  let rightY = y;

  // ── LEFT COLUMN ──────────────────────────────────────────────────────────

  // Customer Information
  leftY = renderSubsectionTitleTwoCol(doc, 'Customer Information', leftY, COL_LEFT_X, COL_WIDTH);

  const ci = data.customerInfo;
  const fullName = [ci.firstName, ci.lastName].filter(Boolean).join(' ');
  if (fullName) leftY = renderFieldTwoCol(doc, 'Client Name', fullName, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.address) leftY = renderFieldTwoCol(doc, 'Address', ci.address, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.phone) leftY = renderFieldTwoCol(doc, 'Phone', ci.phone, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.dateOfBirth) leftY = renderFieldTwoCol(doc, 'Date of Birth', ci.dateOfBirth, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.startOfCareDate) leftY = renderFieldTwoCol(doc, 'Start of Care', ci.startOfCareDate, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.daysPerWeek) leftY = renderFieldTwoCol(doc, 'Days per Week', ci.daysPerWeek, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.hoursPerDay) leftY = renderFieldTwoCol(doc, 'Hours per Day', ci.hoursPerDay, leftY, COL_LEFT_X, COL_WIDTH);
  if (ci.liveIn) leftY = renderFieldTwoCol(doc, 'Live-In', ci.liveIn === 'yes' ? 'Yes' : 'No', leftY, COL_LEFT_X, COL_WIDTH);
  leftY += 2;

  // Contact Person (left column, below customer info)
  const cp = data.contactPerson;
  if (cp.name || cp.phone) {
    leftY = renderSubsectionTitleTwoCol(doc, 'Contact Person', leftY, COL_LEFT_X, COL_WIDTH);
    if (cp.name) leftY = renderFieldTwoCol(doc, 'Name', cp.name, leftY, COL_LEFT_X, COL_WIDTH);
    if (cp.address) leftY = renderFieldTwoCol(doc, 'Address', cp.address, leftY, COL_LEFT_X, COL_WIDTH);
    if (cp.phone) leftY = renderFieldTwoCol(doc, 'Phone', cp.phone, leftY, COL_LEFT_X, COL_WIDTH);
    if (cp.relationship) leftY = renderFieldTwoCol(doc, 'Relationship', cp.relationship, leftY, COL_LEFT_X, COL_WIDTH);
    leftY += 2;
  }

  // Schedule & Frequency (left column, below contact person)
  leftY = renderSubsectionTitleTwoCol(doc, 'Schedule & Frequency', leftY, COL_LEFT_X, COL_WIDTH);

  const freq = data.frequency;

  const flags: string[] = [];
  if (freq.overnight) flags.push('Overnight');
  if (freq.liveIn) flags.push('Live-In');
  if (freq.available24x7) flags.push('24/7');
  if (flags.length) {
    leftY = renderFieldTwoCol(doc, 'Type', flags.join(', '), leftY, COL_LEFT_X, COL_WIDTH);
  }

  if (freq.available24x7 || freq.liveIn) {
    leftY = renderFieldTwoCol(doc, 'Schedule', freq.available24x7 ? '24/7 — all days' : 'Live-in — all days', leftY, COL_LEFT_X, COL_WIDTH);
  } else {
    const days = [
      { checked: freq.monday, label: 'Mon', key: 'monday' },
      { checked: freq.tuesday, label: 'Tue', key: 'tuesday' },
      { checked: freq.wednesday, label: 'Wed', key: 'wednesday' },
      { checked: freq.thursday, label: 'Thu', key: 'thursday' },
      { checked: freq.friday, label: 'Fri', key: 'friday' },
      { checked: freq.saturday, label: 'Sat', key: 'saturday' },
      { checked: freq.sunday, label: 'Sun', key: 'sunday' },
      { checked: freq.orAsRequested, label: 'As Req', key: '' },
    ];

    const selectedDays = days.filter(d => d.checked).map(d => d.label).join(', ');
    if (selectedDays) {
      leftY = renderFieldTwoCol(doc, 'Days', selectedDays, leftY, COL_LEFT_X, COL_WIDTH);
    }

    // Hours per day from customer info (always shown when available)
    if (ci.hoursPerDay) {
      leftY = renderFieldTwoCol(doc, 'Hours/Day', ci.hoursPerDay, leftY, COL_LEFT_X, COL_WIDTH);
    }

    // Per-day start/end times from daySchedules (shown when filled in)
    const dayTimes = days
      .filter(d => d.checked && d.key && freq.daySchedules[d.key])
      .map(d => ({ ...d, sch: freq.daySchedules[d.key] }))
      .filter(d => d.sch.from || d.sch.to);

    if (dayTimes.length > 0) {
      const allSame = dayTimes.every(
        d => d.sch.from === dayTimes[0].sch.from && d.sch.to === dayTimes[0].sch.to
      );
      if (allSame) {
        const from = formatTime(dayTimes[0].sch.from) || '?';
        const to = formatTime(dayTimes[0].sch.to) || '?';
        leftY = renderFieldTwoCol(doc, 'Time', `${from} – ${to}`, leftY, COL_LEFT_X, COL_WIDTH);
      } else {
        for (const d of dayTimes) {
          const from = formatTime(d.sch.from) || '?';
          const to = formatTime(d.sch.to) || '?';
          leftY = renderFieldTwoCol(doc, `  ${d.label}`, `${from} – ${to}`, leftY, COL_LEFT_X, COL_WIDTH);
        }
      }
    }

    if (freq.duration) {
      leftY = renderFieldTwoCol(doc, 'Notes', freq.duration, leftY, COL_LEFT_X, COL_WIDTH);
    }
  }
  leftY += 2;

  // Additional (left column, below schedule)
  if (data.assignedCaregiver || data.serviceDeposit) {
    leftY = renderSubsectionTitleTwoCol(doc, 'Additional', leftY, COL_LEFT_X, COL_WIDTH);
    if (data.assignedCaregiver) leftY = renderFieldTwoCol(doc, 'Caregiver', data.assignedCaregiver, leftY, COL_LEFT_X, COL_WIDTH);
    if (data.serviceDeposit) leftY = renderFieldTwoCol(doc, 'Deposit', `$${data.serviceDeposit}`, leftY, COL_LEFT_X, COL_WIDTH);
    leftY += 2;
  }

  // ── RIGHT COLUMN ─────────────────────────────────────────────────────────

  // Payment Terms
  rightY = renderSubsectionTitleTwoCol(doc, 'Payment Terms', rightY, COL_RIGHT_X, COL_WIDTH);

  const pt = data.paymentTerms;
  if (pt.rateType === 'liveIn') {
    rightY = renderFieldTwoCol(doc, 'Rate Type', 'Live-In', rightY, COL_RIGHT_X, COL_WIDTH);
    if (pt.liveInRate) rightY = renderFieldTwoCol(doc, 'Live-In Rate', pt.liveInRate, rightY, COL_RIGHT_X, COL_WIDTH);
  } else if (pt.rateType === 'hourly' || pt.hourlyRateOption) {
    rightY = renderFieldTwoCol(doc, 'Rate Type', 'Hourly', rightY, COL_RIGHT_X, COL_WIDTH);
    const rateLabel = pt.hourlyRateOption === '35/38' ? '$35 wkday / $38 wkend'
      : pt.hourlyRateOption === '38/40' ? '$38 wkday / $40 wkend'
      : pt.hourlyRateOption === 'custom' ? (pt.customHourlyRate || '—')
      : '—';
    rightY = renderFieldTwoCol(doc, 'Hourly Rate', rateLabel, rightY, COL_RIGHT_X, COL_WIDTH);
  }
  rightY = renderFieldTwoCol(doc, 'Holiday Rates', pt.holidayRatesApply ? 'Yes' : 'No', rightY, COL_RIGHT_X, COL_WIDTH);
  rightY += 2;

  // Level of Service
  rightY = renderSubsectionTitleTwoCol(doc, 'Level of Service', rightY, COL_RIGHT_X, COL_WIDTH);

  const los = data.levelOfService;
  const losLabel = buildSelectedList([
    { selected: los.cna, label: 'CNA' },
    { selected: los.chha, label: 'CHHA' },
    { selected: los.other, label: los.otherText || 'Other' },
  ]);
  rightY = renderFieldTwoCol(doc, 'Service Level', losLabel || '—', rightY, COL_RIGHT_X, COL_WIDTH);
  rightY += 2;

  // Method of Payment
  rightY = renderSubsectionTitleTwoCol(doc, 'Method of Payment', rightY, COL_RIGHT_X, COL_WIDTH);

  const mop = data.methodOfPayment;
  const payLabel = buildSelectedList([
    { selected: mop.check, label: 'Check' },
    { selected: mop.creditCard, label: 'Credit Card' },
    { selected: mop.achEft, label: 'ACH/EFT' },
    { selected: mop.longTermCareInsurance, label: 'LTC Insurance' },
  ]);
  rightY = renderFieldTwoCol(doc, 'Payment', payLabel || '—', rightY, COL_RIGHT_X, COL_WIDTH);

  if (mop.longTermCareInsurance) {
    if (mop.insurancePolicyName) rightY = renderFieldTwoCol(doc, 'Policy Name', mop.insurancePolicyName, rightY, COL_RIGHT_X, COL_WIDTH);
    if (mop.insurancePolicyNumber) rightY = renderFieldTwoCol(doc, 'Policy #', mop.insurancePolicyNumber, rightY, COL_RIGHT_X, COL_WIDTH);
    if (mop.insuranceContactName) rightY = renderFieldTwoCol(doc, 'Contact', mop.insuranceContactName, rightY, COL_RIGHT_X, COL_WIDTH);
    if (mop.insuranceContactAddress) rightY = renderFieldTwoCol(doc, 'Addr', mop.insuranceContactAddress, rightY, COL_RIGHT_X, COL_WIDTH);
    if (mop.insuranceContactPhone) rightY = renderFieldTwoCol(doc, 'Phone', mop.insuranceContactPhone, rightY, COL_RIGHT_X, COL_WIDTH);
    if (mop.insuranceContactRelationship) rightY = renderFieldTwoCol(doc, 'Relationship', mop.insuranceContactRelationship, rightY, COL_RIGHT_X, COL_WIDTH);
  }
  rightY += 2;

  // Billing Person (right column, below payment)
  const bp = data.billingPerson;
  if (bp.name || bp.phone) {
    rightY = renderSubsectionTitleTwoCol(doc, 'Billing Person', rightY, COL_RIGHT_X, COL_WIDTH);
    if (bp.name) rightY = renderFieldTwoCol(doc, 'Name', bp.name, rightY, COL_RIGHT_X, COL_WIDTH);
    if (bp.address) rightY = renderFieldTwoCol(doc, 'Address', bp.address, rightY, COL_RIGHT_X, COL_WIDTH);
    if (bp.phone) rightY = renderFieldTwoCol(doc, 'Phone', bp.phone, rightY, COL_RIGHT_X, COL_WIDTH);
    if (bp.relationship) rightY = renderFieldTwoCol(doc, 'Relationship', bp.relationship, rightY, COL_RIGHT_X, COL_WIDTH);
    rightY += 2;
  }

  // Services Selected (right column, below billing person)
  rightY = renderSubsectionTitleTwoCol(doc, 'Services Selected', rightY, COL_RIGHT_X, COL_WIDTH);

  const svc = data.services;
  const svcLabel = buildSelectedList([
    { selected: svc.selfAdminMeds, label: 'Self-Admin Meds' },
    { selected: svc.personalCare, label: 'Personal Care' },
    { selected: svc.homemaking, label: 'Homemaking' },
    { selected: svc.transportation, label: 'Transportation' },
    { selected: svc.companionship, label: 'Companionship' },
    { selected: svc.respiteCare, label: 'Respite Care' },
    { selected: svc.otherNonSkilled, label: svc.otherNonSkilledText || 'Other Non-Skilled' },
  ]);
  rightY = renderFieldTwoCol(doc, 'Services', svcLabel || '—', rightY, COL_RIGHT_X, COL_WIDTH);
  rightY += 2;

  // Draw column divider
  const colBottomY = Math.max(leftY, rightY);
  drawColumnDivider(doc, colStartY, colBottomY);

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL-WIDTH SECTION: Signatures only
  // ═══════════════════════════════════════════════════════════════════════════

  y = colBottomY + 2;

  // --- Signatures (side-by-side in two columns) ---
  y = checkPageBreak(doc, y, 40);
  y = renderSubsectionTitle(doc, 'Signatures', y);

  // Render both signatures in two columns for maximum space efficiency
  let sigLeftY = y;
  let sigRightY = y;

  // Client / Representative signature — left column
  const signerLabel = data.signerIsRepresentative ? 'Auth. Representative' : 'Client';
  if (data.clientPrintName) sigLeftY = renderFieldTwoCol(doc, `${signerLabel}`, data.clientPrintName, sigLeftY, COL_LEFT_X, COL_WIDTH);
  if (data.signerIsRepresentative && data.representativeName) {
    sigLeftY = renderFieldTwoCol(doc, 'Rep. Name', data.representativeName, sigLeftY, COL_LEFT_X, COL_WIDTH);
  }
  if (data.signerIsRepresentative && data.representativeRelationship) {
    sigLeftY = renderFieldTwoCol(doc, 'Relationship', data.representativeRelationship, sigLeftY, COL_LEFT_X, COL_WIDTH);
  }
  if (data.clientSignature) {
    sigLeftY += 1;
    try {
      doc.addImage(data.clientSignature, 'PNG', COL_LEFT_X + 2, sigLeftY, COL_WIDTH - 10, 14);
    } catch { /* skip if image fails */ }
    sigLeftY += 14;
    // Signature line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(COL_LEFT_X + 2, sigLeftY, COL_LEFT_X + COL_WIDTH - 8, sigLeftY);
    sigLeftY += 2.5;
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`${signerLabel} Signature`, COL_LEFT_X + 2, sigLeftY);
    if (data.clientSignatureMeta?.timestamp) {
      doc.text(`Date: ${data.clientSignatureMeta.timestamp}`, COL_LEFT_X + COL_WIDTH - 8, sigLeftY, { align: 'right' });
    }
    sigLeftY += 3;
  }

  // EHC Rep signature — right column
  if (data.ehcRepName) sigRightY = renderFieldTwoCol(doc, 'EHC Rep', data.ehcRepName, sigRightY, COL_RIGHT_X, COL_WIDTH);
  if (data.ehcRepSignature) {
    sigRightY += 1;
    try {
      doc.addImage(data.ehcRepSignature, 'PNG', COL_RIGHT_X + 2, sigRightY, COL_WIDTH - 10, 14);
    } catch { /* skip if image fails */ }
    sigRightY += 14;
    // Signature line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(COL_RIGHT_X + 2, sigRightY, COL_RIGHT_X + COL_WIDTH - 8, sigRightY);
    sigRightY += 2.5;
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('EHC Representative Signature', COL_RIGHT_X + 2, sigRightY);
    if (data.ehcRepSignatureMeta?.timestamp) {
      doc.text(`Date: ${data.ehcRepSignatureMeta.timestamp}`, COL_RIGHT_X + COL_WIDTH - 8, sigRightY, { align: 'right' });
    }
    sigRightY += 3;
  }

  y = Math.max(sigLeftY, sigRightY);

  return y + 4;
}
