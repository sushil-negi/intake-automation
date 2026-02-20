import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockLogAuditRemote = vi.fn();
vi.mock('../utils/supabaseAuditLog', () => ({
  logAuditRemote: (...args: unknown[]) => mockLogAuditRemote(...args),
}));

// Mock crypto (computeHmac / verifyHmac) to avoid Web Crypto issues in test
vi.mock('../utils/crypto', () => ({
  computeHmac: vi.fn().mockResolvedValue('mock-hmac'),
  verifyHmac: vi.fn().mockResolvedValue(true),
}));

// Mock db to avoid IndexedDB calls
const mockAdd = vi.fn();
const mockObjectStore = vi.fn().mockReturnValue({ add: mockAdd });
const mockTransaction = vi.fn().mockReturnValue({ objectStore: mockObjectStore });
const mockOpenDB = vi.fn().mockResolvedValue({ transaction: mockTransaction });

vi.mock('../utils/db', () => ({
  openDB: () => mockOpenDB(),
  AUDIT_LOG_STORE: 'auditLogs',
}));

// ── Import after mocks ─────────────────────────────────────────────────────

const { logAudit, setAuditDualWriteContext } = await import('../utils/auditLog');

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Audit dual-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset context
    setAuditDualWriteContext(null, null);
  });

  afterEach(() => {
    setAuditDualWriteContext(null, null);
  });

  it('does NOT call logAuditRemote when context is not set', async () => {
    logAudit('login', undefined, undefined, 'success', 'user@test.com');

    // Wait for the async fire-and-forget
    await vi.waitFor(() => expect(mockOpenDB).toHaveBeenCalled(), { timeout: 1000 });

    // Give time for dual-write to potentially fire
    await new Promise(r => setTimeout(r, 50));

    expect(mockLogAuditRemote).not.toHaveBeenCalled();
  });

  it('calls logAuditRemote when context IS set', async () => {
    setAuditDualWriteContext('org-123', 'admin@example.com');

    logAudit('draft_create', 'draft-1', 'Test Client', 'success', 'admin@example.com');

    // Wait for the async fire-and-forget
    await vi.waitFor(() => expect(mockLogAuditRemote).toHaveBeenCalled(), { timeout: 1000 });

    expect(mockLogAuditRemote).toHaveBeenCalledWith(
      'org-123',
      'admin@example.com',
      'draft_create',
      'draft-1',
      'Test Client',
      'success',
    );
  });

  it('uses Supabase email for "system" user entries', async () => {
    setAuditDualWriteContext('org-456', 'system-user@test.com');

    logAudit('data_purge', 'drafts', 'Purged old data');

    // The logAudit user defaults to 'system' when not provided
    await vi.waitFor(() => expect(mockLogAuditRemote).toHaveBeenCalled(), { timeout: 1000 });

    // For 'system' user, dual-write should use the context email
    expect(mockLogAuditRemote).toHaveBeenCalledWith(
      'org-456',
      'system-user@test.com',
      'data_purge',
      'drafts',
      'Purged old data',
      'success',
    );
  });

  it('clears context and stops dual-write', async () => {
    setAuditDualWriteContext('org-789', 'user@test.com');

    // First call should dual-write
    logAudit('login', undefined, undefined, 'success', 'user@test.com');
    await vi.waitFor(() => expect(mockLogAuditRemote).toHaveBeenCalledTimes(1), { timeout: 1000 });

    // Clear context
    setAuditDualWriteContext(null, null);
    vi.clearAllMocks();

    // Second call should NOT dual-write
    logAudit('logout', undefined, undefined, 'success', 'user@test.com');
    await vi.waitFor(() => expect(mockOpenDB).toHaveBeenCalled(), { timeout: 1000 });
    await new Promise(r => setTimeout(r, 50));

    expect(mockLogAuditRemote).not.toHaveBeenCalled();
  });
});
