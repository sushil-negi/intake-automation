/**
 * Tests for the Dashboard component.
 *
 * Covers: auto-rescue dedup logic, encrypted payload handling,
 * navigation, conditional rendering (auth, offline, super admin, org name).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// ── Mocks (before imports) ────────────────────────────────────────────────────

const mockGetAllDrafts = vi.fn<() => Promise<Array<{ id: string; type: string; clientName: string; lastModified: string }>>>();
const mockSaveDraft = vi.fn();
vi.mock('../utils/db', () => ({
  getAllDrafts: (...args: unknown[]) => mockGetAllDrafts(...(args as [])),
  saveDraft: (...args: unknown[]) => mockSaveDraft(...(args as [])),
}));

vi.mock('../utils/crypto', () => ({
  isEncrypted: vi.fn((s: string) => s.startsWith('ENC:')),
  decryptObject: vi.fn(async (s: string) => JSON.parse(s.replace('ENC:', ''))),
}));

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

import { Dashboard } from '../components/Dashboard';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  onNavigate: vi.fn(),
  authUser: { email: 'test@ehc.com', name: 'Test User', picture: 'https://example.com/pic.jpg', loginTime: Date.now() },
  onSignOut: vi.fn(),
};

describe('Dashboard', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    mockGetAllDrafts.mockResolvedValue([]);
    mockSaveDraft.mockResolvedValue(undefined);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders welcome message with user first name', async () => {
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test')).toBeTruthy();
      });
    });

    it('shows generic welcome when no authUser', async () => {
      render(<Dashboard {...defaultProps} authUser={null} />);
      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeTruthy();
      });
    });

    it('renders all 4 standard dashboard cards', async () => {
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('New Assessment')).toBeTruthy();
        expect(screen.getByText('Service Contract')).toBeTruthy();
        expect(screen.getByText('Resume Draft')).toBeTruthy();
        expect(screen.getByText('Admin / Settings')).toBeTruthy();
      });
    });

    it('shows draft count badge when drafts exist', async () => {
      mockGetAllDrafts.mockResolvedValue([
        { id: 'd1', type: 'assessment', clientName: 'A', lastModified: new Date().toISOString() },
        { id: 'd2', type: 'serviceContract', clientName: 'B', lastModified: new Date().toISOString() },
      ]);
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('2')).toBeTruthy();
      });
    });
  });

  // ── Org Name & Super Admin ─────────────────────────────────────────────────

  describe('org name & super admin', () => {
    it('displays org name when provided', async () => {
      render(<Dashboard {...defaultProps} orgName="EHC Chester County" />);
      await waitFor(() => {
        expect(screen.getByText('EHC Chester County')).toBeTruthy();
      });
    });

    it('does not show org name when null', async () => {
      render(<Dashboard {...defaultProps} orgName={null} />);
      await waitFor(() => {
        expect(screen.queryByText('EHC Chester County')).toBeNull();
      });
    });

    it('shows Tenant Admin card only for super admin', async () => {
      render(<Dashboard {...defaultProps} isSuperAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByText('Tenant Admin')).toBeTruthy();
      });
    });

    it('hides Tenant Admin card for non-super admin', async () => {
      render(<Dashboard {...defaultProps} isSuperAdmin={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Tenant Admin')).toBeNull();
      });
    });

    it('hides Tenant Admin card when isSuperAdmin is undefined', async () => {
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByText('Tenant Admin')).toBeNull();
      });
    });
  });

  // ── Offline Banner ─────────────────────────────────────────────────────────

  describe('offline banner', () => {
    it('shows offline banner when not online', async () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeTruthy();
      });
    });

    it('hides offline banner when online', async () => {
      vi.mocked(useOnlineStatus).mockReturnValue(true);
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).toBeNull();
      });
    });
  });

  // ── Auto-Rescue ────────────────────────────────────────────────────────────

  describe('auto-rescue', () => {
    it('rescues unsaved assessment data from localStorage', async () => {
      const data = { clientHelpList: { clientName: 'Alice Smith', dateOfBirth: '1990-01-01' } };
      localStorage.setItem('ehc-assessment-draft', JSON.stringify(data));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      });

      const savedDraft = mockSaveDraft.mock.calls[0][0];
      expect(savedDraft.clientName).toBe('Alice Smith');
      expect(savedDraft.type).toBe('assessment');
      expect(savedDraft.status).toBe('draft');
    });

    it('rescues unsaved contract data from localStorage', async () => {
      const data = { serviceAgreement: { customerInfo: { firstName: 'Bob', lastName: 'Jones' } } };
      localStorage.setItem('ehc-service-contract-draft', JSON.stringify(data));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      });

      const savedDraft = mockSaveDraft.mock.calls[0][0];
      expect(savedDraft.clientName).toBe('Bob Jones');
      expect(savedDraft.type).toBe('serviceContract');
    });

    it('rescues encrypted localStorage data', async () => {
      const data = { clientHelpList: { clientName: 'Encrypted User', dateOfBirth: '1985-05-15' } };
      localStorage.setItem('ehc-assessment-draft', `ENC:${JSON.stringify(data)}`);

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      });

      const savedDraft = mockSaveDraft.mock.calls[0][0];
      expect(savedDraft.clientName).toBe('Encrypted User');
    });

    it('skips rescue if matching draft exists within 60s (dedup guard)', async () => {
      const data = { clientHelpList: { clientName: 'Dedup Test', dateOfBirth: '1990-01-01' } };
      localStorage.setItem('ehc-assessment-draft', JSON.stringify(data));

      // Simulate existing draft with matching name within 60s
      mockGetAllDrafts.mockResolvedValue([
        { id: 'd1', type: 'assessment', clientName: 'Dedup Test', lastModified: new Date().toISOString() },
      ]);

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        // Should check for drafts
        expect(mockGetAllDrafts).toHaveBeenCalled();
      });

      // saveDraft should NOT be called — dedup prevents it
      expect(mockSaveDraft).not.toHaveBeenCalled();

      // But localStorage should still be cleared
      expect(localStorage.getItem('ehc-assessment-draft')).toBeNull();
    });

    it('clears localStorage even when no meaningful data exists', async () => {
      // Empty defaults (no clientName, no dateOfBirth)
      localStorage.setItem('ehc-assessment-draft', JSON.stringify({ clientHelpList: {} }));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(localStorage.getItem('ehc-assessment-draft')).toBeNull();
      });

      // No draft saved — no meaningful data
      expect(mockSaveDraft).not.toHaveBeenCalled();
    });

    it('uses "Untitled" when client name is empty', async () => {
      const data = { clientHelpList: { clientName: '', dateOfBirth: '1990-01-01' } };
      localStorage.setItem('ehc-assessment-draft', JSON.stringify(data));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      });

      const savedDraft = mockSaveDraft.mock.calls[0][0];
      expect(savedDraft.clientName).toBe('Untitled');
    });
  });

  // ── Auth Display ───────────────────────────────────────────────────────────

  describe('auth display', () => {
    it('shows Sign Out button when onSignOut is provided', async () => {
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeTruthy();
      });
    });

    it('hides Sign Out button when onSignOut is undefined', async () => {
      render(<Dashboard {...defaultProps} onSignOut={undefined} />);
      await waitFor(() => {
        expect(screen.queryByText('Sign Out')).toBeNull();
      });
    });

    it('shows user name in header on desktop', async () => {
      render(<Dashboard {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeTruthy();
      });
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('has skip-to-main-content link', async () => {
      render(<Dashboard {...defaultProps} />);
      const skipLink = document.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeTruthy();
    });

    it('has main content landmark with correct id', async () => {
      render(<Dashboard {...defaultProps} />);
      const main = document.getElementById('main-content');
      expect(main).toBeTruthy();
      expect(main?.tagName).toBe('MAIN');
    });
  });
});
