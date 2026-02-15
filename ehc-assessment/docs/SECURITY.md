# Security Architecture

This document describes the security controls implemented in the EHC Assessment App.

## Encryption at Rest

All Protected Health Information (PHI) is encrypted using **AES-GCM 256-bit** encryption via the Web Crypto API.

### Key Management

- **Key storage:** CryptoKey objects stored in a dedicated IndexedDB database (`ehc-crypto-keys`), separate from application data
- **Key types:**
  - `phi` — encrypts patient health information (form data in localStorage + IndexedDB drafts)
  - `credential` — encrypts OAuth tokens and API keys
  - `audit-hmac` — HMAC-SHA256 key for audit log integrity verification
- **Key generation:** `crypto.subtle.generateKey()` with AES-GCM algorithm, 256-bit length
- **Key extraction:** Keys are non-extractable (`extractable: false`) — they cannot be read back from IndexedDB, only used for encrypt/decrypt operations

### Encryption Format

Encrypted values use the `ENC:` prefix format:
```
ENC:<base64(12-byte-IV + ciphertext)>
```

- **IV (Initialization Vector):** 12 random bytes generated per encryption operation via `crypto.getRandomValues()`
- **No IV reuse:** Every encrypt call generates a fresh IV
- **Migration path:** `decryptString()` passes through plaintext values without error, enabling gradual migration from unencrypted data

### What's Encrypted

| Data | Location | Key Used |
|------|----------|----------|
| Active form data | localStorage | `phi` |
| Saved drafts | IndexedDB `drafts` store | `phi` |
| OAuth access tokens | IndexedDB `sheetsConfig` store | `credential` |
| API keys | IndexedDB `sheetsConfig` store | `credential` |
| Sync queue entries | IndexedDB `syncQueue` store | `phi` |

## Authentication

### Google OAuth 2.0

- **Login gate:** Enabled by default (`requireAuth: true`)
- **Google Identity Services (GIS):** Uses `google.accounts.id` for Sign-In and `google.accounts.oauth2` for Sheets API tokens
- **JWT verification:** Google ID tokens are decoded client-side (base64url JWT decode) to extract email, name, and picture
- **Allowed email list:** Administrators configure which Google accounts can access the app via Settings
- **No passwords stored:** Authentication is fully delegated to Google

### Session Management

| Control | Setting |
|---------|---------|
| **Max session duration** | 8 hours from login (`loginTime` epoch) |
| **Idle timeout** | Configurable: 5, 10, 15, or 30 minutes |
| **Session storage** | `sessionStorage` (cleared on tab close) |
| **Token lifetime** | Google OAuth tokens expire after ~1 hour; re-auth via popup |

### Idle Timeout

The `useIdleTimeout` hook tracks user activity:
- **Events monitored:** `mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll` (throttled to 1 event/second)
- **Check interval:** Every 5 seconds
- **Warning:** Displayed 60 seconds before timeout
- **On timeout:** User is signed out, session cleared, redirected to login

## Content Security Policy (CSP)

CSP is enforced at two levels:

1. **HTTP header** (netlify.toml) — server-level enforcement
2. **Meta tag** (index.html, production only) — client-level fallback

### Policy Directives

```
default-src 'self'
script-src 'self' https://accounts.google.com
style-src 'self' 'unsafe-inline'
connect-src 'self' https://sheets.googleapis.com https://accounts.google.com
             https://nominatim.openstreetmap.org https://api.fda.gov
img-src 'self' data: blob:
font-src 'self'
object-src 'none'
base-uri 'self'
form-action 'self'
frame-src 'self' data: blob: https://accounts.google.com
```

### Allowed External Connections

| Domain | Purpose |
|--------|---------|
| `accounts.google.com` | OAuth login + token refresh |
| `sheets.googleapis.com` | Google Sheets sync |
| `nominatim.openstreetmap.org` | Address autocomplete |
| `api.fda.gov` | Drug name autocomplete (OpenFDA) |

