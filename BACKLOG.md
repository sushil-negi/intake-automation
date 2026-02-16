# Executive Home Care - Client Intake Assessment App

## Project Overview
Digital replacement for the paper-based Client Intake Assessment Packet used by Executive Home Care (EHC). Converts 6 PDF forms into a multi-step web wizard with smart conditional logic, e-signatures, and offline support.

---

## Epics

### EPIC-1: Multi-Step Web Form Wizard
**Goal:** Replace the monolithic PDF with a step-by-step web wizard — one form section per step with a progress indicator.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 1.1 | Wizard shell with step navigation and progress bar | - Progress bar shows current step and total steps. - User can navigate forward/back between steps. - Step titles visible in progress indicator. | P0 | Done |
| 1.2 | Step 1: Client Help List form | - All fields from PDF page 1: client name, DOB, address, phone, referral agency, date. - Goals text area. - Emergency contacts (3 entries): name, relationship, address, phone1, phone2. - Doctor info (3 entries): name, type, phone. - Hospital preference (2 entries). - Neighbor info: name, phone, keys yes/no. - Health recently/events text area. | P0 | Done |
| 1.3 | Step 2: Client History form | - Client name, date, age (auto-calculated from DOB in step 1). - Assessment reason: radio (Initial / 90 Day Supervisory). - Re-assessment reason: checkboxes (Change in condition, Post-fall, Post-hospitalization, Post ER Visit, Incident, Complaint, Other with text). - Service preferences: frequency, overnight/live-in toggle, start date, up to 3 time ranges with AM/PM. - Primary diagnosis text field. - Health history: multi-select checkboxes for all conditions listed. - Recent fall date, hospitalizations, recent surgery fields. - Smoker yes/no, oxygen yes/no, recent infections text. - Other providers table (dynamic rows): agency name, type, phone, address, email. - Advance directive radio group. - Vision section with checkboxes. - Hearing section with checkboxes. - Speech impaired text. - Primary language radio + understands English. - Diet checkboxes + other text. - Drug allergies, food allergies text. - Living situation: alone yes/no, people count, who, when. - Pets: yes/no, kind, count. | P0 | Done |
| 1.4 | Step 3: Client Assessment (needs checklist) | - Initial vs Revised radio (with date field if revised). - Three-column grouped checkbox layout: Bathing/Shower, Dressing, Hair Care, Teeth/Gums, Shaving, Mobility, Falls, Mobility Aids, Nutrition/Hydration, Bed Rails, Hearing Aids, Toileting, Medication Reminder, Exercise & Treatment Reminders, Housekeeping, Transportation/Errands. - Each category rendered as a card with toggle options inside. | P0 | Done |
| 1.5 | Step 4: Home Safety Checklist | - All ~50 Yes/No/N/A items grouped by section: Entrance, General, Medications, Medical Equipment, Living Areas, Bathroom, Bedroom, Kitchen, Lighting, Security, Ancillary Services. - Comments text area. - Office use: items that need attention text area. | P0 | Done |
| 1.6 | Step 5: Medication List | - Dynamic table with "Add Medication" button. - Columns: medication name, dosage, frequency, route, updates/changes. - Drug allergies field (pre-populated from step 2). - Remove row capability. - At least 1 row required or explicit "no medications" toggle. | P0 | Done |
| 1.7 | Step 6: Consent & Signatures (HIPAA + Assignment of Benefits) | - HIPAA notice acknowledgment text (read-only display). - Signature capture for HIPAA consent. - Assignment of Benefits text (read-only display). - Signature capture for Assignment of Benefits. - Date auto-populated, editable. | P0 | Done |
| 1.8 | Step 7: Review & Submit | - Read-only summary of all entered data grouped by section. - Edit buttons per section to jump back. - Final submit button. - Confirmation screen after submit. | P1 | Done |

---

### EPIC-2: Smart Conditional Logic
**Goal:** Hide irrelevant form sections based on prior answers to reduce form length by 30-50%.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 2.1 | Mobility conditional logic | - If "Walks by self with no problems" is checked, dim/collapse mobility aids section. - If "Immobile/bedbound" is checked, hide falls section and show positioning options. | P1 | Done |
| 2.2 | Bathing/hygiene conditional logic | - If "Bathes self" is checked, collapse bathing assistance options. - Same pattern for hair care, teeth/gums, shaving. | P1 | Done |
| 2.3 | Assessment type conditional logic | - If assessment is "Initial", hide re-assessment reason section. - If "Revised", show date field and re-assessment reasons. | P1 | Done |
| 2.4 | Living situation conditional logic | - If "Lives alone = Yes", hide "how many people / who / when" fields. - If "Pets = No", hide pet kind and count fields. | P1 | Done |
| 2.5 | Health history conditional follow-ups | - If "Recent fall" checked, show "Last fall date" field. - If "Recent surgery" checked, show surgery details and date. - If "Smoker = Yes", optionally show related notes field. | P1 | Done |
| 2.6 | Home safety N/A auto-logic | - If client doesn't use oxygen (from history), auto-mark oxygen-related safety items as N/A. - If no stairs reported, auto-mark stair-related items as N/A. | P2 | Done |

---

### EPIC-3: Checkbox Groups as Toggle Cards
**Goal:** Convert dense checkbox grids from the Client Assessment page into grouped, tappable toggle cards with icons for tablet use.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 3.1 | Design toggle card component | - Reusable component with icon, label, selected/unselected state. - Touch-friendly (min 44px tap target). - Visual feedback on tap (color change, checkmark). - Accessible (keyboard navigable, ARIA labels). | P0 | Done |
| 3.2 | Category card container | - Collapsible card per category (e.g., "Bathing/Shower"). - Shows count of selected items. - Expand/collapse with smooth animation. | P0 | Done |
| 3.3 | Map all assessment categories to card groups | - All ~16 categories from Client Assessment form mapped. - Each option within a category is a toggle card. - Mutually exclusive options grouped (e.g., "Bathes self" vs "Wants help with bathing"). | P1 | Done |

---

### EPIC-4: E-Signatures
**Goal:** Replace 4 wet signature lines with digital signature capture.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 4.1 | Signature pad component | - Draw-on-screen signature capture. - Clear button to reset. - Renders on both desktop and tablet. - Saves as PNG/SVG data URL. | P0 | Done |
| 4.2 | Type-to-sign alternative | - Text input that renders typed name in a script font. - User can choose between draw or type. | P2 | Done |
| 4.3 | Signature timestamps and metadata | - Each signature stores: image data, timestamp, IP (if available), signer role. - Displayed next to signature on review screen. | P1 | Done |
| 4.4 | EHC Representative signature fields | - Separate signature fields for EHC rep on: Client History, Client Assessment, Home Safety Checklist. - Auto-fill rep name from logged-in session (future). | P1 | Done |

---

