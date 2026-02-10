import { SectionHeader } from '../ui/FormFields';
import type { AssessmentFormData } from '../../types/forms';

interface Props {
  data: AssessmentFormData;
  onGoToStep: (step: number) => void;
}

// Step indices (must match STEPS in App.tsx)
const STEP = { helpList: 0, history: 1, assessment: 2, medications: 3, safety: 4, consent: 5 };

function ReviewSection({ title, stepIndex, status, onEdit, children }: {
  title: string;
  stepIndex: number;
  status?: 'complete' | 'incomplete' | 'warning';
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  const borderColor = status === 'incomplete' ? 'border-red-200' : status === 'warning' ? 'border-yellow-200' : 'border-gray-200';
  return (
    <div className={`bg-white rounded-xl border ${borderColor} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor} ${
        status === 'incomplete' ? 'bg-red-50' : status === 'warning' ? 'bg-yellow-50' : 'bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          {status === 'complete' && <span className="w-2.5 h-2.5 rounded-full bg-green-500" />}
          {status === 'incomplete' && <span className="w-2.5 h-2.5 rounded-full bg-red-400" />}
          {status === 'warning' && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />}
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3 space-y-1 text-sm text-gray-700">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-gray-500 flex-shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ReviewSubmit({ data, onGoToStep }: Props) {
  const { clientHelpList, clientHistory, clientAssessment, medicationList, homeSafetyChecklist, consent } = data;

  const allCategoriesSelected = [
    ...clientAssessment.bathing, ...clientAssessment.dressing, ...clientAssessment.hairCare,
    ...clientAssessment.teethAndGums, ...clientAssessment.shaving, ...clientAssessment.mobility,
    ...clientAssessment.falls, ...clientAssessment.mobilityAids, ...clientAssessment.nutritionHydration,
    ...clientAssessment.toileting, ...clientAssessment.medicationReminder,
    ...clientAssessment.housekeeping, ...clientAssessment.transportation,
  ];

  // Completion checks
  const hasClientInfo = !!clientHelpList.clientName && !!clientHelpList.dateOfBirth;
  const hasHistory = !!clientHistory.assessmentReason;
  const hasAssessment = allCategoriesSelected.length > 0;
  const hasMeds = medicationList.noMedications || medicationList.medications.some(m => m.name);
  const hasSafetySignatures = !!homeSafetyChecklist.clientSignature && !!homeSafetyChecklist.representativeSignature;
  const hasConsentSignatures = !!consent.hipaaSignature && !!consent.benefitsSignature;

  const incomplete: { label: string; step: number }[] = [];
  if (!hasClientInfo) incomplete.push({ label: 'Client Info', step: STEP.helpList });
  if (!hasHistory) incomplete.push({ label: 'Client History', step: STEP.history });
  if (!hasAssessment) incomplete.push({ label: 'Client Assessment', step: STEP.assessment });
  if (!hasMeds) incomplete.push({ label: 'Medication List', step: STEP.medications });
  if (!hasSafetySignatures) incomplete.push({ label: 'Home Safety signatures', step: STEP.safety });
  if (!hasConsentSignatures) incomplete.push({ label: 'Consent signatures', step: STEP.consent });

  return (
    <div className="space-y-4 pt-4">
      {incomplete.length > 0 ? (
        <div className="rounded-xl p-4 text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">
          <p className="font-medium mb-2">The following sections need attention before submitting:</p>
          <ul className="space-y-1">
            {incomplete.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <button type="button" onClick={() => onGoToStep(item.step)} className="text-amber-700 underline hover:text-amber-800">{item.label}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl p-4 text-sm bg-green-50 text-green-800 border border-green-200">
          All sections complete. Review the information below and submit.
        </div>
      )}

      <SectionHeader title="Review All Information" subtitle="Click Edit on any section to make changes" />

      {/* Client Help List */}
      <ReviewSection title="Client Help List" stepIndex={STEP.helpList} onEdit={onGoToStep} status={hasClientInfo ? 'complete' : 'incomplete'}>
        <Field label="Client Name" value={clientHelpList.clientName} />
        <Field label="Date of Birth" value={clientHelpList.dateOfBirth} />
        <Field label="Address" value={clientHelpList.clientAddress} />
        <Field label="Phone" value={clientHelpList.clientPhone} />
        <Field label="Referral Agency" value={clientHelpList.referralAgency} />
        <Field label="Goals" value={clientHelpList.goals} />
        {clientHelpList.emergencyContacts.filter(c => c.name).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500">Emergency Contacts:</span>
            {clientHelpList.emergencyContacts.filter(c => c.name).map((c, i) => (
              <div key={i} className="ml-3 text-xs">{c.name} ({c.relationship}) - {c.phone1}</div>
            ))}
          </div>
        )}
        {clientHelpList.doctors.filter(d => d.name).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500">Doctors:</span>
            {clientHelpList.doctors.filter(d => d.name).map((d, i) => (
              <div key={i} className="ml-3 text-xs">{d.name} ({d.type}) - {d.phone}</div>
            ))}
          </div>
        )}
      </ReviewSection>

      {/* Client History */}
      <ReviewSection title="Client History" stepIndex={STEP.history} onEdit={onGoToStep} status={hasHistory ? 'complete' : 'incomplete'}>
        <Field label="Assessment Reason" value={clientHistory.assessmentReason === 'initial' ? 'Initial' : clientHistory.assessmentReason === '90day' ? '90 Day Supervisory' : ''} />
        <Field label="Primary Diagnosis" value={clientHistory.primaryDiagnosis} />
        {clientHistory.healthHistory.length > 0 && (
          <div className="mt-1">
            <span className="text-gray-500">Health History:</span>
            <span className="ml-1">{clientHistory.healthHistory.join(', ')}</span>
          </div>
        )}
        <Field label="Smoker" value={clientHistory.smoker === 'yes' ? 'Yes' : clientHistory.smoker === 'no' ? 'No' : ''} />
        <Field label="Oxygen" value={clientHistory.oxygenInHome === 'yes' ? 'Yes' : clientHistory.oxygenInHome === 'no' ? 'No' : ''} />
        <Field label="Lives Alone" value={clientHistory.livesAlone === 'yes' ? 'Yes' : clientHistory.livesAlone === 'no' ? 'No' : ''} />
        <Field label="Drug Allergies" value={clientHistory.drugAllergies} />
        <Field label="Food Allergies" value={clientHistory.foodAllergies} />
      </ReviewSection>

      {/* Client Assessment */}
      <ReviewSection title="Client Assessment" stepIndex={STEP.assessment} onEdit={onGoToStep} status={hasAssessment ? 'complete' : 'incomplete'}>
        <Field label="Type" value={clientAssessment.assessmentType === 'initial' ? 'Initial' : clientAssessment.assessmentType === 'revised' ? 'Revised' : ''} />
        <p className="text-gray-500 text-xs mt-1">{allCategoriesSelected.length} items selected across all categories</p>
        {allCategoriesSelected.length > 0 && (
          <p className="text-xs mt-1 text-gray-600">{allCategoriesSelected.slice(0, 10).join(', ')}{allCategoriesSelected.length > 10 ? ` ... and ${allCategoriesSelected.length - 10} more` : ''}</p>
        )}
      </ReviewSection>

      {/* Medications (now step 3) */}
      <ReviewSection title="Medication List" stepIndex={STEP.medications} onEdit={onGoToStep} status={hasMeds ? 'complete' : 'incomplete'}>
        {medicationList.noMedications ? (
          <p>No medications reported</p>
        ) : (
          <>
            <Field label="Allergies" value={medicationList.medicationAllergies} />
            <p className="text-gray-500 text-xs">{medicationList.medications.filter(m => m.name).length} medication(s) listed</p>
            {medicationList.medications.filter(m => m.name).map((m, i) => (
              <div key={i} className="ml-3 text-xs">{m.name} - {m.dosage} ({m.frequency})</div>
            ))}
          </>
        )}
      </ReviewSection>

      {/* Home Safety (now step 4) */}
      <ReviewSection title="Home Safety Checklist" stepIndex={STEP.safety} onEdit={onGoToStep} status={hasSafetySignatures ? 'complete' : 'warning'}>
        <p className="text-gray-500 text-xs">Safety checklist completed</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-3 h-3 rounded-full ${homeSafetyChecklist.clientSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs">Client signature: {homeSafetyChecklist.clientSignature ? 'Signed' : 'Not signed'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${homeSafetyChecklist.representativeSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs">Representative signature: {homeSafetyChecklist.representativeSignature ? 'Signed' : 'Not signed'}</span>
        </div>
      </ReviewSection>

      {/* Consent (step 5) */}
      <ReviewSection title="Consent & Signatures" stepIndex={STEP.consent} onEdit={onGoToStep} status={hasConsentSignatures ? 'complete' : 'incomplete'}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${consent.hipaaSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span>HIPAA Acknowledgment: {consent.hipaaSignature ? 'Signed' : 'Not signed'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${consent.benefitsSignature ? 'bg-green-500' : 'bg-red-400'}`} />
          <span>Assignment of Benefits: {consent.benefitsSignature ? 'Signed' : 'Not signed'}</span>
        </div>
      </ReviewSection>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="button"
          onClick={() => {
            if (incomplete.length > 0) {
              alert(`Please complete the following sections first:\n\n${incomplete.map(i => `• ${i.label}`).join('\n')}`);
              return;
            }
            alert('Assessment submitted successfully! (Backend integration pending)');
          }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            incomplete.length > 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
          }`}
        >
          Submit Assessment
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Once submitted, a PDF copy will be generated for your records.
        </p>
      </div>
    </div>
  );
}
