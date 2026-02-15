import type { jsPDF } from 'jspdf';
import type { TermsConditionsData } from '../../../types/serviceContract';
import { PDF_MARGIN, PDF_COLORS, FONT_SIZES, CONTENT_WIDTH, checkPageBreak, SIGNATURE_META_FONT } from '../pdfStyles';
import { renderSectionTitle, renderSubsectionTitle } from './pdfHeader';

/**
 * Render a block of legal text with paragraph wrapping.
 * Returns the new y position after the text.
 */
function renderLegalParagraph(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 8);
  y = checkPageBreak(doc, y, lines.length * 3 + 2);
  doc.text(lines, PDF_MARGIN.left + 4, y);
  y += lines.length * 3;
  return y;
}

/**
 * Render a bold inline heading followed by paragraph text.
 */
function renderLegalHeadedParagraph(doc: jsPDF, heading: string, text: string, y: number): number {
  y = checkPageBreak(doc, y, 10);
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(heading, PDF_MARGIN.left + 4, y);
  doc.setFont('helvetica', 'normal');
  y += 3.5;
  return renderLegalParagraph(doc, text, y);
}

/**
 * Render initials field in the PDF as "Initials: XX" with label.
 */
function renderInitialsField(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPageBreak(doc, y, 8);
  y += 2;
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...PDF_COLORS.label);
  doc.setFont('helvetica', 'italic');
  doc.text(`${label}:`, PDF_MARGIN.left + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  const labelW = doc.getTextWidth(`${label}: `);
  doc.text(value || '____', PDF_MARGIN.left + 4 + labelW, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  return y;
}

export function renderServiceAgreementTerms(doc: jsPDF, data: TermsConditionsData, startY: number): number {
  let y = startY;

  y = renderSectionTitle(doc, '1b. Terms & Conditions', y);

  // --- Non-Solicitation ---
  y = renderSubsectionTitle(doc, 'Non-Solicitation Agreement', y);

  y = renderLegalParagraph(doc,
    'I agree that any time this Agreement is in effect and for a period of one (1) year from the termination of this Agreement by either party, I will not hire any employee or independent contractor of Executive Home Care, on any basis whatsoever, nor will I directly or indirectly, solicit, induce, recruit or encourage any of Executive Home Care\'s employees or independent contractors to leave their employment with Executive Home Care.',
    y,
  );
  y += 2;
  y = renderLegalParagraph(doc,
    'I acknowledge that a violation of this Non-Solicitation Agreement will damage Executive Home Care and may result in Executive Home Care bringing legal action against me seeking Liquidated Damages in the sum of $25,000.00 for each employee wrongfully solicited as set forth herein, plus additional monetary damages as allowed by law and/or injunctive relief. In the event of a violation of this Non-Solicitation Agreement I agree to pay Executive Home Care\'s entire attorney\'s fees, disbursements and costs resulting there from.',
    y,
  );
  y = renderInitialsField(doc, 'Non-Solicitation Initials', data.nonSolicitationInitial, y);
  y += 2;

  // --- Terms of Payment ---
  y = checkPageBreak(doc, y, 30);
  y = renderSubsectionTitle(doc, 'Terms of Payment', y);

  y = renderLegalHeadedParagraph(doc, '1. Fees',
    'The payment terms and rates set forth above are based upon our current fees for the type of services required based upon the Plan of Care prepared for you. Our invoices will include any disbursements made on your behalf such as travel, telephone, mailing and/or purchase of personal items on your behalf. Should your condition change necessitating a modification of the Plan of Care or should we amend or adjust our billable rate schedule, you will be notified of the proposed rate modification in writing no less than seven (7) days before the new rates go into effect.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, '2. Holidays / Overtime',
    'All Overtime will be billed at a rate of 1.5 times the Hourly Rate in effect at the time. All services that exceed forty (40) hours per week for a specific employee will be charged at the Overtime Rate. When we provide services on New Year\'s Day, Memorial Day, Easter, Independence Day, Labor Day, Thanksgiving Day or Christmas Day, you will be charged the Overtime Rate. The holiday period is the twenty-four hour period that starts the evening before the holiday.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, '3. Insurance',
    'I understand that Executive Home Care only accepts assignment of certain select Long Term Care Insurance Policies. I have been advised that Executive Home Care will not file Medicare or Medicaid claims on my behalf nor initiate a claim with my Long Term Care Insurer. I understand that I am responsible to obtain and complete all appropriate paperwork from my insurance company. I acknowledge that receipt of any pre-approval or pre-certification from my Insurance Company is not a guaranty of payment. I acknowledge that I am obligated to pay any sums due to Executive Home Care that are not paid by my insurance company.',
    y,
  );
  y += 2;

  y = renderLegalParagraph(doc,
    'Invoices are payable upon receipt. I have requested home health services from Executive Home Care and understand that by making this request, I become fully financially responsible for any and all charges incurred in the course of the treatment authorized or services rendered. I understand that employee time sheets must be signed on a daily basis and at the end of the work week in order to confirm the hours/days of services rendered. A finance charge of eighteen percent (18%) per annum will be charged on all invoices past due for 30 days from the date on the invoice. Should any balance be referred for collection, you further agree to pay all reasonable costs of collection including attorney\'s fees, disbursements, court costs and interest. Executive Home Care reserves the right to discharge any client for nonpayment of charges upon three (3) days written notice.',
    y,
  );
  y = renderInitialsField(doc, 'Terms of Payment Initials', data.termsOfPaymentInitial, y);
  y += 2;

  // --- Card Payment Surcharge ---
  y = checkPageBreak(doc, y, 20);
  y = renderSubsectionTitle(doc, 'Card Payment Surcharge', y);

  y = renderLegalParagraph(doc,
    'A processing surcharge of three percent (3%) will be applied to all payments made by credit card, debit card, or any other card-based payment method, regardless of card type or issuing network. This surcharge covers the cost of electronic payment processing and will be reflected as a separate line item on your invoice. By electing to pay via card, you acknowledge and agree to this surcharge. To avoid this surcharge, you may choose to pay by check or ACH/EFT bank transfer.',
    y,
  );
  y = renderInitialsField(doc, 'Card Surcharge Initials', data.cardSurchargeInitial, y);
  y += 2;

  // --- Weather / Live-In / Valuables ---
  y = checkPageBreak(doc, y, 20);
  y = renderSubsectionTitle(doc, 'Severe Weather, Live-In & Valuables', y);

  y = renderLegalHeadedParagraph(doc, 'Severe/Bad Weather',
    'In severe weather, Executive Home Care may determine it is not safe for our Home Care Workers to travel and provide services to your home that day and may have to cancel that day\'s service. When this occurs we will notify you and reschedule.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Live-In Caregivers',
    'I understand that reasonable groceries/meals and suitable sleeping arrangements must be provided for the Live-In caregiver.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Valuables',
    'Our employees are not authorized to accept, have custody of or have the use of cash, credit or debit cards, bankcards, checks or other valuables belonging to you, without written approval in advance. Any and all suspicions of theft or misappropriation of valuables must be directed to Executive Home Care in writing with proof of the allegations. I agree not to hold Executive Home Care or its employees responsible for any physical loss or damage to, or loss of use of, any of Client\'s property while outside the care or control of an Executive Home Care employee.',
    y,
  );
  y += 2;

  // --- Termination ---
  y = checkPageBreak(doc, y, 25);
  y = renderSubsectionTitle(doc, 'Termination of Agreement', y);

  y = renderLegalHeadedParagraph(doc, 'Termination by Client',
    'I have the right to change or terminate service at any time. If I change or suspend service with less than twenty-four hours notice, I may be subject to incurring charges for the service scheduled during that twenty-four (24) hour period. Except in cases of emergency, all notices of change or notices terminating this Agreement should be in writing.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Termination by Executive Home Care',
    'Executive Home Care reserves the right to terminate this Agreement for any cause upon three (3) days written notice (except in cases of emergency). Termination may be based upon: (1) Client no longer requires our services, (2) Client\'s home is no longer adequate for safe and effective care, (3) Client is no longer under the care of a physician, (4) Fees for services have not been paid, (5) Client no longer lives in the geographic area, (6) Client and/or family fail to cooperate.',
    y,
  );
  y = renderInitialsField(doc, 'Termination Initials', data.terminationInitial, y);
  y += 2;

  // --- Authorization, Consent, Medical ---
  y = checkPageBreak(doc, y, 30);
  y = renderSubsectionTitle(doc, 'Authorization, Consent & Medical Services', y);

  y = renderLegalHeadedParagraph(doc, 'Authorization for Payment and Release of Information',
    'I authorize Executive Home Care to process claims for payment on my behalf for covered services rendered to me. I authorize the release of necessary information, including medical information, regarding this or any related service or claim to my insurance carrier(s), billing agents, collection agents, attorneys, and as applicable, any federal or state agency for the purpose of satisfying charges and/or facilitating utilization review.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Consent for Treatment',
    'I authorize Executive Home Care and its health care personnel, employees, and contractors, under the orders of my Physician (if needed) to provide home health care services. I authorize health care personnel to examine me in order to determine whether I am appropriate for the level of care offered by Executive Home Care.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Medical Services',
    'I acknowledge that Executive Home Care caregivers are not qualified or authorized to provide any medical services to the Client. If a medical emergency arises while an Executive Home Care employee is providing services, that employee will not provide any medical services but may call 911 for emergency assistance. I agree to hold harmless Executive Home Care and its employee for any medical or other care that the employee may provide from instructions given by any 911 service provider.',
    y,
  );
  y = renderInitialsField(doc, 'Authorization & Consent Initials', data.authorizationConsentInitial, y);
  y += 2;

  // --- Dispute Resolution & Related Documents ---
  y = checkPageBreak(doc, y, 25);
  y = renderSubsectionTitle(doc, 'Dispute Resolution & Related Documents', y);

  y = renderLegalHeadedParagraph(doc, 'Dispute Resolution',
    'This Agreement shall be governed by, and construed in accordance with the laws of the State of Pennsylvania and will be litigated in that State or in the Federal Courts located within that State.',
    y,
  );
  y += 2;

  y = renderLegalHeadedParagraph(doc, 'Related Documents',
    'I hereby acknowledge receipt of Notice of Privacy Practices (HIPAA), a Statement of your Rights and Responsibilities as a Home Care Client, Grievance Reporting Procedures, Agency Contact Information, Emergency Planning Information, and Advanced Directive Information. By entering into this Service Agreement I am stating that I have read and understood the information and that I agree to be bound by the terms contained therein.',
    y,
  );
  y += 2;

  doc.setFontSize(SIGNATURE_META_FONT);
  doc.setTextColor(...PDF_COLORS.label);
  doc.setFont('helvetica', 'italic');
  const noteText = 'A copy of the document authorizing the representation (Power of Attorney, Court Order Appointing Guardian, etc.) must be attached hereto and made a part hereof.';
  const noteLines = doc.splitTextToSize(noteText, CONTENT_WIDTH - 8);
  y = checkPageBreak(doc, y, noteLines.length * 2.5 + 4);
  doc.text(noteLines, PDF_MARGIN.left + 4, y);
  doc.setFont('helvetica', 'normal');
  y += noteLines.length * 2.5;

  y = renderInitialsField(doc, 'Related Documents Initials', data.relatedDocumentsInitial, y);

  return y + 6;
}