### EPIC-6: Offline-First / Tablet-Friendly
**Goal:** Enable assessments to be completed in-home on tablets without reliable internet.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 6.1 | Auto-save on every field change | - Form state saved to localStorage/IndexedDB on each change. - On page reload, form restores from saved state. - Visual indicator showing "saved" status. | P0 | Done |
| 6.2 | Service Worker for offline shell | - App shell cached via Service Worker. - App loads fully offline after first visit. - Offline banner shown when no connection. | P1 | Done |
| 6.3 | Offline data queue and sync | - Completed assessments queued in IndexedDB when offline. - Auto-sync when connection restored. - Conflict resolution: last-write-wins with timestamp. - Sync status indicator. | P2 | Done |
| 6.4 | Tablet-optimized responsive layout | - Min touch target 44x44px. - Form renders well on 768px+ (iPad portrait). - Large text inputs, comfortable spacing. - No horizontal scrolling. | P0 | Done |
| 6.5 | Draft management | - List of in-progress assessments on home screen. - Resume any draft. - Delete draft capability with confirmation. - Show last modified date per draft. | P1 | Done |

---

### EPIC-9: UI Polish & Branding
**Goal:** Professional EHC branding throughout the app with cohesive color scheme and responsive design.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 9.1 | Brand watermark background | - EHC logo as subtle color watermark behind form content. - Transparent PNG from PDF source. - Non-interactive, behind all form elements. | P1 | Done |
| 9.2 | Header redesign with centered logo | - EHC logo centered in header. - Dark teal gradient background matching brand. - Amber subtitle text. - Save/Drafts controls adapted to dark theme. | P1 | Done |
| 9.3 | Footer color scheme update | - Footer matches header teal gradient. - Back button translucent white. - Continue button amber brand color. | P1 | Done |
| 9.4 | Progress bar theme update | - Step indicators white on dark background. - Active step amber. - Completed steps show checkmark. - Progress fill amber. | P1 | Done |
| 9.5 | Responsive watermark | - Watermark scales with viewport via CSS clamp(). - Works on phones (280px), tablets, and desktops (700px). | P1 | Done |

---

### EPIC-5: PDF Export
**Goal:** Generate downloadable PDF from completed or in-progress assessments with all form data, signatures, and professional formatting.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 5.1 | PDF generation pipeline | - jsPDF + jspdf-autotable for tables. - Dynamic import (only loads on export click). - Section renderers for all 6 form sections. - Retroactive header/footer stamping on all pages. - Signatures embedded as PNG images. | P0 | Done |
| 5.2 | PDF layout polish | - Each section on own page. - Content boxes with light background. - Light teal client banner with 3-column layout. - Concern items highlighted in red. - Text truncation for long values. | P1 | Done |
| 5.3 | PDF export from drafts page | - Per-draft PDF button in DraftManager. - Generates PDF from draft data without resuming. - Loading state per draft. | P1 | Done |

---

### EPIC-10: Form Validation
**Goal:** Enforce required fields and data integrity using Zod schemas, blocking forward navigation on validation failure.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 10.1 | Zod validation schemas per step | - One schema per step with required fields. - Refine validators for Assessment (1+ item) and Medications (noMeds OR 1+ med). - Safety: both signatures + notes on flagged concerns. - Consent: HIPAA signature required. | P0 | Done |
| 10.2 | Validation hook + App wiring | - useStepValidation hook with validate/clearErrors/errors. - Blocks forward nav (Continue + step click) on failure. - Clears errors on Back, step click backward, and field edit. | P0 | Done |
| 10.3 | Error props on form components | - RadioGroup and SignaturePad accept error prop. - Red border + message on error. - All 6 form components thread errors to required fields. - Form-level error banner for refine errors. | P0 | Done |
| 10.4 | Step completion gating | - validateCurrentStep() called on Continue and forward step click. - Scrolls to top on error. - errorsRef pattern prevents focus loss on ThreeWayToggle notes. | P0 | Done |

---

### EPIC-11: Draft UX Improvements
**Goal:** Clean draft management experience with proper context switching and explicit save controls.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 11.1 | Hide wizard chrome in draft mode | - Footer nav, progress bar, step title hidden when viewing drafts. - Header Drafts button toggles to "Back to Form". - Reduced bottom padding in draft mode. | P1 | Done |
| 11.2 | Save Draft button in footer | - "Save Draft" button between step counter and Continue. - Saves to IndexedDB with current step. - Green confirmation banner auto-dismisses after 2s. | P1 | Done |
| 11.3 | Step memory on draft resume | - DraftRecord stores currentStep. - Resume navigates to saved step (not always step 0). - Step label shown in draft list UI. - Backward-compatible with older drafts. | P1 | Done |

---

### EPIC-12: Enhancements & Quality
**Goal:** Future improvements to polish the app, improve data quality, and ensure reliability.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 12.1 | PDF "DRAFT" watermark for incomplete assessments | - PDF generated from incomplete assessments shows diagonal "DRAFT" watermark on every page. - Completed/submitted assessments generate clean PDFs without watermark. - Watermark is semi-transparent via GState opacity, doesn't obscure content. | P2 | Done |
| 12.2 | Print-friendly CSS | - @media print styles hide header, footer, progress bar. - Form content renders cleanly for browser Print dialog (Ctrl/Cmd+P). - Alternative to PDF export for quick hard copies. | P3 | Done |
| 12.3 | Data export (CSV/JSON) | - Export button on drafts page for CSV or JSON download. - flattenData() flattens all form fields including dynamic arrays (contacts, doctors, hospitals, neighbors). - csvEscape handles special characters. | P3 | Done |
| 12.4 | Assessment list/dashboard | - DraftManager enhanced with search input, status filter dropdown, per-draft PDF and export buttons. | P2 | Done |
| 12.5 | Drug name autocomplete | - DrugAutocomplete component using OpenFDA API with wildcard prefix matching (`query*`). - Searches brand and generic names. - Fallback to free-text when offline. - Debounced, accessible ARIA combobox pattern. | P2 | Done |
| 12.6 | Address autocomplete | - AddressAutocomplete component using Nominatim/OpenStreetMap with `addressdetails=1` for structured formatting. - Chester County PA geographic bias via viewbox. - 3-char threshold, 350ms debounce. - Applied to client address and emergency contact addresses. - Fallback to free-text when offline. | P3 | Done |
| 12.7 | Accessibility audit | - 53 issues fixed across 13 components. - ARIA combobox pattern on autocompletes. - role/aria-* attributes on toggle cards, signature pad, progress bar, wizard shell. - useId() for label-input associations. - fieldset/legend for radio groups. - role="alert" on error messages. | P2 | Done |
| 12.8 | Unit & integration tests | - Vitest + jsdom setup (native Vite integration). - 47 tests in 3 suites: validation schemas (18), isAssessmentComplete (11), export utilities (18). - test/test:watch scripts in package.json. | P1 | Done |

---

## Implementation Order (Sprints)

### Sprint 1+2 — Foundation + Core Forms (DONE)
- 1.1–1.8 Wizard shell, all 6 forms, review/submit
- 3.1–3.3 Toggle cards, category cards, category mapping
- 4.1 Signature pad
- 6.1 Auto-save, 6.4 Tablet-responsive

