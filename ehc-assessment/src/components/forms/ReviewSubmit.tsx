import { SectionHeader } from '../ui/FormFields';
import type { AssessmentFormData } from '../../types/forms';

interface Props {
  data: AssessmentFormData;
  onGoToStep: (step: number) => void;
}

function ReviewSection({ title, stepIndex, onEdit, children }: { title: string; stepIndex: number; onEdit: (step: number) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
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
  const { clientHelpList, clientHistory, clientAssessment, medicationList, consent } = data;

  const allCategoriesSelected = [
    ...clientAssessment.bathing, ...clientAssessment.dressing, ...clientAssessment.hairCare,
    ...clientAssessment.teethAndGums, ...clientAssessment.shaving, ...clientAssessment.mobility,
    ...clientAssessment.falls, ...clientAssessment.mobilityAids, ...clientAssessment.nutritionHydration,
    ...clientAssessment.toileting, ...clientAssessment.medicationReminder,
    ...clientAssessment.housekeeping, ...clientAssessment.transportation,
  ];

  const hasSigned = consent.hipaaSignature && consent.benefitsSignature;

  return (
    <div className="space-y-4 pt-4">
      <div className={`rounded-xl p-4 text-sm ${hasSigned ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
        {hasSigned
          ? 'All signatures collected. Review the information below and submit.'
          : 'Warning: Not all signatures have been provided. Please go back to the Consent step to complete signatures.'
        }
      </div>

      <SectionHeader title="Review All Information" subtitle="Click Edit on any section to make changes" />

      {/* Client Help List */}
      <ReviewSection title="Client Help List" stepIndex={0} onEdit={onGoToStep}>
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
      <ReviewSection title="Client History" stepIndex={1} onEdit={onGoToStep}>
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
      <ReviewSection title="Client Assessment" stepIndex={2} onEdit={onGoToStep}>
        <Field label="Type" value={clientAssessment.assessmentType === 'initial' ? 'Initial' : clientAssessment.assessmentType === 'revised' ? 'Revised' : ''} />
        <p className="text-gray-500 text-xs mt-1">{allCategoriesSelected.length} items selected across all categories</p>
        {allCategoriesSelected.length > 0 && (
          <p className="text-xs mt-1 text-gray-600">{allCategoriesSelected.slice(0, 10).join(', ')}{allCategoriesSelected.length > 10 ? ` ... and ${allCategoriesSelected.length - 10} more` : ''}</p>
        )}
      </ReviewSection>

      {/* Home Safety */}
      <ReviewSection title="Home Safety Checklist" stepIndex={3} onEdit={onGoToStep}>
        <p className="text-gray-500 text-xs">Safety checklist completed</p>
      </ReviewSection>

      {/* Medications */}
      <ReviewSection title="Medication List" stepIndex={4} onEdit={onGoToStep}>
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

      {/* Consent */}
      <ReviewSection title="Consent & Signatures" stepIndex={5} onEdit={onGoToStep}>
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
            alert('Assessment submitted successfully! (Backend integration pending)');
          }}
          className="w-full py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 active:bg-amber-800 transition-colors"
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
