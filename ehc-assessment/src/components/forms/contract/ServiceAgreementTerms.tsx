import { SectionHeader } from '../../ui/FormFields';
import { InitialsInput } from '../../ui/InitialsInput';
import type { TermsConditionsData } from '../../../types/serviceContract';

interface Props {
  data: TermsConditionsData;
  onChange: (partial: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

/* ---------- legal clause blocks ---------- */

function LegalClause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{title}</h4>
      <div className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600">
        {children}
      </div>
    </div>
  );
}

export function ServiceAgreementTerms({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6 pt-4">
      <SectionHeader
        title="Terms & Conditions"
        subtitle="Please read each section carefully and initial where indicated to confirm understanding."
      />

      {/* ========== Non-Solicitation Agreement ========== */}
      <LegalClause title="Non-Solicitation Agreement">
        <p>
          I agree that any time this Agreement is in effect and for a period of one (1) year from
          the termination of this Agreement by either party, I will not hire any employee or
          independent contractor of Executive Home Care, on any basis whatsoever, nor will I
          directly or indirectly, solicit, induce, recruit or encourage any of Executive Home
          Care&apos;s employees or independent contractors to leave their employment with Executive
          Home Care.
        </p>
        <p className="mt-2">
          I acknowledge that a violation of this Non-Solicitation Agreement will damage Executive
          Home Care and may result in Executive Home Care bringing legal action against me seeking
          Liquidated Damages in the sum of $25,000.00 for each employee wrongfully solicited as set
          forth herein, plus additional monetary damages as allowed by law and/or injunctive relief.
          In the event of a violation of this Non-Solicitation Agreement I agree to pay Executive
          Home Care&apos;s entire attorney&apos;s fees, disbursements and costs resulting there from.
        </p>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Non-Solicitation"
          value={data.nonSolicitationInitial}
          onChange={val => onChange({ nonSolicitationInitial: val })}
          error={errors?.nonSolicitationInitial}
        />
      </div>

      {/* ========== Terms of Payment ========== */}
      <LegalClause title="Terms of Payment">
        <p className="font-semibold text-gray-800 dark:text-slate-200 mb-1">1. Fees</p>
        <p>
          The payment terms and rates set forth are based upon our current fees for the type of
          services required based upon the Plan of Care prepared for you. Our invoices will include
          any disbursements made on your behalf such as travel, telephone, mailing and/or purchase
          of personal items on your behalf. Should your condition change necessitating a modification
          of the Plan of Care (such as a change from Live In to Hourly) or should we amend or adjust
          our billable rate schedule, you will be notified of the proposed rate modification in
          writing no less than seven (7) days before the new rates go into effect.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">2. Holidays / Overtime</p>
        <p>
          All Overtime will be billed at a rate of 1.5 times the Hourly Rate in effect at the time.
          All services that exceed forty (40) hours per week for a specific employee will be charged
          at the Overtime Rate. When we provide services on New Year&apos;s Day, Memorial Day, Easter,
          Independence Day, Labor Day, Thanksgiving Day or Christmas Day, you will be charged the
          Overtime Rate. The holiday period is the twenty-four hour period that starts the evening
          before the holiday.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">3. Insurance</p>
        <p>
          I understand that Executive Home Care only accepts assignment of certain select Long Term
          Care Insurance Policies. I have been advised that Executive Home Care will not file
          Medicare or Medicaid claims on my behalf nor initiate a claim with my Long Term Care
          Insurer. I understand that I am responsible to obtain and complete all appropriate
          paperwork from my insurance company. I acknowledge that receipt of any pre-approval or
          pre-certification from my Insurance Company is not a guaranty of payment. I acknowledge
          that I am obligated to pay any sums due to Executive Home Care that are not paid by my
          insurance company.
        </p>
        <p className="mt-3">
          Invoices are payable upon receipt. I have requested home health services from Executive
          Home Care and understand that by making this request, I become fully financially
          responsible for any and all charges incurred in the course of the treatment authorized or
          services rendered. I understand that employee time sheets must be signed on a daily basis
          and at the end of the work week in order to confirm the hours/days of services rendered.
          A finance charge of eighteen percent (18%) per annum will be charged on all invoices past
          due for 30 days from the date on the invoice. Should any balance be referred for
          collection, you further agree to pay all reasonable costs of collection including
          attorney&apos;s fees, disbursements, court costs and interest. Executive Home Care reserves the
          right to discharge any client for nonpayment of charges upon three (3) days written notice.
        </p>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Terms of Payment"
          value={data.termsOfPaymentInitial}
          onChange={val => onChange({ termsOfPaymentInitial: val })}
          error={errors?.termsOfPaymentInitial}
        />
      </div>

      {/* ========== Card Payment Surcharge ========== */}
      <LegalClause title="Card Payment Surcharge">
        <p>
          A processing surcharge of three percent (3%) will be applied to all payments made by credit
          card, debit card, or any other card-based payment method, regardless of card type or issuing
          network. This surcharge covers the cost of electronic payment processing and will be reflected
          as a separate line item on your invoice. By electing to pay via card, you acknowledge and agree
          to this surcharge. To avoid this surcharge, you may choose to pay by check or ACH/EFT bank
          transfer.
        </p>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Card Surcharge"
          value={data.cardSurchargeInitial}
          onChange={val => onChange({ cardSurchargeInitial: val })}
          error={errors?.cardSurchargeInitial}
        />
      </div>

      {/* ========== Severe Weather / Live-In / Valuables ========== */}
      <LegalClause title="Severe Weather, Live-In Caregivers & Valuables">
        <p className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Severe/Bad Weather</p>
        <p>
          In severe weather, Executive Home Care may determine it is not safe for our Home Care
          Workers to travel and provide services to your home that day and may have to cancel that
          day&apos;s service. When this occurs we will notify you and reschedule.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Live-In Caregivers</p>
        <p>
          I understand that reasonable groceries/meals and suitable sleeping arrangements must be
          provided for the Live-In caregiver.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Valuables</p>
        <p>
          Our employees are not authorized to accept, have custody of or have the use of cash,
          credit or debit cards, bankcards, checks or other valuables belonging to you, without
          written approval in advance. Any and all suspicions of theft or misappropriation of
          valuables must be directed to Executive Home Care in writing with proof of the
          allegations. We will not pay any claims, nor will credits be given for any such
          unauthorized use or misappropriation of valuables. I agree not to hold Executive Home Care
          or its employees responsible for any physical loss or damage to, or loss of use of, any of
          Client&apos;s property while outside the care or control of an Executive Home Care employee.
        </p>
      </LegalClause>

      {/* ========== Termination ========== */}
      <LegalClause title="Termination of Agreement">
        <p className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Termination by Client</p>
        <p>
          I have the right to change or terminate service at any time. If I change or suspend
          service with less than twenty-four hours notice, I may be subject to incurring charges for
          the service scheduled during that twenty-four (24) hour period. Except in cases of
          emergency, all notices of change or notices terminating this Agreement should be in
          writing.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Termination by Executive Home Care</p>
        <p>
          Executive Home Care reserves the right to terminate this Agreement for any cause upon
          three (3) days written notice (except in cases of emergency). Termination may be based
          upon one or more of the following conditions:
        </p>
        <ol className="list-decimal list-inside mt-1 ml-2 space-y-0.5">
          <li>Client no longer requires our services based upon Client&apos;s health or social needs.</li>
          <li>Client&apos;s home is no longer adequate for safe and effective care.</li>
          <li>Client is no longer under the care of a physician who will verify diagnosis and assume responsibility for medical direction.</li>
          <li>Our fees for services rendered have not been paid as required herein.</li>
          <li>Client no longer lives in the geographic area serviced by us.</li>
          <li>Client and/or family, representatives or caregivers fail to cooperate with us in any manner deemed necessary or prudent.</li>
        </ol>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Termination"
          value={data.terminationInitial}
          onChange={val => onChange({ terminationInitial: val })}
          error={errors?.terminationInitial}
        />
      </div>

      {/* ========== Authorization, Consent, Medical Services ========== */}
      <LegalClause title="Authorization, Consent & Medical Services">
        <p className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Authorization for Payment and Release of Information</p>
        <p>
          I authorize Executive Home Care to process claims for payment on my behalf for covered
          services rendered to me. I authorize the release of necessary information, including
          medical information, regarding this or any related service or claim to my insurance
          carrier(s), including any managed care plan or other private, federal or state payer,
          billing agents and collection agents or attorneys of the Agency, and as applicable, any
          federal or state agency for the purpose of satisfying charges and/or facilitating
          utilization review and/or otherwise complying with obligations of state or federal law.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Consent for Treatment</p>
        <p>
          I authorize Executive Home Care and its health care personnel, employees, and contractors,
          under the orders of my Physician (if needed) to provide home health care services. I
          authorize health care personnel to examine me in order to determine whether I am
          appropriate for the level of care offered by Executive Home Care.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Medical Services</p>
        <p>
          I acknowledge that Executive Home Care caregivers are not qualified or authorized to
          provide any medical services to the Client. If a medical emergency arises while an
          Executive Home Care employee is providing services, that employee will not provide any
          medical services but may call 911 for emergency assistance. I agree to hold harmless
          Executive Home Care and its employee for any medical or other care that the employee may
          provide from instructions given by any 911 service provider.
        </p>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Authorization & Consent"
          value={data.authorizationConsentInitial}
          onChange={val => onChange({ authorizationConsentInitial: val })}
          error={errors?.authorizationConsentInitial}
        />
      </div>

      {/* ========== Dispute Resolution & Related Documents ========== */}
      <LegalClause title="Dispute Resolution & Related Documents">
        <p className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Dispute Resolution</p>
        <p>
          This Agreement shall be governed by, and construed in accordance with the laws of the
          State of Pennsylvania and will be litigated in that State or in the Federal Courts located
          within that State.
        </p>
        <p className="font-semibold text-gray-800 dark:text-slate-200 mt-3 mb-1">Related Documents</p>
        <p>
          I hereby acknowledge receipt of Notice of Privacy Practices (HIPAA), a Statement of your
          Rights and Responsibilities as a Home Care Client, Grievance Reporting Procedures, Agency
          Contact Information, Emergency Planning Information, and Advanced Directive Information. By
          entering into this Service Agreement I am stating that I have read and understood the
          information and that I agree to be bound by the terms contained therein.
        </p>
        <p className="mt-2 text-gray-500 dark:text-slate-400 italic text-[11px]">
          A copy of the document authorizing the representation (Power of Attorney, Court Order
          Appointing Guardian, etc.) must be attached hereto and made a part hereof.
        </p>
      </LegalClause>

      <div className="flex justify-center">
        <InitialsInput
          label="Initials — Related Documents"
          value={data.relatedDocumentsInitial}
          onChange={val => onChange({ relatedDocumentsInitial: val })}
          error={errors?.relatedDocumentsInitial}
        />
      </div>

      {/* ========== Summary note ========== */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
        <p className="font-medium mb-1">All sections require your initials</p>
        <p className="text-xs">
          By initialing each section above, you confirm that you have read and understand the terms
          and conditions of the Service Agreement. All six initial fields must be completed to
          proceed.
        </p>
      </div>
    </div>
  );
}