### Sprint 3 — Conditional Logic + Signatures + Offline (DONE)
- 2.1–2.6 All conditional logic
- 4.2–4.4 Type-to-sign, metadata, EHC rep signatures
- 6.2–6.3, 6.5 Service Worker, offline sync, draft management

### Sprint 4 — UI Polish & Branding (DONE)
- 9.1–9.5 Watermark, header, footer, progress bar, responsive

### Sprint 5 — Validation + PDF Export + Draft UX (DONE)
- 10.1–10.4 Zod validation (direct safeParse, not RHF), error threading, step gating
- 5.1–5.3 PDF export: jsPDF + jspdf-autotable, 6 section renderers, draft PDF export
- 11.1–11.3 Draft UX: wizard chrome hidden in draft mode, save draft button, step memory

### Sprint 6 — Enhancements & Quality (DONE)
- 12.1–12.8 All EPIC-12 stories complete
- Post-sprint: dynamic add/remove for contacts/doctors/hospitals/neighbors, emergency contact email field

### Sprint 7 — Data Portability (COMPLETE)
- 13.1 JSON Import (Done)
- 13.2–13.4 Google Sheets integration (Done)

---

### EPIC-13: Data Portability & Persistence
**Goal:** Enable assessments to be imported, exported, and persisted beyond localStorage/IndexedDB — starting with file-based JSON and progressing to Google Sheets as a lightweight backend.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 13.1 | JSON Import | - `importJSON()` utility validates .json file (6 required sections). - Deep-merges with INITIAL_DATA for forward-compatibility. - "Import JSON" button in DraftManager with file picker. - Error banner on invalid files. - Loads data into form at step 0. | P1 | Done |
| 13.2 | Google Sheets connection setup | - OAuth2 via Google Identity Services (GIS). - Admin panel UI accessible from header "Admin" button. - Config: spreadsheet URL/ID, sheet tab name, auto-sync toggle. - "Test Connection" button. - Config persisted in new IndexedDB `sheetsConfig` store. - GIS script loaded in index.html. | P1 | Done |
| 13.3 | Write assessment to Google Sheets | - `appendAssessmentRow()` uses `flattenData()` for column schema (~120 cols). - Auto-creates header row on first sync. - Per-draft "Sync" button in DraftManager + "Sync All" in Admin. - Raw `fetch()` against Sheets API v4 (no gapi.client). - Token in memory only, auto-refresh via GIS. - Offline-aware: buttons disabled when offline. | P1 | Done |
| 13.4 | Read assessments from Google Sheets | - `readAllRows()` fetches all data from configured sheet. - `parseRowToAssessment()` reverses `flattenData()`, deep-merges with INITIAL_DATA. - "Load from Sheet" button in Admin with table display + per-row Import. - Service worker uses NetworkOnly for google.com/googleapis.com domains. | P2 | Done |
| 13.5 | Bulk export (ZIP) | - Export all drafts as ZIP file containing one JSON per client. - For backup/transfer between devices. - JSZip dynamic import, "Export All (ZIP)" in DraftManager toolbar + Settings Data Management. | P2 | Done |

---

### EPIC-14: Workflow & Templates
**Goal:** Speed up repeated assessments with templates and improve multi-client workflow.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 14.1 | Assessment templates | - 4 built-in templates (Standard Initial, 90-Day Supervisory, Live-In/24x7, Post-Hospitalization). - Template picker shown on fresh assessments inside WizardShell. - `applyTemplate()` deep-merges overrides with INITIAL_DATA. - 11 unit tests. | P2 | Done |
| 14.2 | Caregiver notes per section | - Free-text notes field per form section for internal EHC staff annotations. - Separate from patient-facing form fields. - Included in PDF export as "Staff Notes" appendix. - StaffNoteField component, flattenData/unflattenAssessment support, pdfStaffNotes appendix page. | P2 | Done |
| 14.3 | Multi-client session management | - Clear form state properly when starting new assessment. - Prevent data bleed between clients. - Confirmation dialog when switching clients with unsaved changes. | P2 | Done |

---

### EPIC-17: PDF Preview + Linked Workflow (COMPLETE)
**Goal:** Show PDF preview before downloading, provide confirmation when starting new forms with unsaved data, and link assessment PDFs from contract review.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 17.1 | PDF generator refactoring | - `buildAssessmentPdf()` and `buildContractPdf()` return jsPDF doc without saving. - `getAssessmentFilename()` and `getContractFilename()` extract filename logic. - Original `generatePdf`/`generateContractPdf` kept as thin wrappers for backward compat. | P0 | Done |
| 17.2 | PDF preview modal | - `PdfPreviewModal.tsx` portal component. - iframe-based PDF preview. - Download + Close buttons. - Escape key + backdrop click to close. - Body scroll lock. | P0 | Done |
| 17.3 | Assessment PDF preview | - Assessment Review "Export PDF" → "Preview PDF" opens modal. - Download from modal saves file. - Dynamic import preserved. | P0 | Done |
| 17.4 | Contract PDF preview | - Contract Review "Export PDF" → "Preview PDF" opens modal. - Same UX as assessment preview. | P0 | Done |
| 17.5 | Confirm dialog component | - `ConfirmDialog.tsx` reusable portal dialog. - Configurable title, message, action buttons (primary/danger/secondary variants). - Escape key + backdrop to close. | P0 | Done |
| 17.6 | Unsaved data check on Dashboard | - Dashboard checks localStorage for unsaved form data before clearing. - Shows 3-option dialog: Save Draft & Continue / Discard & Continue / Cancel. - Heuristic: checks if clientName or firstName is filled. | P0 | Done |
| 17.7 | Linked assessment from contract | - `AppView.linkedAssessmentId` threaded through navigation → wizard → review. - Assessment saved to IndexedDB on "Continue to Service Contract". - "View Linked Assessment PDF" button on contract review loads assessment and opens preview. - Draft save/resume preserves linked ID. | P1 | Done |
| 17.8 | Auto-save migration testing | - Verified `migrateData`/`deepMerge2` handles missing `termsConditions`. - 4 migration tests (missing section, partial fields, full fields, assessment migration). | P0 | Done |
| 17.9 | PDF banner height safety | - HEADER_HEIGHT bumped 38→42mm for 3-line address safety margin. - 6 PDF banner tests verify dynamic banner stays within HEADER_HEIGHT for various address lengths. | P0 | Done |

---

