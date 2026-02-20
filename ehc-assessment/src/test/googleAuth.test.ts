/**
 * Tests for Google Auth utilities.
 *
 * Covers: isTokenExpired, decodeGoogleJwt, isGsiLoaded/isGsiIdLoaded,
 * requestAccessToken, revokeAccessToken, initGoogleSignIn, googleSignOut.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to set up the global `google` object before importing the module
// since the module references it via `declare global`.

function setupGoogleGlobal() {
  const mockTokenClient = {
    requestAccessToken: vi.fn(),
  };

  (globalThis as Record<string, unknown>).google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(() => mockTokenClient),
        revoke: vi.fn((_token: string, cb: () => void) => cb()),
      },
      id: {
        initialize: vi.fn(),
        renderButton: vi.fn(),
        disableAutoSelect: vi.fn(),
        prompt: vi.fn(),
      },
    },
  };

  return mockTokenClient;
}

function clearGoogleGlobal() {
  delete (globalThis as Record<string, unknown>).google;
}

// Import after setup
import {
  isGsiLoaded,
  isGsiIdLoaded,
  isTokenExpired,
  decodeGoogleJwt,
  requestAccessToken,
  revokeAccessToken,
  initGoogleSignIn,
  googleSignOut,
} from '../utils/googleAuth';

describe('googleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearGoogleGlobal();
  });

  // ── isGsiLoaded / isGsiIdLoaded ────────────────────────────────────────────

  describe('isGsiLoaded', () => {
    it('returns false when google is not defined', () => {
      clearGoogleGlobal();
      expect(isGsiLoaded()).toBe(false);
    });

    it('returns true when google.accounts.oauth2 exists', () => {
      setupGoogleGlobal();
      expect(isGsiLoaded()).toBe(true);
    });
  });

  describe('isGsiIdLoaded', () => {
    it('returns false when google is not defined', () => {
      clearGoogleGlobal();
      expect(isGsiIdLoaded()).toBe(false);
    });

    it('returns true when google.accounts.id exists', () => {
      setupGoogleGlobal();
      expect(isGsiIdLoaded()).toBe(true);
    });
  });

  // ── isTokenExpired ─────────────────────────────────────────────────────────

  describe('isTokenExpired', () => {
    it('returns true for empty string', () => {
      expect(isTokenExpired('')).toBe(true);
    });

    it('returns true for past date', () => {
      const past = new Date(Date.now() - 120_000).toISOString();
      expect(isTokenExpired(past)).toBe(true);
    });

    it('returns true for date within 60s buffer', () => {
      const almostExpired = new Date(Date.now() + 30_000).toISOString(); // 30s from now
      expect(isTokenExpired(almostExpired)).toBe(true);
    });

    it('returns false for date well in the future', () => {
      const future = new Date(Date.now() + 3600_000).toISOString(); // 1 hour from now
      expect(isTokenExpired(future)).toBe(false);
    });

    it('returns false for date exactly at 61s from now', () => {
      const justAboveBuffer = new Date(Date.now() + 61_000).toISOString();
      expect(isTokenExpired(justAboveBuffer)).toBe(false);
    });

    it('returns true for date exactly at 59s from now', () => {
      const justBelowBuffer = new Date(Date.now() + 59_000).toISOString();
      expect(isTokenExpired(justBelowBuffer)).toBe(true);
    });
  });

  // ── decodeGoogleJwt ────────────────────────────────────────────────────────

  describe('decodeGoogleJwt', () => {
    function encodeJwt(payload: Record<string, unknown>): string {
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const body = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const sig = btoa('fake-signature');
      return `${header}.${body}.${sig}`;
    }

    it('decodes a valid JWT with verified email', () => {
      const jwt = encodeJwt({
        email: 'user@ehc.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        sub: '12345',
        email_verified: true,
      });

      const result = decodeGoogleJwt(jwt);
      expect(result.email).toBe('user@ehc.com');
      expect(result.name).toBe('Test User');
      expect(result.picture).toBe('https://example.com/pic.jpg');
      expect(result.loginTime).toBeGreaterThan(0);
    });

    it('throws for unverified email', () => {
      const jwt = encodeJwt({
        email: 'unverified@ehc.com',
        name: 'Bad User',
        picture: '',
        sub: '12345',
        email_verified: false,
      });

      expect(() => decodeGoogleJwt(jwt)).toThrow(/not verified/i);
    });

    it('throws for invalid JWT format (missing parts)', () => {
      expect(() => decodeGoogleJwt('header.payload')).toThrow('Invalid JWT credential');
    });

    it('throws for invalid JWT format (too many parts)', () => {
      expect(() => decodeGoogleJwt('a.b.c.d')).toThrow('Invalid JWT credential');
    });

    it('handles base64url encoding correctly', () => {
      // Create payload with characters that differ in base64url vs base64
      const jwt = encodeJwt({
        email: 'user+special@example.com',
        name: 'User With/Special+Chars',
        picture: '',
        sub: '99999',
        email_verified: true,
      });

      const result = decodeGoogleJwt(jwt);
      expect(result.email).toBe('user+special@example.com');
      expect(result.name).toBe('User With/Special+Chars');
    });
  });

  // ── requestAccessToken ─────────────────────────────────────────────────────

  describe('requestAccessToken', () => {
    it('rejects when GSI library is not loaded', async () => {
      clearGoogleGlobal();
      await expect(requestAccessToken('client-id')).rejects.toThrow(/not loaded/);
    });

    it('calls initTokenClient with correct config', async () => {
      const mockTokenClient = setupGoogleGlobal();
      const g = (globalThis as { google: typeof google }).google;

      // Make initTokenClient capture the callback and call it with success
      vi.mocked(g.accounts.oauth2.initTokenClient).mockImplementation((config) => {
        setTimeout(() => {
          config.callback({
            access_token: 'test-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            token_type: 'Bearer',
          });
        }, 0);
        return mockTokenClient;
      });

      const result = await requestAccessToken('my-client-id');

      expect(result.access_token).toBe('test-token');
      expect(result.expires_in).toBe(3600);
      expect(g.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'my-client-id' }),
      );
    });

    it('rejects when token response has error', async () => {
      const mockTokenClient = setupGoogleGlobal();
      const g = (globalThis as { google: typeof google }).google;

      vi.mocked(g.accounts.oauth2.initTokenClient).mockImplementation((config) => {
        setTimeout(() => {
          config.callback({
            access_token: '',
            expires_in: 0,
            scope: '',
            token_type: '',
            error: 'access_denied',
            error_description: 'User denied access',
          });
        }, 0);
        return mockTokenClient;
      });

      await expect(requestAccessToken('my-client-id')).rejects.toThrow('User denied access');
    });
  });

  // ── revokeAccessToken ──────────────────────────────────────────────────────

  describe('revokeAccessToken', () => {
    it('resolves when GSI is not loaded (no-op)', async () => {
      clearGoogleGlobal();
      await expect(revokeAccessToken('some-token')).resolves.toBeUndefined();
    });

    it('calls google.accounts.oauth2.revoke', async () => {
      setupGoogleGlobal();
      const g = (globalThis as { google: typeof google }).google;

      await revokeAccessToken('my-token');
      expect(g.accounts.oauth2.revoke).toHaveBeenCalledWith('my-token', expect.any(Function));
    });
  });

  // ── initGoogleSignIn ───────────────────────────────────────────────────────

  describe('initGoogleSignIn', () => {
    it('calls onError when GSI id library is not loaded', () => {
      clearGoogleGlobal();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const element = document.createElement('div');

      initGoogleSignIn('client-id', onSuccess, onError, element);
      expect(onError).toHaveBeenCalledWith('Google Identity Services library not loaded');
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('initializes google.accounts.id and renders button', () => {
      setupGoogleGlobal();
      const g = (globalThis as { google: typeof google }).google;
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const element = document.createElement('div');

      initGoogleSignIn('my-client-id', onSuccess, onError, element);

      expect(g.accounts.id.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'my-client-id' }),
      );
      expect(g.accounts.id.renderButton).toHaveBeenCalledWith(
        element,
        expect.objectContaining({ theme: 'outline', size: 'large' }),
      );
    });
  });

  // ── googleSignOut ──────────────────────────────────────────────────────────

  describe('googleSignOut', () => {
    it('does not throw when GSI is not loaded', () => {
      clearGoogleGlobal();
      expect(() => googleSignOut()).not.toThrow();
    });

    it('calls disableAutoSelect when GSI is loaded', () => {
      setupGoogleGlobal();
      const g = (globalThis as { google: typeof google }).google;

      googleSignOut();
      expect(g.accounts.id.disableAutoSelect).toHaveBeenCalledTimes(1);
    });
  });
});
