import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { SettingsScreen } from '../components/SettingsScreen';

// --- Mock all external dependencies ---

// db.ts
const mockSaveEmailConfig = vi.fn().mockResolvedValue(undefined);
vi.mock('../utils/db', () => ({
  getSheetsConfig: vi.fn().mockResolvedValue({
    spreadsheetId: '',
    apiKey: '',
    assessmentSheetName: 'Assessments',
    contractSheetName: 'Contracts',
    autoSync: false,
    authMethod: 'apiKey' as const,
    oauthClientId: '',
    oauthAccessToken: '',
    oauthTokenExpiry: 0,
    exportPrivacy: {
      maskNames: false,
      maskDob: false,
      maskSsn: false,
      maskAddresses: false,
      maskPhone: false,
      maskEmail: false,
      maskMedical: false,
    },
    baaConfirmed: false,
  }),
  saveSheetsConfig: vi.fn().mockResolvedValue(undefined),
  getAllDrafts: vi.fn().mockResolvedValue([]),
  deleteDraft: vi.fn(),
  saveAuthConfig: vi.fn().mockResolvedValue(undefined),
  saveDraft: vi.fn().mockResolvedValue(undefined),
  getEmailConfig: vi.fn().mockResolvedValue({
    assessmentSubjectTemplate: 'EHC Assessment Report - {clientName}',
    assessmentBodyTemplate: 'Please find attached the EHC Assessment Report for {clientName}.',
    contractSubjectTemplate: 'EHC Service Contract - {clientName}',
    contractBodyTemplate: 'Please find attached the EHC Service Contract for {clientName}.',
    defaultCc: '',
    emailSignature: '',
    htmlEnabled: true,
  }),
  saveEmailConfig: (...args: unknown[]) => mockSaveEmailConfig(...args),
}));

// remoteConfig (dynamically imported inside SettingsScreen)
vi.mock('../utils/remoteConfig', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    sheetsConfig: {
      spreadsheetId: '',
      apiKey: '',
      assessmentSheetName: 'Assessments',
      contractSheetName: 'Contracts',
      autoSync: false,
      authMethod: 'apiKey' as const,
      oauthClientId: '',
      oauthAccessToken: '',
      oauthTokenExpiry: 0,
      exportPrivacy: {
        maskNames: false,
        maskDob: false,
        maskSsn: false,
        maskAddresses: false,
        maskPhone: false,
        maskEmail: false,
        maskMedical: false,
      },
      baaConfirmed: false,
    },
    authConfig: {
      requireAuth: false,
      allowedEmails: [],
      idleTimeoutMinutes: 15,
    },
    source: 'local',
  }),
}));

// sheetsApi.ts
vi.mock('../utils/sheetsApi', () => ({
  testConnection: vi.fn().mockResolvedValue({ ok: true, sheetTitle: 'Test' }),
  readAllRows: vi.fn().mockResolvedValue({ headers: [], rows: [] }),
  rowToFlatMap: vi.fn(),
  syncAssessment: vi.fn(),
  syncContract: vi.fn(),
}));

// emailApi.ts
const mockSendPdfEmail = vi.fn();
const mockIsValidEmail = vi.fn();
vi.mock('../utils/emailApi', () => ({
  sendPdfEmail: (...args: unknown[]) => mockSendPdfEmail(...args),
  isValidEmail: (...args: unknown[]) => mockIsValidEmail(...args),
}));

// Other utilities
vi.mock('../utils/exportData', () => ({
  exportAllDraftsZip: vi.fn(),
  unflattenAssessment: vi.fn(),
}));
vi.mock('../utils/contractExportData', () => ({
  unflattenContractData: vi.fn(),
}));
vi.mock('../utils/googleAuth', () => ({
  requestAccessToken: vi.fn(),
  revokeAccessToken: vi.fn(),
  isTokenExpired: vi.fn().mockReturnValue(true),
  isGsiLoaded: vi.fn().mockReturnValue(false),
}));
vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  purgeOldLogs: vi.fn().mockResolvedValue(0),
  exportAuditLogCSV: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true, // online by default
}));

// --- Helper ---

function renderSettings(authUserEmail?: string) {
  return render(createElement(SettingsScreen, {
    onGoHome: vi.fn(),
    authUserEmail,
  }));
}

// Click the accordion to expand it
async function expandEmailSection() {
  // Wait for the component to finish loading config
  await waitFor(() => {
    expect(screen.getByText('Email Configuration')).toBeInTheDocument();
  });
  // Click to expand the accordion
  fireEvent.click(screen.getByText('Email Configuration'));
}

