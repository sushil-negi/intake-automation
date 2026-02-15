import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { HomeSafetyChecklistData, SafetyItem } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, HEADER_HEIGHT, checkPageBreak, drawContentBoxFill, drawContentBoxBorder, TABLE_FONT_SIZE, TABLE_CELL_PADDING, ALTERNATE_ROW_COLOR, TABLE_LINE_COLOR, TABLE_LINE_WIDTH } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField, renderSignatureBlock } from './pdfHeader';

// Mirror the safety sections from the component
interface SafetyQuestionDef {
  id: string;
  label: string;
  concernAnswer: 'yes' | 'no';
}

interface SafetySectionDef {
  key: keyof HomeSafetyChecklistData;
  title: string;
  items: SafetyQuestionDef[];
}

const SAFETY_SECTIONS: SafetySectionDef[] = [
  {
    key: 'entrance', title: 'Entrance to the Home',
    items: [
      { id: 'outsideLights', label: 'Outside lights covering sidewalks/entrances', concernAnswer: 'no' },
      { id: 'stepsCondition', label: 'Steps & sidewalks in good condition', concernAnswer: 'no' },
      { id: 'railingsSecure', label: 'Railings on outside steps secure', concernAnswer: 'no' },
      { id: 'peephole', label: 'Functional peephole in front door', concernAnswer: 'no' },
      { id: 'deadbolt', label: 'Deadbolt (no key from inside)', concernAnswer: 'no' },
    ],
  },
  {
    key: 'general', title: 'General',
    items: [
      { id: 'evacuationPlan', label: 'Emergency evacuation plan', concernAnswer: 'no' },
      { id: 'smokeDetectors', label: 'Working smoke detectors', concernAnswer: 'no' },
      { id: 'fireExtinguisher', label: 'Fire extinguisher ready', concernAnswer: 'no' },
      { id: 'hallsFreeClutter', label: 'Halls/stairways free of clutter', concernAnswer: 'no' },
      { id: 'throwRugs', label: 'Throw rugs in client areas', concernAnswer: 'yes' },
      { id: 'handrails', label: 'Handrails by steps/stairs', concernAnswer: 'no' },
      { id: 'electricalCords', label: 'Electrical cords un-frayed/placed safely', concernAnswer: 'no' },
      { id: 'coverPlates', label: 'Cover plates on outlets', concernAnswer: 'no' },
      { id: 'areaRugsSecured', label: 'Area rugs secured around edges', concernAnswer: 'no' },
      { id: 'hazardousProducts', label: 'Hazardous products labeled/secured', concernAnswer: 'no' },
      { id: 'stoolNeeded', label: 'Stool needed for high shelves', concernAnswer: 'yes' },
      { id: 'smokeInHome', label: 'Anyone smokes in home', concernAnswer: 'yes' },
      { id: 'oxygenUse', label: 'Oxygen use in home', concernAnswer: 'yes' },
      { id: 'petsInHome', label: 'Pets in home', concernAnswer: 'yes' },
      { id: 'pestFree', label: 'Home appears pest free', concernAnswer: 'no' },
      { id: 'materialsProperHeight', label: 'Care materials at proper height', concernAnswer: 'no' },
      { id: 'emergencyResponse', label: 'Emergency response necklace/bracelet', concernAnswer: 'no' },
    ],
  },
  {
    key: 'medications', title: 'Medications',
    items: [
      { id: 'medsMarkedClearly', label: 'Medications marked clearly', concernAnswer: 'no' },
      { id: 'pillBox', label: 'Uses pill box/pill minder', concernAnswer: 'no' },
      { id: 'expiredMeds', label: 'Concerns about expired medications', concernAnswer: 'yes' },
      { id: 'skippingMeds', label: 'Concern about skipping medications', concernAnswer: 'yes' },
      { id: 'medsEasyReach', label: 'Medications within easy reach', concernAnswer: 'no' },
      { id: 'moreThan5Meds', label: 'Takes more than 5 daily medicines', concernAnswer: 'yes' },
    ],
  },
  {
    key: 'medicalEquipment', title: 'Medical Equipment / Supplies',
    items: [
      { id: 'sharpsContainer', label: 'Needles in sharps container', concernAnswer: 'no' },
      { id: 'oxygenTubing', label: 'Oxygen tubing off walking path', concernAnswer: 'no' },
      { id: 'equipmentStored', label: 'Equipment properly stored', concernAnswer: 'no' },
    ],
  },
  {
    key: 'livingAreas', title: 'Living Areas',
    items: [
      { id: 'doorwaysWide', label: 'Doorways wide for wheelchair/walker', concernAnswer: 'no' },
      { id: 'lightSwitches', label: 'Light switches accessible', concernAnswer: 'no' },
      { id: 'sofasChairsHeight', label: 'Sofas/chairs proper height', concernAnswer: 'no' },
      { id: 'telephone', label: 'Telephone in home', concernAnswer: 'no' },
      { id: 'emergencyNumbers', label: 'Emergency numbers by phone', concernAnswer: 'no' },
      { id: 'cordsAcrossWalking', label: 'Cords across walking areas', concernAnswer: 'yes' },
      { id: 'castorsWheels', label: 'Castors/wheels on furniture', concernAnswer: 'yes' },
      { id: 'armrests', label: 'Furniture has armrests', concernAnswer: 'no' },
    ],
  },
  {
    key: 'bathroom', title: 'Bathroom',
    items: [
      { id: 'glassDoors', label: 'Glass doors on bathtub/shower', concernAnswer: 'yes' },
      { id: 'nonSkidSurface', label: 'Non-skid surface in tub/shower', concernAnswer: 'no' },
      { id: 'grabBars', label: 'Grab bars by tub/shower/toilet', concernAnswer: 'no' },
      { id: 'raisedToilet', label: 'Raised toilet seat', concernAnswer: 'no' },
      { id: 'waterHeater', label: 'Water heater temp checked', concernAnswer: 'no' },
      { id: 'showerBench', label: 'Shower bench with hand-held wand', concernAnswer: 'no' },
      { id: 'bathroomNightLight', label: 'Bathroom night light', concernAnswer: 'no' },
    ],
  },
  {
    key: 'bedroom', title: 'Bedroom',
    items: [
      { id: 'scatterRugs', label: 'Scatter rugs present', concernAnswer: 'yes' },
      { id: 'bedHeight', label: 'Bed below back-of-knee height', concernAnswer: 'yes' },
      { id: 'chairArmrests', label: 'Chair with armrests & firm seat', concernAnswer: 'no' },
      { id: 'furnitureCastors', label: 'Furniture castors/wheels lock', concernAnswer: 'no' },
      { id: 'bedroomPhone', label: 'Phone accessible from bed', concernAnswer: 'no' },
      { id: 'bedroomEmergencyNumbers', label: 'Emergency numbers by bed phone', concernAnswer: 'no' },
      { id: 'flashlightBed', label: 'Flashlight/lamp beside bed', concernAnswer: 'no' },
      { id: 'bedroomNightLight', label: 'Bedroom night light', concernAnswer: 'no' },
    ],
  },
  {
    key: 'kitchen', title: 'Kitchen',
    items: [
      { id: 'floorSlippery', label: 'Floor waxed/slippery', concernAnswer: 'yes' },
      { id: 'flammableItems', label: 'Flammable items near heat', concernAnswer: 'yes' },
      { id: 'applianceButtons', label: 'Appliance buttons work', concernAnswer: 'no' },
      { id: 'itemsStoredProperly', label: 'Items stored eye-to-knee level', concernAnswer: 'no' },
      { id: 'unclutteredWorkspace', label: 'Uncluttered work space near cooking', concernAnswer: 'no' },
    ],
  },
  {
    key: 'lighting', title: 'Lighting',
    items: [
      { id: 'nightLightsStairs', label: 'Night lights in stairways/hallways', concernAnswer: 'no' },
      { id: 'lightSwitchStairs', label: 'Light switch top & bottom of stairs', concernAnswer: 'no' },
      { id: 'lightSwitchDoorway', label: 'Light switch by each doorway', concernAnswer: 'no' },
    ],
  },
  {
    key: 'security', title: 'Security',
    items: [
      { id: 'securityCompany', label: 'Security company services', concernAnswer: 'no' },
      { id: 'doorWindowAlarms', label: 'Door/window alarms', concernAnswer: 'no' },
    ],
  },
  {
    key: 'ancillaryServices', title: 'Ancillary Services',
    items: [
      { id: 'lifeAid', label: 'LifeAid', concernAnswer: 'no' },
      { id: 'medicationStation', label: 'Medication Station', concernAnswer: 'no' },
    ],
  },
];

