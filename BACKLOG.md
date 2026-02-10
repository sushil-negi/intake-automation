# Executive Home Care - Client Intake Assessment App

## Project Overview
Digital replacement for the paper-based Client Intake Assessment Packet used by Executive Home Care (EHC). Converts 6 PDF forms into a multi-step web wizard with smart conditional logic, e-signatures, and offline support.

---

## Epics

### EPIC-1: Multi-Step Web Form Wizard
**Goal:** Replace the monolithic PDF with a step-by-step web wizard — one form section per step with a progress indicator.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 1.1 | Wizard shell with step navigation and progress bar | - Progress bar shows current step and total steps. - User can navigate forward/back between steps. - Step titles visible in progress indicator. | P0 | Backlog |
| 1.2 | Step 1: Client Help List form | - All fields from PDF page 1: client name, DOB, address, phone, referral agency, date. - Goals text area. - Emergency contacts (3 entries): name, relationship, address, phone1, phone2. - Doctor info (3 entries): name, type, phone. - Hospital preference (2 entries). - Neighbor info: name, phone, keys yes/no. - Health recently/events text area. | P0 | Backlog |
| 1.3 | Step 2: Client History form | - Client name, date, age (auto-calculated from DOB in step 1). - Assessment reason: radio (Initial / 90 Day Supervisory). - Re-assessment reason: checkboxes (Change in condition, Post-fall, Post-hospitalization, Post ER Visit, Incident, Complaint, Other with text). - Service preferences: frequency, overnight/live-in toggle, start date, up to 3 time ranges with AM/PM. - Primary diagnosis text field. - Health history: multi-select checkboxes for all conditions listed. - Recent fall date, hospitalizations, recent surgery fields. - Smoker yes/no, oxygen yes/no, recent infections text. - Other providers table (dynamic rows): agency name, type, phone, address, email. - Advance directive radio group. - Vision section with checkboxes. - Hearing section with checkboxes. - Speech impaired text. - Primary language radio + understands English. - Diet checkboxes + other text. - Drug allergies, food allergies text. - Living situation: alone yes/no, people count, who, when. - Pets: yes/no, kind, count. | P0 | Backlog |
| 1.4 | Step 3: Client Assessment (needs checklist) | - Initial vs Revised radio (with date field if revised). - Three-column grouped checkbox layout: Bathing/Shower, Dressing, Hair Care, Teeth/Gums, Shaving, Mobility, Falls, Mobility Aids, Nutrition/Hydration, Bed Rails, Hearing Aids, Toileting, Medication Reminder, Exercise & Treatment Reminders, Housekeeping, Transportation/Errands. - Each category rendered as a card with toggle options inside. | P0 | Backlog |
| 1.5 | Step 4: Home Safety Checklist | - All ~50 Yes/No/N/A items grouped by section: Entrance, General, Medications, Medical Equipment, Living Areas, Bathroom, Bedroom, Kitchen, Lighting, Security, Ancillary Services. - Comments text area. - Office use: items that need attention text area. | P0 | Backlog |
| 1.6 | Step 5: Medication List | - Dynamic table with "Add Medication" button. - Columns: medication name, dosage, frequency, route, updates/changes. - Drug allergies field (pre-populated from step 2). - Remove row capability. - At least 1 row required or explicit "no medications" toggle. | P0 | Backlog |
| 1.7 | Step 6: Consent & Signatures (HIPAA + Assignment of Benefits) | - HIPAA notice acknowledgment text (read-only display). - Signature capture for HIPAA consent. - Assignment of Benefits text (read-only display). - Signature capture for Assignment of Benefits. - Date auto-populated, editable. | P0 | Backlog |
| 1.8 | Step 7: Review & Submit | - Read-only summary of all entered data grouped by section. - Edit buttons per section to jump back. - Final submit button. - Confirmation screen after submit. | P1 | Backlog |

---

### EPIC-2: Smart Conditional Logic
**Goal:** Hide irrelevant form sections based on prior answers to reduce form length by 30-50%.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 2.1 | Mobility conditional logic | - If "Walks by self with no problems" is checked, dim/collapse mobility aids section. - If "Immobile/bedbound" is checked, hide falls section and show positioning options. | P1 | Backlog |
| 2.2 | Bathing/hygiene conditional logic | - If "Bathes self" is checked, collapse bathing assistance options. - Same pattern for hair care, teeth/gums, shaving. | P1 | Backlog |
| 2.3 | Assessment type conditional logic | - If assessment is "Initial", hide re-assessment reason section. - If "Revised", show date field and re-assessment reasons. | P1 | Backlog |
| 2.4 | Living situation conditional logic | - If "Lives alone = Yes", hide "how many people / who / when" fields. - If "Pets = No", hide pet kind and count fields. | P1 | Backlog |
| 2.5 | Health history conditional follow-ups | - If "Recent fall" checked, show "Last fall date" field. - If "Recent surgery" checked, show surgery details and date. - If "Smoker = Yes", optionally show related notes field. | P1 | Backlog |
| 2.6 | Home safety N/A auto-logic | - If client doesn't use oxygen (from history), auto-mark oxygen-related safety items as N/A. - If no stairs reported, auto-mark stair-related items as N/A. | P2 | Backlog |

