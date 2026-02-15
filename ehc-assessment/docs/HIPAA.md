# HIPAA Compliance Documentation

This document describes how the EHC Assessment App handles Protected Health Information (PHI) in alignment with HIPAA requirements.

> **Disclaimer:** This app implements technical safeguards for PHI protection. Full HIPAA compliance also requires administrative and physical safeguards (policies, training, BAAs) that are outside the scope of this application.

## PHI Inventory

The app collects the following HIPAA-defined identifiers:

| # | Identifier | Where Collected | Storage |
|---|-----------|----------------|---------|
| 1 | Client name | ClientHelpList, ClientHistory | Encrypted localStorage + IndexedDB |
| 2 | Date of birth | ClientHelpList, ServiceAgreement | Encrypted localStorage + IndexedDB |
| 3 | Address | ClientHelpList, ServiceAgreement | Encrypted localStorage + IndexedDB |
| 4 | Phone numbers | ClientHelpList, emergency contacts | Encrypted localStorage + IndexedDB |
| 5 | Email addresses | Emergency contacts | Encrypted localStorage + IndexedDB |
| 6 | SSN (last 4 only) | ServiceAgreement (MaskedInput) | Encrypted; full SSN never stored |
| 7 | Medical history | ClientHistory (conditions, surgeries) | Encrypted localStorage + IndexedDB |
| 8 | Medications | MedicationList (name, dosage, route) | Encrypted localStorage + IndexedDB |
| 9 | Diagnoses | ClientHistory, ClientAssessment | Encrypted localStorage + IndexedDB |
| 10 | Functional status | ClientAssessment (16 categories) | Encrypted localStorage + IndexedDB |
| 11 | Signatures | ConsentSignatures, contract forms | Encrypted as data URLs |
| 12 | Dates of service | ServiceAgreement (start date) | Encrypted localStorage + IndexedDB |
| 13 | Doctor/provider info | ClientHistory (doctors, hospitals) | Encrypted localStorage + IndexedDB |
| 14 | Insurance info | ServiceAgreement (policy, contact) | Encrypted localStorage + IndexedDB |
| 15 | Emergency contacts | ClientHelpList | Encrypted localStorage + IndexedDB |

## Technical Safeguards

### Encryption at Rest (HIPAA 164.312(a)(2)(iv))

All PHI is encrypted using AES-GCM 256-bit encryption via the Web Crypto API:

- **localStorage:** Active form data encrypted with `phi` key
- **IndexedDB drafts:** `DraftRecord.encryptedData` field
- **IndexedDB credentials:** OAuth tokens encrypted with `credential` key
- **IndexedDB sync queue:** Encrypted before queuing

See [SECURITY.md](SECURITY.md) for full encryption architecture details.

### Access Control (HIPAA 164.312(a)(1))

- **Google OAuth login gate** — only authenticated users access the app
- **Allowed email list** — administrators whitelist specific Google accounts
- **Idle timeout** — configurable auto-lock (5/10/15/30 minutes)
- **8-hour session maximum** — forces re-authentication daily
- **Session in sessionStorage** — cleared when browser tab closes

### Audit Controls (HIPAA 164.312(b))

The audit logging system tracks 29 action types:

| Category | Actions Logged |
|----------|---------------|
| Authentication | `login`, `logout`, `idle_timeout` |
| Draft operations | `draft_create`, `draft_update`, `draft_delete`, `draft_resume` |
| Data export | `pdf_export`, `csv_export`, `json_export`, `zip_export` |
| Sheets sync | `sheets_sync`, `bulk_sync`, `sheets_oauth_signin`, `sheets_oauth_signout` |
| Data import | `load_from_sheet`, `import_row` |
| Consent | `consent_grant`, `consent_revoke` |
| Administration | `settings_change`, `auth_config_change`, `clear_all_drafts` |
| Errors | `error` |

Each audit entry includes:
- Timestamp (ISO 8601)
- User email
- Action type
- Resource identifier (draft ID, export type)
- Sanitized details (no raw PHI)
- HMAC-SHA256 integrity hash

**Tamper evidence:** HMAC hashes allow detection of log modification. The `verifyHmac()` function validates log entry integrity.

**Retention:** Audit logs are automatically purged after 90 days.

**Export:** Administrators can export the full audit log as CSV from Settings.

### Transmission Security (HIPAA 164.312(e)(1))

- **HTTPS enforced** via HSTS header (`max-age=31536000; includeSubDomains`)
- **Google Sheets sync:** PHI is sanitized before transmission via `sanitizeForSync()`:

| PHI Field | Masking Applied |
|-----------|----------------|
| Names | Reduced to initials (e.g., "John Smith" → "J.S.") |
| Date of birth | Year only (e.g., "1955-03-15" → "1955") |
| Phone numbers | Last 4 digits (e.g., "(555) 123-4567" → "***-***-4567") |
| Addresses | City/State only (e.g., "123 Main St, Exton, PA" → "Exton, PA") |
| Signatures | Replaced with `[SIGNED]` |
| SSN | Masked (e.g., "***-**-1234") |

