import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WizardShell } from './wizard/WizardShell';
import { useFormWizard } from '../hooks/useFormWizard';
import { useAutoSave } from '../hooks/useAutoSave';
import { useStepValidation, scrollToFirstError } from '../hooks/useStepValidation';
import { INITIAL_DATA } from '../utils/initialData';
import { STEP_SCHEMAS } from '../validation/schemas';
import { BUILT_IN_TEMPLATES, applyTemplate } from '../utils/assessmentTemplates';
import type { AssessmentTemplate } from '../utils/assessmentTemplates';
import { ClientHelpList } from './forms/ClientHelpList';
import { ClientHistory } from './forms/ClientHistory';
import { ClientAssessment } from './forms/ClientAssessment';
import { HomeSafetyChecklist } from './forms/HomeSafetyChecklist';
import { MedicationList } from './forms/MedicationList';
import { ConsentSignatures } from './forms/ConsentSignatures';
import { ReviewSubmit } from './forms/ReviewSubmit';
import { DraftManager } from './DraftManager';
import { StaffNoteField } from './ui/StaffNoteField';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { saveDraft, type DraftRecord } from '../utils/db';
import { logAudit } from '../utils/auditLog';
import type { AssessmentFormData } from '../types/forms';

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

const STEP_DATA_KEYS: Record<number, keyof AssessmentFormData> = {
  0: 'clientHelpList',
  1: 'clientHistory',
  2: 'clientAssessment',
  3: 'medicationList',
  4: 'homeSafetyChecklist',
  5: 'consent',
};

interface AssessmentWizardProps {
  onGoHome: () => void;
  onContinueToContract?: (data: AssessmentFormData) => void;
  resumeStep?: number;
  draftId?: string;
  authUserName?: string;
}

