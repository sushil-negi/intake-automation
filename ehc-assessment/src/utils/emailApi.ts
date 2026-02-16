import { fetchWithTimeout } from './fetchWithTimeout';
import { logAudit } from './auditLog';
import { logger } from './logger';

const EMAIL_API_URL = '/api/email';
const EMAIL_TIMEOUT_MS = 30_000; // 30 seconds (PDFs can be large)

// --- Types ---

export interface SendEmailRequest {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  pdfBlob: Blob;
  filename: string;
  /** When true, server wraps body in branded HTML template */
  htmlEnabled?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// --- Utilities ---

/**
 * Convert a Blob to a base64 string (without the data URL prefix).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:...;base64," prefix
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to convert blob to base64'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Validate an email address format (basic client-side check).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// --- Core ---

/**
 * Send a PDF via email through the serverless function.
 * Handles blob->base64 conversion, API call, and audit logging.
 */
export async function sendPdfEmail(
  request: SendEmailRequest,
  auditContext?: { draftId?: string; documentType?: string; userEmail?: string },
): Promise<SendEmailResult> {
  try {
    // Convert PDF blob to base64
    const pdfBase64 = await blobToBase64(request.pdfBlob);

    // Call serverless function
    const response = await fetchWithTimeout(
      EMAIL_API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: request.to.trim(),
          cc: request.cc?.trim() || undefined,
          subject: request.subject,
          body: request.body,
          pdfBase64,
          filename: request.filename,
          htmlEnabled: request.htmlEnabled,
        }),
      },
      EMAIL_TIMEOUT_MS,
    );

    // Guard against non-JSON responses (e.g. SPA fallback returning HTML)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      const isHtml = text.startsWith('<!') || text.startsWith('<html');
      const error = isHtml
        ? 'Email API not available. Are you running "npm run dev:netlify"?'
        : `Unexpected response (${response.status}): ${text.slice(0, 100)}`;
      logAudit('email_failed', auditContext?.draftId, `Email failed: ${error}`, 'failure', auditContext?.userEmail);
      return { ok: false, error };
    }

    const data = (await response.json()) as SendEmailResult;

    if (data.ok) {
      logAudit(
        'email_sent',
        auditContext?.draftId,
        `Emailed ${auditContext?.documentType || 'PDF'}`,
        'success',
        auditContext?.userEmail,
      );
    } else {
      logAudit(
        'email_failed',
        auditContext?.draftId,
        `Email failed: ${data.error || 'Unknown error'}`,
        'failure',
        auditContext?.userEmail,
      );
    }

    return data;
  } catch (err) {
    const errorMessage =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Request timed out'
        : err instanceof Error
          ? err.message
          : 'Network error';

    logger.error('[EmailApi] Send failed:', err);

    logAudit(
      'email_failed',
      auditContext?.draftId,
      `Email failed: ${errorMessage}`,
      'failure',
      auditContext?.userEmail,
    );

    return { ok: false, error: errorMessage };
  }
}