### EPIC-15: Dashboard + Service Contract Wizard (COMPLETE)
**Goal:** Add a Dashboard landing page and a Service Contract wizard (7 steps) that can be launched standalone or pre-filled from a completed assessment.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 15.1 | Dashboard landing page | - 2×2 card grid: New Assessment, New Service Contract, Resume Draft (with count badge), Settings. - AppView state machine replaces boolean flags. - App.tsx is thin router. | P0 | Done |
| 15.2 | Extract AssessmentWizard | - Assessment logic extracted from App.tsx into standalone `AssessmentWizard.tsx`. - All existing features work identically. | P0 | Done |
| 15.3 | Service Contract types + initial data | - `ServiceContractFormData` with 6 sub-interfaces. - `SERVICE_CONTRACT_INITIAL_DATA` defaults. - Separate localStorage key `'ehc-service-contract-draft'`. | P0 | Done |
| 15.4 | Service Agreement form (Step 0) | - Customer info, payment terms, level of service, payment method, contact/billing persons, services checklist, frequency/schedule, caregiver, deposit, 3 signatures. - 635 lines, largest component. | P0 | Done |
| 15.5 | Terms & Conditions (Step 1) | - Legal text from Service Agreement PDF pages 2-3. - 6 sections: Non-Solicitation, Terms of Payment, Card Payment Surcharge (3%), Termination, Authorization & Consent, Related Documents. - InitialsInput for each section. | P0 | Done |
| 15.6 | Consumer Rights (Step 2) | - 16 rights + 10 responsibilities (read-only). - Acknowledgment signature. | P0 | Done |
| 15.7 | Direct Care Worker Notice (Step 3) | - Employee status initials, liability insurance initials. - Consumer + agency signatures. | P0 | Done |
| 15.8 | Transportation Request (Step 4) | - Vehicle choice, employee names, indemnification text. - Client + EHC signatures. - Decline option. | P0 | Done |
| 15.9 | Customer Packet (Step 5) | - Accordion sections: HIPAA, Hiring Standards, Caregiver ID, Complaint, Survey. - All read-only with receipt acknowledgment + signature. | P0 | Done |
| 15.10 | Contract Review & Submit (Step 6) | - Read-only summary of all 6 data steps. - Green/red completion indicators. - Edit buttons per section. - PDF/CSV/JSON export. | P0 | Done |
| 15.11 | Contract validation schemas | - Zod schemas for 6 data steps (null for Review). - CONTRACT_STEP_SCHEMAS array (7 entries). | P0 | Done |
| 15.12 | Assessment → Contract pre-fill | - `mapAssessmentToContract()` maps name, address, DOB, service preferences. - Deep-merged with defaults. - "Continue to Service Contract" button on Assessment Review. | P1 | Done |
| 15.13 | Dual-type draft management | - DraftManager shows both assessment and contract drafts. - Filter tabs (All / Assessments / Contracts). - Type badge per draft. - Route resume to correct wizard. | P1 | Done |
| 15.14 | Contract PDF export | - 6 section renderers + orchestrator. - DRAFT watermark on incomplete contracts. - Dynamic banner with wrapping address, centered age. - Age computed from DOB. | P0 | Done |
| 15.15 | Contract data export (CSV/JSON) | - `flattenContractData()` for CSV. - `exportContractJSON()` for JSON. - Download from Review step. | P1 | Done |
| 15.16 | Contract tests | - 26 contract schema tests. - 6 contract export tests. - 27 prefill mapping tests. - Total: 106 tests passing. | P1 | Done |

---

### EPIC-16: PDF Improvements (COMPLETE)
**Goal:** Fix PDF rendering issues and improve banner layout.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 16.1 | Dynamic PDF banner | - 2-row layout: Row 1 (Name \| Age \| Date), Row 2 (full-width wrapping address). - Banner height calculated from address line count. - HEADER_HEIGHT=38mm. | P0 | Done |
| 16.2 | Age in contract PDFs | - Age computed from customerInfo.dateOfBirth. - Shown in banner center column. | P0 | Done |
| 16.3 | Content box improvements | - Two-pass pattern: `drawContentBoxFill` before content + `drawContentBoxBorder` after. - Dynamic height based on actual content. | P1 | Done |
| 16.4 | Configurable document title | - `stampHeaderOnCurrentPage()` accepts `documentTitle` parameter. - "Client Intake Assessment" vs "Service Contract". | P1 | Done |

---

## Implementation Order (continued)

### Sprint 7 — Data Portability + Settings (COMPLETE)
- 13.1 JSON Import (Done)
- 13.2 Google Sheets connection setup (Done — OAuth2/GIS, Settings panel, IndexedDB config)
- 13.3 Write assessment/contract to Google Sheets (Done — flattenData→row, per-draft + bulk Sync)
- Inline setup guide with Quick Start, OAuth walkthrough, Spreadsheet setup, Troubleshooting (9 entries)
- Total: 82 source files, ~14,500 lines, 130 tests

### Sprint 8 — Service Contract Wizard (COMPLETE)
- 15.1–15.16 All stories complete
- 16.1–16.4 PDF improvements complete

### Sprint 9 — PDF Preview + Multi-Client + Linked Workflow (COMPLETE)
- 17.1–17.9 All stories complete
- 14.3 Multi-client session management (Done via 17.5–17.6)

### Sprint 10 — Auth + Login Gate (COMPLETE)
- Google OAuth login gate via google.accounts.id API (JWT credential)
- LoginScreen.tsx with branded UI, allowed email check
- User Access Control section in Settings (requireAuth toggle, email allowlist)
- Auth session in sessionStorage, Sign Out in Dashboard header
- DB_VERSION 2→3, authConfig IndexedDB store

### Sprint 11 — Remaining P2s + Codebase Review (COMPLETE)
- 13.5 Bulk export (ZIP) — Done
- 14.1 Assessment templates — Done (4 built-in templates, template picker, 11 tests)
- Assessment PDF banner verify — Done (age passes correctly)
- 13.4 Read assessments from Google Sheets — Done (readAllRows, rowToFlatMap, unflattenAssessment, Load from Sheet UI)
- 14.2 Caregiver notes per section — Done (StaffNoteField, flatten/unflatten, PDF appendix)
- Codebase review recommendations — Done (8 items: remove unused deps, phone masking, Read from Sheets, ErrorBoundary, CSP meta tag, per-field inline validation, E2E smoke tests)
- Remove unused deps (react-hook-form, @hookform/resolvers) — Done
- PhoneInput masking — Done (10 phone fields across 3 components)
- ErrorBoundary — Done (wraps each wizard independently)
- CSP meta tag — Done (production-only via Vite plugin)
- Per-field inline validation — Done (clearFieldErrors in useStepValidation)
- E2E smoke tests — Done (11 Playwright tests, playwright.config.ts)
- Tests: 150/150 unit + 11/11 E2E

---

