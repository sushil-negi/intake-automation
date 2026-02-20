/**
 * Tests for the SettingsScreen component.
 *
 * Covers: section rendering (accordion structure), Supabase org info display,
 * admin gate, cloud sync section, and admin portal link for super-admins.
 *
 * Note: SettingsScreen shows a loading spinner until resolveConfig() resolves.
 * All tests must wait for config to load before asserting on rendered content.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../utils/db', () => ({
  getSheetsConfig: vi.fn().mockResolvedValue(null),
  saveSheetsConfig: vi.fn().mockResolvedValue(undefined),
  getAllDrafts: vi.fn().mockResolvedValue([]),
  deleteDraft: vi.fn().mockResolvedValue(undefined),
  saveAuthConfig: vi.fn().mockResolvedValue(undefined),
  saveDraft: vi.fn().mockResolvedValue(undefined),
  getEmailConfig: vi.fn().mockResolvedValue({
    assessmentSubjectTemplate: '',
    assessmentBodyTemplate: '',
    contractSubjectTemplate: '',
    contractBodyTemplate: '',
    defaultCc: '',
    emailSignature: '',
    htmlEnabled: true,
  }),
  saveEmailConfig: vi.fn().mockResolvedValue(undefined),
  getSupabaseSyncQueue: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/sheetsApi', () => ({
  testConnection: vi.fn(),
  readAllRows: vi.fn(),
  rowToFlatMap: vi.fn(),
  syncAssessment: vi.fn(),
  syncContract: vi.fn(),
}));

vi.mock('../utils/exportData', () => ({
  exportAllDraftsZip: vi.fn(),
  unflattenAssessment: vi.fn(),
}));

vi.mock('../utils/contractExportData', () => ({
  unflattenContractData: vi.fn(),
}));

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  purgeOldLogs: vi.fn().mockResolvedValue(0),
  exportAuditLogCSV: vi.fn(),
}));

vi.mock('../utils/googleAuth', () => ({
  requestAccessToken: vi.fn(),
  revokeAccessToken: vi.fn(),
  isTokenExpired: vi.fn(() => true),
  isGsiLoaded: vi.fn(() => false),
}));

let mockIsSupabaseConfigured = false;
vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: vi.fn(() => mockIsSupabaseConfigured),
}));

vi.mock('../utils/emailApi', () => ({
  sendPdfEmail: vi.fn(),
  isValidEmail: vi.fn((e: string) => e.includes('@')),
}));

// Dynamic import mock for resolveConfig — vi.mock handles dynamic imports
vi.mock('../utils/remoteConfig', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    sheetsConfig: {
      spreadsheetId: '',
      apiKey: '',
      authMethod: 'apiKey',
      oauthAccessToken: '',
      oauthTokenExpiry: '',
      oauthClientId: '',
      tabMapping: {
        clientHelpList: 'Sheet1',
        clientHistory: 'Sheet2',
        clientAssessment: 'Sheet3',
        medicationList: 'Sheet4',
        homeSafetyChecklist: 'Sheet5',
        consent: 'Sheet6',
      },
      exportPrivacy: undefined,
    },
    authConfig: {
      requireAuth: false,
      allowedEmails: [],
      idleTimeoutMinutes: 0,
    },
    source: 'local',
  }),
}));

// Import after mocks
import { SettingsScreen } from '../components/SettingsScreen';

// ── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  onGoHome: vi.fn(),
};

/**
 * Wait for the async config loading to complete.
 * SettingsScreen returns a LoadingSpinner while configLoading=true.
 * Once resolveConfig() resolves, the full page renders.
 */
