/**
 * Google Identity Services (GIS) OAuth 2.0 Token Model wrapper.
 *
 * Uses the popup-based token flow via google.accounts.oauth2.initTokenClient.
 * No refresh tokens — the user re-authorizes via popup when the token expires.
 *
 * The GIS library script must be loaded in index.html:
 *   <script src="https://accounts.google.com/gsi/client" async defer></script>
 */

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** Shape of the GIS TokenResponse */
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

/** Check if the GIS library is loaded */
export function isGsiLoaded(): boolean {
  return typeof google !== 'undefined' && !!google?.accounts?.oauth2;
}

/**
 * Request an access token via the Google Identity Services popup.
 * Returns the full token response including access_token and expires_in.
 */
export function requestAccessToken(clientId: string): Promise<GoogleTokenResponse> {
  return new Promise((resolve, reject) => {
    if (!isGsiLoaded()) {
      reject(new Error('Google Identity Services library not loaded. Check that the GSI script is in index.html.'));
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SHEETS_SCOPE,
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response);
        }
      },
    });

    client.requestAccessToken();
  });
}

/**
 * Revoke the given access token.
 */
export function revokeAccessToken(accessToken: string): Promise<void> {
  return new Promise((resolve) => {
    if (!isGsiLoaded()) {
      resolve();
      return;
    }
    google.accounts.oauth2.revoke(accessToken, () => {
      resolve();
    });
  });
}

/**
 * Check if a token is expired or about to expire (within 60s buffer).
 */
export function isTokenExpired(expiresAt: string): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  return now >= expiry - 60_000; // 60-second buffer
}

// --- Google Sign-In (Identity) for login gate ---

import type { AuthUser } from '../types/auth';

/** Decoded JWT payload from Google Sign-In credential */
interface GoogleJwtPayload {
  email: string;
  name: string;
  picture: string;
  sub: string;
  email_verified: boolean;
}

/**
 * Decode the JWT credential from Google Sign-In.
 * The credential is a base64url-encoded JWT — we only need the payload (middle segment).
 */
export function decodeGoogleJwt(credential: string): AuthUser {
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT credential');
  // base64url → base64 → decode
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(base64);
  const payload: GoogleJwtPayload = JSON.parse(json);

  // v4-1: Reject unverified email addresses
  if (payload.email_verified === false) {
    throw new Error('Email address is not verified. Please verify your Google email before signing in.');
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

/**
 * Initialize Google Sign-In and render the "Sign in with Google" button.
 * Uses the google.accounts.id API (separate from the oauth2 token API).
 */
export function initGoogleSignIn(
  clientId: string,
  onSuccess: (user: AuthUser, credential: string) => void,
  onError: (error: string) => void,
  buttonElement: HTMLElement,
): void {
  if (!isGsiIdLoaded()) {
    onError('Google Identity Services library not loaded');
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: { credential: string }) => {
      try {
        const user = decodeGoogleJwt(response.credential);
        onSuccess(user, response.credential);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to decode credential');
      }
    },
  });
  google.accounts.id.renderButton(buttonElement, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    width: 300,
  });
}

/** Check if the GIS Sign-In (google.accounts.id) API is loaded */
export function isGsiIdLoaded(): boolean {
  return typeof google !== 'undefined' && !!google?.accounts?.id;
}

/** Disable auto-select (sign out from GIS perspective) */
export function googleSignOut(): void {
  if (isGsiIdLoaded()) {
    google.accounts.id.disableAutoSelect();
  }
}

// --- Global type declarations for the GIS library ---
declare global {
  const google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
        }) => { requestAccessToken: () => void };
        revoke: (token: string, callback: () => void) => void;
      };
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        renderButton: (element: HTMLElement, config: {
          theme?: string;
          size?: string;
          text?: string;
          width?: number;
        }) => void;
        disableAutoSelect: () => void;
        prompt: () => void;
      };
    };
  };
}