### EPIC-18: Security Hardening
**Goal:** Address security gaps identified in the deep codebase review — encrypt PHI at rest, secure credentials, add session management and audit logging.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 18.1 | Encrypt PHI at rest (localStorage) | - AES-GCM encryption via Web Crypto API for localStorage auto-save data. - Device-bound keys in separate IndexedDB (`ehc-crypto-keys`). - Transparent encrypt/decrypt in useAutoSave hook. - Migration: encrypts existing plaintext data on first load. - `ENC:` prefix format, plaintext passthrough. | P1 | Done |
| 18.2 | Encrypt PHI at rest (IndexedDB) | - AES-GCM encryption for all DraftRecord data in IndexedDB. - Shared crypto module (`crypto.ts`). - `StoredDraftRecord.encryptedData` field. - Lazy migration on read. | P1 | Done |
| 18.3 | Secure credential storage | - OAuth tokens and API keys encrypted via `encryptCredential` before storing in IndexedDB sheetsConfig. - Separate `credential` key from `phi` key. - Decrypted only when needed. - Cleared on sign-out. | P1 | Done |
| 18.4 | Session idle timeout | - `useIdleTimeout` hook with activity detection (mouse, keyboard, touch, scroll, click). - Warning modal 2 minutes before timeout via ConfirmDialog. - Configurable in Settings (5/10/15/30 min). - Auto sign-out on timeout. | P1 | Done |
| 18.5 | Audit logging | - Log key events: login, logout, draft create/update/delete, PDF export, Sheets sync, settings change. - AuditLog entries stored in IndexedDB with timestamp, action, userId, details. - Viewable in Settings under "Activity Log" section. - Export audit log as CSV. - Retain last 90 days of entries. | P2 | Done |
| 18.6 | Sanitize console logs in production | - Remove or gate all console.log/warn/error statements behind a debug flag. - No PHI or tokens visible in browser DevTools console in production builds. - Vite define: `__DEV__` flag for conditional logging. | P2 | Done |
| 18.7 | CSV formula injection prevention | - `csvEscape()` prefixes `=`, `+`, `-`, `@`, `\t`, `\r` with single quote. - Applied in exportData.ts (contractExportData.ts imports from there). - 8 unit tests for edge cases. | P2 | Done |

---

### EPIC-19: HIPAA Compliance
**Goal:** Strengthen HIPAA compliance posture with granular consent capture, data retention policies, and documentation for Business Associate Agreements.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 19.1 | Granular consent checkboxes | - 4 individual checkboxes: treatment consent, info sharing, electronic records, data retention. - `ConsentCheckbox { checked, timestamp }` interface. - All must be checked before SignaturePad enabled (`disabled` prop). - Zod `z.literal(true)` validation. - PDF renders `[X]`/`[ ]` with timestamps. - CSV exports 8 fields. | P1 | Done |
| 19.2 | Data retention policy & auto-purge | - Auto-purge drafts and audit logs older than 90 days on app load. - `purgeOldDrafts()` in db.ts + `purgeOldLogs()` in auditLog.ts called on mount in App.tsx. | P2 | Done |
| 19.3 | Minimum Necessary standard enforcement | - Review all data exports (CSV, JSON, Sheets sync) for minimum necessary PHI. - Add option to exclude sensitive fields from exports (SSN last 4, signatures). - Export configuration in Settings. | P2 | Done |
| 19.4 | BAA documentation & checklist | - In-app checklist in Settings showing HIPAA compliance status. - Items: BAA with Google (for Sheets), encryption at rest, access controls, audit logging, data retention. - Each item shows status (configured/not configured). - Links to external resources for BAA templates. | P3 | Done |

---

### EPIC-20: UI/UX Polish
**Goal:** Improve usability, accessibility, and mobile experience based on the deep UX review.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 20.1 | Mobile progress indicator | - Progress bar visible on mobile (currently hidden below sm breakpoint). - Compact horizontal layout with step dots instead of full labels. - Current step highlighted, completed steps show checkmark. - Tappable for navigation. | P1 | Done |
| 20.2 | Exit/back confirmation dialog | - Warn when navigating away from wizard with unsaved changes. - "Save Draft & Exit" / "Discard & Exit" / "Cancel" options. - Triggered by: Home button, browser back, Dashboard navigation. - Skip dialog if no changes since last save. | P1 | Done |
| 20.3 | Color contrast fixes (WCAG AA) | - Audit all text/background combinations for 4.5:1 contrast ratio (normal text) and 3:1 (large text). - Fix amber-on-white text in progress bar, footer, and buttons. - Fix light gray placeholder text. - Use axe-core or Lighthouse for automated testing. | P1 | Done |
| 20.4 | Assessment search and filter | - Search by client name across all drafts (assessment + contract). - Filter by: date range, completion status, type. - Sort by: last modified, client name, creation date. - Debounced search input. | P2 | Done |
| 20.5 | Dark mode | - System-preference-aware dark mode toggle. - Dark variants for all components: forms, cards, dialogs, PDF preview. - Persist preference in localStorage. - Toggle in Settings + system auto-detect. | P3 | Done |
| 20.6 | Signature UX improvements | - Larger signature pad area on mobile. - Pinch-to-zoom on signature pad. - Undo last stroke (not just clear all). - Signature preview thumbnail in review. | P2 | Done |
| 20.7 | Form auto-scroll to first error | - On validation failure, auto-scroll to first error field. - Smooth scroll with offset for fixed header. - Focus the first invalid input. - Works across all wizard steps. | P2 | Done |
| 20.8 | Button density and touch targets | - Audit all interactive elements for 44px minimum touch target. - Add spacing between adjacent buttons (especially in footer). - Larger tap areas for checkboxes and radio buttons on mobile. | P2 | Done |
| 20.9 | Loading states and skeleton screens | - Skeleton placeholder for draft list while loading from IndexedDB. - Loading spinner for PDF generation. - Disabled buttons with spinner during async operations (sync, export). - Prevent double-submit on slow operations. | P2 | Done |
| 20.10 | Keyboard navigation improvements | - Tab order follows visual layout. - Enter key submits current step. - Escape key closes modals and dialogs. - Arrow key navigation in toggle card groups. - Focus trap in modals. | P2 | Done |

---

### Sprint 12 — Security & HIPAA (COMPLETE)
- 18.1 Encrypt PHI at rest (localStorage)
- 18.2 Encrypt PHI at rest (IndexedDB)
- 18.3 Secure credential storage
- 18.4 Session idle timeout
- 18.7 CSV formula injection prevention
- 19.1 Granular consent checkboxes

### Sprint 13 — Production Hardening (COMPLETE)
- 20.1 Mobile progress indicator
- 20.2 Exit/back confirmation dialog
- 18.6 Sanitize console logs in production

### Sprint 14 — UX Polish (COMPLETE)
- 20.3 Color contrast fixes (WCAG AA) — Done
- 20.7 Form auto-scroll to first error — Done
- 20.8 Button density and touch targets — Done
- 20.9 Loading states and skeleton screens — Done

### Sprint 15 — Go-Live Hardening (COMPLETE)
- C1/18.5 Audit logging — Done (27 action types, IndexedDB, CSV export, 10 tests)
- C2 PHI masking for Sheets sync — Done (sanitizeForSync, 8 tests)
- C3 Global error handlers — Done (window.onerror + unhandledrejection → audit log)
- H1 Auth enabled by default — Done (requireAuth=true)
- H2 Focus trap in modals — Done (useFocusTrap hook, 4 tests)
- H3 PWA icons — Done (192x192, 512x512)
- H4 CI/CD pipeline — Done (GitHub Actions: tsc + vitest + build)
- H5 robots.txt + noindex meta — Done
- H6 Deployment docs — Done (.env.example, vercel.json with security headers)
- H7 AbortSignal.timeout fix — Done (fetchWithTimeout utility, 3 tests)

