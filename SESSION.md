# Session Tracker — EHC Client Intake Assessment App

## Quick Start for Any Session
1. Read this file first to understand current state
2. Read `BACKLOG.md` for full story details and acceptance criteria
3. Check "Current Sprint" below to see what's in progress
4. Check "Decisions Log" for context on past choices
5. Start working on the next `In Progress` or `Up Next` item

---

## Project Location
```
/Users/snegi/Downloads/SIE/Assessment/
```

## Source PDF
```
/Users/snegi/Library/CloudStorage/OneDrive-Personal/EHC/CLIENT-INTAKE/Assessment-Packet-FINAL.pdf
```
- 8 pages, 6 forms: Client Help List, Client History, Client Assessment, Home Safety Checklist, HIPAA/Consent, Medication List

---

## Tech Stack (Decided)
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Form Management:** Zod validation (direct safeParse, no RHF)
- **Wizard Navigation:** Custom multi-step component (2 wizards: Assessment + Service Contract)
- **Signature Capture:** react-signature-canvas
- **PDF Export:** jsPDF + jspdf-autotable (dynamic import)
- **Offline Storage:** localStorage (auto-save), IndexedDB (drafts + sync queue)
- **Build Tool:** Vite
- **Package Manager:** npm
- **Testing:** Vitest + jsdom (587 unit tests, 43 files) + Playwright + axe-core (16 E2E tests)

---

## Current State

**Assessment Wizard:** 7-step wizard — COMPLETE (all sprints 1-6 done)
**Service Contract Wizard:** 7-step wizard — COMPLETE (all 7 phases done)
**Dashboard:** Landing page with New Assessment, New Contract, Resume Draft, Settings cards — COMPLETE
**Google Sheets:** Full OAuth 2.0 sync (assessments + contracts), inline setup guide — COMPLETE
**Auth:** Google OAuth login gate with allowed-email access control + idle timeout — COMPLETE
**Security:** AES-GCM encryption (localStorage + IndexedDB + credentials + sync queue), CSV injection prevention, HMAC audit log integrity, 8hr session expiry — COMPLETE
**HIPAA:** Granular consent checkboxes with timestamps (assessment + contract), consent audit trail, data retention auto-purge, PHI sanitization in audit logs — COMPLETE
**Audit Logging:** Full audit trail (29 actions incl. consent_grant/consent_revoke) in IndexedDB with HMAC integrity, CSV export — COMPLETE
**Email PDF:** Resend API via Netlify Function, EmailComposeModal with focus trap, configurable subject/body templates per document type, `{clientName}/{date}/{staffName}` placeholders, default CC auto-fill, email signature, branded HTML formatting (table-based layout, EHC brand colors), PHI redaction in audit logs, rate limiting (5/min/IP), max 4MB PDF — COMPLETE
**Accessibility:** WCAG AA contrast, required indicators, heading hierarchy, error icons, aria-live, focus traps, automated axe-core WCAG testing in CI — COMPLETE
**Go-Live Audit:** v2 (27 findings resolved) + v3 (13 more fixes) + v4 (11 findings: 10 resolved, 1 accepted risk) + v5 (2 warnings resolved: source maps disabled, stable signature lib) + v6 (automated WCAG testing, contrast fix) — READY (0 blockers, 0 warnings)
**Documentation:** README.md, CONTRIBUTING.md, docs/SECURITY.md, docs/HIPAA.md, docs/DEPLOYMENT.md, docs/GOOGLE-SHEETS-SETUP.md
**Tests:** 587/587 unit (43 files) + 16/16 E2E (Playwright: 11 smoke + 5 accessibility)
**TypeScript:** Clean (`tsc --noEmit` zero errors)
**Codebase:** 151 source files (43 components, 12 hooks, 39 utils), ~28,500 lines
**Supabase Backend:** Multi-device sync via Supabase Postgres (JSONB form data, RLS, optimistic concurrency, draft locking, real-time subscriptions, audit dual-write, conflict resolution). Graceful fallback when not configured.
**Dev Server:** `npm run dev` → localhost:5173

---

## Completed Sprint: Sprint 1 — Foundation + Sprint 2 — Core Forms (MERGED)

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 1.1 | Wizard shell with navigation | Done | WizardShell.tsx + ProgressBar.tsx |
| 3.1 | Toggle card component | Done | ToggleCard.tsx |
| 3.2 | Category card container | Done | CategoryCard.tsx with collapse/expand |
| 4.1 | Signature pad component | Done | SignaturePad.tsx using react-signature-canvas |
| 6.1 | Auto-save | Done | useAutoSave.ts with localStorage + debounce |
| 6.4 | Tablet-responsive layout | Done | Tailwind responsive classes, 44px min touch targets |
| 1.2 | Client Help List form | Done | All fields from PDF page 1 |
| 1.3 | Client History form | Done | All fields from PDF page 2 with conditional logic |
| 1.4 | Client Assessment form | Done | 16 category cards with toggle options |
| 1.5 | Home Safety Checklist | Done | ~50 Yes/No/N/A items in 11 sections |
| 1.6 | Medication List | Done | Dynamic add/remove rows, route/frequency dropdowns |
| 1.7 | Consent & Signatures | Done | HIPAA + Assignment of Benefits with signature pads |
| 1.8 | Review & Submit | Done | Summary of all steps with edit buttons |
| 3.3 | Map categories to cards | Done | All 16 assessment categories mapped |
| 2.3 | Assessment type conditional | Done | Re-assessment fields show only for 90-day |
| 2.4 | Living situation conditional | Done | People/pets fields hidden based on answers |

---

## Completed Work

