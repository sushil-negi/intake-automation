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
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Form Management:** React Hook Form + Zod validation
- **Wizard Navigation:** Custom multi-step component
- **Signature Capture:** react-signature-canvas
- **Offline Storage:** localStorage (phase 1), IndexedDB (phase 2)
- **Build Tool:** Vite
- **Package Manager:** npm

---

## Current Sprint: Sprint 1 — Foundation + Sprint 2 — Core Forms (MERGED)

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

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-09 | React + Vite over Next.js | App is a client-side form tool, no SSR needed. Vite is faster for development. |
| 2026-02-09 | localStorage before IndexedDB | Simpler to implement first; IndexedDB added in Sprint 4 for offline sync. |
| 2026-02-09 | No backend in initial build | Focus on frontend form UX first. Backend/DB is out of scope for now. |
| 2026-02-09 | Epics 5, 7, 8 deferred | PDF export, auth, and backend are future phases. |

---

## Architecture Notes

```
src/
  components/
    wizard/          # Wizard shell, progress bar, step navigation
    forms/           # One component per form step
    ui/              # Reusable UI: toggle cards, signature pad, inputs
  hooks/
    useAutoSave.ts   # Auto-save form state to localStorage
    useFormWizard.ts  # Wizard step state management
  schemas/           # Zod validation schemas per step
  types/             # TypeScript interfaces for form data
  utils/             # Helpers (date formatting, etc.)
  App.tsx
  main.tsx
```

---

## Next Up: Sprint 3 — Remaining Conditional Logic + Polish

| Story ID | Title | Status | Notes |
|----------|-------|--------|-------|
| 2.1 | Mobility conditional logic | Not Started | Dim/collapse mobility aids if walks alone |
| 2.2 | Bathing/hygiene conditional logic | Not Started | |
| 2.5 | Health history conditional follow-ups | Not Started | |
| 2.6 | Home safety N/A auto-logic | Not Started | |
| 4.2 | Type-to-sign alternative | Not Started | |
| 4.3 | Signature timestamps & metadata | Not Started | |
| 4.4 | EHC Representative signature fields | Not Started | |
| 6.2 | Service Worker for offline shell | Not Started | |
| 6.3 | Offline data queue and sync | Not Started | |
| 6.5 | Draft management | Not Started | |

---

## Known Risks / Open Questions

| # | Item | Status |
|---|------|--------|
| 1 | HIPAA compliance for any future hosted version — need BAA with hosting provider | Open |
| 2 | Should "EHC Representative" fields be tied to auth, or free-text for now? | Decision: free-text for now |
| 3 | Exact icons for toggle card categories — need design input or use generic | Open |
| 4 | Should conditional logic fully hide fields or dim/disable them? | Decision: hide with conditional show; mobility aids dimmed when walks alone |

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
