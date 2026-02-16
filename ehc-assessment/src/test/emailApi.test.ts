import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies BEFORE importing code under test
vi.mock('../utils/auditLog', () => ({
  logAudit: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendPdfEmail, blobToBase64, isValidEmail } from '../utils/emailApi';
import { logAudit } from '../utils/auditLog';

// --- isValidEmail ---

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('name.last@company.org')).toBe(true);
    expect(isValidEmail('admin+tag@sub.domain.co')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('  ')).toBe(false);
  });
});

// --- blobToBase64 ---

describe('blobToBase64', () => {
  it('converts a blob to base64 string', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const result = await blobToBase64(blob);
    expect(result).toBe(btoa('hello world'));
  });

  it('handles binary blob data', async () => {
    const bytes = new Uint8Array([0x50, 0x44, 0x46]); // "PDF"
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const result = await blobToBase64(blob);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// --- sendPdfEmail ---

describe('sendPdfEmail', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.mocked(logAudit).mockClear();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const jsonHeaders = { 'Content-Type': 'application/json' };

  const makeRequest = () => ({
    to: 'test@example.com',
    subject: 'Test Subject',
    body: 'Hello, please find attached.',
    pdfBlob: new Blob(['pdf-data'], { type: 'application/pdf' }),
    filename: 'test.pdf',
  });

  it('sends email and returns success with messageId', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-123' }), { status: 200, headers: jsonHeaders }),
    );

    const result = await sendPdfEmail(makeRequest(), { documentType: 'Assessment' });

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Verify request shape
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe('/api/email');
    const opts = callArgs[1] as RequestInit;
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.to).toBe('test@example.com');
    expect(body.subject).toBe('Test Subject');
    expect(body.filename).toBe('test.pdf');
    expect(typeof body.pdfBase64).toBe('string');
    expect(body.pdfBase64.length).toBeGreaterThan(0);
  });

  it('logs email_sent audit event on success', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-123' }), { status: 200, headers: jsonHeaders }),
    );

    await sendPdfEmail(makeRequest(), {
      draftId: 'draft-1',
      documentType: 'Assessment',
      userEmail: 'staff@ehc.com',
    });

    expect(logAudit).toHaveBeenCalledWith(
      'email_sent',
      'draft-1',
      'Emailed Assessment',
      'success',
      'staff@ehc.com',
    );
  });

  it('returns error when server responds with failure', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: 'Email service error (502): gateway timeout' }),
        { status: 502, headers: jsonHeaders },
      ),
    );

    const result = await sendPdfEmail(makeRequest());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Email service error');
  });

  it('logs email_failed audit event on server error', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: 'Email service error (502)' }),
        { status: 502, headers: jsonHeaders },
      ),
    );

    await sendPdfEmail(makeRequest(), { draftId: 'draft-1', documentType: 'Assessment' });

    expect(logAudit).toHaveBeenCalledWith(
      'email_failed',
      'draft-1',
      expect.stringContaining('Email failed'),
      'failure',
      undefined,
    );
  });

  it('handles network error gracefully', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await sendPdfEmail(makeRequest());

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Failed to fetch');
  });

  it('handles timeout with AbortError', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchSpy.mockRejectedValue(abortError);

    const result = await sendPdfEmail(makeRequest());

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Request timed out');
  });

  it('handles rate limit response (429)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: 'Rate limit exceeded. Try again in a minute.' }),
        { status: 429, headers: jsonHeaders },
      ),
    );

    const result = await sendPdfEmail(makeRequest());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Rate limit');
  });

  it('includes CC in request when provided', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-456' }), { status: 200, headers: jsonHeaders }),
    );

    await sendPdfEmail({ ...makeRequest(), cc: 'office@ehc.com' });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.cc).toBe('office@ehc.com');
  });

  it('omits CC from request when not provided', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-789' }), { status: 200, headers: jsonHeaders }),
    );

    await sendPdfEmail(makeRequest());

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.cc).toBeUndefined();
  });

  it('logs email_failed on network error', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    await sendPdfEmail(makeRequest(), { draftId: 'draft-2', documentType: 'Service Contract' });

    expect(logAudit).toHaveBeenCalledWith(
      'email_failed',
      'draft-2',
      'Email failed: Failed to fetch',
      'failure',
      undefined,
    );
  });

  it('passes htmlEnabled flag through in request body', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-html' }), { status: 200, headers: jsonHeaders }),
    );

    await sendPdfEmail({ ...makeRequest(), htmlEnabled: true });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.htmlEnabled).toBe(true);
  });

  it('passes htmlEnabled=false when explicitly disabled', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, messageId: 'msg-plain' }), { status: 200, headers: jsonHeaders }),
    );

    await sendPdfEmail({ ...makeRequest(), htmlEnabled: false });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.htmlEnabled).toBe(false);
  });
});