### Sprint 16 — Go-Live Audit Remediation (COMPLETE)
All 27 findings from GO-LIVE-AUDIT.md v2 resolved:
- C1 HSTS header — Done (vercel.json)
- C2 BAA enforcement — Done (prominent HIPAA warning in Settings)
- H1 CSP HTTP header — Done (vercel.json)
- H2 E2E in CI — Done (Playwright in ci.yml)
- H3 Max-length strings — Done (.max() on all Zod schemas)
- H4 Audit log HMAC — Done (HMAC-SHA256 in crypto.ts/auditLog.ts)
- H5 Session expiry — Done (loginTime + 8hr max in App.tsx)
- H6 Encryption failure logging — Done (logAudit in useAutoSave.ts)
- S3 Audit PHI sanitization — Done (sanitizeDetails in auditLog.ts)
- S4 Sync queue encryption — Done (encryptObject/decryptObject in db.ts)
- S5 Data retention — Done (purgeOldDrafts + purgeOldLogs on mount)
- S6 Contract consent timestamps — Done (boolean → ConsentCheckbox)
- S7 Consent revocation audit — Done (consent_grant/consent_revoke actions)
- S8 Pin signature lib — Done (exact version in package.json)
- A1 Low contrast header text — Done (WizardShell, ProgressBar, Dashboard)
- A2 Required field indicators — Done (asterisk + aria-required in FormFields)
- A3 Heading hierarchy — Done (h2 → h1 in WizardShell)
- A4 Error icon prefix — Done (⚠ in FormFields)
- A5 Save indicator aria-live — Done (role="status" in WizardShell)
- A7 Accordion chevron aria-hidden — Done (AccordionSection)
- I1 Quota monitoring — Done (navigator.storage.estimate() in App.tsx)
- I3 Bundle splitting — Done (manualChunks in vite.config.ts)
- I4 npm audit in CI — Done (ci.yml)
- I6 Cache-Control headers — Done (vercel.json)
- I2 Image optimization — Done (pngquant + jpegoptim, 802KB→114KB, 86% reduction)
- S1, S2, C3, A6, I5 — Documented as known limitations

### Sprint 17 — Go-Live Audit v3 Remediation (COMPLETE)
13 findings from deep re-audit (4 parallel agents: Security, HIPAA, Accessibility, Infrastructure):
- v3-1 crypto.ts btoa stack overflow — Done (loop-based encoding)
- v3-2 Dashboard encrypted localStorage read — Done (isEncrypted + decryptObject)
- v3-3 CI Node version mismatch — Done (20→22)
- v3-4 Skip navigation links (WCAG 2.4.1) — Done (WizardShell + Dashboard)
- v3-5 ConfirmDialog focus rings (WCAG 2.4.7) — Done
- v3-6 Modal backdrop aria-hidden (WCAG 4.1.2) — Done
- v3-7 Empty RadioGroup legends (WCAG 1.3.1) — Done
- v3-8 Touch target: Add provider button — Done (min-h-[44px])
- v3-9 CategoryCard aria-expanded/controls — Done
- v3-10 LoadingSpinner prefers-reduced-motion — Done (motion-reduce:animate-none)
- v3-11 Signature canvas keyboard guidance — Done
- v3-12 Color-only status dots in review — Done (sr-only text)
- v3-13 Submit button disabled state — Done (disabled/aria-disabled)

### Sprint 18 — Go-Live Audit v4 + Bug Fixes (COMPLETE)
Final pre-deployment audit with 4 parallel deep-dive agents:
- Security audit (auth bypass, crypto, data flow, XSS, dependency supply chain)
- HIPAA + data flow audit (PHI inventory, encryption coverage, masking, audit trail)
- Accessibility audit (forms, modals, navigation, responsive, WCAG compliance)
- Infrastructure + performance audit (build, PWA, deployment, error recovery, CI/CD)

v4 Audit Results: 11 MUST-FIX items identified across 4 dimensions. All resolved.

Documentation created: README.md (rewrite w/ Mermaid diagrams), docs/SECURITY.md, docs/HIPAA.md, docs/DEPLOYMENT.md, docs/GOOGLE-SHEETS-SETUP.md, CONTRIBUTING.md

Bug Fixes (Session 30):
- PDF service schedule: templates used abbreviated day names ('Mon') vs form full names ('Monday') — fixed templates + added migration
- Staff name auto-populate: refactored to functional updater pattern to prevent stale closure issues

v4 Code Remediations (Session 32 — all 9 open findings resolved):
- v4-1: JWT email_verified check in googleAuth.ts
- v4-3: Admin-only gate on Settings screen (first email = admin)
- v4-4: Encrypt clientName in IndexedDB draft records
- v4-5: Email fields added to sanitizeForSync() with masking
- v4-6: Insurance policy numbers added to sanitizeForSync() with masking
- v4-7: Full keyboard navigation for DrugAutocomplete + AddressAutocomplete
- v4-8: html2canvas stub (Vite alias) — 12% bundle reduction
- v4-9: handleSignOut stale closure fix (dependency array)
- v4-10: localStorage.removeItem moved out of render body
- v4-2: Accepted risk (session token in sessionStorage, mitigated by CSP + 8hr expiry)
- 4 new unit tests for email + insurance sanitization (209 total)

### Sprint 19 — Feature Completion (COMPLETE)
All remaining EPIC 19 (HIPAA) and EPIC 20 (UI/UX) stories completed:
- 20.4 Draft Search & Filter Enhancement — Done (type filter, sort dropdown, combined search)
- 19.3 Minimum Necessary Export Filters — Done (ExportPrivacyConfig, 7 PHI category toggles, shared phiFieldDetection.ts)
- 19.4 BAA Documentation & HIPAA Compliance Checklist — Done (status indicators, BAA section in Settings)
- 20.6 Signature UX Improvements — Done (taller canvas, undo stroke button)
- 20.10 Keyboard Navigation Improvements — Done (ToggleCardGroup with arrow key navigation, data-toggle-card)
- 20.5 Dark Mode — Done (useDarkMode hook, ThemeToggle, dark: classes across 13+ components, CSS custom properties)
- AddressAutocomplete optimization — Done (AbortController, LRU cache, reduced debounce/timeout, useCallback)
- Tests: 238/238 unit (18 files) + 11/11 E2E

### Sprint 20 — Final Audit Cleanup (COMPLETE)
- Source maps disabled in production (`sourcemap: false` in vite.config.ts)
- react-signature-canvas downgraded from 1.1.0-alpha.2 → 1.0.7 (latest stable)
- Final audit: 0 BLOCKERS, 0 WARNINGS — app is go-live ready

