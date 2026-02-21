import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConflictResolutionModal } from '../components/ui/ConflictResolutionModal';

describe('ConflictResolutionModal', () => {
  let onKeepMine: () => void;
  let onUseTheirs: () => void;
  let onCancel: () => void;

  beforeEach(() => {
    cleanup();
    onKeepMine = vi.fn();
    onUseTheirs = vi.fn();
    onCancel = vi.fn();
  });

  const renderModal = (extra = {}) =>
    render(
      <ConflictResolutionModal
        onKeepMine={onKeepMine}
        onUseTheirs={onUseTheirs}
        onCancel={onCancel}
        {...extra}
      />,
    );

  it('renders with all three action buttons', () => {
    renderModal();

    expect(screen.getByText('Sync Conflict')).toBeTruthy();
    expect(screen.getByText(/Keep Mine/)).toBeTruthy();
    expect(screen.getByText(/Use Theirs/)).toBeTruthy();
    expect(screen.getByText(/Cancel/)).toBeTruthy();
  });

  it('shows client name when provided', () => {
    renderModal({ clientName: 'Alice Johnson' });

    expect(screen.getByText(/Alice Johnson/)).toBeTruthy();
  });

  it('shows generic message when no client name', () => {
    renderModal();

    expect(screen.getByText(/This draft was updated on another device/)).toBeTruthy();
  });

  it('shows remote updated time when provided', () => {
    renderModal({ remoteUpdatedAt: '2025-01-15T10:30:00Z' });

    expect(screen.getByText(/Remote updated:/)).toBeTruthy();
  });

  it('calls onKeepMine when "Keep Mine" is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByText(/Keep Mine/));
    expect(onKeepMine).toHaveBeenCalledTimes(1);
  });

  it('calls onUseTheirs when "Use Theirs" is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByText(/Use Theirs/));
    expect(onUseTheirs).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when "Cancel" button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByText(/Cancel/));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', () => {
    renderModal();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when clicking on the overlay backdrop', () => {
    renderModal();

    // The overlay is the outermost div with role="dialog"
    // Clicking it (not the inner content) triggers onCancel
    const overlay = document.querySelector('[role="dialog"]');
    expect(overlay).toBeTruthy();

    // Simulate click directly on overlay, not on inner content
    fireEvent.click(overlay!);
    expect(onCancel).toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('conflict-title');
  });
});