| Date | Session | What Was Done |
|------|---------|---------------|
| 2026-02-09 | Session 1 | Reviewed PDF, created BACKLOG.md with 5 epics (30 stories), created SESSION.md, scaffolded Vite+React+TS project, installed deps (Tailwind, React Hook Form, Zod, react-signature-canvas), built all 7 form steps, wizard shell, progress bar, toggle cards, category cards, signature pad, auto-save hook, form fields library, initial data, review/submit page. Build passes clean. Sprint 1+2 fully delivered. |
| 2026-02-10 | Session 2 | Home Safety Checklist enhancements: (1) Added SafetyItem type with answer+note — "No" answers now prompt for a note. (2) Added per-section bulk action bar (All Yes/No/N/A/Clear). (3) Polarity-aware question handling — tagged all 66 questions with `concernAnswer` (15 inverted questions where Yes=concern). ThreeWayToggle dynamically flips button colors, shows note input on concern answer, and displays warning indicator. Polarity-aware flagged counts per section. Legacy localStorage migration guard. Build clean. |
| 2026-02-10 | Session 3 | Sprint 3 complete (10 stories). Conditional logic: mobility dims/hides, bathing/hygiene dims, health history surgery+smoker follow-ups, safety checklist cross-form N/A auto-logic. Signatures: type-to-sign alternative with script font, timestamp+metadata on all signatures, EHC rep signature fields added to History+Assessment. Offline: PWA service worker via vite-plugin-pwa, offline banner, IndexedDB for sync queue + draft storage, DraftManager UI (list/resume/delete). Build clean. |
| 2026-02-10 | Session 4 | Sprint 4 — UI Polish & Branding (5 stories). Converted EHC PDF logo to transparent PNG (horizontal). Removed black-bg JPG, created alpha-transparent horizontal PNG via Python/Pillow. Header redesigned: dark teal gradient (#1a3a4a→#1f4f5f), centered logo with CSS invert, amber "Client Intake Assessment" subtitle. Footer matched to same teal gradient with amber CTA. Progress bar adapted for dark background: white steps, amber active indicator. Watermark made responsive with CSS clamp(280px, 55vw, 700px). Page background changed to bg-sky-50/60. Build clean. |
| 2026-02-10 | Session 5 | Sprint 5A — Form Validation. Created Zod schemas for all 6 steps (schemas.ts). Built useStepValidation hook with safeParse + error mapping. Added error props to RadioGroup and SignaturePad. Wired validation into App.tsx: blocks forward nav on failure, clears on back/edit. Threaded errors into all 6 form components. Used errorsRef pattern to prevent ThreeWayToggle note input focus loss. Home Safety validation: requires both signatures + notes on all flagged concerns. Build clean. |
| 2026-02-10 | Session 6 | Sprint 5B — PDF Export + Draft UX. Built full PDF generation pipeline: pdfStyles.ts (colors, margins, helpers), pdfHeader.ts (logo fetch/cache, client banner, section/subsection titles, field renderer, page footer), 6 section renderers (ClientHelpList, ClientHistory, ClientAssessment, MedicationList, HomeSafety, Consent). Each section on own page, retroactive header/footer stamping, concern highlighting in red, signature images embedded. Content boxes with drawContentBox helper. Light teal client banner with 3-column layout and text truncation. Export PDF button on Review page with dynamic import. Draft UX fixes: hide wizard footer/progress/step-title in draft mode, "Save Draft" button in footer, header Drafts button toggles to "Back to Form", step memory on draft save/resume, step label shown in draft list, PDF export per draft. Build clean. |
| 2026-02-10 | Session 7 | Sprint 6 — Enhancements & Quality (EPIC-12 complete). Stories 12.1-12.8: PDF DRAFT watermark (GState opacity), print CSS, CSV/JSON export, dashboard enhancements, DrugAutocomplete (OpenFDA API), AddressAutocomplete (Nominatim/OpenStreetMap with Chester County PA bias), accessibility audit (53 fixes across 13 components — ARIA combobox, roles, labels, landmarks), Vitest test suite (47 tests in 3 files). Responsive design improvements for phones/tablets. Build clean, all tests pass. |
| 2026-02-10 | Session 8 | Post-sprint polish. Fixed drug autocomplete to use wildcard prefix matching instead of exact. Rewrote address autocomplete with structured formatting, geographic bias, lower threshold. Added email field to emergency contacts (type, initial data, form, PDF, CSV, review). Added AddressAutocomplete to emergency contact address fields. Converted emergency contacts, doctors, hospitals, and neighbors from fixed-count to dynamic add/remove arrays (start with 1, add more as needed). New HospitalPreference and Neighbor interfaces. Updated all consumers: exportData, PDF export, ReviewSubmit. Build clean, 47 tests pass. |
| 2026-02-10 | Session 9 | **Service Preferences redesign:** Moved section after Pets, added weekday checkboxes (Mon-Sun), 24×7 option, conditional logic (24×7/live-in hides schedule), per-day start/end time inputs, "Apply to all days" convenience feature. Replaced old `preferredTimes` with `is24x7`, `serviceDays[]`, `daySchedules{}`. Migration in useAutoSave.ts. Updated 7 files. **Signature display fix:** Draw signatures now restore from localStorage using `isDrawing` state toggle (show `<img>` when loaded, switch to canvas on tap). Typed signatures also restore via same pattern when `typedName` is empty. **JSON Import/Export:** Added `importJSON()` to exportData.ts — validates .json file, checks 6 required top-level keys, deep-merges with INITIAL_DATA for forward-compatibility. "Import JSON" button in DraftManager with file picker, error handling. Review page kept clean (PDF + Submit only); DraftManager is the file management hub (Import JSON, PDF/JSON/CSV export per draft). Build clean, 47 tests pass. |
| 2026-02-11 | Session 10 | **Phase 1-2: Dashboard + Service Contract Foundation.** Created `types/navigation.ts` (AppView union), `types/serviceContract.ts` (6 sub-interfaces), `utils/contractInitialData.ts`. Parameterized `useAutoSave.ts` with storageKey. Added title/onGoHome to `WizardShell.tsx`. Added type field to DraftRecord. Created `Dashboard.tsx` + `DashboardCard.tsx`. Extracted `AssessmentWizard.tsx` from App.tsx — App.tsx became thin routing layer. |
| 2026-02-11 | Session 11 | **Phase 3-4: Contract Forms + Wizard.** Created 3 UI components (`AccordionSection`, `InitialsInput`, `MaskedInput`). Created 6 contract form components: `ServiceAgreement.tsx` (635 lines — customer info, payment terms, services, schedule, signatures), `ConsumerRights.tsx`, `DirectCareWorkerNotice.tsx`, `TransportationRequest.tsx`, `CustomerPacket.tsx`, `ContractReviewSubmit.tsx`. Created `contractSchemas.ts` (Zod validation for 6 steps). Created `ServiceContractWizard.tsx` orchestrator. Wired into App.tsx from Dashboard. |
| 2026-02-11 | Session 12 | **Phase 5-7: Pre-fill + PDF + Tests.** Created `prefill.ts` (assessment→contract mapping). Modified `DraftManager.tsx` with dual type tabs. Added "Continue to Service Contract" button on Assessment Review. Created 6 contract PDF section renderers + `generateContractPdf.ts` orchestrator. Made `pdfHeader.ts` configurable with document title. Created `contractExportData.ts`. Added 59 new tests (prefill: 27, contract schemas: 26, contract export: 6). Total: 106 tests passing. |
| 2026-02-11 | Session 13 | **PDF Spacing + Content Box Improvements.** Fixed content overlapping on PDF sections. Improved dynamic content box sizing using two-pass pattern (`drawContentBoxFill` before content, `drawContentBoxBorder` after). Addressed spacing issues across all PDF section renderers. |
| 2026-02-11 | Session 14 | **Terms & Conditions + Card Surcharge + Banner Fix.** (1) Added Terms & Conditions as new Step 1 in contract wizard — 6 legal sections (Non-Solicitation, Terms of Payment, Card Payment Surcharge 3%, Termination, Authorization & Consent, Related Documents) each requiring initials. Created `ServiceAgreementTerms.tsx` form + `pdfServiceAgreementTerms.ts` PDF renderer. (2) Added Card Payment Surcharge section with professional legal language about 3% surcharge on all card types. (3) Redesigned PDF banner from 3 fixed-width columns to 2-row dynamic layout: Row 1 (Name | Age | Date), Row 2 (full-width wrapping address). HEADER_HEIGHT 30→38mm. (4) Added age computation from dateOfBirth in contract PDF. Updated all affected files: types, initial data, validation, wizard, review, prefill, export, tests. 106 tests passing. |
| 2026-02-11 | Session 15 | **Date timezone fix.** Replaced all 10 occurrences of `new Date().toISOString().split('T')[0]` (UTC — wrong date in evening US timezones) with `new Date().toLocaleDateString('en-CA')` (local timezone YYYY-MM-DD) across 5 files: contractInitialData.ts, initialData.ts (7×), prefill.ts, generateContractPdf.ts, generatePdf.ts. Timestamp usages (`toISOString()`) left unchanged since those should be UTC. |
| 2026-02-11 | Session 16 | **PDF Preview + Multi-Client + Linked Assessment PDF + P0 fixes.** (1) **PDF Preview Modal:** Refactored `generatePdf.ts` and `generateContractPdf.ts` to extract `buildAssessmentPdf`/`buildContractPdf` (return jsPDF doc) and `getAssessmentFilename`/`getContractFilename`. Created `PdfPreviewModal.tsx` portal component with iframe preview, Download/Close buttons, Escape key, body scroll lock. Updated `ReviewSubmit.tsx` and `ContractReviewSubmit.tsx` — "Export PDF" → "Preview PDF" opens modal. (2) **Multi-Client Workflow:** Created `ConfirmDialog.tsx` reusable portal dialog. Updated `Dashboard.tsx` — checks localStorage for unsaved data before starting new form. Shows 3-option dialog: Save Draft & Continue / Discard & Continue / Cancel. (3) **Linked Assessment PDF:** Extended `AppView` with `linkedAssessmentId`. Assessment saved to IndexedDB on "Continue to Service Contract". ID threaded through navigation → `ServiceContractWizard` → `ContractReviewSubmit`. Draft save/resume preserves linked ID. "View Linked Assessment PDF" button on contract review loads assessment from IndexedDB → preview modal. (4) **P0: Auto-save migration** — Verified existing `migrateData`/`deepMerge2` correctly handles old drafts missing `termsConditions`. Added 4 migration tests. (5) **P0: Visual PDF testing** — Bumped HEADER_HEIGHT 38→42mm for 3-line address safety margin. Added 6 PDF banner tests verifying dynamic banner height stays within HEADER_HEIGHT. **New files:** PdfPreviewModal.tsx, ConfirmDialog.tsx, autoSaveMigration.test.ts, pdfBanner.test.ts. **Modified:** 10 files. Tests: 116/116 passing (8 test files). |
| 2026-02-11 | Session 17 | **Settings Screen + Google Sheets Integration (Full OAuth 2.0).** (1) Created `types/sheetsConfig.ts` — SheetsConfig interface with OAuth + API Key support. (2) Modified `utils/db.ts` — DB_VERSION 1→2, added `sheetsConfig` store with versioned upgrade. (3) Created `utils/sheetsApi.ts` — Sheets API fetch utilities (testConnection, ensureHeaderRow, appendRow, syncAssessment, syncContract) with OAuth Bearer headers. (4) Created `hooks/useSheetsSync.ts` — React hook wrapping sheetsApi. (5) Created `components/SettingsScreen.tsx` — Full admin UI with OAuth sign-in, API key fallback, inline setup guide (Quick Start + OAuth walkthrough + Spreadsheet setup + Troubleshooting with 9 entries), sheet config, bulk sync with error details, data management. (6) Created `utils/googleAuth.ts` — Google Identity Services wrapper (requestAccessToken, revokeAccessToken, isTokenExpired). (7) Added GIS script to index.html. (8) Modified `DraftManager.tsx` — per-draft Sync button with error display. (9) Created `test/sheetsConfig.test.ts` — 14 tests. (10) Improved sync error messages in sheetsApi.ts (sheet tab not found, auth expired, detailed context). Tests: 130/130 passing (9 test files). |
| 2026-02-11 | Session 18 | **Google OAuth Login Gate.** (1) Created `types/auth.ts` — AuthUser, AuthConfig interfaces + DEFAULT_AUTH_CONFIG. (2) Modified `utils/db.ts` — DB_VERSION 2→3, added `authConfig` IndexedDB store with getAuthConfig/saveAuthConfig. (3) Modified `utils/googleAuth.ts` — Added google.accounts.id API: decodeGoogleJwt (base64url JWT decode), initGoogleSignIn (renders GIS button), isGsiIdLoaded, googleSignOut. Extended global type declarations. (4) Created `components/LoginScreen.tsx` — Branded login screen with GIS Sign-In button, allowed-email gate, setup-required message if no clientId. (5) Modified `App.tsx` — Auth gate with sessionStorage session, loads authConfig on mount, shows LoginScreen when requireAuth=true. Passes authUser/onSignOut to Dashboard. Reloads authConfig when returning from settings. (6) Modified `components/SettingsScreen.tsx` — New "User Access Control" accordion: requireAuth toggle (validates clientId first), allowed-emails list with add/remove, auto-saves to IndexedDB. (7) Modified `components/Dashboard.tsx` — User avatar + name in header, Sign Out button, personalized welcome message. Tests: 130/130 passing (10 test files). |
| 2026-02-11 | Session 19 | **P2 completions + codebase review.** (1) Assessment PDF banner verified — age passes correctly via clientHistory.age → stampHeaderOnCurrentPage. (2) Bulk export ZIP — added `exportAllDraftsZip()` using JSZip dynamic import; "Export All (ZIP)" buttons in DraftManager + Settings. (3) Assessment templates — created `assessmentTemplates.ts` with 4 built-in templates (Standard Initial, 90-Day Supervisory, Live-In/24x7, Post-Hospital), template picker UI in AssessmentWizard, 11 tests. (4) Comprehensive codebase review: 84 files, ~14,800 lines, 141/141 tests, zero `any` types, zero XSS vectors, strong OAuth token handling. Recommended: remove unused deps (react-hook-form), phone masking, Read from Sheets (13.4), ErrorBoundary, CSP headers. Tests: 141/141 passing (10 test files). |
| 2026-02-11 | Session 20 | **Codebase review recommendations (all 8) + deep security/HIPAA/UX review.** (1) Removed unused deps (react-hook-form, @hookform/resolvers). (2) PhoneInput.tsx — masked phone input `(555) 555-5555`, stores raw digits, replaced 10 fields across 3 components. (3) Read from Sheets (13.4) — readAllRows, rowToFlatMap, unflattenAssessment, Load from Sheet UI in Settings. (4) ErrorBoundary.tsx — wraps each wizard independently in App.tsx, friendly reset UI. (5) Caregiver notes (14.2) — StaffNoteField component in all 6 wizard steps, handleStaffNoteChange callback, flatten/unflatten with `staffNote_` prefix, pdfStaffNotes appendix page, 2 new tests. (6) CSP meta tag — production-only via Vite `cspPlugin()`, `<!--CSP_META-->` placeholder in index.html, allows Google domains. (7) Per-field inline validation — `clearFieldErrors()` in useStepValidation with nested path matching, wired into both wizards. (8) E2E smoke tests — Playwright + Chromium, 11 tests in e2e/smoke.spec.ts, playwright.config.ts, `test:e2e` script. Deep security/HIPAA/UX review with 28 findings across 4 phases, added as EPIC-18 (Security Hardening), EPIC-19 (HIPAA Compliance), EPIC-20 (UI/UX Polish) to BACKLOG.md. Tests: 150/150 unit + 11/11 E2E. |
| 2026-02-11 | Session 21 | **Sprint 12 — Security & HIPAA Compliance (6 stories).** Phase 1: CSV formula injection fix in `csvEscape()` — prefix `=`, `+`, `-`, `@`, `\t`, `\r` with single quote + 8 tests. Phase 2: AES-GCM encryption module (`crypto.ts`) — Web Crypto API, 256-bit keys, separate `phi`/`credential` keys in own IndexedDB (`ehc-crypto-keys`), `ENC:` prefix format, plaintext passthrough for migration + 16 tests. Phase 3: Encrypt PHI at rest — `useAutoSave.ts` rewritten for async init with `isLoading` gate, encrypted localStorage read/write; `db.ts` encrypts DraftRecord.data and Sheets credentials (OAuth tokens, API keys); `App.tsx` uses `writeEncryptedLocalStorage` for draft resume, clears tokens on sign-out. Phase 4: Session idle timeout — `useIdleTimeout.ts` hook (activity tracking, 5s check interval, warning/timeout callbacks), ConfirmDialog warning modal in App.tsx, configurable 5/10/15/30 min dropdown in Settings, `idleTimeoutMinutes` added to AuthConfig + 5 tests. Phase 5: Granular consent — `ConsentCheckbox` interface with `checked`+`timestamp`, 4 checkboxes in `ConsentSignatures.tsx`, `SignaturePad` `disabled` prop gates signing, Zod `z.literal(true)` validation, PDF renders `[X]`/`[ ]` with timestamps, CSV exports 8 new consent fields. **Staff name auto-populate:** `authUser.name` → `ehcStaffName` (assessment: History, Assessment, Safety) and `ehcRepName` (contract: Service Agreement, Transportation) on load when fields empty. Tests: 180/180 unit (12 files) + 11/11 E2E. TypeScript clean. |
| 2026-02-11 | Session 22 | **Production hardening (3 stories).** (1) **Exit confirmation dialog (20.2):** WizardShell Home button now shows ConfirmDialog with "Save Draft & Exit" / "Discard & Exit" / "Cancel" — applies to both Assessment and Service Contract wizards. Uses existing ConfirmDialog component. (2) **Mobile progress indicator (20.1):** Compact 24px step dots on mobile (was 36px), 10px text, tighter margins. All steps visible on small screens with checkmarks for completed steps. Labels still hidden for non-current on mobile, full labels on sm+. (3) **Console log sanitization (18.6):** Created `utils/logger.ts` with `__DEV__`-gated logger (error/warn/log). Added `define: { __DEV__ }` to vite.config.ts. Replaced all 18 console statements across 10 production files with `logger.error`/`logger.log`. Test file console.log left as-is. Production build verified: Vite dead-code-eliminates all logger calls — zero app console output in prod bundle. **Full regression:** 180/180 unit tests pass, 11/11 E2E pass, TypeScript clean, production build succeeds. |
| 2026-02-12 | Session 23 | **Sprint 14 — UX Polish (4 stories).** (1) **Color contrast fixes (20.3):** Comprehensive WCAG AA audit — upgraded 30+ `text-gray-400` → `text-gray-500` across 18 components for 4.5:1 ratio. Fixed `text-white/40` → `text-white/60` in WizardShell and ProgressBar for dark backgrounds. Left decorative-only instances (row numbers, separators, placeholders). (2) **Auto-scroll to first error (20.7):** Created `scrollToFirstError()` in useStepValidation.ts — uses `requestAnimationFrame` + `[aria-invalid="true"]` query with `[role="alert"]` fallback. Smooth scroll to center + focus. Integrated into both wizards. (3) **Button density & touch targets (20.8):** Audit found 11 undersized elements — fixed 7 "Remove" buttons to `min-h-[44px]`, Dashboard sign-out to `min-h-[36px]`, StaffNoteField toggle to `min-h-[44px]`, 3 SettingsScreen buttons to `min-h-[36px]`. (4) **Loading states (20.9):** Created `LoadingSpinner` component with animated bouncing dots (`role="status"`, `aria-label`). Replaced 6 plain-text loading indicators across App, AssessmentWizard, ServiceContractWizard, SettingsScreen, DraftManager, LoginScreen. **Comprehensive go-live audit:** 4-dimension audit (Security, HIPAA, Usability, Infrastructure) with detailed findings and MUST-FIX recommendations. **Full regression:** 180/180 unit tests, 11/11 E2E, TypeScript clean, production build succeeds. |
| 2026-02-12 | Session 24 | **Sprint 15 — Go-Live Hardening (10 items).** Addressed 9 of 10 CRITICAL/HIGH go-live audit findings. (1) **Audit logging (C1/18.5):** Created `utils/auditLog.ts` — 27 action types (login, logout, draft CRUD, exports, sync, settings), fire-and-forget `logAudit()`, `logError()` for runtime errors, `getAuditLogs()` with filtering/pagination, `purgeOldLogs()` for retention, `exportAuditLogCSV()`. DB_VERSION 3→4 with `auditLogs` IndexedDB store. Integrated into 8 components (App, main, AssessmentWizard, ServiceContractWizard, DraftManager, SettingsScreen, ErrorBoundary). Activity log viewer in Settings. 10 tests. (2) **PHI masking for Sheets sync (C2 mitigation):** Created `sanitizeForSync()` in sheetsApi.ts — masks names→initials, DOB→year, phone→last 4, address→city/state, signatures→`[SIGNED]`, SSN→masked. 8 tests. (3) **Global error handlers (C3 partial):** Added `window.onerror` + `unhandledrejection` handlers in main.tsx logging to audit trail. ErrorBoundary logs component errors. (4) **Auth enabled by default (H1):** `DEFAULT_AUTH_CONFIG.requireAuth` changed `false`→`true`. (5) **Focus trap in modals (H2):** Created `hooks/useFocusTrap.ts` — traps Tab/Shift+Tab, auto-focus first element, restores focus on unmount. Integrated into ConfirmDialog + PdfPreviewModal. 4 tests. (6) **PWA icons (H3):** Generated `pwa-192x192.png` + `pwa-512x512.png` from EHC logo. (7) **CI/CD pipeline (H4):** Created `.github/workflows/ci.yml` — GitHub Actions with tsc, vitest, vite build on push/PR to main. (8) **robots.txt + noindex meta (H5):** Created `public/robots.txt` Disallow:/, added `<meta name="robots" content="noindex, nofollow">` + proper title/description/favicon to index.html. (9) **Deployment docs (H6):** Created `.env.example` + `vercel.json` with security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy). (10) **AbortSignal.timeout fix (H7):** Created `utils/fetchWithTimeout.ts` replacing browser-compat-breaking API in AddressAutocomplete. 3 tests. **Full regression:** 205/205 unit tests (16 files), 11/11 E2E, TypeScript clean, production build succeeds. |
| 2026-02-12 | Session 25 | **Sprint/backlog status update + deep go-live audit v2.** (1) Updated SESSION.md with Session 24 entry (Sprint 15 — Go-Live Hardening, 10 items). (2) Updated BACKLOG.md: marked 18.5 audit logging as Done, added Sprint 15 completion section. (3) Updated current state metrics: 205 tests (16 files), 101 source files, ~17,700 lines. (4) Performed comprehensive 4-dimension go-live audit using 4 parallel deep-dive agents (Security, HIPAA, Usability, Infrastructure). (5) Wrote GO-LIVE-AUDIT.md v2 with 27 findings: 3 CRITICAL (HSTS missing, Sheets BAA, no external error monitoring), 6 HIGH (CSP in header, E2E in CI, string max-length, audit log tamper, session expiry, encryption failure silent), 11 MEDIUM, 7 LOW. Category scores: Security 8.5/10, HIPAA 7/10, Usability 7.5/10, Infrastructure 7/10. Recommended Sprint 16 plan (4-5 days). |
| 2026-02-12 | Session 26 | **Sprint 16 — Go-Live Audit Remediation (all 27 findings).** Implemented all 27 findings from GO-LIVE-AUDIT.md v2 across 5 phases. **Phase 1 (Quick Wins):** Added HSTS + CSP + Cache-Control headers to vercel.json, pinned react-signature-canvas to exact version. **Phase 2 (Security Hardening):** Session expiry (loginTime + 8hr max), encryption failure audit logging in useAutoSave.ts, HMAC-SHA256 tamper-evidence for audit logs (crypto.ts computeHmac/verifyHmac), sync queue encryption (db.ts), BAA HIPAA warning in SettingsScreen, audit log PHI sanitization (sanitizeDetails), consent_grant/consent_revoke audit actions. **Phase 3 (Validation & Consent):** .max() on all Zod string fields (schemas.ts + contractSchemas.ts), contract CustomerPacketData boolean→ConsentCheckbox with timestamps (10-file cascade: types, initial data, form, validation, export, PDF, review, auto-save migration, 2 test files), consent audit trail in ConsentSignatures.tsx + CustomerPacket.tsx. **Phase 4 (Accessibility):** Contrast fixes in WizardShell/ProgressBar/Dashboard (text-white/40→70, /60→90, /80→white), required field indicators with asterisk + aria-required in FormFields.tsx, h2→h1 heading fix, error icon prefix, SaveIndicator aria-live="polite", AccordionSection aria-hidden chevron. **Phase 5 (Infrastructure):** E2E + npm audit in CI, purgeOldDrafts(90) + purgeOldLogs(90) on app mount, navigator.storage.estimate() quota monitoring at 80%, manualChunks bundle splitting (react, pdf, zip, validation). **Documentation:** GO-LIVE-AUDIT.md updated with Resolution Status (21 implemented, 6 documented known limitations). Verdict changed to READY. **Tests:** 205/205 unit (16 files) + 11/11 E2E. TypeScript clean. Production build succeeds with bundle splitting. |
| 2026-02-12 | Session 27 | **Netlify deployment config + image optimization.** (1) Created `netlify.toml` — full Netlify deployment config with build command (`npm run build`), publish dir (`dist`), Node 22, SPA fallback redirect, all security headers (HSTS, CSP, X-Frame-Options, etc.), service worker no-cache headers, PWA manifest no-cache, hashed asset immutable cache. (2) Created `.node-version` file (22). (3) **Image optimization:** Installed pngquant + jpegoptim via homebrew. Downscaled ehc-logo.jpg and ehc-watermark-h.png from 2160px→1080px (still 2x for max 540px display). Applied pngquant (quality 65-80) to all 4 PNGs, jpegoptim (max 80, strip-all) to JPG. **Results:** Total image assets 802KB→114KB (**86% reduction**). PWA precache size 2126→1599 KiB (25% reduction). GO-LIVE-AUDIT.md updated: I2 moved from document-only to implemented (22 implemented, 5 known limitations). Build, tests (205/205), TypeScript all clean. |
| 2026-02-12 | Session 28 | **Go-Live Audit v3 — Deep re-audit + critical fixes.** Launched 4 parallel deep-dive audit agents (Security, HIPAA, Accessibility/Usability, Infrastructure/Performance) covering all 80+ source files. **Security findings (2 MUST-FIX):** (1) `crypto.ts:98` btoa spread operator stack overflow on large payloads (>64KB signatures) — fixed with loop-based binary string encoding. (2) `Dashboard.tsx` reads encrypted localStorage as plaintext JSON (unsaved-work detection broken since encryption added) — fixed all 3 functions to use `isEncrypted()` + `decryptObject()`, made `handleNew` async. **Infrastructure (1 MUST-FIX):** CI Node version mismatch (20→22) in `.github/workflows/ci.yml`. **Accessibility (4 CRITICAL + 7 HIGH):** (C1) Added skip navigation links to WizardShell + Dashboard. (C2) Added `focus:ring-2 focus:ring-offset-2 focus:ring-amber-500` to ConfirmDialog buttons. (C3) Added `aria-hidden="true"` to modal backdrop overlays in ConfirmDialog + PdfPreviewModal. (C4) Fixed empty RadioGroup legends in ClientHistory (Advance Directive) + ClientAssessment (Assessment Type). (H1) Added `min-h-[44px]` to "Add provider" button in ClientHistory. (H2) Added `aria-expanded`/`aria-controls`/`aria-hidden` to CategoryCard. (H3) Added `motion-reduce:animate-none` to LoadingSpinner dots. (H4) Added keyboard guidance text to SignaturePad draw mode. (H5) Added `aria-hidden` + sr-only text to status dots in ReviewSubmit + ContractReviewSubmit. (H6) Added `disabled`/`aria-disabled` to Submit buttons when incomplete. **HIPAA:** READY — all 12 safeguards compliant (no code changes needed, admin actions documented). **Tests:** 205/205 unit, TypeScript clean, build succeeds. |
| 2026-02-12 | Session 29 | **Go-Live Audit v4 — Final pre-deployment audit + documentation.** Launched 4 parallel deep-dive audit agents (Security, HIPAA+Data Flow, Accessibility, Infrastructure+Performance). Compiled v4 results: 11 MUST-FIX items across 4 dimensions. Created 6 documentation files: README.md (complete rewrite with Mermaid architecture diagrams), docs/SECURITY.md, docs/HIPAA.md, docs/DEPLOYMENT.md, docs/GOOGLE-SHEETS-SETUP.md, CONTRIBUTING.md. |
| 2026-02-12 | Session 30 | **Bug fixes: PDF service schedule + staff name auto-populate.** (1) **Service schedule PDF bug:** Templates used abbreviated day names ('Mon', 'Wed', 'Fri') but form uses full names ('Monday', 'Wednesday', 'Friday') — caused mismatch where template days appeared selected in data but not in UI. Fixed all 4 templates to use full day names. Added migration in useAutoSave.ts to convert old abbreviated day names to full names in existing saved data. Added safety filter in PDF renderer to exclude internal `_all` staging key. Updated template test. (2) **Staff name auto-populate:** Refactored both AssessmentWizard and ServiceContractWizard to use functional updater pattern (`updateData(prev => ...)`) instead of closure-captured `data` — eliminates potential stale closure issues. Added `updateData` to dependency arrays. (3) All 205 tests pass, TypeScript clean, production build succeeds. |
| 2026-02-12 | Session 31 | **Document consolidation.** Audited and updated SESSION.md, BACKLOG.md, and GO-LIVE-AUDIT.md to match actual codebase state. Fixed metrics (~18,100 lines, 38 components, 7 hooks, 30 utils), added Documentation line to Current State, reordered Completed Work table chronologically (sessions 23-30 were out of order), added v4 section to GO-LIVE-AUDIT.md, verified docs/ files match codebase. |
| 2026-02-12 | Session 32 | **v4 audit remediation — all 9 open findings resolved.** (1) **v4-1:** Added `email_verified === false` check in `decodeGoogleJwt()` — rejects unverified Google accounts. (2) **v4-3:** Added admin-only gate to SettingsScreen — first email in allowedEmails is admin, non-admin users see limited UI. (3) **v4-4:** Encrypted `clientName` in IndexedDB draft records via `encryptString`/`decryptString` with plaintext passthrough for migration. (4) **v4-5/v4-6:** Added email + insurance policy number masking to `sanitizeForSync()` — reordered check priority (email/insurance before name) to handle keys like `emergencyContact1_email`. 4 new tests. (5) **v4-7:** Full keyboard navigation (ArrowUp/Down, Enter, Escape) + `aria-activedescendant` for DrugAutocomplete and AddressAutocomplete. (6) **v4-8:** Stubbed `html2canvas` transitive dep via Vite `resolve.alias` — PWA precache 1602→1408 KiB (12% savings). (7) **v4-9:** Fixed `handleSignOut` stale closure by adding `authUser?.email` to dependency array. (8) **v4-10:** Moved `localStorage.removeItem` from render body into `useState()` initializer in ServiceContractWizard. **Tests:** 209/209 unit, TypeScript clean, build succeeds. GO-LIVE-AUDIT.md verdict changed to READY. |
| 2026-02-12 | Session 34 | **Final audit warnings resolved.** (1) **Source maps disabled:** Added `sourcemap: false` to vite.config.ts build config — source code not exposed in production. (2) **Stable dependency:** Downgraded react-signature-canvas from 1.1.0-alpha.2 to 1.0.7 (latest stable). Same API surface (toData, fromData, clear, toDataURL). All 226 unit tests pass, TypeScript clean, 0 vulnerabilities. **Audit result: 0 BLOCKERS, 0 WARNINGS.** App is go-live ready. |
| 2026-02-14 | Session 35 | **Contract import + PDF data quality fixes + full PDF audit + doc consolidation.** (1) **Contract import (plan: inherited-discovering-wind.md):** Implemented `unflattenContractData()` in contractExportData.ts — reverse of flattenContractData(). Added Assessment/Contract toggle in SettingsScreen Load from Sheet. 12 new round-trip tests. (2) Fixed "no" appearing in Service Days — added VALID_DAYS whitelist filter in pdfClientHistory.ts and REJECT list in exportData.ts for Google Sheets import. (3) Restored formatTime and per-day hours display in Client History PDF (Section 2) after accidental removal. (4) Fixed corrupted assessment category data in Client Needs Assessment PDF (Section 3) — day names, times, and boolean values leaked into category arrays from Google Sheets column misalignment. Added REJECT_VALUES + TIME_RE filters in both pdfClientAssessment.ts (render-time) and exportData.ts (import-time). (5) Completed full audit of all 17 PDF files (assessment + contract) — no additional spacing/layout issues found. (6) Documentation consolidation: updated MEMORY.md (HEADER_HEIGHT 42→35, test count 226→238, PDF patterns), CLAUDE.md (test count), SESSION.md, BACKLOG.md, GO-LIVE-AUDIT.md. Tests: 238/238 unit (18 files). |
| 2026-02-14 | Session 36 | **Automated WCAG AA accessibility testing.** (1) Installed `@axe-core/playwright` — axe-core integration for Playwright E2E tests. (2) Created `e2e/accessibility.spec.ts` — 5 WCAG 2.1 AA tests scanning Dashboard, Assessment Step 1, Assessment Step 1 with validation errors, Service Contract Step 1, Settings. Uses `expectNoViolations()` helper with pretty-print debugging. (3) **Color contrast fix:** axe-core detected amber `#d4912a` with white text had only 2.66:1 contrast ratio (WCAG AA requires 4.5:1). Darkened to `#8a6212` (~5.9:1 ratio) across 4 components: WizardShell Continue button, ProgressBar active step dot, DashboardCard badge accent, SettingsScreen Sync All Drafts button. (4) Known Limitation #5 (no automated WCAG testing in CI) eliminated — axe-core tests auto-run via Playwright in CI. **Tests:** 238/238 unit + 16/16 E2E (11 smoke + 5 accessibility). TypeScript clean. |
| 2026-02-12 | Session 33 | **Sprint 19 — Feature Completion (6 stories + optimization).** All remaining EPIC 19 + EPIC 20 backlog stories implemented. (1) **20.4 Draft Search & Filter:** Added type filter (`all`/`assessment`/`serviceContract`), sort dropdown (`newest`/`oldest`/`name`), combined filtering in DraftManager. Single sorted list replaces split sections. Type badge per card. (2) **19.3 Minimum Necessary Export Filters:** Created `ExportPrivacyConfig` interface with 7 PHI category toggles (names, addresses, phones, DOB, emails, insurance, signatures). Extracted shared `phiFieldDetection.ts` from sheetsApi.ts. Created `exportFilters.ts` with `applyExportFilters()`. Wired into CSV/JSON exports. Export Privacy section in Settings. 11 tests. (3) **19.4 BAA Documentation & HIPAA Compliance Checklist:** Added HIPAA Compliance accordion in Settings with 7 read-only status indicators (AES-256, PHI masking, audit logging, session expiry, auto-purge, CSP+HSTS, no external transmission), BAA date/notes fields, and "What this app does NOT provide" section. (4) **20.6 Signature UX Improvements:** Taller signature canvas (`h-[160px] sm:h-[200px]`), undo-last-stroke button with stroke history via `sigRef.current.toData()/fromData()`, undo visibility gated on draw mode + stroke count. (5) **20.10 Keyboard Navigation:** Created `ToggleCardGroup.tsx` wrapper with ArrowUp/Down key handler, `data-toggle-card` attribute on ToggleCard buttons, wrapped groups in ClientAssessment. (6) **20.5 Dark Mode (largest):** Created `useDarkMode` hook (system/light/dark modes, localStorage `ehc-theme`, `.dark` class on `<html>`, matchMedia listener). Created `ThemeToggle.tsx` (☀️/🌙/🖥️ cycle button). Added `@custom-variant dark` + CSS custom properties to index.css. Applied `dark:` classes to 13+ components (FormFields, AccordionSection, ToggleCard, CategoryCard, WizardShell, Dashboard, DashboardCard, ConfirmDialog, DraftManager, LoadingSpinner, SettingsScreen, ProgressBar). Consistent slate palette: `dark:bg-slate-800/900`, `dark:text-slate-100/300/400`, `dark:border-slate-600/700`. 6 dark mode tests. (7) **AddressAutocomplete optimization:** AbortController for stale request cancellation, LRU query cache (20 entries), reduced debounce 350→300ms, reduced timeout 4→3s, useCallback memoization, abort cleanup on unmount, dark mode classes. **New files:** `useDarkMode.ts`, `ThemeToggle.tsx`, `ToggleCardGroup.tsx`, `phiFieldDetection.ts`, `exportFilters.ts`, `useDarkMode.test.ts`, `exportFilters.test.ts`. **Tests:** 226/226 unit (18 files), TypeScript clean, production build succeeds. |
| 2026-02-14 | Session 37 | **EPIC-22 Email Customization + Draft Duplicate Fix.** (1) **Email template customization:** Configurable subject/body templates per document type (assessment vs contract) with `{clientName}`, `{date}`, `{staffName}` placeholders (`emailTemplates.ts`). Email config persisted in IndexedDB `emailConfig` store (DB v5→v6). Settings UI: template editors, default CC, email signature, HTML formatting toggle, save/reset buttons. (2) **Branded HTML email template:** Server-side `buildHtmlEmail()` in `email.mts` — table-based layout (600px), EHC brand colors (#1a3a4a header, #d4912a accent), inline CSS. `htmlEnabled` flag on API. (3) **Draft duplicate fix (3 root causes):** (a) `clearDraft()` in useAutoSave.ts now cancels pending debounce timer to prevent write-back race condition. (b) Dashboard auto-rescue dedup guard — checks if matching draft exists in IndexedDB within 60s before creating new. (c) `setCurrentDraftId(null)` added to `handleNewAssessment`/`handleNewContract` to prevent overwriting previous client's draft. (4) **DB v6 migration fix:** Bumped DB_VERSION 5→6 with idempotent `db.objectStoreNames.contains()` guard after user reported "failed to save" when emailConfig store missing. Tests: 487/487 unit (35 files). |
| 2026-02-16 | Session 38 | **Production hardening & documentation.** (1) **HTML XSS prevention:** Added `escapeHtml()` in `email.mts` — escapes `& < > " '` before `<br>` conversion. Applied to both branded HTML and plain-text email paths. (2) **Server-side size limits:** Subject max 1000 chars, body max 50000 chars — returns 413 if exceeded. (3) **Client-side maxLength:** Settings template inputs: subject `maxLength=200`, body `maxLength=5000`, signature `maxLength=2000`. (4) **Production readiness audit:** Comprehensive 3-agent deep audit across security, test coverage, and email changes. 95→97% confidence. Zero breaking changes confirmed. (5) **Documentation update:** Updated MEMORY.md, SESSION.md, GO-LIVE-AUDIT.md (v8), BACKLOG.md, README.md. Tests: 487/487 unit (35 files), TypeScript clean. |
| 2026-02-18 | Session 39 | **EPIC-23 Supabase Phase 1+2: Foundation + Data Sync (committed f314c11).** (1) Set up Supabase project, ran schema SQL (organizations, profiles, drafts, audit_logs, app_config tables with RLS, lock functions, version triggers, realtime publishing). (2) Created `supabaseClient.ts` (singleton, `isSupabaseConfigured()` guard), generated `types/supabase.ts`. (3) Added `@supabase/supabase-js ^2.97.0`, updated CSP in vite.config.ts and netlify.toml. (4) Created `useSupabaseAuth.ts` hook — Google OAuth via Supabase Auth, maps session to existing AuthUser shape, graceful GIS fallback. (5) Modified LoginScreen.tsx + App.tsx for Supabase auth flow. (6) Created `supabaseDrafts.ts` (CRUD: upsert with optimistic version concurrency, fetch, delete). (7) Created `useSupabaseSync.ts` (background sync with 3s debounce, offline queue). (8) Bumped IndexedDB to v7 with `supabaseSyncQueue` store. (9) Created `supabaseMigration.ts` (one-time IndexedDB → Supabase migration). (10) Created `supabaseAuditLog.ts` for remote audit log writes. (11) Created `useOnlineStatus.ts` hook. Tests: 74 new Supabase tests added. 20 files changed, +2377 lines. |
| 2026-02-19 | Session 40 | **EPIC-23 Supabase Phase 3: Real-Time + Locks (committed a2d6657).** (1) Created `useSupabaseDrafts.ts` with Realtime subscription — live draft list via `supabase.channel('drafts-org').on('postgres_changes', ...)`. (2) Created `useDraftLock.ts` hook — Postgres `FOR UPDATE` atomicity, 30-min auto-expiry, 5-min renewal via `setInterval`, `beforeunload` safety net, lock indicators. (3) Integrated locks into both AssessmentWizard and ServiceContractWizard — lock acquire on mount, release on exit. (4) Added lock indicators in Dashboard showing locked/synced state. 8 files changed, +1182 lines. |
| 2026-02-20 | Session 41 | **EPIC-23 Supabase Phase 4: Audit + Conflict + Polish (committed 3b5bef0).** (1) Dual-write audit logs — `setAuditDualWriteContext(orgId, email)` pattern, `logAudit()` auto-dual-writes to Supabase. Wired in App.tsx via useEffect. (2) Created `ConflictResolutionModal.tsx` — three-option modal (Keep Mine / Use Theirs / Cancel) with focus trap + ARIA. (3) Added `forceOverwrite` option to `upsertRemoteDraft()`. (4) Enhanced `useSupabaseSync.ts` with conflict detection (version mismatch → `conflictInfo`), `resolveConflict('keepMine' | 'useTheirs')`, `dismissConflict()`. (5) Integrated conflict UI into both wizards. (6) Added "Cloud Sync (Supabase)" section to SettingsScreen. (7) Fixed `supabaseOrgId` destructuring bug in ServiceContractWizard. (8) 26 new tests (useSupabaseSync: 12, ConflictResolutionModal: 10, auditDualWrite: 4). Fixed settingsEmailTest.test.ts mocks. Total: 587/587 unit tests (43 files), TypeScript clean. 12 files changed, +1036 lines. |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-09 | React + Vite over Next.js | App is a client-side form tool, no SSR needed. Vite is faster for development. |
| 2026-02-09 | localStorage before IndexedDB | Simpler to implement first; IndexedDB added in Sprint 4 for offline sync. |
| 2026-02-09 | No backend in initial build | Focus on frontend form UX first. Backend/DB is out of scope for now. |
| 2026-02-09 | Epics 5, 7, 8 deferred | PDF export, auth, and backend are future phases. |
| 2026-02-10 | Polarity-aware safety questions | Tag each question with `concernAnswer` ('yes' or 'no') instead of hardcoding "No=bad". 15 of 66 questions are inverted (Yes=concern). ThreeWayToggle uses this to flip colors and show notes dynamically. |
| 2026-02-10 | Bulk section actions for safety checklist | Per-section All Yes/No/N/A/Clear buttons to speed up form completion. |
| 2026-02-10 | Type-to-sign generates canvas data URL | Typed signatures render via canvas to produce same PNG data URL as drawn signatures — uniform storage format. |
| 2026-02-10 | Cross-form context for safety checklist | Safety checklist receives `crossFormContext` prop with values from other forms (e.g., oxygenInHome) to drive auto-N/A logic. |
| 2026-02-10 | IndexedDB for drafts + sync queue | localStorage for active auto-save; IndexedDB for multi-draft management and offline sync queue. Two stores: `drafts` and `syncQueue`. |
| 2026-02-10 | vite-plugin-pwa for service worker | Workbox-based precaching of all static assets, runtime caching for Google Fonts, auto-update registration. |
| 2026-02-10 | Dark teal + amber color scheme | Header/footer use teal gradient (#1a3a4a→#1f4f5f), amber (#d4912a) for CTAs and accents (#e8a838 for text). Matches EHC brand colors. |
| 2026-02-10 | Logo from PDF, not JPG | Original JPG had black background. Converted PDF to transparent PNG via sips (vertical) and Python/Pillow (horizontal, black-bg removal). Horizontal version used for header and watermark. |
| 2026-02-10 | Responsive watermark via CSS clamp | `backgroundSize: clamp(280px, 55vw, 700px) auto` scales watermark from phones (280px) through tablets to desktops (700px). |
| 2026-02-10 | Centered header logo | Logo centered in header with "Client Intake Assessment" subtitle below. Save indicator and Drafts button right-aligned. Cleaner brand presentation. |
| 2026-02-10 | Zod direct safeParse over React Hook Form | RHF would require rewriting all 6 form components from data/onChange pattern to register()/Controller — too risky with auto-save. Zod safeParse on "Continue" click is minimal-touch. |
| 2026-02-10 | errorsRef pattern for stable onChange | Errors state in useCallback dependency caused ThreeWayToggle note input to lose focus on first keystroke. Using a ref for errors keeps onChange reference stable across error-clearing re-renders. |
| 2026-02-10 | jsPDF over react-pdf/html2canvas | jsPDF is lightweight (~280KB), works offline (PWA), addImage() accepts data URLs natively for signatures, jspdf-autotable handles tables. Dynamic import so it only loads on export. |
| 2026-02-10 | Section-per-page PDF layout | Each major section starts on its own page for readability. Retroactive header/footer stamping ensures pages added by autoTable also get headers. |
| 2026-02-10 | Light teal client banner in PDF | Replaced amber/yellow banner with light teal (#edf6f9 fill, #b4d7e2 border) to match teal section headers. 3 equal-width columns with text truncation. |
| 2026-02-10 | Draft step memory | DraftRecord stores currentStep so resume goes to last page worked on, not always step 0. Backward-compatible (optional field). |
| 2026-02-10 | OpenFDA wildcard prefix matching | Drug autocomplete uses `openfda.brand_name:${query}*` for prefix matching instead of exact quotes — users don't need to type full drug name. |
| 2026-02-10 | Nominatim structured addresses with geographic bias | Address autocomplete uses `addressdetails=1` for structured parsing and `viewbox=-76.1,40.3,-75.1,39.6` for Chester County PA bias without hard restriction. |
| 2026-02-10 | Dynamic array sections over fixed counts | Emergency contacts, doctors, hospitals, and neighbors all start with 1 entry and allow add/remove dynamically. No upper limit. Replaced fixed 2-3 entry patterns. |
| 2026-02-10 | Vitest over Jest | Vitest is native to Vite, zero config needed, faster execution. 47 tests in <1s. |
| 2026-02-10 | Weekday-based service scheduling | Replaced generic `preferredTimes` array with explicit `serviceDays[]` + `daySchedules{}` per-day times. More intuitive for home care scheduling. 24×7/live-in automatically hides schedule UI. |
| 2026-02-10 | `_all` staging key for Apply to All | "Apply to all days" uses `daySchedules._all` as temporary staging that doesn't leak to exports/PDF/review since those iterate `serviceDays[]` array only. |
| 2026-02-10 | isDrawing state for signature restoration | `react-signature-canvas` doesn't restore data URLs on mount. Toggle between `<img>` (saved signature) and `<SignatureCanvas>` (active drawing) using `isDrawing` state. |
| 2026-02-10 | JSON Import deep-merges with INITIAL_DATA | Imported JSON is spread over INITIAL_DATA defaults so any new fields added since export automatically get default values. Forward-compatible. |
| 2026-02-10 | Import only in DraftManager, not Review | Review page should focus on reviewing + submitting. DraftManager is the file management hub for import/export. Cleaner UX separation. |
| 2026-02-10 | Google Sheets via OAuth2 + GIS + raw fetch | OAuth2 (Google Sign-In) chosen over API key or service account. GIS for token flow, raw fetch() against Sheets API v4 (no gapi.client). Token in memory only. GIS script loaded dynamically. Plan created and added to backlog. |
| 2026-02-10 | Admin panel as third view mode | No router needed — Admin is a third state alongside wizard and DraftManager, toggled via header button. Mutual exclusivity with Drafts view. |
| 2026-02-11 | AppView discriminated union for navigation | Replace boolean state flags with `AppView = 'dashboard' \| 'assessment' \| 'serviceContract' \| 'drafts' \| 'settings'`. Type-safe routing without React Router. |
| 2026-02-11 | Separate localStorage keys per workflow | `'ehc-assessment-draft'` vs `'ehc-service-contract-draft'` — no collision, independent auto-save. |
| 2026-02-11 | Single IndexedDB store with type field | DraftRecord gets `type: 'assessment' \| 'serviceContract'`. Avoids DB migration. Old drafts default to 'assessment'. |
| 2026-02-11 | Prop-driven pre-fill for contract | `mapAssessmentToContract()` runs once, result passed as prop. No Redux/Context needed. Deep-merged with defaults. |
| 2026-02-11 | SSN: store last 4 only | MaskedInput stores `***-**-1234` format. Full SSN never in localStorage/IndexedDB. |
| 2026-02-11 | 7 contract steps (not 6) | Terms & Conditions added as Step 1 between Service Agreement and Consumer Rights. Legal requirements for explicit initials drove this addition. |
| 2026-02-11 | Card payment surcharge as separate initials | 3% surcharge on all card types gets dedicated initials field (not grouped with Terms of Payment). Explicit acknowledgment. |
| 2026-02-11 | Dynamic 2-row PDF banner | Replaced 3 equal-width columns with Row 1 (Name \| Age \| Date) + Row 2 (full-width wrapping address). Banner height dynamically calculated from address line count. HEADER_HEIGHT=35mm (reduced from 38mm and later 42mm after compact banner redesign). |

---

## Architecture Notes

```
src/
  App.tsx              # Thin routing layer with AppView state machine
  main.tsx
  components/
    Dashboard.tsx        # Landing page: 2×2 card grid
    AssessmentWizard.tsx # Assessment orchestrator (7 steps)
    ServiceContractWizard.tsx # Contract orchestrator (7 steps)
    DraftManager.tsx     # Dual-type draft list with filter tabs
    wizard/              # Wizard shell, progress bar, step navigation
    forms/               # Assessment form steps (7 components)
    forms/contract/      # Contract form steps (7 components)
    ui/                  # Shared UI: toggle cards, signature pad, initials, accordion, ThemeToggle, ToggleCardGroup, EmailComposeModal, etc.
      ConflictResolutionModal.tsx # Sync conflict resolution (Keep Mine / Use Theirs / Cancel)
  hooks/
    useAutoSave.ts       # Encrypted auto-save (async init, AES-GCM, isLoading gate)
    useDarkMode.ts       # Dark mode hook (system/light/dark, localStorage, .dark class)
    useDraftLock.ts      # Supabase draft locking (acquire/release/refresh, 30-min expiry)
    useFormWizard.ts     # Wizard step state management
    useIdleTimeout.ts    # Session idle timeout (activity tracking, warning/timeout)
    useOnlineStatus.ts   # Online/offline detection hook
    useSheetsSync.ts     # React hook wrapping sheetsApi (sync assessments/contracts to Google Sheets)
    useStepValidation.ts # Zod validation hook: validate(), clearErrors(), errors
    useSupabaseAuth.ts   # Supabase Google OAuth wrapper (graceful GIS fallback)
    useSupabaseDrafts.ts # Remote drafts list with Realtime subscription
    useSupabaseSync.ts   # Background sync + offline queue + conflict resolution
  validation/
    schemas.ts           # Assessment Zod schemas (7 steps)
    contractSchemas.ts   # Contract Zod schemas (7 steps, null for Review)
  types/
    navigation.ts        # AppView discriminated union
    forms.ts             # Assessment form interfaces
    serviceContract.ts   # Contract form interfaces (6 sub-interfaces)
    emailConfig.ts       # Email template config interfaces (per-document templates, signature, HTML toggle)
    supabase.ts          # Generated Supabase database types
  utils/
    initialData.ts       # Assessment defaults
    contractInitialData.ts # Contract defaults (includes termsConditions)
    prefill.ts           # Assessment → Contract data mapping
    exportData.ts        # Assessment CSV/JSON export + import
    exportFilters.ts     # Minimum Necessary PHI export filters (applyExportFilters)
    contractExportData.ts # Contract CSV/JSON export
    crypto.ts            # AES-GCM encryption (Web Crypto API, phi + credential keys)
    logger.ts            # __DEV__-gated logger (error/warn/log), dead-code eliminated in prod
    phiFieldDetection.ts # Shared PHI field detection (isNameField, isAddressField, etc.)
    emailApi.ts          # Email send client (Resend via Netlify Function, rate limiting, PDF attachment)
    emailTemplates.ts    # Email template engine ({clientName}/{date}/{staffName} placeholders, per-document defaults)
    supabaseClient.ts    # Supabase client singleton, isSupabaseConfigured() guard
    supabaseDrafts.ts    # CRUD operations on drafts table (upsert, fetch, delete)
    supabaseAuditLog.ts  # Remote audit log read/write via Supabase
    supabaseMigration.ts # One-time IndexedDB → Supabase migration
    db.ts                # IndexedDB: drafts (encrypted) + sync queue + auth config + emailConfig
    pdf/
      pdfStyles.ts              # Colors, margins, fonts, helpers (HEADER_HEIGHT=35mm)
      generatePdf.ts            # Assessment PDF orchestrator
      generateContractPdf.ts    # Contract PDF orchestrator (with age from DOB)
      sections/
        pdfHeader.ts              # Dynamic 2-row banner, section titles, field renderer, footer
        pdfClientHelpList.ts      # Assessment: client info, contacts, doctors tables
        pdfClientHistory.ts       # Assessment: medical info, living situation
        pdfClientAssessment.ts    # Assessment: category → selected items
        pdfMedicationList.ts      # Assessment: medications table
        pdfHomeSafety.ts          # Assessment: safety tables, concern highlighting
        pdfConsent.ts             # Assessment: HIPAA + signature
        pdfServiceAgreement.ts    # Contract: customer info, payment, services
        pdfServiceAgreementTerms.ts # Contract: T&C legal text + initials
        pdfConsumerRights.ts      # Contract: rights/responsibilities + signature
        pdfDirectCareWorker.ts    # Contract: employee status + signatures
        pdfTransportation.ts      # Contract: vehicle choice + signatures
        pdfCustomerPacket.ts      # Contract: packet acknowledgments
  test/
    setup.ts                      # Vitest config
    schemas.test.ts               # 19 assessment schema tests
    isAssessmentComplete.test.ts  # 11 completeness tests
    exportData.test.ts            # 35 assessment export tests (incl. CSV injection)
    prefill.test.ts               # 27 prefill mapping tests
    contractSchemas.test.ts       # 26 contract schema tests
    contractExportData.test.ts    # 6 contract export tests
    crypto.test.ts                # 16 encryption tests
    idleTimeout.test.ts           # 5 idle timeout tests
    sheetsConfig.test.ts          # 14 sheets config tests
    autoSaveMigration.test.ts     # 4 migration tests
    pdfBanner.test.ts             # 6 PDF banner tests
    assessmentTemplates.test.ts   # 11 template tests
    auditLog.test.ts              # 10 audit log tests (HMAC, filtering, purge)
    sanitizeForSync.test.ts       # 12 PHI masking tests (incl. email + insurance)
    useFocusTrap.test.ts          # 4 focus trap tests
    fetchWithTimeout.test.ts      # 3 fetch timeout tests
    useDarkMode.test.ts           # 6 dark mode tests (localStorage, .dark class, matchMedia mock)
    exportFilters.test.ts         # 11 export filter tests (PHI category toggles)
    emailApi.test.ts              # Email API client tests (send, rate limit, error handling)
    emailComposeModal.test.ts     # EmailComposeModal component tests (render, focus trap, validation)
    emailConfig.test.ts           # Email config persistence tests (IndexedDB, defaults, migration)
    emailTemplates.test.ts        # Email template engine tests (placeholders, per-document defaults)
    settingsEmailTest.test.ts     # Settings email UI tests (template editors, CC, signature, save/reset)
    useSupabaseSync.test.ts     # 12 Supabase sync + conflict tests
    useSupabaseDrafts.test.ts   # 15 remote drafts list tests
    useDraftLock.test.ts        # 14 draft locking tests
    supabaseDrafts.test.ts      # 23 CRUD tests
    supabaseMigration.test.ts   # 9 migration tests
    supabaseAuditLog.test.ts    # 8 audit log tests
    ConflictResolutionModal.test.tsx # 10 modal component tests
    auditDualWrite.test.ts      # 4 dual-write tests
```

---

## Completed Sprint: Sprint 3 — Conditional Logic + Signatures + Offline (DONE)

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 2.1 | Mobility conditional logic | Done | Dim mobility aids if walks alone, hide falls if immobile |
| 2.2 | Bathing/hygiene conditional logic | Done | Dim assistance categories when self-sufficient selected |
| 2.5 | Health history conditional follow-ups | Done | Surgery details expand, smoker notes when smoker=yes |
| 2.6 | Home safety N/A auto-logic | Done | Cross-form: oxygen items auto-N/A when oxygen=no in history |
| 4.2 | Type-to-sign alternative | Done | Draw/Type toggle, script font preview, generates canvas data URL |
| 4.3 | Signature timestamps & metadata | Done | Each signature stores timestamp, signerRole, method (draw/type) |
| 4.4 | EHC Representative signature fields | Done | Added to ClientHistory, ClientAssessment, already on SafetyChecklist |
| 6.2 | Service Worker for offline shell | Done | vite-plugin-pwa with workbox, offline banner, auto-update SW |
| 6.3 | Offline data queue and sync | Done | IndexedDB db.ts with drafts + syncQueue stores, attemptSync() |
| 6.5 | Draft management | Done | DraftManager component: list, resume, delete with confirm, save current |

---

## Current Sprint: Sprint 4 — UI Polish & Branding (DONE)

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 9.1 | Brand watermark background | Done | Converted PDF logo to transparent PNG, horizontal layout, responsive sizing via clamp(280px, 55vw, 700px) |
| 9.2 | Header redesign with centered logo | Done | Dark teal gradient header, centered EHC logo (white inverted), amber subtitle, adapted save/drafts controls |
| 9.3 | Footer color scheme update | Done | Matching teal gradient footer, translucent Back button, amber Continue button |
| 9.4 | Progress bar theme update | Done | White-on-dark step indicators, amber active step and progress fill, adapted for dark header |
| 9.5 | Responsive watermark | Done | Background logo scales with viewport using CSS clamp(), works on phones through desktops |

---

## Completed Sprint: Sprint 5 — Validation + PDF Export + Draft UX (DONE)

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 5.1 | PDF export with form data + signatures | Done | jsPDF + jspdf-autotable, 6 section renderers, retroactive headers/footers |
| 5.2 | PDF layout polish | Done | Section-per-page, content boxes, light teal banner, text truncation |
| 5.3 | PDF export from drafts page | Done | Per-draft PDF button in DraftManager |
| 10.1 | Zod validation schemas per step | Done | schemas.ts with 6 step schemas + STEP_SCHEMAS[] |
| 10.2 | Validation hook + App wiring | Done | useStepValidation hook, blocks forward nav, clears on back/edit |
| 10.3 | Error props on form components | Done | RadioGroup, SignaturePad error props; errors threaded to all 6 forms |
| 10.4 | Step completion gating | Done | validateCurrentStep() on Continue + step click forward |
| 11.1 | Draft UX: hide wizard chrome in draft mode | Done | Footer, progress bar, step title hidden when showDrafts=true |
| 11.2 | Draft UX: Save Draft button in footer | Done | Saves to IndexedDB with step memory, green confirmation banner |
| 11.3 | Draft UX: step memory on resume | Done | DraftRecord.currentStep saved/restored, shown in draft list |

---

## Completed Sprint: Sprint 6 — Enhancements & Quality (DONE)

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 12.1 | PDF DRAFT watermark | Done | Semi-transparent diagonal watermark on incomplete assessments, GState opacity |
| 12.2 | Print-friendly CSS | Done | @media print styles hide header/footer/progress, clean content rendering |
| 12.3 | Data export (CSV/JSON) | Done | exportData.ts with flattenData, csvEscape, safeName; download buttons on drafts |
| 12.4 | Assessment list/dashboard | Done | DraftManager enhanced with search, status filter, PDF/export buttons |
| 12.5 | Drug name autocomplete | Done | DrugAutocomplete component using OpenFDA API, wildcard prefix matching |
| 12.6 | Address autocomplete | Done | AddressAutocomplete component using Nominatim/OpenStreetMap, Chester County PA bias |
| 12.7 | Accessibility audit | Done | 53 issues fixed across 13 components: ARIA combobox, roles, labels, landmarks |
| 12.8 | Unit & integration tests | Done | Vitest + jsdom, 47 tests across 3 suites (schemas, completeness, export) |

---

## Post-Sprint Improvements (Session 7-8)

| Change | Description |
|--------|-------------|
| Drug autocomplete wildcard | Changed OpenFDA query from exact match to `${query}*` prefix matching |
| Address autocomplete rewrite | Structured address formatting with `addressdetails=1`, Chester County PA viewbox bias, 3-char threshold |
| Emergency contact email | Added `email` field to EmergencyContact interface, form, PDF, CSV export, review |
| Emergency contact address autocomplete | Replaced TextInput with AddressAutocomplete for emergency contact addresses |
| Dynamic emergency contacts | Starts with 1, add/remove buttons, no fixed limit |
| Dynamic doctors | Starts with 1, add/remove buttons, no fixed limit |
| Dynamic hospitals | Converted from 2 fixed fields to dynamic array with add/remove |
| Dynamic neighbors | Converted from fixed scalar fields to dynamic array with add/remove |
| New types | Added `HospitalPreference` and `Neighbor` interfaces |

---

## Post-Sprint Improvements (Session 9)

| Change | Description |
|--------|-------------|
| Service Preferences redesign | Replaced `preferredTimes[]` with weekday ToggleCards (Mon-Sun), `is24x7` boolean, `serviceDays[]`, `daySchedules{}`. Moved section after Pets, before EHC signature. 24×7/live-in hides schedule UI. |
| Apply to all days | "All days" row with amber styling — set one time range and apply to all selected days. Uses `_all` staging key that doesn't leak to exports. |
| Data migration | `migrateData()` in useAutoSave.ts handles old `preferredTimes` → new fields on load |
| Signature display fix (draw) | `isDrawing` state — show saved signature as `<img>` when loaded, switch to `<SignatureCanvas>` on tap. "Tap to re-sign" hint. |
| Signature display fix (type) | When `value` exists but `typedName` is empty (loaded from storage), show saved data URL as `<img>`. "Type below to re-sign" hint. |
| JSON Import | `importJSON()` in exportData.ts — reads File, validates 6 required sections, deep-merges with INITIAL_DATA defaults for forward-compatibility. |
| Import button in DraftManager | Hidden file input (accept=".json"), error banner on failure, loads data via `onResumeDraft(data, 0)`. |
| Review page cleanup | Removed JSON/CSV/Import from Review — kept only Export PDF + Submit. DraftManager is the file management hub. |

---

## Service Contract Wizard (Sessions 10-14) — COMPLETE

### What Was Built
A second 7-step wizard for the Service Agreement packet, running alongside the existing Assessment wizard.

| Phase | What Was Done | Key Files |
|-------|--------------|-----------|
| Foundation | AppView navigation, types, initial data, parameterized auto-save, dashboard | `navigation.ts`, `serviceContract.ts`, `contractInitialData.ts`, `Dashboard.tsx`, `DashboardCard.tsx` |
| Extract | Assessment logic extracted from App.tsx into standalone `AssessmentWizard.tsx` | `AssessmentWizard.tsx`, `App.tsx` refactored |
| Contract Forms | 7 contract form components + 3 shared UI components | `ServiceAgreement.tsx` (635 lines), `ServiceAgreementTerms.tsx`, `ConsumerRights.tsx`, `DirectCareWorkerNotice.tsx`, `TransportationRequest.tsx`, `CustomerPacket.tsx`, `ContractReviewSubmit.tsx`, `AccordionSection.tsx`, `InitialsInput.tsx`, `MaskedInput.tsx` |
| Wizard + Validation | Contract orchestrator + Zod schemas for 7 steps | `ServiceContractWizard.tsx`, `contractSchemas.ts` |
| Pre-fill + Drafts | Assessment→Contract mapping, dual-type draft management | `prefill.ts`, `DraftManager.tsx` modified, `ReviewSubmit.tsx` "Continue to Service Contract" |
| PDF Export | 6 contract PDF section renderers + orchestrator | `generateContractPdf.ts`, `pdfServiceAgreement.ts`, `pdfServiceAgreementTerms.ts`, `pdfConsumerRights.ts`, `pdfDirectCareWorker.ts`, `pdfTransportation.ts`, `pdfCustomerPacket.ts` |
| Export + Tests | Contract CSV/JSON export + 59 new tests | `contractExportData.ts`, `contractSchemas.test.ts`, `contractExportData.test.ts`, `prefill.test.ts` |
| Terms & Conditions | Legal text + 6 initials (Non-Solicitation, Payment, Surcharge, Termination, Auth, Docs) | `ServiceAgreementTerms.tsx`, `pdfServiceAgreementTerms.ts` |
| Banner Fix | Dynamic 2-row PDF banner, age from DOB | `pdfHeader.ts` redesigned, `pdfStyles.ts` HEADER_HEIGHT→38mm |

### Contract Wizard Steps
| Step | Form | Status |
|------|------|--------|
| 0 | Service Agreement (customer info, payment, services, schedule, signatures) | Done |
| 1 | Terms & Conditions (6 legal sections with initials) | Done |
| 2 | Consumer Rights & Responsibilities (read-only + signature) | Done |
| 3 | Direct Care Worker Notice (initials + signatures) | Done |
| 4 | Transportation Request (vehicle choice + signatures) | Done |
| 5 | Customer Packet (HIPAA, Hiring Standards, etc. + acknowledgment) | Done |
| 6 | Review & Submit (summary + PDF/CSV/JSON export) | Done |

---

## Next Up: Sprint 7+ — Suggested Backlog

| Priority | Item | Description | Effort |
|----------|------|-------------|--------|
| ~~P0~~ | ~~Visual PDF testing~~ | ~~Bumped HEADER_HEIGHT 38→42mm, added 6 banner tests~~ | Done |
| ~~P0~~ | ~~Auto-save migration~~ | ~~Verified migrateData handles missing termsConditions, added 4 tests~~ | Done |
| ~~P1~~ | ~~PDF preview before download~~ | ~~PdfPreviewModal + refactored PDF generators~~ | Done |
| ~~P1~~ | ~~Google Sheets integration~~ | ~~Full OAuth 2.0 via GIS, Settings screen, bulk sync, per-draft sync, inline setup guide~~ | Done |
| ~~P1~~ | ~~Multi-client workflow~~ | ~~ConfirmDialog + unsaved-data check on Dashboard~~ | Done |
| ~~P1~~ | ~~Google OAuth login gate~~ | ~~LoginScreen, auth gate in App.tsx, User Access Control in Settings, user info in Dashboard~~ | Done |
| ~~P2~~ | ~~Assessment PDF banner verify~~ | ~~Assessment PDF passes age correctly via clientHistory.age → stampHeaderOnCurrentPage~~ | Done |
| ~~P2~~ | ~~Bulk export~~ | ~~Export All (ZIP) button in DraftManager + Settings. JSZip, one JSON per draft, date-stamped filename.~~ | Done |
| ~~P2~~ | ~~Assessment templates~~ | ~~4 built-in templates (Standard Initial, 90-Day, Live-In/24x7, Post-Hospital). Template picker in AssessmentWizard for fresh assessments. 11 tests.~~ | Done |
| ~~P2~~ | ~~Settings screen~~ | ~~Full SettingsScreen with Sheets connection, sheet config, sync status, data management~~ | Done |
| ~~P1~~ | ~~Codebase review: 8 recommendations~~ | ~~Remove unused deps, phone masking, Read from Sheets, ErrorBoundary, caregiver notes, CSP, per-field validation, E2E tests~~ | Done |
| ~~P1~~ | ~~Encrypt PHI at rest~~ | ~~AES-GCM encryption for localStorage + IndexedDB (EPIC-18.1, 18.2)~~ | Done |
| ~~P1~~ | ~~Secure credential storage~~ | ~~Encrypt OAuth tokens and API keys in IndexedDB (EPIC-18.3)~~ | Done |
| ~~P1~~ | ~~Session idle timeout~~ | ~~Auto-lock after configurable inactivity, warning modal (EPIC-18.4)~~ | Done |
| ~~P1~~ | ~~Granular consent checkboxes~~ | ~~Individual HIPAA consent items with timestamps (EPIC-19.1)~~ | Done |
| ~~P2~~ | ~~CSV formula injection prevention~~ | ~~Prefix dangerous cell values in CSV export (EPIC-18.7)~~ | Done |
| ~~P1~~ | ~~Mobile progress indicator~~ | ~~Compact step dots visible on mobile (EPIC-20.1)~~ | Done |
| ~~P1~~ | ~~Exit/back confirmation dialog~~ | ~~Warn on unsaved changes when leaving wizard (EPIC-20.2)~~ | Done |
| ~~P2~~ | ~~Console log sanitization~~ | ~~__DEV__-gated logger, dead-code eliminated in prod (EPIC-18.6)~~ | Done |
| ~~P1~~ | ~~Color contrast fixes (WCAG AA)~~ | ~~Fix amber-on-white and light gray text for 4.5:1 ratio (EPIC-20.3)~~ | Done |
| ~~P2~~ | ~~Form auto-scroll to first error~~ | ~~Smooth scroll + focus on validation failure (EPIC-20.7)~~ | Done |
| ~~P2~~ | ~~Button density & touch targets~~ | ~~44px min for primary, 36px for secondary interactive elements (EPIC-20.8)~~ | Done |
| ~~P2~~ | ~~Loading states & skeleton screens~~ | ~~LoadingSpinner component, replaced 6 plain-text indicators (EPIC-20.9)~~ | Done |
| ~~P1~~ | ~~Audit logging (C1/18.5)~~ | ~~27 action types, IndexedDB store, CSV export, Activity Log viewer in Settings, 10 tests~~ | Done |
| ~~P1~~ | ~~PHI masking for Sheets sync (C2)~~ | ~~sanitizeForSync() masks names, DOB, phone, address, email, insurance, signatures, SSN before sync. 12 tests~~ | Done |
| ~~P1~~ | ~~Global error handlers (C3 partial)~~ | ~~window.onerror + unhandledrejection → audit log. ErrorBoundary logs component errors~~ | Done |
| ~~P1~~ | ~~Auth enabled by default (H1)~~ | ~~requireAuth=true in DEFAULT_AUTH_CONFIG~~ | Done |
| ~~P1~~ | ~~Focus trap in modals (H2)~~ | ~~useFocusTrap hook integrated into ConfirmDialog + PdfPreviewModal. 4 tests~~ | Done |
| ~~P1~~ | ~~PWA icons (H3)~~ | ~~Generated 192x192 and 512x512 PNG icons from EHC logo~~ | Done |
| ~~P1~~ | ~~CI/CD pipeline (H4)~~ | ~~GitHub Actions: tsc + vitest + vite build on push/PR to main~~ | Done |
| ~~P1~~ | ~~robots.txt + noindex meta (H5)~~ | ~~public/robots.txt Disallow:/ + meta noindex,nofollow in index.html~~ | Done |
| ~~P1~~ | ~~Deployment docs (H6)~~ | ~~.env.example + vercel.json with security headers~~ | Done |
| ~~P1~~ | ~~AbortSignal.timeout fix (H7)~~ | ~~fetchWithTimeout utility replacing compat-breaking API. 3 tests~~ | Done |
| ~~P2~~ | ~~Data retention policy & auto-purge~~ | ~~Auto-purge old drafts + audit logs on app mount (EPIC-19.2)~~ | Done |
| P3 | Backend integration | Submit button shows "Backend integration pending"; connect to actual API | Large |
| P3 | User roles & permissions | Admin/nurse/family roles, role-based field visibility | Large |
| P3 | Backend API & Database | REST API, PostgreSQL, data persistence, replace IndexedDB sync stub with real API. | Large |
| P3 | Multi-language / i18n | Spanish translation for client-facing sections. | Large |
| ~~P3~~ | ~~Dark mode~~ | ~~System-preference-aware dark mode toggle (EPIC-20.5)~~ | Done |
| ~~P2~~ | ~~Draft search & filter~~ | ~~Type filter, sort, combined search (EPIC-20.4)~~ | Done |
| ~~P2~~ | ~~Minimum Necessary export filters~~ | ~~PHI category toggles for CSV/JSON/Sheets exports (EPIC-19.3)~~ | Done |
| ~~P3~~ | ~~BAA documentation & HIPAA checklist~~ | ~~Status indicators + BAA fields in Settings (EPIC-19.4)~~ | Done |
| ~~P2~~ | ~~Signature UX improvements~~ | ~~Taller canvas, undo stroke (EPIC-20.6)~~ | Done |
| ~~P2~~ | ~~Keyboard navigation~~ | ~~Arrow key navigation in ToggleCard groups (EPIC-20.10)~~ | Done |

---

### Sprint 22 — Supabase Multi-Device Sync (COMPLETE)
- EPIC-23 Phases 1-4 implemented: Supabase Postgres backend with JSONB form data, RLS, optimistic concurrency
- Phase 1: Foundation — Supabase client, types, auth hook, env vars, CSP
- Phase 2: Data Sync — CRUD operations, background sync (3s debounce), offline queue, migration
- Phase 3: Real-Time + Locks — Realtime subscriptions, draft locking (30-min expiry, 5-min renewal), lock UI
- Phase 4: Audit + Polish — Dual-write audit logs, conflict resolution UI, Settings cloud sync section
- 100 new tests (587 total across 43 files)
- 3 commits: f314c11 (Phase 1+2, +2377 lines), a2d6657 (Phase 3, +1182 lines), 3b5bef0 (Phase 4, +1036 lines)
- Total: ~4,595 new lines of code

---

## Known Risks / Open Questions

| # | Item | Status |
|---|------|--------|
| 1 | HIPAA compliance for any future hosted version — need BAA with hosting provider | Open |
| 2 | Should "EHC Representative" fields be tied to auth, or free-text for now? | Decision: free-text for now |
| 3 | Exact icons for toggle card categories — need design input or use generic | Open |
| 4 | Should conditional logic fully hide fields or dim/disable them? | Decision: hide with conditional show; mobility aids dimmed when walks alone |
| 5 | PDF "DRAFT" watermark for incomplete assessments? | Open — currently generates same PDF regardless of completion |
| 6 | Backend API design: REST vs GraphQL, auth provider choice | Open |

---

## How to Resume Work

### Starting a new coding session:
```
1. cd /Users/snegi/Downloads/SIE/Assessment
2. Read SESSION.md (this file)
3. Check "Current Sprint" table for next item with "Not Started" or "In Progress"
4. npm run dev  (once project is initialized)
5. Work on the item, update this file when done
```

### After completing a story:
```
1. Update story status in "Current Sprint" table above
2. Add entry to "Completed Work" table with date and summary
3. If decisions were made, add to "Decisions Log"
4. Commit: git add -A && git commit -m "Complete story X.X: <title>"
```

### Starting a new sprint:
```
1. Move completed sprint table to "Completed Work"
2. Copy next sprint's stories from BACKLOG.md into "Current Sprint"
3. Update sprint header
```
