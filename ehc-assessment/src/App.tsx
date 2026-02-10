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

const STEPS = [
  { id: 'help-list', title: 'Client Help List', shortTitle: 'Client Info' },
  { id: 'history', title: 'Client History', shortTitle: 'History' },
  { id: 'assessment', title: 'Client Assessment', shortTitle: 'Assessment' },
  { id: 'safety', title: 'Home Safety Checklist', shortTitle: 'Safety' },
  { id: 'medications', title: 'Medication List', shortTitle: 'Medications' },
  { id: 'consent', title: 'Consent & Signatures', shortTitle: 'Consent' },
  { id: 'review', title: 'Review & Submit', shortTitle: 'Review' },
];

function App() {
  const wizard = useFormWizard(STEPS.length);
  const { data, updateData, lastSaved, isSaving } = useAutoSave<AssessmentFormData>(INITIAL_DATA);

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
          <HomeSafetyChecklist
            data={data.homeSafetyChecklist}
            onChange={partial => updateData(prev => ({
              ...prev,
              homeSafetyChecklist: { ...prev.homeSafetyChecklist, ...partial },
            }))}
          />
        );
      case 4:
        return (
          <MedicationList
            data={data.medicationList}
            onChange={partial => updateData(prev => ({
              ...prev,
              medicationList: { ...prev.medicationList, ...partial },
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