### Integrity (HIPAA 164.312(c)(1))

- **Form validation:** Zod schemas enforce data integrity at each wizard step
- **Audit log HMAC:** Tamper-evident hashing on all log entries
- **CSV injection prevention:** `csvEscape()` sanitizes exported data

## Consent Management

### Assessment Consent (ConsentSignatures.tsx)

Four granular consent checkboxes, each with an independent timestamp:

1. HIPAA Notice of Privacy Practices acknowledgment
2. Authorization for release of health information
3. Assignment of Benefits authorization
4. Acknowledgment of patient rights and responsibilities

**Enforcement:**
- `z.literal(true)` validation — all 4 must be checked before proceeding
- `SignaturePad` is disabled until all checkboxes are acknowledged
- Timestamps recorded at moment of check: `new Date().toISOString()`

### Contract Consent (CustomerPacket.tsx)

Additional consent items for the service contract:
- HIPAA Privacy Practices
- Hiring Standards & Policy
- Direct Care Worker Employee Status
- Transportation authorization

Each uses the `ConsentCheckbox` interface (`{ checked: boolean; timestamp: string }`).

### Consent Audit Trail

- `consent_grant` logged when a checkbox is checked (with specific item identifier)
- `consent_revoke` logged when a checkbox is unchecked
- All consent actions include user email and timestamp
- Consent status and timestamps rendered in PDF exports

## Data Retention

### Auto-Purge

On every app startup (`main.tsx`):
- `purgeOldDrafts(90)` — deletes drafts older than 90 days
- `purgeOldLogs(90)` — deletes audit logs older than 90 days

### Storage Monitoring

- `navigator.storage.estimate()` checks available quota
- Warning displayed when usage exceeds 80% of quota

### Data Deletion

- Individual drafts can be deleted from DraftManager
- "Clear All Drafts" available in Settings (logged to audit trail)
- Browser clearing (IndexedDB + localStorage) removes all local data
- Encryption keys in `ehc-crypto-keys` IndexedDB are separate — clearing the main DB does not remove keys

## Export Privacy Filters (Minimum Necessary — 164.502(b))

The app implements HIPAA's Minimum Necessary standard through configurable export privacy filters. When exporting data (CSV, JSON, ZIP), users can toggle off PHI categories that are not needed for the export purpose.

### PHI Category Toggles

The `ExportPrivacyConfig` provides 7 independent toggles:

| Toggle | Fields Affected | When Off |
|--------|----------------|----------|
| Include Names | Client name, emergency contact names, doctor names | Redacted from export |
| Include DOB | Date of birth, age | Redacted from export |
| Include Contact Info | Phone numbers, email addresses | Redacted from export |
| Include Addresses | Street address, city, state, ZIP | Redacted from export |
| Include Medical Info | Diagnoses, conditions, surgeries, medications | Redacted from export |
| Include Signatures | All signature data URLs | Redacted from export |
| Include Identifiers | SSN (last 4), insurance policy numbers | Redacted from export |

### Shared PHI Field Detection

The `phiFieldDetection.ts` module is the single source of truth for identifying which form fields contain PHI. It is shared by:

1. **Export privacy filters** (`exportFilters.ts`) — redacts fields from CSV/JSON/ZIP exports
2. **Sheets sync sanitization** (`sanitizeForSync()`) — masks fields before Google Sheets transmission

This centralized approach prevents drift between export and sync sanitization logic.

### HIPAA Compliance Checklist

The Settings screen includes an in-app HIPAA compliance status panel with visual indicators showing:

- Encryption at rest status (AES-GCM key presence)
- Authentication enforcement (login gate enabled)
- Idle timeout configuration
- Audit logging active
- PHI masking for Sheets sync
- Export privacy filter availability

These indicators help administrators verify that technical safeguards are properly configured.

## PHI Minimization

- **SSN:** Only last 4 digits stored (`MaskedInput` component displays `***-**-1234`)
- **Signatures:** Stored as data URL images (no biometric analysis)
- **Sheets sync:** All PHI masked before transmission via `sanitizeForSync()`, using field detection from `phiFieldDetection.ts`
- **Export filters:** PHI categories can be excluded from CSV/JSON/ZIP exports via `ExportPrivacyConfig`
- **Production logging:** Zero console output in production builds (logger dead-code eliminated)
- **Error handlers:** Stack traces logged to audit trail only, not exposed to UI
- **Audit log details:** PHI sanitized before writing to log entries

## Administrative Requirements (Outside App Scope)

The following HIPAA requirements must be addressed through organizational policies:

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| BAA with hosting provider | Required | Sign BAA with Netlify (or use HIPAA-eligible host) |
| BAA with Google (if unmasked Sheets sync) | Required if disabling PHI masking | Sign Google Workspace BAA |
| Employee training | Required | Train staff on app usage and PHI handling |
| Incident response plan | Required | Document breach notification procedures |
| Risk assessment | Required | Conduct formal HIPAA risk assessment |
| Device security policy | Required | Require device passwords/encryption on tablets |
| Backup procedures | Recommended | Regular export of data (ZIP/CSV) to secure storage |
