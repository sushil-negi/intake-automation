import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { EmailComposeModal } from '../components/ui/EmailComposeModal';

// Mock the focus trap hook — it requires a real DOM ref which jsdom can't fully support
vi.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

const defaultProps = {
  defaultSubject: 'EHC Assessment - John Doe',
  defaultBody: 'Please find attached the assessment.',
  sending: false,
  onSend: vi.fn(),
  onClose: vi.fn(),
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(createElement(EmailComposeModal, props));
}

describe('EmailComposeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup portal nodes that may linger
    document.body.style.overflow = '';
  });

  // --- Rendering ---

  it('renders with pre-filled subject and body', () => {
    renderModal();

    const subjectInput = screen.getByDisplayValue('EHC Assessment - John Doe');
    expect(subjectInput).toBeInTheDocument();

    const bodyTextarea = screen.getByDisplayValue('Please find attached the assessment.');
    expect(bodyTextarea).toBeInTheDocument();
  });

  it('renders To and CC fields empty by default', () => {
    renderModal();

    const toInput = screen.getByPlaceholderText('recipient@email.com');
    expect(toInput).toHaveValue('');

    const ccInput = screen.getByPlaceholderText('office@ehc.com');
    expect(ccInput).toHaveValue('');
  });

  it('pre-fills CC field when defaultCc prop is provided', () => {
    renderModal({ defaultCc: 'office@ehc.com' } as Partial<typeof defaultProps>);

    const ccInput = screen.getByPlaceholderText('office@ehc.com') as HTMLInputElement;
    expect(ccInput.value).toBe('office@ehc.com');
  });

  it('leaves CC empty when defaultCc is not provided', () => {
    renderModal();

    const ccInput = screen.getByPlaceholderText('office@ehc.com') as HTMLInputElement;
    expect(ccInput.value).toBe('');
  });

  // --- Validation ---

  it('shows error for empty To field on submit', () => {
    renderModal();

    fireEvent.click(screen.getByText('Send Email'));

    expect(screen.getByText('Recipient email is required')).toBeInTheDocument();
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format in To field', () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('recipient@email.com'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByText('Send Email'));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it('shows error for invalid CC email', () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('recipient@email.com'), {
      target: { value: 'valid@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('office@ehc.com'), {
      target: { value: 'bad-cc' },
    });
    fireEvent.click(screen.getByText('Send Email'));

    expect(screen.getByText('Please enter a valid CC email address')).toBeInTheDocument();
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it('clears To error when user types a new value', () => {
    renderModal();

    // Trigger error
    fireEvent.click(screen.getByText('Send Email'));
    expect(screen.getByText('Recipient email is required')).toBeInTheDocument();

    // Type a new value — error should clear
    fireEvent.change(screen.getByPlaceholderText('recipient@email.com'), {
      target: { value: 'a' },
    });

    expect(screen.queryByText('Recipient email is required')).not.toBeInTheDocument();
  });

  // --- Submission ---

  it('calls onSend with form data on valid submit', () => {
    const onSend = vi.fn();
    renderModal({ onSend });

    fireEvent.change(screen.getByPlaceholderText('recipient@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('office@ehc.com'), {
      target: { value: 'cc@example.com' },
    });
    fireEvent.click(screen.getByText('Send Email'));

    expect(onSend).toHaveBeenCalledWith({
      to: 'test@example.com',
      cc: 'cc@example.com',
      subject: 'EHC Assessment - John Doe',
      body: 'Please find attached the assessment.',
    });
  });

  // --- Sending state ---

  it('disables all inputs and buttons while sending', () => {
    renderModal({ sending: true });

    expect(screen.getByPlaceholderText('recipient@email.com')).toBeDisabled();
    expect(screen.getByPlaceholderText('office@ehc.com')).toBeDisabled();
    expect(screen.getByText('Sending...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('shows "Sending..." text while sending', () => {
    renderModal({ sending: true });
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  // --- Close / Cancel ---

  it('calls onClose on Cancel click', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT close on Escape while sending', () => {
    const onClose = vi.fn();
    renderModal({ sending: true, onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  // --- Accessibility ---

  it('has proper ARIA attributes', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Email PDF');

    // Required To field
    const toInput = screen.getByPlaceholderText('recipient@email.com');
    expect(toInput).toHaveAttribute('aria-required', 'true');
    expect(toInput).toHaveAttribute('required');
  });
});