---

### EPIC-3: Checkbox Groups as Toggle Cards
**Goal:** Convert dense checkbox grids from the Client Assessment page into grouped, tappable toggle cards with icons for tablet use.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 3.1 | Design toggle card component | - Reusable component with icon, label, selected/unselected state. - Touch-friendly (min 44px tap target). - Visual feedback on tap (color change, checkmark). - Accessible (keyboard navigable, ARIA labels). | P0 | Backlog |
| 3.2 | Category card container | - Collapsible card per category (e.g., "Bathing/Shower"). - Shows count of selected items. - Expand/collapse with smooth animation. | P0 | Backlog |
| 3.3 | Map all assessment categories to card groups | - All ~16 categories from Client Assessment form mapped. - Each option within a category is a toggle card. - Mutually exclusive options grouped (e.g., "Bathes self" vs "Wants help with bathing"). | P1 | Backlog |

---

### EPIC-4: E-Signatures
**Goal:** Replace 4 wet signature lines with digital signature capture.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 4.1 | Signature pad component | - Draw-on-screen signature capture. - Clear button to reset. - Renders on both desktop and tablet. - Saves as PNG/SVG data URL. | P0 | Backlog |
| 4.2 | Type-to-sign alternative | - Text input that renders typed name in a script font. - User can choose between draw or type. | P2 | Backlog |
| 4.3 | Signature timestamps and metadata | - Each signature stores: image data, timestamp, IP (if available), signer role. - Displayed next to signature on review screen. | P1 | Backlog |
| 4.4 | EHC Representative signature fields | - Separate signature fields for EHC rep on: Client History, Client Assessment, Home Safety Checklist. - Auto-fill rep name from logged-in session (future). | P1 | Backlog |

---

### EPIC-6: Offline-First / Tablet-Friendly
**Goal:** Enable assessments to be completed in-home on tablets without reliable internet.

| ID | Story | Acceptance Criteria | Priority | Status |
|----|-------|-------------------|----------|--------|
| 6.1 | Auto-save on every field change | - Form state saved to localStorage/IndexedDB on each change. - On page reload, form restores from saved state. - Visual indicator showing "saved" status. | P0 | Backlog |
| 6.2 | Service Worker for offline shell | - App shell cached via Service Worker. - App loads fully offline after first visit. - Offline banner shown when no connection. | P1 | Backlog |
| 6.3 | Offline data queue and sync | - Completed assessments queued in IndexedDB when offline. - Auto-sync when connection restored. - Conflict resolution: last-write-wins with timestamp. - Sync status indicator. | P2 | Backlog |
| 6.4 | Tablet-optimized responsive layout | - Min touch target 44x44px. - Form renders well on 768px+ (iPad portrait). - Large text inputs, comfortable spacing. - No horizontal scrolling. | P0 | Backlog |
| 6.5 | Draft management | - List of in-progress assessments on home screen. - Resume any draft. - Delete draft capability with confirmation. - Show last modified date per draft. | P1 | Backlog |

---

## Implementation Order (Suggested Sprints)

### Sprint 1 — Foundation
- 1.1 Wizard shell with navigation
- 3.1 Toggle card component
- 3.2 Category card container
- 4.1 Signature pad component
- 6.1 Auto-save
- 6.4 Tablet-responsive layout

### Sprint 2 — Core Forms
- 1.2 Client Help List
- 1.3 Client History
- 1.4 Client Assessment
- 3.3 Map categories to cards

### Sprint 3 — Remaining Forms + Conditional Logic
- 1.5 Home Safety Checklist
- 1.6 Medication List
- 1.7 Consent & Signatures
- 2.1 Mobility conditional logic
- 2.2 Bathing conditional logic
- 2.3 Assessment type conditional logic
- 2.4 Living situation conditional logic

### Sprint 4 — Polish & Offline
- 1.8 Review & Submit
- 2.5 Health history follow-ups
- 2.6 Home safety auto-logic
- 4.2 Type-to-sign
- 4.3 Signature timestamps
- 4.4 EHC rep signatures
- 6.2 Service Worker
- 6.3 Offline sync
- 6.5 Draft management

---

## Out of Scope (for now)
- EPIC-5: PDF generation on completion
- EPIC-7: Role-based access / authentication
- EPIC-8: Backend API and database
- Drug name autocomplete API integration
- Email/notification system
- Analytics dashboard