describe('SettingsScreen — Email Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: isValidEmail returns true for valid emails
    mockIsValidEmail.mockImplementation((email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    );
  });

  it('renders the "Email Configuration" accordion section', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText('Email Configuration')).toBeInTheDocument();
    });
  });

  it('pre-fills recipient email from authUserEmail prop', async () => {
    renderSettings('admin@ehc.com');
    await expandEmailSection();

    const input = screen.getByLabelText('Recipient Email') as HTMLInputElement;
    expect(input.value).toBe('admin@ehc.com');
  });

  it('shows validation error for empty email', async () => {
    renderSettings(); // no authUserEmail → empty
    await expandEmailSection();

    // Clear any pre-filled value
    const input = screen.getByLabelText('Recipient Email');
    fireEvent.change(input, { target: { value: '' } });

    // Clicking send should show button disabled (empty input disables it)
    const button = screen.getByText('Send Test Email');
    expect(button).toBeDisabled();
  });

  it('shows validation error for invalid email format', async () => {
    renderSettings();
    await expandEmailSection();

    const input = screen.getByLabelText('Recipient Email');
    fireEvent.change(input, { target: { value: 'not-valid' } });

    // isValidEmail returns false for invalid
    mockIsValidEmail.mockReturnValue(false);

    fireEvent.click(screen.getByText('Send Test Email'));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
    expect(mockSendPdfEmail).not.toHaveBeenCalled();
  });

  it('calls sendPdfEmail with test data on valid submit', async () => {
    mockSendPdfEmail.mockResolvedValue({ ok: true, messageId: 'test-123' });

    renderSettings();
    await expandEmailSection();

    const input = screen.getByLabelText('Recipient Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByText('Send Test Email'));

    await waitFor(() => {
      expect(mockSendPdfEmail).toHaveBeenCalledOnce();
    });

    const [request, context] = mockSendPdfEmail.mock.calls[0];
    expect(request.to).toBe('test@example.com');
    expect(request.subject).toBe('EHC Assessments & Contracts — Test Email');
    expect(request.filename).toBe('test-email-config.pdf');
    expect(request.pdfBlob).toBeInstanceOf(Blob);
    expect(context?.documentType).toBe('Test Email');
  });

  it('shows success message after successful send', async () => {
    mockSendPdfEmail.mockResolvedValue({ ok: true, messageId: 'test-456' });

    renderSettings();
    await expandEmailSection();

    fireEvent.change(screen.getByLabelText('Recipient Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByText('Send Test Email'));

    await waitFor(() => {
      expect(screen.getByText('Test email sent to user@example.com')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    mockSendPdfEmail.mockResolvedValue({
      ok: false,
      error: 'Email service not configured',
    });

    renderSettings();
    await expandEmailSection();

    fireEvent.change(screen.getByLabelText('Recipient Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByText('Send Test Email'));

    await waitFor(() => {
      expect(screen.getByText('Email service not configured')).toBeInTheDocument();
    });
  });

  it('shows "Sending..." and disables button while sending', async () => {
    // Make sendPdfEmail hang to simulate loading
    let resolveEmail: (value: { ok: boolean; messageId?: string }) => void;
    mockSendPdfEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveEmail = resolve;
      }),
    );

    renderSettings();
    await expandEmailSection();

    fireEvent.change(screen.getByLabelText('Recipient Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Send Test Email'));

    // Should show "Sending..." while pending
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByText('Sending...')).toBeDisabled();
    });

    // Resolve the promise to complete
    resolveEmail!({ ok: true, messageId: 'done' });

    await waitFor(() => {
      expect(screen.getByText('Send Test Email')).toBeInTheDocument();
    });
  });
});

describe('SettingsScreen — Email Template Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidEmail.mockImplementation((email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    );
  });

  it('renders template editor fields when expanded', async () => {
    renderSettings();
    await expandEmailSection();

    // Template sections have their own headings + fields
    expect(screen.getByText('Assessment Email Template')).toBeInTheDocument();
    expect(screen.getByText('Contract Email Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Default CC Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Signature')).toBeInTheDocument();
    // HTML toggle uses a wrapping label with nested spans
    expect(document.getElementById('email-html-toggle')).toBeTruthy();
    expect(screen.getByText('Branded HTML formatting')).toBeInTheDocument();
  });

  it('loads email config values into template fields', async () => {
    renderSettings();
    await expandEmailSection();

    // Use specific IDs to target the assessment subject input
    const subjectInput = document.getElementById('email-assessment-subject') as HTMLInputElement;
    expect(subjectInput).toBeTruthy();
    expect(subjectInput.value).toContain('Assessment');
  });

  it('saves email config when Save Templates clicked', async () => {
    renderSettings();
    await expandEmailSection();

    fireEvent.click(screen.getByText('Save Templates'));

    await waitFor(() => {
      expect(mockSaveEmailConfig).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(screen.getByText('Templates saved')).toBeInTheDocument();
    });
  });

  it('resets to defaults when Reset to Defaults clicked', async () => {
    renderSettings();
    await expandEmailSection();

    // Modify the default CC field
    const ccInput = screen.getByLabelText('Default CC Address');
    fireEvent.change(ccInput, { target: { value: 'modified@ehc.com' } });
    expect((ccInput as HTMLInputElement).value).toBe('modified@ehc.com');

    // Click reset
    fireEvent.click(screen.getByText('Reset to Defaults'));

    // CC should be empty again (default)
    expect((ccInput as HTMLInputElement).value).toBe('');
  });

  it('shows placeholder help info box', async () => {
    renderSettings();
    await expandEmailSection();

    expect(screen.getByText('Available Placeholders:')).toBeInTheDocument();
  });
});

describe('SettingsScreen — Activity Log email filters', () => {
  it('includes email_sent and email_failed filter options', async () => {
    renderSettings();

    // Wait for component to load, then expand Activity Log section
    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Activity Log'));

    const select = screen.getByLabelText('Filter by action');
    expect(select).toBeInTheDocument();

    // Check that the email filter options exist
    const options = Array.from(select.querySelectorAll('option'));
    const optionValues = options.map(o => o.getAttribute('value'));

    expect(optionValues).toContain('email_sent');
    expect(optionValues).toContain('email_failed');
  });
});
