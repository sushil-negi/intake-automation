/**
 * Tests for the OrgSetupScreen component.
 *
 * Verifies role-based rendering:
 * - Regular users see "Contact your administrator"
 * - Super-admins see "Go to Admin Portal" link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OrgSetupScreen } from '../components/OrgSetupScreen';
import type { AuthUser } from '../types/auth';

const mockAuthUser: AuthUser = {
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  loginTime: Date.now(),
};

describe('OrgSetupScreen', () => {
  const onNavigate = vi.fn();
  const onSignOut = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('regular user (non-super-admin)', () => {
    it('shows "Account Setup Required" heading', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText('Account Setup Required')).toBeTruthy();
    });

    it('displays user name and email', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('displays user avatar', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      const avatarImg = document.querySelector('img[src="https://example.com/avatar.jpg"]');
      expect(avatarImg).toBeTruthy();
    });

    it('shows "contact administrator" message', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText(/not been assigned to an organization/)).toBeTruthy();
      expect(screen.getByText(/contact your administrator/i)).toBeTruthy();
    });

    it('does NOT show Admin Portal button', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.queryByText(/Admin Portal/)).toBeNull();
    });

    it('shows sign-in-again hint', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText(/sign in again/i)).toBeTruthy();
    });
  });

  describe('super-admin', () => {
    it('shows "Super Admin" label', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={true}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText(/Super Admin/)).toBeTruthy();
    });

    it('shows "Go to Admin Portal" button', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={true}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText(/Go to Admin Portal/)).toBeTruthy();
    });

    it('does NOT show "contact administrator" message', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={true}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      expect(screen.queryByText(/not been assigned to an organization/)).toBeNull();
    });

    it('navigates to admin screen when button clicked', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={true}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      fireEvent.click(screen.getByText(/Go to Admin Portal/));
      expect(onNavigate).toHaveBeenCalledWith({ screen: 'admin' });
    });
  });

  describe('sign out', () => {
    it('calls onSignOut when Sign Out button is clicked', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      fireEvent.click(screen.getByText('Sign Out'));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it('super-admin can also sign out', () => {
      render(
        <OrgSetupScreen
          authUser={mockAuthUser}
          isSuperAdmin={true}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      fireEvent.click(screen.getByText('Sign Out'));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('no avatar', () => {
    it('does not render avatar img when picture is empty', () => {
      const noAvatarUser = { ...mockAuthUser, picture: '' };
      render(
        <OrgSetupScreen
          authUser={noAvatarUser}
          isSuperAdmin={false}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />,
      );

      // Should still show name/email
      expect(screen.getByText('Test User')).toBeTruthy();
      // No avatar img — only the EHC logo
      const images = document.querySelectorAll('img');
      const avatarImages = Array.from(images).filter(img => img.alt === '');
      expect(avatarImages.length).toBe(0);
    });
  });
});