## HTTP Security Headers

All deployed responses include (configured in `netlify.toml`):

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |
| `X-DNS-Prefetch-Control` | `off` | Prevent DNS leak |

## Audit Logging

All security-relevant actions are logged to IndexedDB with HMAC-SHA256 tamper evidence:

- **29 action types:** login, logout, idle_timeout, draft CRUD, exports, sync, settings changes, consent grant/revoke, errors
- **HMAC integrity:** Each log entry includes an HMAC hash computed over (timestamp + user + action + details)
- **PHI sanitization:** Audit log details are sanitized — no raw PHI in log entries
- **Retention:** Auto-purged after 90 days on app startup
- **Export:** CSV export available from Settings > Activity Log

## PHI Field Detection

The `phiFieldDetection.ts` module provides a shared, centralized catalog of PHI-containing fields used by multiple security controls:

- **Export privacy filters** (`exportFilters.ts`) — determines which fields to redact based on user-configured `ExportPrivacyConfig` category toggles
- **Sheets sync sanitization** (`sanitizeForSync()` in `sheetsApi.ts`) — identifies fields requiring masking before transmission to Google Sheets

This shared module ensures consistent PHI identification across all data egress paths, preventing divergence between export and sync sanitization logic.

### PHI Categories

Fields are classified into 7 toggleable categories:

| Category | Example Fields | Default |
|----------|---------------|---------|
| Names | Client name, emergency contacts, doctor names | Included |
| Date of Birth | DOB, age | Included |
| Contact Info | Phone numbers, email addresses | Included |
| Addresses | Street address, city, state, ZIP | Included |
| Medical Info | Diagnoses, conditions, surgeries, medications | Included |
| Signatures | Client signature, representative signature, staff signature | Included |
| Identifiers | SSN (last 4), insurance policy numbers | Included |

## Export Privacy Filters (Minimum Necessary)

The `ExportPrivacyConfig` interface provides granular control over which PHI categories are included in CSV, JSON, and ZIP exports. This implements the HIPAA Minimum Necessary standard (164.502(b)) by allowing administrators to exclude PHI categories that are not required for a given export purpose.

- **Configuration:** Stored per-session; accessible from the export/review step
- **Scope:** Applies to CSV, JSON, and ZIP exports (PDF exports always include full data for clinical use)
- **Default:** All categories included (full export); users toggle off categories to restrict

## Additional Protections

### CSV Injection Prevention
The `csvEscape()` utility prefixes dangerous cell values (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote to prevent formula injection attacks (OWASP recommendation).

### Console Log Sanitization
A `__DEV__`-gated logger (`utils/logger.ts`) replaces all `console.*` calls. In production builds, Vite dead-code-eliminates all logging statements — zero console output in production.

### Search Engine Exclusion
- `robots.txt` with `Disallow: /`
- `<meta name="robots" content="noindex, nofollow">` in HTML head
- Prevents indexing of PHI-containing pages

### Service Worker Security
- SW files (`sw.js`, `workbox-*.js`, `registerSW.js`) served with `Cache-Control: no-cache, no-store, must-revalidate`
- Ensures PWA updates propagate immediately
- PWA manifest also served without caching

## Known Limitations

1. **Client-side encryption only** — Keys are in browser IndexedDB. A sophisticated attacker with physical device access + browser dev tools could extract keys. This is acceptable for the threat model (trusted devices, short sessions).
2. **No server-side validation** — All validation is client-side (Zod). A backend API would add server-side validation.
3. **Google OAuth tokens in memory** — Sheets API tokens live in JavaScript memory during the session. They expire after ~1 hour.
4. **No BAA with Google** — Google Sheets sync uses PHI masking (`sanitizeForSync`) as a mitigation. A HIPAA Business Associate Agreement with Google would be required for unmasked PHI transmission.
