/**
 * Tests for the AdminPortal component.
 *
 * Verifies rendering of org list, create org form, org detail view,
 * user management, and confirm dialogs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// Mock the useAdminApi hook
const mockListOrgs = vi.fn();
const mockCreateOrg = vi.fn();
const mockSuspendOrg = vi.fn();
const mockListUsers = vi.fn();
const mockInviteUser = vi.fn();
const mockRemoveUser = vi.fn();
const mockClearError = vi.fn();

vi.mock('../hooks/useAdminApi', () => ({
  useAdminApi: () => ({
    callAdmin: vi.fn(),
    loading: false,
    error: null,
    clearError: mockClearError,
    listOrgs: mockListOrgs,
    createOrg: mockCreateOrg,
    suspendOrg: mockSuspendOrg,
    listUsers: mockListUsers,
    inviteUser: mockInviteUser,
    removeUser: mockRemoveUser,
  }),
}));

import { AdminPortal } from '../components/AdminPortal';

const SAMPLE_ORGS = [
  { id: 'org-1', name: 'EHC Chester County', slug: 'ehc-chester', is_active: true, created_at: '2025-01-15T00:00:00Z', user_count: 5 },
  { id: 'org-2', name: 'EHC Delaware County', slug: 'ehc-delaware', is_active: false, created_at: '2025-03-01T00:00:00Z', user_count: 2 },
];

const SAMPLE_USERS = [
  { id: 'u1', email: 'admin@ehc.com', full_name: 'Alice Admin', avatar_url: '', org_id: 'org-1', role: 'admin' as const, created_at: '2025-01-15', updated_at: '2025-01-15' },
  { id: 'u2', email: 'staff@ehc.com', full_name: 'Bob Staff', avatar_url: '', org_id: 'org-1', role: 'staff' as const, created_at: '2025-02-01', updated_at: '2025-02-01' },
];

describe('AdminPortal', () => {
  const onGoHome = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockListOrgs.mockResolvedValue(SAMPLE_ORGS);
    mockListUsers.mockResolvedValue(SAMPLE_USERS);
  });

  it('renders the Tenant Administration heading', async () => {
    render(<AdminPortal onGoHome={onGoHome} />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant Administration/)).toBeTruthy();
    });
  });

  it('calls listOrgs on mount and displays organizations', async () => {
    render(<AdminPortal onGoHome={onGoHome} />);

    await waitFor(() => {
      expect(mockListOrgs).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('EHC Chester County')).toBeTruthy();
    expect(screen.getByText('EHC Delaware County')).toBeTruthy();
  });

  it('shows Active/Suspended badges', async () => {
    render(<AdminPortal onGoHome={onGoHome} />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('Suspended')).toBeTruthy();
    });
  });

  it('shows user counts', async () => {
    render(<AdminPortal onGoHome={onGoHome} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  it('Home button calls onGoHome', async () => {
    render(<AdminPortal onGoHome={onGoHome} />);
    await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

    fireEvent.click(screen.getByText('Home'));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no organizations', async () => {
    mockListOrgs.mockResolvedValue([]);
    render(<AdminPortal onGoHome={onGoHome} />);

    await waitFor(() => {
      expect(screen.getByText(/No organizations yet/)).toBeTruthy();
    });
  });

  describe('Create Organization', () => {
    it('navigates to create form when New Organization is clicked', async () => {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));

      expect(screen.getByRole('heading', { name: 'Create Organization' })).toBeTruthy();
      expect(screen.getByLabelText('Organization Name')).toBeTruthy();
      expect(screen.getByLabelText(/Slug/)).toBeTruthy();
    });

    it('auto-generates slug from name', async () => {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));

      const nameInput = screen.getByLabelText('Organization Name');
      fireEvent.change(nameInput, { target: { value: 'EHC of Montgomery County' } });

      const slugInput = screen.getByLabelText(/Slug/) as HTMLInputElement;
      expect(slugInput.value).toBe('ehc-of-montgomery-county');
    });

    it('validates empty name', async () => {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));

      // Submit without filling in name — click the submit button specifically
      fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));

      expect(screen.getByText('Organization name is required.')).toBeTruthy();
      expect(mockCreateOrg).not.toHaveBeenCalled();
    });

    it('validates invalid slug', async () => {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));

      const nameInput = screen.getByLabelText('Organization Name');
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

      const slugInput = screen.getByLabelText(/Slug/);
      fireEvent.change(slugInput, { target: { value: 'INVALID SLUG!!' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));

      expect(screen.getByText(/Slug must be lowercase/)).toBeTruthy();
      expect(mockCreateOrg).not.toHaveBeenCalled();
    });

    it('calls createOrg and returns to org list on success', async () => {
      const newOrg = { id: 'org-3', name: 'Test Org', slug: 'test-org', is_active: true, created_at: '2025-06-01', user_count: 0 };
      mockCreateOrg.mockResolvedValue(newOrg);
      mockListOrgs.mockResolvedValue([...SAMPLE_ORGS, newOrg]);

      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));

      fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Test Org' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));

      await waitFor(() => {
        expect(mockCreateOrg).toHaveBeenCalledWith('Test Org', 'test-org');
      });
    });

    it('Cancel button returns to org list', async () => {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('+ New Organization')).toBeTruthy());

      fireEvent.click(screen.getByText('+ New Organization'));
      expect(screen.getByRole('heading', { name: 'Create Organization' })).toBeTruthy();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText(/Tenant Administration/)).toBeTruthy();
      });
    });
  });

  describe('Org Detail', () => {
    async function navigateToOrgDetail() {
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('EHC Chester County')).toBeTruthy());
      fireEvent.click(screen.getByText('EHC Chester County'));
      await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    }

    it('shows org name and slug', async () => {
      await navigateToOrgDetail();

      expect(screen.getByText('EHC Chester County')).toBeTruthy();
      expect(screen.getByText('ehc-chester')).toBeTruthy();
    });

    it('shows users in the org', async () => {
      await navigateToOrgDetail();

      expect(screen.getByText('Alice Admin')).toBeTruthy();
      expect(screen.getByText('admin@ehc.com')).toBeTruthy();
      expect(screen.getByText('Bob Staff')).toBeTruthy();
      expect(screen.getByText('staff@ehc.com')).toBeTruthy();
    });

    it('shows role badges for users', async () => {
      await navigateToOrgDetail();

      expect(screen.getByText('admin')).toBeTruthy();
      expect(screen.getByText('staff')).toBeTruthy();
    });

    it('shows suspend button for active org', async () => {
      await navigateToOrgDetail();

      expect(screen.getByText('Suspend Organization')).toBeTruthy();
    });

    it('shows confirm dialog on suspend', async () => {
      await navigateToOrgDetail();

      fireEvent.click(screen.getByText('Suspend Organization'));

      expect(screen.getByText('Suspend Organization?')).toBeTruthy();
      expect(screen.getByText(/will no longer be able to access/)).toBeTruthy();
    });

    it('shows reactivate button for suspended org', async () => {
      mockListOrgs.mockResolvedValue(SAMPLE_ORGS);
      render(<AdminPortal onGoHome={onGoHome} />);
      await waitFor(() => expect(screen.getByText('EHC Delaware County')).toBeTruthy());

      fireEvent.click(screen.getByText('EHC Delaware County'));
      await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

      expect(screen.getByText('Reactivate Organization')).toBeTruthy();
    });

    it('shows remove button for non-super-admin users', async () => {
      await navigateToOrgDetail();

      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons.length).toBe(2); // Both admin and staff can be removed
    });

    it('shows confirm dialog on remove user', async () => {
      await navigateToOrgDetail();

      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      expect(screen.getByText('Remove User?')).toBeTruthy();
    });

    it('invite form is visible', async () => {
      await navigateToOrgDetail();

      expect(screen.getByText('Invite User')).toBeTruthy();
      expect(screen.getByPlaceholderText('user@example.com')).toBeTruthy();
    });

    it('validates email in invite form', async () => {
      await navigateToOrgDetail();

      // Submit without email
      fireEvent.click(screen.getByText('Invite'));

      expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
      expect(mockInviteUser).not.toHaveBeenCalled();
    });

    it('invites user with correct params', async () => {
      mockInviteUser.mockResolvedValue({ id: 'u3', email: 'new@ehc.com', full_name: 'New User', avatar_url: '', org_id: 'org-1', role: 'staff', created_at: '', updated_at: '' });
      await navigateToOrgDetail();

      fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'new@ehc.com' } });
      fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'New User' } });
      fireEvent.click(screen.getByText('Invite'));

      await waitFor(() => {
        expect(mockInviteUser).toHaveBeenCalledWith('new@ehc.com', 'org-1', 'staff', 'New User');
      });
    });

    it('shows success message after invite', async () => {
      mockInviteUser.mockResolvedValue({ id: 'u3', email: 'new@ehc.com', full_name: '', avatar_url: '', org_id: 'org-1', role: 'staff', created_at: '', updated_at: '' });
      await navigateToOrgDetail();

      fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'new@ehc.com' } });
      fireEvent.click(screen.getByText('Invite'));

      await waitFor(() => {
        expect(screen.getByText(/Invited new@ehc.com as staff/)).toBeTruthy();
      });
    });

    it('back button returns to org list', async () => {
      await navigateToOrgDetail();

      fireEvent.click(screen.getByText(/Back to Organizations/));

      await waitFor(() => {
        expect(screen.getByText(/Tenant Administration/)).toBeTruthy();
      });
    });
  });
});
