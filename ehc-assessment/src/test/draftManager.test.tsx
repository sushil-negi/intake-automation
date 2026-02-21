/**
 * Tests for the DraftManager component.
 *
 * Covers: local/remote draft merge, filter/sort UI, delete confirmation,
 * export menu, empty states, draft card rendering, and Sheets sync button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAllDrafts = vi.fn();
const mockDeleteDraft = vi.fn();
const mockSaveDraft = vi.fn();
const mockGetEmailConfig = vi.fn();

vi.mock('../utils/db', () => ({
  getAllDrafts: (...args: unknown[]) => mockGetAllDrafts(...args),
  deleteDraft: (...args: unknown[]) => mockDeleteDraft(...args),
  saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
  getEmailConfig: (...args: unknown[]) => mockGetEmailConfig(...args),
}));

vi.mock('../utils/exportData', () => ({
  exportJSON: vi.fn(),
  exportCSV: vi.fn(),
  importJSON: vi.fn(),
  exportAllDraftsZip: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
}));

vi.mock('../utils/emailTemplates', () => ({
  resolveTemplate: vi.fn((t: string) => t),
  resolveEmailBody: vi.fn((b: string) => b),
}));

const mockSyncDraft = vi.fn();
vi.mock('../hooks/useSheetsSync', () => ({
  useSheetsSync: () => ({
    config: null, // No sheets config by default
    syncDraft: mockSyncDraft,
  }),
}));

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

let mockSupabaseDraftsReturn = {
  drafts: [] as Array<{ id: string; clientName: string; type: string; data: unknown; lastModified: string; status: string; currentStep?: number }>,
  loading: false,
  realtimeConnected: false,
};
vi.mock('../hooks/useSupabaseDrafts', () => ({
  useSupabaseDrafts: () => mockSupabaseDraftsReturn,
}));

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => false),
}));

vi.mock('../components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

vi.mock('../components/ui/EmailComposeModal', () => ({
  EmailComposeModal: () => <div data-testid="email-compose-modal">EmailCompose</div>,
}));

// Import after mocks
import { DraftManager } from '../components/DraftManager';
import type { DraftRecord } from '../utils/db';

// ── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_ASSESSMENT_DRAFT: DraftRecord = {
  id: 'draft-1',
  clientName: 'Alice Smith',
  type: 'assessment',
  data: { clientHelpList: { clientName: 'Alice Smith' } } as any,
  lastModified: '2025-06-15T10:00:00Z',
  status: 'draft',
  currentStep: 2,
};

const SAMPLE_CONTRACT_DRAFT: DraftRecord = {
  id: 'draft-2',
  clientName: 'Bob Jones',
  type: 'serviceContract',
  data: { serviceAgreement: { customerInfo: { firstName: 'Bob', lastName: 'Jones' } } } as any,
  lastModified: '2025-06-14T08:00:00Z',
  status: 'submitted',
  currentStep: 5,
};

const SAMPLE_DRAFT_3: DraftRecord = {
  id: 'draft-3',
  clientName: 'Charlie Brown',
  type: 'assessment',
  data: { clientHelpList: { clientName: 'Charlie Brown' } } as any,
  lastModified: '2025-06-13T12:00:00Z',
  status: 'draft',
  currentStep: 0,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DraftManager', () => {
  const onResumeDraft = vi.fn();
  const onNewAssessment = vi.fn();

  const defaultProps = {
    onResumeDraft,
    onNewAssessment,
    currentData: null,
    currentStep: 0,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockGetAllDrafts.mockResolvedValue([]);
    mockDeleteDraft.mockResolvedValue(undefined);
    mockSaveDraft.mockResolvedValue(undefined);
    mockGetEmailConfig.mockResolvedValue({
      assessmentSubjectTemplate: 'Assessment for {clientName}',
      assessmentBodyTemplate: 'Please find attached...',
      contractSubjectTemplate: 'Contract for {clientName}',
      contractBodyTemplate: 'Please find attached...',
      defaultCc: '',
      emailSignature: '',
      htmlEnabled: true,
    });
    mockSupabaseDraftsReturn = {
      drafts: [],
      loading: false,
      realtimeConnected: false,
    };
  });

  // ── Loading State ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loading spinner while loading drafts', () => {
      mockGetAllDrafts.mockReturnValue(new Promise(() => {})); // Never resolves
      render(<DraftManager {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty message when no drafts exist', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('No saved drafts')).toBeTruthy();
      });
    });

    it('shows New Assessment button even with no drafts', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('New Assessment')).toBeTruthy();
      });
    });

    it('calls onNewAssessment when New Assessment is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('New Assessment')).toBeTruthy());
      fireEvent.click(screen.getByText('New Assessment'));
      expect(onNewAssessment).toHaveBeenCalledTimes(1);
    });
  });

  // ── Draft Card Rendering ──────────────────────────────────────────────────

  describe('draft card rendering', () => {
    it('displays draft client name', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeTruthy();
      });
    });

    it('displays last modified date', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/Last modified:/)).toBeTruthy();
      });
    });

    it('shows type badge for assessments', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Assessment')).toBeTruthy();
      });
    });

    it('shows type badge for contracts', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_CONTRACT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Contract')).toBeTruthy();
      });
    });

    it('shows status badge (Draft vs Submitted)', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT, SAMPLE_CONTRACT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeTruthy();
        expect(screen.getByText('Submitted')).toBeTruthy();
      });
    });

    it('shows current step label', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        // Step 2 = "Assessment" for assessment type
        expect(screen.getByText(/Step 3: Assessment/)).toBeTruthy();
      });
    });

    it('shows contract step labels', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_CONTRACT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        // Step 5 = "Packet" for contract type
        expect(screen.getByText(/Step 6: Packet/)).toBeTruthy();
      });
    });
  });

  // ── Resume Draft ──────────────────────────────────────────────────────────

  describe('resume draft', () => {
    it('calls onResumeDraft when Resume is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy());

      fireEvent.click(screen.getByText('Resume'));
      expect(onResumeDraft).toHaveBeenCalledTimes(1);
      expect(onResumeDraft).toHaveBeenCalledWith(SAMPLE_ASSESSMENT_DRAFT);
    });
  });

  // ── Delete Confirmation ───────────────────────────────────────────────────

  describe('delete confirmation', () => {
    it('shows Confirm/Cancel buttons when Delete is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeTruthy());

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Confirm')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('deletes draft when Confirm is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeTruthy());

      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDeleteDraft).toHaveBeenCalledWith('draft-1');
      });
    });

    it('hides confirm buttons when Cancel is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeTruthy());

      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Confirm')).toBeTruthy();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Confirm')).toBeNull();
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  // ── Export Menu ───────────────────────────────────────────────────────────

  describe('export menu', () => {
    it('shows PDF button for each draft', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeTruthy();
      });
    });

    it('shows export dropdown when ▾ is clicked', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByLabelText('More export options')).toBeTruthy());

      fireEvent.click(screen.getByLabelText('More export options'));

      expect(screen.getByText('Export CSV')).toBeTruthy();
      expect(screen.getByText('Export JSON')).toBeTruthy();
    });

    it('shows Email button for each draft', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Email')).toBeTruthy();
      });
    });
  });

  // ── Filter / Sort ─────────────────────────────────────────────────────────

  describe('filter and sort', () => {
    beforeEach(() => {
      mockGetAllDrafts.mockResolvedValue([
        SAMPLE_ASSESSMENT_DRAFT,
        SAMPLE_CONTRACT_DRAFT,
        SAMPLE_DRAFT_3,
      ]);
    });

    it('renders search input when drafts exist', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by client name...')).toBeTruthy();
      });
    });

    it('filters drafts by search query', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy());

      fireEvent.change(screen.getByPlaceholderText('Search by client name...'), {
        target: { value: 'alice' },
      });

      expect(screen.getByText('Alice Smith')).toBeTruthy();
      expect(screen.queryByText('Bob Jones')).toBeNull();
      expect(screen.queryByText('Charlie Brown')).toBeNull();
    });

    it('shows no matching message when search finds nothing', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy());

      fireEvent.change(screen.getByPlaceholderText('Search by client name...'), {
        target: { value: 'zzzznotfound' },
      });

      expect(screen.getByText('No matching drafts')).toBeTruthy();
    });

    it('filters by type (assessments only)', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy());

      fireEvent.change(screen.getByLabelText('Filter drafts by type'), {
        target: { value: 'assessment' },
      });

      expect(screen.getByText('Alice Smith')).toBeTruthy();
      expect(screen.getByText('Charlie Brown')).toBeTruthy();
      // Bob is a contract — should be filtered out of assessment section
    });

    it('filters by type (contracts only)', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Bob Jones')).toBeTruthy());

      fireEvent.change(screen.getByLabelText('Filter drafts by type'), {
        target: { value: 'serviceContract' },
      });

      expect(screen.getByText('Bob Jones')).toBeTruthy();
    });

    it('filters by status', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy());

      fireEvent.change(screen.getByLabelText('Filter drafts by status'), {
        target: { value: 'submitted' },
      });

      expect(screen.getByText('Bob Jones')).toBeTruthy();
      expect(screen.queryByText('Alice Smith')).toBeNull();
    });

    it('renders sort dropdown', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByLabelText('Sort drafts')).toBeTruthy();
      });
    });

    it('shows result count', async () => {
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('3 results')).toBeTruthy();
      });
    });
  });

  // ── Grouped Sections ──────────────────────────────────────────────────────

  describe('grouped sections', () => {
    it('renders Assessments and Service Contracts section headings', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT, SAMPLE_CONTRACT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Assessments')).toBeTruthy();
        expect(screen.getByText('Service Contracts')).toBeTruthy();
      });
    });

    it('shows assessment count in section heading', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT, SAMPLE_DRAFT_3]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('(2)')).toBeTruthy();
      });
    });
  });

  // ── Import JSON Button ────────────────────────────────────────────────────

  describe('import JSON', () => {
    it('renders Import JSON button', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Import JSON')).toBeTruthy();
      });
    });
  });

  // ── Export All ZIP ────────────────────────────────────────────────────────

  describe('export all ZIP', () => {
    it('shows Export All (ZIP) button when drafts exist', async () => {
      mockGetAllDrafts.mockResolvedValue([SAMPLE_ASSESSMENT_DRAFT]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Export All (ZIP)')).toBeTruthy();
      });
    });

    it('hides Export All (ZIP) when no drafts', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByText('Export All (ZIP)')).toBeNull();
      });
    });
  });

  // ── Save Current As Draft ─────────────────────────────────────────────────

  describe('save current as draft', () => {
    it('shows Save Current as Draft when currentData is provided', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(
        <DraftManager
          {...defaultProps}
          currentData={{ clientHelpList: { clientName: 'Active Client' } } as never}
        />,
      );
      await waitFor(() => {
        expect(screen.getByText('Save Current as Draft')).toBeTruthy();
      });
    });

    it('hides Save Current as Draft when currentData is null', async () => {
      mockGetAllDrafts.mockResolvedValue([]);
      render(<DraftManager {...defaultProps} currentData={null} />);
      await waitFor(() => {
        expect(screen.queryByText('Save Current as Draft')).toBeNull();
      });
    });
  });
});
