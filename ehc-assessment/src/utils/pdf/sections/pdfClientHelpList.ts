import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClientHelpListData } from '../../../types/forms';
import { PDF_MARGIN, PDF_COLORS, CONTENT_WIDTH, HEADER_HEIGHT, checkPageBreak, drawContentBoxFill, drawContentBoxBorder, TABLE_FONT_SIZE, TABLE_CELL_PADDING, ALTERNATE_ROW_COLOR, TABLE_LINE_COLOR, TABLE_LINE_WIDTH } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle, renderField } from './pdfHeader';

export function renderClientHelpList(doc: jsPDF, data: ClientHelpListData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '1. Client Help List', y);

  // Client info fields in a background box
  const boxTop = y;
  drawContentBoxFill(doc, boxTop);

  y += 4;
  y = renderField(doc, 'Client Name', data.clientName, y);
  y = renderField(doc, 'Date of Birth', data.dateOfBirth, y);
  y = renderField(doc, 'Address', data.clientAddress, y);
  y = renderField(doc, 'Phone', data.clientPhone, y);
  y = renderField(doc, 'Referral Agency', data.referralAgency, y);
  y = renderField(doc, 'Date', data.date, y);

  if (data.goals) {
    y = renderField(doc, 'Goals', data.goals, y);
  }
  y += 3;
  drawContentBoxBorder(doc, boxTop, y - boxTop);

  // Emergency Contacts table
  const contacts = data.emergencyContacts.filter(c => c.name);
  if (contacts.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = renderSubsectionTitle(doc, 'Emergency Contacts', y);

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      head: [['Name', 'Relationship', 'Address', 'Phone 1', 'Phone 2', 'Email']],
      body: contacts.map(c => [c.name, c.relationship, c.address, c.phone1, c.phone2, c.email]),
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
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

  // Doctors table
  const doctors = data.doctors.filter(d => d.name);
  if (doctors.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = renderSubsectionTitle(doc, 'Doctor Information', y);

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_HEIGHT, left: PDF_MARGIN.left, right: PDF_MARGIN.right },
      head: [['Doctor Name', 'Type', 'Phone']],
      body: doctors.map(d => [d.name, d.type, d.phone]),
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: TABLE_CELL_PADDING, textColor: PDF_COLORS.text, lineColor: TABLE_LINE_COLOR, lineWidth: TABLE_LINE_WIDTH },
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

  // Hospitals / Neighbors / Health events in a box
  const filledHospitals = data.hospitals.filter(hp => hp.name);
  const filledNeighbors = data.neighbors.filter(n => n.name);
  const hasHealth = !!data.healthRecentlyEvents;
  if (filledHospitals.length > 0 || filledNeighbors.length > 0 || hasHealth) {
    y = checkPageBreak(doc, y, 20);
    y = renderSubsectionTitle(doc, 'Additional Information', y);
    const extraBoxTop = y;
    drawContentBoxFill(doc, extraBoxTop);
    y += 4;
    filledHospitals.forEach((hp, i) => {
      y = renderField(doc, `Hospital ${i + 1}`, hp.name, y);
    });
    filledNeighbors.forEach((n, i) => {
      const label = `Neighbor ${filledNeighbors.length > 1 ? i + 1 : ''}`.trim();
      y = renderField(doc, label, `${n.name} - ${n.phone || 'No phone'}${n.hasKeys === 'yes' ? ' (has keys)' : ''}`, y);
    });
    if (hasHealth) {
      y = renderField(doc, 'Recent Health Events', data.healthRecentlyEvents, y);
    }
    y += 3;
    drawContentBoxBorder(doc, extraBoxTop, y - extraBoxTop);
  }

  return y + 4;
}