function getItemData(sectionData: Record<string, SafetyItem>, itemId: string): SafetyItem {
  const raw = sectionData[itemId];
  if (raw && typeof raw === 'object' && 'answer' in raw) return raw;
  return { answer: (typeof raw === 'string' ? raw : '') as SafetyItem['answer'], note: '' };
}

export function renderHomeSafety(doc: jsPDF, data: HomeSafetyChecklistData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '5. Home Safety Checklist', y);

  for (const section of SAFETY_SECTIONS) {
    y = checkPageBreak(doc, y, 25);

    const sectionData = (data[section.key] as Record<string, SafetyItem>) || {};

    // Build table rows
    const rows: (string | { content: string; styles: object })[][] = [];
    for (const item of section.items) {
      const itemData = getItemData(sectionData, item.id);
      const answer = itemData.answer || '—';
      const isConcern = itemData.answer !== '' && itemData.answer !== 'na' && itemData.answer === item.concernAnswer;

      const answerDisplay = answer === 'yes' ? 'Yes' : answer === 'no' ? 'No' : answer === 'na' ? 'N/A' : '—';

      if (isConcern) {
        rows.push([
          { content: item.label, styles: { textColor: PDF_COLORS.red } },
          { content: answerDisplay, styles: { textColor: PDF_COLORS.red, fontStyle: 'bold' } },
          { content: itemData.note || '', styles: { textColor: PDF_COLORS.red, fontStyle: 'italic' } },
        ]);
      } else {
        rows.push([item.label, answerDisplay, itemData.note || '']);
      }
    }

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      head: [[
        { content: section.title, colSpan: 3, styles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: TABLE_FONT_SIZE } },
      ]],
      body: rows,
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, overflow: 'linebreak', lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
      columnStyles: {
        0: { cellWidth: CONTENT_WIDTH * 0.55 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: CONTENT_WIDTH * 0.45 - 15, fontStyle: 'italic' },
      },
      alternateRowStyles: { fillColor: ALTERNATE_ROW_COLOR },
      tableWidth: CONTENT_WIDTH,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }

  // Comments in a content box
  if (data.itemsNeedingAttention) {
    y = checkPageBreak(doc, y, 15);
    y = renderSubsectionTitle(doc, 'Comments & Items Needing Attention', y);
    const commentBoxTop = y;
    drawContentBoxFill(doc, commentBoxTop);
    y += 4;
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...PDF_COLORS.text);
    const lines = doc.splitTextToSize(data.itemsNeedingAttention, CONTENT_WIDTH - 8);
    doc.text(lines, PDF_MARGIN.left + 4, y);
    y += lines.length * 3 + 4;
    drawContentBoxBorder(doc, commentBoxTop, y - commentBoxTop);
  }

  // Signatures
  y = checkPageBreak(doc, y, 45);
  y += 2;

  // Client signature
  if (data.signerName) y = renderField(doc, 'Signing Party', data.signerName, y);
  if (data.clientSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.clientSignature, 'Client / Consumer Signature', data.clientSignatureMeta?.timestamp || '', y);
  }

  // EHC Rep signature
  if (data.ehcStaffName) y = renderField(doc, 'EHC Staff', data.ehcStaffName, y + 2);
  if (data.representativeSignature) {
    y += 2;
    y = renderSignatureBlock(doc, data.representativeSignature, 'EHC Representative Signature', data.representativeSignatureMeta?.timestamp || '', y);
  }

  return y + 4;
}
