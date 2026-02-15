# Google Sheets Integration Setup

This guide covers setting up Google Sheets sync for the EHC Assessment App.

## Overview

The app can sync assessment and contract data to a Google Spreadsheet using OAuth 2.0. **PHI is automatically sanitized** before transmission — names are reduced to initials, DOB to year only, phone numbers to last 4 digits, addresses to city/state, and signatures replaced with `[SIGNED]`.

## Prerequisites

- A Google Cloud Platform account
- A Google Spreadsheet to receive the data

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g., "EHC Assessment App")
3. Enable the **Google Sheets API**:
   - Navigate to APIs & Services > Library
   - Search for "Google Sheets API"
   - Click Enable

## Step 2: Create OAuth 2.0 Credentials

1. Navigate to APIs & Services > Credentials
2. Click **Create Credentials** > **OAuth Client ID**
3. If prompted, configure the OAuth Consent Screen:
   - User type: Internal (if using Google Workspace) or External
   - App name: "EHC Assessment App"
   - Scopes: `https://www.googleapis.com/auth/spreadsheets`
4. Create the OAuth Client ID:
   - Application type: **Web application**
   - Name: "EHC Assessment App"
   - Authorized JavaScript origins:
     ```
     http://localhost:5173          (development)
     https://your-app.netlify.app   (production)
     https://your-domain.com        (custom domain, if applicable)
     ```
   - No redirect URIs needed (GIS uses popup flow)
5. Copy the **Client ID** (looks like `123456789-abcdef.apps.googleusercontent.com`)

## Step 3: Prepare the Spreadsheet

1. Create a new Google Spreadsheet
2. Create two sheet tabs (exact names required):
   - `Assessments`
   - `Contracts`
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

> **Important:** The sheet tabs must exist before the first sync. The app will automatically add header rows on the first sync to each tab.

## Step 4: Configure the App

1. Open the EHC Assessment App
2. Navigate to **Settings** (gear icon on Dashboard)
3. In the **Google Sheets Connection** section:
   - Enter your **OAuth Client ID**
   - Enter your **Spreadsheet ID**
   - Click **Sign In with Google** to authorize
4. Click **Test Connection** to verify

## How Sync Works

### Authentication Flow

1. User clicks "Sign In with Google" in Settings
2. Google Identity Services (GIS) opens a popup
3. User grants permission to access Google Sheets
4. App receives an OAuth access token (valid ~1 hour)
5. Token is encrypted and stored in IndexedDB

### Token Refresh

- Tokens expire after approximately 1 hour
- When a token expires, the app prompts for re-authorization via popup
- No refresh tokens are available in the GIS token model
- Re-authorization is seamless (one-click if session is active)

### Data Flow

```
Form Data → sanitizeForSync() → Google Sheets API → Spreadsheet
              (PHI masked)        (OAuth Bearer)
```

### PHI Sanitization

Both Sheets sync and data exports use the shared `phiFieldDetection.ts` module to identify PHI-containing fields. This ensures consistent field detection across all data egress paths:

- **Sheets sync** always applies full masking via `sanitizeForSync()` (non-configurable)
- **CSV/JSON/ZIP exports** apply configurable privacy filters via `ExportPrivacyConfig` (see [HIPAA.md](HIPAA.md))

> **Note:** Export privacy filter settings do **not** affect Sheets sync. Sync always masks all PHI regardless of export filter configuration.

Before any data leaves the device, `sanitizeForSync()` masks all PHI:

| Original | Sanitized |
|----------|-----------|
| John Smith | J.S. |
| 1955-03-15 | 1955 |
| (555) 123-4567 | ***-***-4567 |
| 123 Main St, Exton, PA 19341 | Exton, PA |
| [signature data URL] | [SIGNED] |
| ***-**-1234 | ***-**-1234 |

### Sync Options

| Method | Description |
|--------|-------------|
| **Per-draft sync** | Click the sync icon on any draft in DraftManager |
| **Bulk sync** | Settings > Sync All — syncs all drafts at once |

### Header Row

On the first sync to each sheet tab, the app automatically writes a header row with all column names. Subsequent syncs append data rows.

## Troubleshooting

### "Sheet tab not found" Error

The sheet tabs `Assessments` and `Contracts` must exist in the spreadsheet before syncing. Create them manually if they don't exist.

### "Auth expired" or "Token invalid"

OAuth tokens expire after ~1 hour. Click "Sign In with Google" again in Settings to get a fresh token.

### "Permission denied" or 403 Error

- Verify the Spreadsheet ID is correct
- Ensure the Google account used for sign-in has edit access to the spreadsheet
- Check that the Google Sheets API is enabled in your Cloud project

### "popup_blocked_by_browser"

The OAuth flow uses a popup window. Ensure popups are allowed for your app domain.

### CSP Blocking Requests

If you see CSP errors in the console, verify that `connect-src` in your CSP includes:
```
https://sheets.googleapis.com
https://accounts.google.com
```

These are already configured in the default `netlify.toml` and `vite.config.ts`.

## Security Notes

- OAuth tokens are encrypted at rest using AES-GCM (the `credential` key)
- Tokens are never exposed in URLs, localStorage, or console output
- PHI sanitization is applied automatically — there is no option to send raw PHI to Sheets
- PHI field detection is centralized in `phiFieldDetection.ts`, shared with export privacy filters
- All sync actions are logged to the audit trail
- To fully comply with HIPAA for Google Sheets, a Business Associate Agreement (BAA) with Google is recommended even with PHI masking