### Sprint 21 — Email PDF from App (COMPLETE)
- EPIC-22: All 6 stories implemented and tested
- 22.1 Email PDF button on Review pages (Assessment + Contract) — Done
- 22.2 Email compose dialog (To, CC, Subject, Body, validation, dark mode, a11y) — Done
- 22.3 Serverless email function (Resend API, rate limiting, validation) — Done
- 22.4 Email from Draft Manager — Done
- 22.5 Email audit logging (email_sent/email_failed + email PHI redaction) — Done
- 22.6 Email confirmation & history (inline banners, auto-dismiss) — Done
- Dev tooling: netlify-cli, Vite proxy, .env documentation
- Environment variable documentation in .env.example (all 14 Netlify env vars)
- Production sender: snegi@executivehomecare.com (verified in Resend)
- Tests: 487/487 unit (35 files) — 37 new tests added
- Email customization: configurable subject/body templates per type, {clientName}/{date}/{staffName} placeholders, default CC, email signature, HTML formatting toggle, Settings UI. DB v5→v6 (emailConfig store). escapeHtml() XSS prevention. Server-side subject/body size limits. Client-side maxLength validation.
- Draft duplicate fix: clearDraft() debounce cancellation, Dashboard auto-rescue dedup guard, setCurrentDraftId(null) on new assessment/contract

### Future — Backend + Roles + Advanced
- 7.1 User roles & permissions (admin/nurse/family) → subsumed by EPIC-23.6 (RBAC)
- 8.1 REST API + database → subsumed by EPIC-23.1 + 23.11
- 8.2 Replace IndexedDB sync stub with real API → subsumed by EPIC-23.11
- **EPIC-23: Multi-Tenant SaaS Platform** (12 stories, 3–6 month effort)

---

### EPIC-21: Online Contract Signing
**Goal:** Allow EHC staff to send contracts to customers for remote e-signature, eliminating the need for in-person signing on the same device.
**Prerequisite:** EPIC-8 (Backend API & Database) — requires server-side contract storage and state management.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 21.1 | Backend contract storage | - REST API endpoint to save contract as server-side record with unique ID. - Contract state machine: `draft` → `pending_signature` → `signed` → `completed`. - Encrypted at rest on server. - Linked to originating EHC staff user. | P0 | Not Started |
| 21.2 | Shareable signing link generation | - "Send for Signature" button on Contract Review step. - Generates unique token-based URL (e.g., `/sign/{token}`). - Token expires after configurable period (default 7 days). - One-time use: invalidated after successful signature. - Staff can revoke/regenerate link. | P0 | Not Started |
| 21.3 | Customer signing portal | - Public page (no Google OAuth required) accessed via signing link. - Read-only view of contract terms (Service Agreement, T&C, Consumer Rights, etc.). - Customer identity verification: name + last 4 of SSN or email code. - SignaturePad for customer signatures only (EHC rep fields pre-filled and locked). - Mobile-responsive for phone/tablet signing. - Dark mode support. | P0 | Not Started |
| 21.4 | Multi-party signing workflow | - Sequential signing: EHC staff signs first → customer signs second. - Each party sees only their signature fields as editable. - Status dashboard showing who has/hasn't signed. - Contract locked after all parties sign. - Timestamps and metadata captured per signature (IP, user agent, geolocation if consented). | P0 | Not Started |
| 21.5 | Email/SMS notifications | - "Send signing invitation" via email (and optionally SMS). - Email contains: customer name, EHC contact info, signing link, expiration date. - Reminder emails: configurable (e.g., after 3 days if unsigned). - Confirmation email to both parties after completion. - Unsubscribe/opt-out for reminders. | P1 | Not Started |
| 21.6 | Signing audit trail | - Detailed audit log per contract: link generated, link opened, identity verified, each signature applied, completion. - IP address + user agent captured for each signing event. - Tamper-evident (HMAC integrity on signing events). - Exportable as part of the contract PDF. - HIPAA-compliant: PHI access logged. | P1 | Not Started |
| 21.7 | Completed contract PDF with e-signature certificate | - Final PDF includes all signatures + e-signature certificate page. - Certificate shows: signer names, email/phone, timestamps, IP addresses, verification method. - "Electronically signed via EHC Assessment App" footer on each page. - Automatically saved to server and available for download by both parties. | P1 | Not Started |
| 21.8 | Staff signing dashboard | - List of all sent contracts with status (pending, viewed, partially signed, completed, expired). - Filter by status, date, customer name. - Resend/revoke actions per contract. - Bulk operations for multiple contracts. | P2 | Not Started |
| 21.9 | ESIGN Act & UETA compliance | - Consent to electronic signatures captured before first signature. - Option to request paper copy. - Clear disclosure that electronic signature has same legal effect as wet signature. - Records retained for required period. - Withdrawal of consent mechanism. | P1 | Not Started |

**Technical Notes:**
- Requires backend (EPIC-8) — contract state must be server-side, not localStorage
- Customer portal is a separate unauthenticated route, not behind Google OAuth
- Consider using SendGrid/Twilio for email/SMS delivery
- Token-based links should use cryptographically random UUIDs with HMAC validation
- HIPAA: customer signing portal must use HTTPS, encrypt PHI in transit and at rest
- Legal: consult with EHC's legal team on ESIGN Act/UETA compliance requirements

---

### EPIC-22: Email PDF from App
**Goal:** Allow EHC staff to email Assessment and Service Contract PDFs directly to customers from within the application, without manually downloading and attaching.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 22.1 | Email PDF button on Review pages | - "Email PDF" button alongside existing "Preview PDF" on both Assessment ReviewSubmit and Contract ContractReviewSubmit. - Opens email compose dialog with recipient field, pre-filled subject, and body text. - PDF auto-attached. | P1 | Done |
| 22.2 | Email compose dialog | - Modal with: To (email input), Subject (pre-filled with client name + document type), Body (configurable template text). - CC field (optional, for EHC office copy). - "Send" and "Cancel" buttons. - Email validation before send. - Dark mode, focus trap, ARIA accessible. | P1 | Done |
| 22.3 | Serverless email function | - Netlify Function (`/api/email`) accepts PDF base64 + recipient + subject + body. - Uses Resend REST API to send with PDF attachment. - API key stored as Netlify env var (not client-side). - Rate limiting (5/min/IP). - Max 4MB PDF. - Returns success/failure status to client. | P0 | Done |
| 22.4 | Email from Draft Manager | - "Email" action per draft in DraftManager (alongside existing PDF/CSV/JSON export buttons). - Same compose dialog as Review page. - Works for both assessment and contract drafts. | P2 | Done |
| 22.5 | Email audit logging | - `email_sent`/`email_failed` actions in audit trail with document type, timestamp, staff user. - Recipient email masked in audit log (PHI sanitization via email regex in PHI_PATTERNS). - Failed sends logged with error details. | P1 | Done |
| 22.6 | Email confirmation & history | - Inline success/error banner with auto-dismiss (4s). - Email history viewable in Settings Activity Log (via audit trail). | P2 | Done |

