import { useEffect } from 'react';
import { WizardShell } from './components/wizard/WizardShell';
import { useFormWizard } from './hooks/useFormWizard';
import { useAutoSave } from './hooks/useAutoSave';
import { INITIAL_DATA } from './utils/initialData';
import { ClientHelpList } from './components/forms/ClientHelpList';
import { ClientHistory } from './components/forms/ClientHistory';
import { ClientAssessment } from './components/forms/ClientAssessment';
import { HomeSafetyChecklist } from './components/forms/HomeSafetyChecklist';
import { MedicationList } from './components/forms/MedicationList';
import { ConsentSignatures } from './components/forms/ConsentSignatures';
import { ReviewSubmit } from './components/forms/ReviewSubmit';
import type { AssessmentFormData } from './types/forms';

// Medications before Home Safety so signing forms (Safety + Consent) are grouped at end
const STEPS = [
  { id: 'help-list', title: 'Client Help List', shortTitle: 'Client Info' },
  { id: 'history', title: 'Client History', shortTitle: 'History' },
  { id: 'assessment', title: 'Client Assessment', shortTitle: 'Assessment' },
  { id: 'medications', title: 'Medication List', shortTitle: 'Medications' },
  { id: 'safety', title: 'Home Safety Checklist', shortTitle: 'Safety' },
  { id: 'consent', title: 'Consent & Signatures', shortTitle: 'Consent' },
  { id: 'review', title: 'Review & Submit', shortTitle: 'Review' },
];

function calculateAge(dob: string): string {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : '';
}

function App() {
  const wizard = useFormWizard(STEPS.length);
  const { data, updateData, lastSaved, isSaving } = useAutoSave<AssessmentFormData>(INITIAL_DATA);

  // Auto-propagate client name, date, address, and age from Step 1 to other forms
  useEffect(() => {
    const { clientName, date, clientAddress, dateOfBirth } = data.clientHelpList;
    const age = calculateAge(dateOfBirth);

    let needsUpdate = false;
    const updates: Partial<AssessmentFormData> = {};

    // Sync to clientHistory
    if (data.clientHistory.clientName !== clientName || data.clientHistory.date !== date || data.clientHistory.age !== age || data.clientHistory.clientAddress !== clientAddress) {
      updates.clientHistory = { ...data.clientHistory, clientName, date, age, clientAddress };
      needsUpdate = true;
    }

    // Sync to clientAssessment
    if (data.clientAssessment.clientName !== clientName || data.clientAssessment.date !== date || data.clientAssessment.age !== age || data.clientAssessment.clientAddress !== clientAddress) {
      updates.clientAssessment = { ...data.clientAssessment, clientName, date, age, clientAddress };
      needsUpdate = true;
    }

    // Sync to medicationList
    if (data.medicationList.clientName !== clientName || data.medicationList.date !== date || data.medicationList.clientAddress !== clientAddress || data.medicationList.age !== age) {
      updates.medicationList = { ...data.medicationList, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    // Sync to homeSafetyChecklist
    if (data.homeSafetyChecklist.clientName !== clientName || data.homeSafetyChecklist.date !== date || data.homeSafetyChecklist.clientAddress !== clientAddress || data.homeSafetyChecklist.age !== age) {
      updates.homeSafetyChecklist = { ...data.homeSafetyChecklist, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    // Sync to consent
    if (data.consent.clientName !== clientName || data.consent.date !== date || data.consent.clientAddress !== clientAddress || data.consent.age !== age) {
      updates.consent = { ...data.consent, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    if (needsUpdate) {
      updateData(prev => ({ ...prev, ...updates }));
    }
  }, [data.clientHelpList.clientName, data.clientHelpList.date, data.clientHelpList.clientAddress, data.clientHelpList.dateOfBirth]);

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return (
          <ClientHelpList
            data={data.clientHelpList}
            onChange={partial => updateData(prev => ({
              ...prev,
              clientHelpList: { ...prev.clientHelpList, ...partial },
            }))}
          />
        );
      case 1:
        return (
          <ClientHistory
            data={data.clientHistory}
            onChange={partial => updateData(prev => ({
              ...prev,
              clientHistory: { ...prev.clientHistory, ...partial },
            }))}
          />
        );
      case 2:
        return (
          <ClientAssessment
            data={data.clientAssessment}
            onChange={partial => updateData(prev => ({
              ...prev,
              clientAssessment: { ...prev.clientAssessment, ...partial },
            }))}
          />
        );
      case 3:
        return (
          <MedicationList
            data={data.medicationList}
            onChange={partial => updateData(prev => ({
              ...prev,
              medicationList: { ...prev.medicationList, ...partial },
            }))}
          />
        );
      case 4:
        return (
          <HomeSafetyChecklist
            data={data.homeSafetyChecklist}
            onChange={partial => updateData(prev => ({
              ...prev,
              homeSafetyChecklist: { ...prev.homeSafetyChecklist, ...partial },
            }))}
          />
        );
      case 5:
        return (
          <ConsentSignatures
            data={data.consent}
            onChange={partial => updateData(prev => ({
              ...prev,
              consent: { ...prev.consent, ...partial },
            }))}
          />
        );
      case 6:
        return (
          <ReviewSubmit
            data={data}
            onGoToStep={wizard.goToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardShell
      currentStep={wizard.currentStep}
      totalSteps={wizard.totalSteps}
      steps={STEPS}
      onStepClick={wizard.goToStep}
      onNext={wizard.goNext}
      onBack={wizard.goBack}
      isFirst={wizard.isFirst}
      isLast={wizard.isLast}
      lastSaved={lastSaved}
      isSaving={isSaving}
    >
      {renderStep()}
    </WizardShell>
  );
}

export default App;
