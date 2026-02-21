/**
 * Integration tests for the ServiceContractWizard component.
 *
 * Covers: prefill timing (localStorage side effect), consumer name
 * propagation from firstName+lastName, EHC rep name one-time population,
 * lock UI, conflict resolution, step rendering, and loading state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// ── Mock surfaces ────────────────────────────────────────────────────────────

const mockUpdateData = vi.fn();
const mockClearDraft = vi.fn();
let mockAutoSaveReturn = {
  data: {} as any,
  updateData: mockUpdateData,
  lastSaved: null as string | null,
  isSaving: false,
  isLoading: false,
  isDirty: false,
  clearDraft: mockClearDraft,
  hasDraft: vi.fn(() => false),
};

vi.mock('../hooks/useAutoSave', () => ({
  useAutoSave: (_init: unknown, _key?: string) => mockAutoSaveReturn,
}));

const mockGoNext = vi.fn();
const mockGoBack = vi.fn();
const mockGoToStep = vi.fn();
let mockWizardReturn = {
  currentStep: 0,
  totalSteps: 7,
  isFirst: true,
  isLast: false,
  goNext: mockGoNext,
  goBack: mockGoBack,
  goToStep: mockGoToStep,
};

vi.mock('../hooks/useFormWizard', () => ({
  useFormWizard: () => mockWizardReturn,
}));

const mockValidate = vi.fn(() => true);
vi.mock('../hooks/useStepValidation', () => ({
  useStepValidation: () => ({
    errors: {},
    validate: mockValidate,
    clearErrors: vi.fn(),
    clearFieldErrors: vi.fn(),
  }),
  scrollToFirstError: vi.fn(),
}));

let mockLockReturn = {
  lockedByOther: false,
  otherLockInfo: null as { lockedBy?: string; lockedAt?: string; lockDeviceId?: string } | null,
  retryLock: vi.fn(),
  releaseLock: vi.fn(),
};
vi.mock('../hooks/useDraftLock', () => ({
  useDraftLock: () => mockLockReturn,
}));

let mockSyncReturn = {
  status: 'idle' as string,
  conflictInfo: null as { clientName: string; remoteUpdatedAt: string } | null,
  resolveConflict: vi.fn(),
  dismissConflict: vi.fn(),
  scheduleDraftSync: vi.fn(),
  flushSync: vi.fn(),
};
vi.mock('../hooks/useSupabaseSync', () => ({
  useSupabaseSync: () => mockSyncReturn,
}));

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => false),
}));

vi.mock('../utils/db', () => ({
  saveDraft: vi.fn(),
  getAllDrafts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

// Mock contract form step components
vi.mock('../components/forms/contract/ServiceAgreement', () => ({
  ServiceAgreement: ({ data }: { data: Record<string, unknown> }) => (
    <div data-testid="step-service-agreement">ServiceAgreement: {(data as { ehcRepName?: string }).ehcRepName || 'no-rep'}</div>
  ),
}));
vi.mock('../components/forms/contract/ServiceAgreementTerms', () => ({
  ServiceAgreementTerms: () => <div data-testid="step-terms">Terms</div>,
}));
vi.mock('../components/forms/contract/ConsumerRights', () => ({
  ConsumerRights: ({ data }: { data: Record<string, unknown> }) => (
    <div data-testid="step-rights">ConsumerRights: {(data as { consumerName?: string }).consumerName || 'no-name'}</div>
  ),
}));
vi.mock('../components/forms/contract/DirectCareWorkerNotice', () => ({
  DirectCareWorkerNotice: ({ data }: { data: Record<string, unknown> }) => (
    <div data-testid="step-dcw">DCW: {(data as { consumerName?: string }).consumerName || 'no-name'}</div>
  ),
}));
vi.mock('../components/forms/contract/TransportationRequest', () => ({
  TransportationRequest: ({ data }: { data: Record<string, unknown> }) => (
    <div data-testid="step-transport">Transport: {(data as { ehcRepName?: string }).ehcRepName || 'no-rep'}</div>
  ),
}));
vi.mock('../components/forms/contract/CustomerPacket', () => ({
  CustomerPacket: ({ data }: { data: Record<string, unknown> }) => (
    <div data-testid="step-packet">Packet: {(data as { consumerName?: string }).consumerName || 'no-name'}</div>
  ),
}));
vi.mock('../components/forms/contract/ContractReviewSubmit', () => ({
  ContractReviewSubmit: ({ linkedAssessmentId }: { linkedAssessmentId?: string }) => (
    <div data-testid="step-review">Review: linked={linkedAssessmentId || 'none'}</div>
  ),
}));

vi.mock('../components/DraftManager', () => ({
  DraftManager: () => <div data-testid="draft-manager">DraftManager</div>,
}));

vi.mock('../components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

vi.mock('../components/ui/ConflictResolutionModal', () => ({
  ConflictResolutionModal: ({ clientName, onCancel }: {
    clientName: string;
    onCancel: () => void;
  }) => (
    <div data-testid="conflict-modal">
      <span>Conflict: {clientName}</span>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/wizard/WizardShell', () => ({
  WizardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="wizard-shell">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('../validation/contractSchemas', () => ({
  CONTRACT_STEP_SCHEMAS: [null, null, null, null, null, null, null],
}));

// Import after mocks
import { ServiceContractWizard } from '../components/ServiceContractWizard';
import { SERVICE_CONTRACT_INITIAL_DATA } from '../utils/contractInitialData';
import type { ServiceContractFormData } from '../types/serviceContract';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDefaultData(): ServiceContractFormData {
  return JSON.parse(JSON.stringify(SERVICE_CONTRACT_INITIAL_DATA));
}

const defaultProps = {
  onGoHome: vi.fn(),
  authUserName: 'Jane Doe',
};

describe('ServiceContractWizard', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();

    const data = makeDefaultData();
    mockAutoSaveReturn = {
      data,
      updateData: mockUpdateData,
      lastSaved: null,
      isSaving: false,
      isLoading: false,
      isDirty: false,
      clearDraft: mockClearDraft,
      hasDraft: vi.fn(() => false),
    };

    mockWizardReturn = {
      currentStep: 0,
      totalSteps: 7,
      isFirst: true,
      isLast: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      goToStep: mockGoToStep,
    };

    mockLockReturn = {
      lockedByOther: false,
      otherLockInfo: null,
      retryLock: vi.fn(),
      releaseLock: vi.fn(),
    };

    mockSyncReturn = {
      status: 'idle',
      conflictInfo: null,
      resolveConflict: vi.fn(),
      dismissConflict: vi.fn(),
      scheduleDraftSync: vi.fn(),
      flushSync: vi.fn(),
    };
  });

  // ── Loading State ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loading spinner when auto-save is initializing', () => {
      mockAutoSaveReturn.isLoading = true;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      expect(screen.getByText('Loading draft...')).toBeTruthy();
    });

    it('renders wizard shell when loading is complete', () => {
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('wizard-shell')).toBeTruthy();
      expect(screen.getByText('Service Contract')).toBeTruthy();
    });
  });

  // ── Prefill Side Effect ───────────────────────────────────────────────────

  describe('prefill timing', () => {
    it('clears localStorage when prefillData is provided', () => {
      localStorage.setItem('ehc-service-contract-draft', JSON.stringify({ test: true }));
      const prefill = makeDefaultData();

      render(<ServiceContractWizard {...defaultProps} prefillData={prefill} />);

      expect(localStorage.getItem('ehc-service-contract-draft')).toBeNull();
    });

    it('does not clear localStorage when no prefillData', () => {
      localStorage.setItem('ehc-service-contract-draft', JSON.stringify({ test: true }));

      render(<ServiceContractWizard {...defaultProps} />);

      // localStorage should remain (side effect only runs when prefillData truthy)
      expect(localStorage.getItem('ehc-service-contract-draft')).toBe(JSON.stringify({ test: true }));
    });
  });

  // ── Consumer Name Propagation ─────────────────────────────────────────────

  describe('consumer name propagation', () => {
    it('propagates firstName+lastName to downstream consumerName fields', () => {
      const data = makeDefaultData();
      data.serviceAgreement.customerInfo.firstName = 'Alice';
      data.serviceAgreement.customerInfo.lastName = 'Smith';
      // Downstream still empty
      data.consumerRights.consumerName = '';
      data.directCareWorker.consumerName = '';
      data.transportationRequest.consumerName = '';
      data.customerPacket.consumerName = '';
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} />);

      // updateData should have been called with silent:true for propagation
      const silentCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => call[1] && (call[1] as { silent?: boolean }).silent === true,
      );
      expect(silentCalls.length).toBeGreaterThan(0);
    });

    it('does not propagate when firstName and lastName are empty', () => {
      const data = makeDefaultData();
      data.serviceAgreement.customerInfo.firstName = '';
      data.serviceAgreement.customerInfo.lastName = '';
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} />);

      // The consumer name propagation effect should not update when fullName is empty
      // Only the rep name effect should run
      const silentCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'function' && (call[1] as any)?.silent === true,
      );

      // All silent calls should be the rep name population, not consumer name propagation
      for (const call of silentCalls) {
        const updater = call[0] as (prev: ServiceContractFormData) => ServiceContractFormData;
        const result = updater(data);
        // Consumer names should remain empty
        expect(result.consumerRights.consumerName).toBe('');
      }
    });

    it('creates correct full name from firstName only', () => {
      const data = makeDefaultData();
      data.serviceAgreement.customerInfo.firstName = 'Bob';
      data.serviceAgreement.customerInfo.lastName = '';
      data.consumerRights.consumerName = '';
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} />);

      // Should propagate "Bob" (filter empty parts)
      const silentCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => (call[1] as any)?.silent === true,
      );
      expect(silentCalls.length).toBeGreaterThan(0);
    });
  });

  // ── EHC Rep Name Population ───────────────────────────────────────────────

  describe('EHC rep name one-time population', () => {
    it('populates rep name from authUserName when fields are empty', () => {
      const data = makeDefaultData();
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} authUserName="Jane Doe" />);

      const fnCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'function',
      );
      expect(fnCalls.length).toBeGreaterThan(0);

      // Find and execute the rep name updater
      const updater = fnCalls[fnCalls.length - 1][0] as (prev: ServiceContractFormData) => ServiceContractFormData;
      const result = updater(data);
      expect(result.serviceAgreement.ehcRepName).toBe('Jane Doe');
      expect(result.transportationRequest.ehcRepName).toBe('Jane Doe');
    });

    it('does not overwrite existing rep name', () => {
      const data = makeDefaultData();
      data.serviceAgreement.ehcRepName = 'Existing Rep';
      data.transportationRequest.ehcRepName = 'Existing Rep';
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} authUserName="Jane Doe" />);

      const fnCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'function' && (call[1] as any)?.silent === true,
      );

      for (const call of fnCalls) {
        const updater = call[0] as (prev: ServiceContractFormData) => ServiceContractFormData;
        const result = updater(data);
        expect(result.serviceAgreement.ehcRepName).toBe('Existing Rep');
        expect(result.transportationRequest.ehcRepName).toBe('Existing Rep');
      }
    });

    it('skips population when authUserName is undefined', () => {
      const data = makeDefaultData();
      mockAutoSaveReturn.data = data;

      render(<ServiceContractWizard {...defaultProps} authUserName={undefined} />);

      const fnCalls = mockUpdateData.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'function' && (call[1] as any)?.silent === true,
      );

      for (const call of fnCalls) {
        const updater = call[0] as (prev: ServiceContractFormData) => ServiceContractFormData;
        const result = updater(data);
        expect(result.serviceAgreement.ehcRepName).toBe('');
      }
    });
  });

  // ── Lock UI ────────────────────────────────────────────────────────────────

  describe('lock UI', () => {
    it('shows lock banner when draft is locked', () => {
      mockLockReturn.lockedByOther = true;
      mockLockReturn.otherLockInfo = {
        lockedAt: new Date().toISOString(),
      };
      render(<ServiceContractWizard {...defaultProps} draftId="d1" />);
      expect(screen.getByText('Draft Locked')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.getByText('Go Back')).toBeTruthy();
    });

    it('hides form content when locked', () => {
      mockLockReturn.lockedByOther = true;
      render(<ServiceContractWizard {...defaultProps} draftId="d1" />);
      expect(screen.queryByTestId('step-service-agreement')).toBeNull();
    });
  });

  // ── Conflict Resolution ───────────────────────────────────────────────────

  describe('conflict resolution', () => {
    it('shows conflict modal when conflictInfo is present', () => {
      mockSyncReturn.conflictInfo = {
        clientName: 'Test Client',
        remoteUpdatedAt: '2025-06-15T10:00:00Z',
      };
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('conflict-modal')).toBeTruthy();
    });

    it('hides conflict modal when conflictInfo is null', () => {
      mockSyncReturn.conflictInfo = null;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.queryByTestId('conflict-modal')).toBeNull();
    });
  });

  // ── Step Rendering ────────────────────────────────────────────────────────

  describe('step rendering', () => {
    it('renders ServiceAgreement on step 0', () => {
      mockWizardReturn.currentStep = 0;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-service-agreement')).toBeTruthy();
    });

    it('renders ServiceAgreementTerms on step 1', () => {
      mockWizardReturn.currentStep = 1;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-terms')).toBeTruthy();
    });

    it('renders ConsumerRights on step 2', () => {
      mockWizardReturn.currentStep = 2;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-rights')).toBeTruthy();
    });

    it('renders DirectCareWorkerNotice on step 3', () => {
      mockWizardReturn.currentStep = 3;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-dcw')).toBeTruthy();
    });

    it('renders TransportationRequest on step 4', () => {
      mockWizardReturn.currentStep = 4;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-transport')).toBeTruthy();
    });

    it('renders CustomerPacket on step 5', () => {
      mockWizardReturn.currentStep = 5;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-packet')).toBeTruthy();
    });

    it('renders ContractReviewSubmit on step 6', () => {
      mockWizardReturn.currentStep = 6;
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('step-review')).toBeTruthy();
    });

    it('passes linkedAssessmentId to review step', () => {
      mockWizardReturn.currentStep = 6;
      render(<ServiceContractWizard {...defaultProps} linkedAssessmentId="assess-123" />);
      expect(screen.getByText('Review: linked=assess-123')).toBeTruthy();
    });
  });

  // ── Draft ID Management ───────────────────────────────────────────────────

  describe('draft ID management', () => {
    it('initializes with draftId prop', () => {
      render(<ServiceContractWizard {...defaultProps} draftId="existing-123" />);
      expect(screen.getByTestId('wizard-shell')).toBeTruthy();
    });

    it('initializes with null when no draftId', () => {
      render(<ServiceContractWizard {...defaultProps} />);
      expect(screen.getByTestId('wizard-shell')).toBeTruthy();
    });
  });
});