async function waitForConfigLoad() {
  await waitFor(() => {
    expect(screen.getByText(/Google Sheets Connection/)).toBeTruthy();
  });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockIsSupabaseConfigured = false;
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      // Don't wait — check the immediate render
      render(<SettingsScreen {...defaultProps} />);
      // LoadingSpinner renders as <div role="status" aria-label="...">
      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByText('Loading settings...')).toBeTruthy();
    });
  });

  // ── Core Rendering (after config load) ────────────────────────────────────

  describe('core rendering', () => {
    it('renders the Admin / Settings heading', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getAllByText('Admin / Settings').length).toBeGreaterThan(0);
    });

    it('renders Home button', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText('Home')).toBeTruthy();
    });

    it('calls onGoHome when Home is clicked', async () => {
      const onGoHome = vi.fn();
      render(<SettingsScreen {...defaultProps} onGoHome={onGoHome} />);
      await waitForConfigLoad();
      fireEvent.click(screen.getByText('Home'));
      expect(onGoHome).toHaveBeenCalledTimes(1);
    });

    it('renders Save Settings button', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText('Save Settings')).toBeTruthy();
    });
  });

  // ── Accordion Sections (admin-gated, appear after config loads) ───────────

  describe('accordion sections', () => {
    it('renders Google Sheets Connection section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/Google Sheets Connection/)).toBeTruthy();
    });

    it('renders Sheet Configuration section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/Sheet Configuration/)).toBeTruthy();
    });

    it('renders Data Management section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/Data Management/)).toBeTruthy();
    });

    it('renders Activity Log section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/Activity Log/)).toBeTruthy();
    });

    it('renders HIPAA Compliance section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/HIPAA Compliance/)).toBeTruthy();
    });

    it('renders User Access Control section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/User Access Control/)).toBeTruthy();
    });

    it('renders Email Configuration section', async () => {
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.getByText(/Email Configuration/)).toBeTruthy();
    });
  });

  // ── Supabase Org Info ─────────────────────────────────────────────────────

  describe('Supabase org info', () => {
    /** Helper: expand the Cloud Sync accordion so content is visible */
    async function expandCloudSync() {
      await waitFor(() => expect(screen.getByText(/Cloud Sync/)).toBeTruthy());
      fireEvent.click(screen.getByText(/Cloud Sync/));
    }

    it('shows Cloud Sync section when Supabase configured', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/Cloud Sync/)).toBeTruthy();
      });
    });

    it('hides Cloud Sync section when Supabase not configured', async () => {
      mockIsSupabaseConfigured = false;
      render(<SettingsScreen {...defaultProps} />);
      await waitForConfigLoad();
      expect(screen.queryByText(/Cloud Sync/)).toBeNull();
    });

    it('shows org name when accordion expanded', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} orgName="EHC Chester County" orgSlug="ehc-chester" />);
      await expandCloudSync();
      expect(screen.getByText('EHC Chester County')).toBeTruthy();
    });

    it('shows org slug in parentheses when accordion expanded', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} orgName="EHC Chester County" orgSlug="ehc-chester" />);
      await expandCloudSync();
      expect(screen.getByText(/ehc-chester/)).toBeTruthy();
    });

    it('shows user role badge as "Admin" for admin role', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} userRole="admin" />);
      await expandCloudSync();
      expect(screen.getByText('Admin')).toBeTruthy();
    });

    it('shows user role badge as "Super Admin" for super_admin role', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} userRole="super_admin" isSuperAdmin={true} />);
      await expandCloudSync();
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('shows user role badge as "Staff" for staff role', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} userRole="staff" />);
      await expandCloudSync();
      expect(screen.getByText('Staff')).toBeTruthy();
    });

    it('shows admin portal link for super_admin', async () => {
      mockIsSupabaseConfigured = true;
      const onNavigateAdmin = vi.fn();
      render(
        <SettingsScreen
          {...defaultProps}
          isSuperAdmin={true}
          userRole="super_admin"
          onNavigateAdmin={onNavigateAdmin}
        />,
      );
      await expandCloudSync();
      expect(screen.getByText(/Tenant Admin Portal/)).toBeTruthy();
    });

    it('calls onNavigateAdmin when admin portal link is clicked', async () => {
      mockIsSupabaseConfigured = true;
      const onNavigateAdmin = vi.fn();
      render(
        <SettingsScreen
          {...defaultProps}
          isSuperAdmin={true}
          userRole="super_admin"
          onNavigateAdmin={onNavigateAdmin}
        />,
      );
      await expandCloudSync();
      fireEvent.click(screen.getByText(/Tenant Admin Portal/));
      expect(onNavigateAdmin).toHaveBeenCalledTimes(1);
    });

    it('hides admin portal link for non-super-admin', async () => {
      mockIsSupabaseConfigured = true;
      render(
        <SettingsScreen
          {...defaultProps}
          isSuperAdmin={false}
          userRole="staff"
        />,
      );
      await expandCloudSync();
      expect(screen.queryByText(/Tenant Admin Portal/)).toBeNull();
    });

    it('shows connection status as Connected', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} />);
      await expandCloudSync();
      expect(screen.getByText('Connected')).toBeTruthy();
    });

    it('shows offline queue status', async () => {
      mockIsSupabaseConfigured = true;
      render(<SettingsScreen {...defaultProps} />);
      await expandCloudSync();
      expect(screen.getByText(/all synced/)).toBeTruthy();
    });
  });

  // ── Admin Gate ────────────────────────────────────────────────────────────

  describe('admin gate', () => {
    it('shows admin sections when allowedEmails is empty (all users admin)', async () => {
      render(<SettingsScreen {...defaultProps} authUserEmail="anyone@ehc.com" />);
      await waitForConfigLoad();
      expect(screen.getByText(/Google Sheets Connection/)).toBeTruthy();
      expect(screen.getByText(/Data Management/)).toBeTruthy();
    });
  });

  // ── Config Source Badge ───────────────────────────────────────────────────

  describe('config source', () => {
    it('shows Remote badge when configSource is remote', async () => {
      render(<SettingsScreen {...defaultProps} configSource="remote" />);
      await waitForConfigLoad();
      const remoteBadges = screen.queryAllByText('Remote');
      expect(remoteBadges.length).toBeGreaterThan(0);
    });

    it('does not show Remote badge when configSource is local', async () => {
      render(<SettingsScreen {...defaultProps} configSource="local" />);
      await waitForConfigLoad();
      const remoteBadges = screen.queryAllByText('Remote');
      expect(remoteBadges.length).toBe(0);
    });
  });
});
