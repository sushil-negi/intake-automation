import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WizardShell } from './wizard/WizardShell';
import { useFormWizard } from '../hooks/useFormWizard';
import { useAutoSave } from '../hooks/useAutoSave';
import { useStepValidation, scrollToFirstError } from '../hooks/useStepValidation';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import { CONTRACT_STEP_SCHEMAS } from '../validation/contractSchemas';
import { ServiceAgreement } from './forms/contract/ServiceAgreement';
import { ServiceAgreementTerms } from './forms/contract/ServiceAgreementTerms';
import { ConsumerRights } from './forms/contract/ConsumerRights';
import { DirectCareWorkerNotice } from './forms/contract/DirectCareWorkerNotice';
import { TransportationRequest } from './forms/contract/TransportationRequest';
import { CustomerPacket } from './forms/contract/CustomerPacket';
import { ContractReviewSubmit } from './forms/contract/ContractReviewSubmit';
import { DraftManager } from './DraftManager';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { saveDraft, type DraftRecord } from '../utils/db';
import { logAudit } from '../utils/auditLog';
import { useDraftLock } from '../hooks/useDraftLock';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { ConflictResolutionModal } from './ui/ConflictResolutionModal';
import type { ServiceContractFormData } from '../types/serviceContract';

const STEPS = [
  { id: 'agreement', title: 'Service Agreement', shortTitle: 'Agreement' },
  { id: 'terms', title: 'Terms & Conditions', shortTitle: 'Terms' },
  { id: 'rights', title: 'Consumer Rights & Responsibilities', shortTitle: 'Rights' },
  { id: 'dcw-notice', title: 'Direct Care Worker Notice', shortTitle: 'DCW Notice' },
  { id: 'transportation', title: 'Transportation Request', shortTitle: 'Transport' },
  { id: 'customer-packet', title: 'Customer Packet', shortTitle: 'Packet' },
  { id: 'review', title: 'Review & Submit', shortTitle: 'Review' },
];

const STEP_DATA_KEYS: Record<number, keyof ServiceContractFormData> = {
  0: 'serviceAgreement',
  1: 'termsConditions',
  2: 'consumerRights',
  3: 'directCareWorker',
  4: 'transportationRequest',
  5: 'customerPacket',
};

interface ServiceContractWizardProps {
  onGoHome: () => void;
  prefillData?: ServiceContractFormData;
  resumeStep?: number;
  draftId?: string;
  linkedAssessmentId?: string;
  authUserName?: string;
  /** Supabase auth.uid — passed from App for lock management. */
  supabaseUserId?: string | null;
  /** Supabase org_id — passed from App for lock management. */
  supabaseOrgId?: string | null;
}