export function AssessmentWizard({ onGoHome, onContinueToContract, resumeStep, draftId, authUserName }: AssessmentWizardProps) {
  const wizard = useFormWizard(STEPS.length, resumeStep);
  const { data, updateData, lastSaved, isSaving, isLoading, isDirty, clearDraft, hasDraft } = useAutoSave<AssessmentFormData>(INITIAL_DATA);
  const [showDrafts, setShowDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId ?? null);
  const { errors, validate, clearErrors, clearFieldErrors } = useStepValidation();

  // Show template picker for fresh assessments (no resume, no existing draft in localStorage)
  const [showTemplatePicker, setShowTemplatePicker] = useState(() => !resumeStep && !hasDraft());

  const handleSelectTemplate = useCallback((template: AssessmentTemplate | null) => {
    if (template) {
      updateData(() => applyTemplate(template));
    }
    // null = blank assessment (INITIAL_DATA already loaded)
    setShowTemplatePicker(false);
  }, [updateData]);

  const validateCurrentStep = useCallback(() => {
    const schema = STEP_SCHEMAS[wizard.currentStep];
    const key = STEP_DATA_KEYS[wizard.currentStep];
    return validate(schema, key ? data[key] : null);
  }, [wizard.currentStep, data, validate]);

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      clearErrors();
      wizard.goNext();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToFirstError();
    }
  }, [validateCurrentStep, clearErrors, wizard]);

  const handleBack = useCallback(() => {
    clearErrors();
    wizard.goBack();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clearErrors, wizard]);

  const handleStepClick = useCallback((targetStep: number) => {
    if (targetStep > wizard.currentStep) {
      if (!validateCurrentStep()) return;
    }
    clearErrors();
    wizard.goToStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [wizard, validateCurrentStep, clearErrors]);

  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  const makeOnChange = useCallback((key: keyof AssessmentFormData) => {
    return (partial: Record<string, unknown>) => {
      if (Object.keys(errorsRef.current).length > 0) {
        clearFieldErrors(Object.keys(partial));
      }
      updateData(prev => ({ ...prev, [key]: { ...prev[key], ...partial } }));
    };
  }, [clearFieldErrors, updateData]);

  const onChangeHandlers = useMemo(() => ({
    clientHelpList: makeOnChange('clientHelpList'),
    clientHistory: makeOnChange('clientHistory'),
    clientAssessment: makeOnChange('clientAssessment'),
    medicationList: makeOnChange('medicationList'),
    homeSafetyChecklist: makeOnChange('homeSafetyChecklist'),
    consent: makeOnChange('consent'),
  }), [makeOnChange]);

  const staffNoteKeys = ['clientHelpList', 'clientHistory', 'clientAssessment', 'medicationList', 'homeSafetyChecklist', 'consent'] as const;
  const handleStaffNoteChange = useCallback((key: typeof staffNoteKeys[number]) => {
    return (value: string) => {
      updateData(prev => ({ ...prev, staffNotes: { ...prev.staffNotes, [key]: value } }));
    };
  }, [updateData]);

  // Auto-propagate client name, date, address, and age from Step 1 to other forms
  useEffect(() => {
    const { clientName, date, clientAddress, dateOfBirth } = data.clientHelpList;
    const age = calculateAge(dateOfBirth);

    let needsUpdate = false;
    const updates: Partial<AssessmentFormData> = {};

    if (data.clientHistory.clientName !== clientName || data.clientHistory.date !== date || data.clientHistory.age !== age || data.clientHistory.clientAddress !== clientAddress) {
      updates.clientHistory = { ...data.clientHistory, clientName, date, age, clientAddress };
      needsUpdate = true;
    }

    if (data.clientAssessment.clientName !== clientName || data.clientAssessment.date !== date || data.clientAssessment.age !== age || data.clientAssessment.clientAddress !== clientAddress) {
      updates.clientAssessment = { ...data.clientAssessment, clientName, date, age, clientAddress };
      needsUpdate = true;
    }

    if (data.medicationList.clientName !== clientName || data.medicationList.date !== date || data.medicationList.clientAddress !== clientAddress || data.medicationList.age !== age) {
      updates.medicationList = { ...data.medicationList, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    if (data.homeSafetyChecklist.clientName !== clientName || data.homeSafetyChecklist.date !== date || data.homeSafetyChecklist.clientAddress !== clientAddress || data.homeSafetyChecklist.age !== age) {
      updates.homeSafetyChecklist = { ...data.homeSafetyChecklist, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    if (data.consent.clientName !== clientName || data.consent.date !== date || data.consent.clientAddress !== clientAddress || data.consent.age !== age) {
      updates.consent = { ...data.consent, clientName, date, clientAddress, age };
      needsUpdate = true;
    }

    if (needsUpdate) {
      updateData(prev => ({ ...prev, ...updates }), { silent: true });
    }
  }, [data.clientHelpList.clientName, data.clientHelpList.date, data.clientHelpList.clientAddress, data.clientHelpList.dateOfBirth]);

  // Auto-populate EHC staff name from logged-in user when fields are empty.
  // Uses functional updater to avoid stale closure issues with `data`.
  const staffNamePopulated = useRef(false);
  useEffect(() => {
    if (isLoading || staffNamePopulated.current || !authUserName) return;
    staffNamePopulated.current = true;

    updateData(prev => {
      const updates: Partial<AssessmentFormData> = {};
      let needsUpdate = false;

      if (!prev.clientHistory.ehcStaffName) {
        updates.clientHistory = { ...prev.clientHistory, ehcStaffName: authUserName };
        needsUpdate = true;
      }
      if (!prev.clientAssessment.ehcStaffName) {
        updates.clientAssessment = { ...prev.clientAssessment, ehcStaffName: authUserName };
        needsUpdate = true;
      }
      if (!prev.homeSafetyChecklist.ehcStaffName) {
        updates.homeSafetyChecklist = { ...prev.homeSafetyChecklist, ehcStaffName: authUserName };
        needsUpdate = true;
      }

      return needsUpdate ? { ...prev, ...updates } : prev;
    }, { silent: true });
  }, [isLoading, authUserName, updateData]);

  const handleResumeDraft = (draft: DraftRecord) => {
    updateData(() => draft.data as AssessmentFormData);
    wizard.goToStep(draft.currentStep ?? 0);
    setCurrentDraftId(draft.id);
    setShowDrafts(false);
  };

  const handleNewAssessment = () => {
    clearDraft();
    setCurrentDraftId(null);
    wizard.goToStep(0);
    setShowDrafts(false);
  };

  const [draftSaveMessage, setDraftSaveMessage] = useState('');
  const handleSaveDraft = useCallback(async () => {
    const isUpdate = !!currentDraftId;
    const id = currentDraftId || `draft-${Date.now()}`;
    const draft: DraftRecord = {
      id,
      clientName: data.clientHelpList.clientName || 'Unnamed Client',
      type: 'assessment',
      data,
      lastModified: new Date().toISOString(),
      status: 'draft',
      currentStep: wizard.currentStep,
    };
    await saveDraft(draft);
    if (!isUpdate) setCurrentDraftId(id);
    logAudit(isUpdate ? 'draft_update' : 'draft_create', id, draft.clientName);
    setDraftSaveMessage('Draft saved!');
    setTimeout(() => setDraftSaveMessage(''), 2000);
  }, [data, wizard.currentStep, currentDraftId]);

  const renderStep = () => {
    const formError = errors._form ? (
      <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
        {errors._form}
      </div>
    ) : null;

    switch (wizard.currentStep) {
      case 0:
        return (
          <>
            {formError}
            <ClientHelpList
              data={data.clientHelpList}
              onChange={onChangeHandlers.clientHelpList}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.clientHelpList} onChange={handleStaffNoteChange('clientHelpList')} />
          </>
        );
      case 1:
        return (
          <>
            {formError}
            <ClientHistory
              data={data.clientHistory}
              onChange={onChangeHandlers.clientHistory}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.clientHistory} onChange={handleStaffNoteChange('clientHistory')} />
          </>
        );
      case 2:
        return (
          <>
            {formError}
            <ClientAssessment
              data={data.clientAssessment}
              onChange={onChangeHandlers.clientAssessment}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.clientAssessment} onChange={handleStaffNoteChange('clientAssessment')} />
          </>
        );
      case 3:
        return (
          <>
            {formError}
            <MedicationList
              data={data.medicationList}
              onChange={onChangeHandlers.medicationList}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.medicationList} onChange={handleStaffNoteChange('medicationList')} />
          </>
        );
      case 4:
        return (
          <>
            {formError}
            <HomeSafetyChecklist
              data={data.homeSafetyChecklist}
              onChange={onChangeHandlers.homeSafetyChecklist}
              crossFormContext={{
                oxygenInHome: data.clientHistory.oxygenInHome,
              }}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.homeSafetyChecklist} onChange={handleStaffNoteChange('homeSafetyChecklist')} />
          </>
        );
      case 5:
        return (
          <>
            {formError}
            <ConsentSignatures
              data={data.consent}
              onChange={onChangeHandlers.consent}
              errors={errors}
            />
            <StaffNoteField value={data.staffNotes.consent} onChange={handleStaffNoteChange('consent')} />
          </>
        );
      case 6:
        return (
          <ReviewSubmit
            data={data}
            onGoToStep={handleStepClick}
            onContinueToContract={onContinueToContract ? () => onContinueToContract(data) : undefined}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50/60 flex items-center justify-center">
        <LoadingSpinner message="Loading draft..." />
      </div>
    );
  }

  return (
    <WizardShell
      currentStep={wizard.currentStep}
      totalSteps={wizard.totalSteps}
      steps={STEPS}
      onStepClick={handleStepClick}
      onNext={handleNext}
      onBack={handleBack}
      isFirst={wizard.isFirst}
      isLast={wizard.isLast}
      lastSaved={lastSaved}
      isSaving={isSaving}
      showDrafts={showDrafts}
      onShowDrafts={() => setShowDrafts(prev => !prev)}
      onSaveDraft={handleSaveDraft}
      title="Client Intake Assessment"
      onGoHome={onGoHome}
      hasUnsavedChanges={isDirty}
      onDiscard={clearDraft}
    >
      {showTemplatePicker ? (
        <div className="pt-2">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold" style={{ color: '#1a3a4a' }}>Choose a Template</h2>
            <p className="text-sm text-gray-500 mt-1">Select a starting template or begin with a blank assessment</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {/* Blank Assessment option */}
            <button
              type="button"
              onClick={() => handleSelectTemplate(null)}
              className="text-left bg-white rounded-xl border-2 border-gray-200 hover:border-amber-400 p-4 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">📝</span>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">Blank Assessment</p>
                  <p className="text-xs text-gray-500 mt-1">Start from scratch with empty fields</p>
                </div>
              </div>
            </button>
            {/* Built-in templates */}
            {BUILT_IN_TEMPLATES.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className="text-left bg-white rounded-xl border-2 border-gray-200 hover:border-amber-400 p-4 transition-all hover:shadow-md group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">
                    {template.id === 'standard-initial' ? '📋' :
                     template.id === '90-day-supervisory' ? '🔄' :
                     template.id === 'live-in-24x7' ? '🏠' :
                     template.id === 'post-hospital' ? '🏥' : '📄'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : showDrafts ? (
        <div className="pt-6">
          <DraftManager
            currentData={data}
            currentStep={wizard.currentStep}
            onResumeDraft={handleResumeDraft}
            onNewAssessment={handleNewAssessment}
          />
        </div>
      ) : (
        <>
          {draftSaveMessage && (
            <div className="rounded-xl p-3 bg-green-50 border border-green-200 text-sm text-green-700 mb-4">
              {draftSaveMessage}
            </div>
          )}
          {renderStep()}
        </>
      )}
    </WizardShell>
  );
}