**Technical Notes:**
- **Approach:** Serverless function via Netlify Functions v2 (`/api/email`) + Resend REST API
- No new client-side npm dependencies — Resend called via raw `fetch()` server-side
- `/api/email` is same-origin — no CSP changes needed (covered by `'self'`)
- PDF generated client-side (reuses existing `buildAssessmentPdf`/`buildContractPdf`), converted to base64, sent as attachment
- Environment vars: `RESEND_API_KEY` (required), `EHC_EMAIL_FROM` (optional, default `noreply@ehcassessment.com`)
- Production sender: `snegi@executivehomecare.com` (verified in Resend)
- Dev setup: `npm run dev:functions` (port 9999) + `npm run dev` (Vite proxy on 5173)
- 37 new tests total (total: 487 tests across 35 files)
- Netlify function 6MB body limit → max attachment capped at 5.5MB base64 (~4MB PDF)

---

### EPIC-23: Multi-Tenant SaaS Platform
**Goal:** Transform the single-tenant Netlify-deployed app into a multi-customer SaaS platform where each home care agency gets its own isolated environment with centralized billing, tenant management, and white-label branding.
**Prerequisite:** EPIC-8 (Backend API & Database), EPIC-21 (Online Contract Signing — shares backend infrastructure)

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 23.1 | Server-side database | - PostgreSQL database (Supabase, Neon, or PlanetScale). - Schema: tenants, users, assessments, contracts, audit_logs, config tables. - Row-level security (RLS) policies ensuring tenant data isolation. - Migrations managed via Prisma or Drizzle ORM. - Connection pooling for serverless (PgBouncer or Neon pooler). | P0 | Not Started |
| 23.2 | Tenant management & onboarding | - Admin super-portal for SIE to create/manage tenants. - Tenant provisioning: create org, generate subdomain or path-based URL, seed default config. - Tenant profile: company name, logo, contact info, plan tier. - Tenant suspension/deactivation without data loss. - Self-service signup flow (optional: manual approval or auto-provision). | P0 | Not Started |
| 23.3 | Tenant-aware authentication | - Replace current single-org Google OAuth with multi-tenant auth. - Options: Clerk, Auth0, Supabase Auth, or custom JWT. - Each tenant has its own allowed email domain(s) and user roster. - Tenant ID embedded in JWT claims. - Login screen shows tenant branding (logo, colors). - SSO support per tenant (Google Workspace, Azure AD). | P0 | Not Started |
| 23.4 | Tenant routing & isolation | - Subdomain-based routing (e.g., `acme.ehcassessment.com`) or path-based (`/t/acme/`). - All API requests scoped to tenant via middleware (extract tenant from subdomain/JWT). - Database queries filtered by `tenant_id` at ORM level (no cross-tenant data leakage). - Static assets shared, tenant config fetched at runtime. - Custom domain support per tenant (DNS CNAME). | P0 | Not Started |
| 23.5 | Per-tenant configuration | - Extend existing Netlify Function shared config to per-tenant config stored in database. - Each tenant configures: Google OAuth Client ID, Spreadsheet ID, sheet names, auth settings, idle timeout. - Config API: `GET /api/tenants/:id/config` (replaces current `/api/config`). - Admin UI for tenant config management. - Per-tenant feature flags (enable/disable modules like Sheets sync, PDF email, contract signing). | P1 | Not Started |
| 23.6 | Role-based access control (RBAC) | - Roles per tenant: Owner, Admin, Staff (Nurse/Aide), Read-Only. - Owner: full settings + billing access. - Admin: manage users, view all assessments, configure sheets. - Staff: create/edit own assessments, view assigned clients. - Read-Only: view assessments, export PDF (no edit). - Role-field visibility: hide sensitive fields from non-admin roles. - Permissions stored in database, enforced server-side + UI. | P1 | Not Started |
| 23.7 | Billing & subscriptions (Stripe) | - Stripe integration for recurring billing. - Plan tiers: Free (1 user, 50 assessments/mo), Pro ($X/mo per user), Enterprise (custom). - Usage-based metering: assessment count, PDF exports, Sheets syncs. - Stripe Customer Portal for payment method management. - Webhooks for subscription lifecycle (created, renewed, cancelled, payment failed). - Grace period on payment failure before suspension. - Invoice history in admin portal. | P1 | Not Started |
| 23.8 | White-label branding | - Per-tenant customization: logo, primary/accent colors, company name in header/footer. - Tenant branding applied via CSS custom properties at runtime. - PDF exports use tenant logo and branding (replace EHC logo). - Email templates branded per tenant. - Configurable via tenant admin settings (logo upload, color picker). - Default EHC branding as fallback. | P2 | Not Started |
| 23.9 | Data migration from single-tenant | - Migration tool to import existing IndexedDB/localStorage data into tenant database. - Export current single-tenant data as JSON bundle. - Import script maps data to new multi-tenant schema. - Preserve draft history, audit logs, and config. - One-time migration with verification report. | P1 | Not Started |
| 23.10 | Centralized analytics dashboard | - SIE super-admin dashboard: total tenants, active users, assessment volume, revenue. - Per-tenant metrics: assessments completed, active users, storage usage, API calls. - Usage trends (daily/weekly/monthly charts). - Export analytics as CSV. - Alerting: tenants approaching plan limits, failed payments. | P2 | Not Started |
| 23.11 | Multi-tenant API layer | - REST API (Node.js/Express or Netlify Functions) replacing direct IndexedDB access. - Endpoints: assessments CRUD, contracts CRUD, config, users, audit logs. - Authentication middleware (JWT verification + tenant scoping). - Rate limiting per tenant. - API versioning (v1). - OpenAPI/Swagger documentation. | P0 | Not Started |
| 23.12 | Tenant data export & portability | - Tenant admin can export all org data (assessments, contracts, audit logs) as ZIP. - HIPAA-compliant data deletion: full tenant data purge on account closure. - Data retention policies configurable per tenant. - Right to data portability compliance. | P2 | Not Started |

**Technical Notes:**
- **Estimated effort:** 3–6 months with 1–2 developers
- **Database:** PostgreSQL recommended (Supabase for managed + auth, or Neon for serverless-friendly pooling)
- **ORM:** Prisma or Drizzle for type-safe queries with tenant-scoped middleware
- **Auth:** Clerk or Supabase Auth provide multi-tenant auth with minimal custom code; Auth0 for enterprise SSO
- **Billing:** Stripe is the standard — use Stripe Checkout for signup, Customer Portal for self-service
- **Hosting:** Can remain on Netlify (frontend) + serverless functions, or move API to Railway/Fly.io/AWS Lambda
- **Migration path:** Phase 1 (23.1, 23.3, 23.4, 23.11) gets multi-tenant working; Phase 2 (23.2, 23.5–23.7) adds management; Phase 3 (23.8, 23.10, 23.12) adds polish
- **HIPAA:** Each tenant's data must be logically isolated; encryption at rest per tenant; BAA required with database provider (Supabase, AWS, etc.)
- **Current architecture preserved:** The existing React frontend, Zod validation, PDF generation, and offline-first PWA patterns remain — only the data layer and auth change
- **Backward compatibility:** Single-tenant mode (current) should remain functional as a "self-hosted" option alongside the SaaS deployment

---

## Out of Scope (for now)
- Analytics dashboard (covered by 23.10 when SaaS is built)
- Multi-language / i18n support
- Role-based field visibility (covered by 23.6 when RBAC is built)