export function ServiceContractWizard({ onGoHome, prefillData, resumeStep, draftId, linkedAssessmentId, authUserName, supabaseUserId, supabaseOrgId }: ServiceContractWizardProps) {
  // v4-10: Move localStorage side effect out of render body into useState initializer
  // useState initializer only runs once on mount, safe for React concurrent mode
  useState(() => {
    if (prefillData) {
      localStorage.removeItem('ehc-service-contract-draft');
    }
  });
  const initialData = prefillData ?? SERVICE_CONTRACT_INITIAL_DATA;
  const wizard = useFormWizard(STEPS.length, resumeStep);
  const { data, updateData, lastSaved, isSaving, isLoading, isDirty, clearDraft } = useAutoSave<ServiceContractFormData>(
    initialData,
    'ehc-service-contract-draft',
  );
  const [showDrafts, setShowDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId ?? null);
  const { errors, validate, clearErrors, clearFieldErrors } = useStepValidation();

  // Lock management — acquire lock when editing an existing draft
  const { lockedByOther, otherLockInfo, retryLock, releaseLock } = useDraftLock({
    draftId: currentDraftId,
    userId: supabaseUserId ?? null,
    enabled: isSupabaseConfigured() && !!currentDraftId && !!supabaseUserId,
  });

  // Remote sync — background push to Supabase with conflict detection
  const isOnline = useOnlineStatus();
  const {
    status: syncStatus,
    conflictInfo,
    resolveConflict,
    dismissConflict,
    scheduleDraftSync,
    flushSync,
  } = useSupabaseSync({
    userId: supabaseUserId ?? null,
    orgId: supabaseOrgId ?? null,
    online: isOnline,
  });

  const validateCurrentStep = useCallback(() => {
    const schema = CONTRACT_STEP_SCHEMAS[wizard.currentStep];
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

  const makeOnChange = useCallback((key: keyof ServiceContractFormData) => {
    return (partial: Record<string, unknown>) => {
      if (Object.keys(errorsRef.current).length > 0) {
        clearFieldErrors(Object.keys(partial));
      }
      updateData(prev => ({ ...prev, [key]: { ...prev[key], ...partial } }));
    };
  }, [clearFieldErrors, updateData]);

  const onChangeHandlers = useMemo(() => ({
    serviceAgreement: makeOnChange('serviceAgreement'),
    termsConditions: makeOnChange('termsConditions'),
    consumerRights: makeOnChange('consumerRights'),
    directCareWorker: makeOnChange('directCareWorker'),
    transportationRequest: makeOnChange('transportationRequest'),
    customerPacket: makeOnChange('customerPacket'),
  }), [makeOnChange]);

  // Auto-propagate consumer name from Service Agreement to other steps
  useEffect(() => {
    const { firstName, lastName } = data.serviceAgreement.customerInfo;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    if (!fullName) return;

    let needsUpdate = false;
    const updates: Partial<ServiceContractFormData> = {};

    if (data.consumerRights.consumerName !== fullName) {
      updates.consumerRights = { ...data.consumerRights, consumerName: fullName };
      needsUpdate = true;
    }
    if (data.directCareWorker.consumerName !== fullName) {
      updates.directCareWorker = { ...data.directCareWorker, consumerName: fullName };
      needsUpdate = true;
    }
    if (data.transportationRequest.consumerName !== fullName) {
      updates.transportationRequest = { ...data.transportationRequest, consumerName: fullName };
      needsUpdate = true;
    }
    if (data.customerPacket.consumerName !== fullName) {
      updates.customerPacket = { ...data.customerPacket, consumerName: fullName };
      needsUpdate = true;
    }

    if (needsUpdate) {
      updateData(prev => ({ ...prev, ...updates }), { silent: true });
    }
  }, [data.serviceAgreement.customerInfo.firstName, data.serviceAgreement.customerInfo.lastName]);

  // Auto-populate EHC rep name from logged-in user when fields are empty.
  // Uses functional updater to avoid stale closure issues with `data`.
  const repNamePopulated = useRef(false);
  useEffect(() => {
    if (isLoading || repNamePopulated.current || !authUserName) return;
    repNamePopulated.current = true;

    updateData(prev => {
      const updates: Partial<ServiceContractFormData> = {};
      let needsUpdate = false;

      if (!prev.serviceAgreement.ehcRepName) {
        updates.serviceAgreement = { ...prev.serviceAgreement, ehcRepName: authUserName };
        needsUpdate = true;
      }
      if (!prev.transportationRequest.ehcRepName) {
        updates.transportationRequest = { ...prev.transportationRequest, ehcRepName: authUserName };
        needsUpdate = true;
      }

      return needsUpdate ? { ...prev, ...updates } : prev;
    }, { silent: true });
  }, [isLoading, authUserName, updateData]);

  const handleResumeDraft = (draft: DraftRecord) => {
    updateData(() => draft.data as ServiceContractFormData);
    wizard.goToStep(draft.currentStep ?? 0);
    setCurrentDraftId(draft.id);
    setShowDrafts(false);
  };

  const handleNewContract = () => {
    clearDraft();
    setCurrentDraftId(null);
    wizard.goToStep(0);
    setShowDrafts(false);
  };

  const [draftSaveMessage, setDraftSaveMessage] = useState('');
  const handleSaveDraft = useCallback(async () => {
    const customerName = [
      data.serviceAgreement.customerInfo.firstName,
      data.serviceAgreement.customerInfo.lastName,
    ].filter(Boolean).join(' ');

    const isUpdate = !!currentDraftId;
    const id = currentDraftId || `draft-${Date.now()}`;
    const draft: DraftRecord = {
      id,
      clientName: customerName || 'Unnamed Client',
      type: 'serviceContract',
      data,
      lastModified: new Date().toISOString(),
      status: 'draft',
      currentStep: wizard.currentStep,
      linkedAssessmentId,
    };
    await saveDraft(draft);
    if (!isUpdate) setCurrentDraftId(id);
    logAudit(isUpdate ? 'draft_update' : 'draft_create', id, draft.clientName);
    // Schedule background sync to Supabase
    scheduleDraftSync(draft);
    setDraftSaveMessage('Draft saved!');
    setTimeout(() => setDraftSaveMessage(''), 2000);
  }, [data, wizard.currentStep, currentDraftId, scheduleDraftSync]);

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
            <ServiceAgreement
              data={data.serviceAgreement}
              onChange={onChangeHandlers.serviceAgreement}
              errors={errors}
            />
          </>
        );
      case 1:
        return (
          <>
            {formError}
            <ServiceAgreementTerms
              data={data.termsConditions}
              onChange={onChangeHandlers.termsConditions}
              errors={errors}
            />
          </>
        );
      case 2:
        return (
          <>
            {formError}
            <ConsumerRights
              data={data.consumerRights}
              onChange={onChangeHandlers.consumerRights}
              errors={errors}
            />
          </>
        );
      case 3:
        return (
          <>
            {formError}
            <DirectCareWorkerNotice
              data={data.directCareWorker}
              onChange={onChangeHandlers.directCareWorker}
              errors={errors}
            />
          </>
        );
      case 4:
        return (
          <>
            {formError}
            <TransportationRequest
              data={data.transportationRequest}
              onChange={onChangeHandlers.transportationRequest}
              errors={errors}
            />
          </>
        );
      case 5:
        return (
          <>
            {formError}
            <CustomerPacket
              data={data.customerPacket}
              onChange={onChangeHandlers.customerPacket}
              errors={errors}
            />
          </>
        );
      case 6:
        return (
          <ContractReviewSubmit
            data={data}
            onGoToStep={handleStepClick}
            linkedAssessmentId={linkedAssessmentId}
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
      title="Service Contract"
      onGoHome={async () => { await flushSync(); await releaseLock(); onGoHome(); }}
      hasUnsavedChanges={isDirty}
      onDiscard={clearDraft}
    >
      {lockedByOther ? (
        <div className="pt-6">
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
              Draft Locked
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400 mb-1">
              This draft is currently being edited by another user{otherLockInfo?.lockDeviceId ? ` on device ${otherLockInfo.lockDeviceId.slice(0, 12)}...` : ''}.
            </p>
            {otherLockInfo?.lockedAt && (
              <p className="text-xs text-red-600 dark:text-red-500 mb-4">
                Locked since {new Date(otherLockInfo.lockedAt).toLocaleString()}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={retryLock}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/50 transition-all min-h-[44px]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-all min-h-[44px]"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      ) : showDrafts ? (
        <div className="pt-6">
          <DraftManager
            currentData={null}
            currentStep={wizard.currentStep}
            onResumeDraft={handleResumeDraft}
            onNewAssessment={handleNewContract}
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

      {/* Conflict resolution modal — shown when background sync detects version mismatch */}
      {conflictInfo && (
        <ConflictResolutionModal
          clientName={conflictInfo.clientName}
          remoteUpdatedAt={conflictInfo.remoteUpdatedAt}
          onKeepMine={async () => {
            const resolved = await resolveConflict('keepMine');
            if (resolved) {
              setDraftSaveMessage('Conflict resolved — your version kept');
              setTimeout(() => setDraftSaveMessage(''), 3000);
            }
          }}
          onUseTheirs={async () => {
            const resolved = await resolveConflict('useTheirs');
            if (resolved) {
              updateData(() => resolved.data as ServiceContractFormData);
              if (resolved.currentStep !== undefined) {
                wizard.goToStep(resolved.currentStep);
              }
              setDraftSaveMessage('Conflict resolved — remote version loaded');
              setTimeout(() => setDraftSaveMessage(''), 3000);
            }
          }}
          onCancel={dismissConflict}
        />
      )}
    </WizardShell>
  );
}
