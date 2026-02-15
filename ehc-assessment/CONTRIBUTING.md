# Contributing Guide

Development guide for the EHC Client Intake Assessment App.

## Prerequisites

- **Node.js 22+** (see `.node-version`)
- **npm 10+**
- **Git**

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd ehc-assessment

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
ehc-assessment/
  src/
    App.tsx                    # Root component — AppView state machine routing
    main.tsx                   # Entry point, global error handlers, auto-purge
    components/
      Dashboard.tsx            # Landing page with 4 action cards
      LoginScreen.tsx          # Google OAuth login screen
      SettingsScreen.tsx       # Admin panel (auth, Sheets, data, audit logs)
      AssessmentWizard.tsx     # 7-step assessment orchestrator
      ServiceContractWizard.tsx # 7-step contract orchestrator
      DraftManager.tsx         # Draft list with search, filters, per-draft actions
      ErrorBoundary.tsx        # Error recovery UI
      wizard/
        WizardShell.tsx        # Wizard chrome (header, footer, navigation)
        ProgressBar.tsx        # Step indicator dots
      forms/                   # Assessment step components
        ClientHelpList.tsx     # Step 0: Client info, contacts, doctors
        ClientHistory.tsx      # Step 1: Medical history, living situation
        ClientAssessment.tsx   # Step 2: 16-category functional assessment
        HomeSafetyChecklist.tsx # Step 3: 66-item safety audit
        MedicationList.tsx     # Step 4: Dynamic medication rows
        ConsentSignatures.tsx  # Step 5: HIPAA consent + signatures
        ReviewSubmit.tsx       # Step 6: Summary + PDF export + submit
      forms/contract/          # Contract step components (7 steps)
      ui/                      # Reusable UI components
        ThemeToggle.tsx        # Dark mode toggle button
        ToggleCardGroup.tsx    # Grouped toggle cards with exclusive selection
    hooks/                     # Custom React hooks
      useDarkMode.ts           # Dark mode state + system preference detection
    validation/                # Zod schemas
    types/                     # TypeScript interfaces
    utils/                     # Business logic, crypto, DB, exports, PDF
      exportFilters.ts         # Export privacy filters (PHI category toggles)
      phiFieldDetection.ts     # Shared PHI field detection for exports & sync
  e2e/                         # Playwright E2E tests
  docs/                        # Documentation
  public/                      # Static assets (icons, robots.txt)
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all 226 unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run 11 Playwright E2E tests |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | TypeScript type check only |

## Coding Conventions

### TypeScript

- **Strict mode** enabled
- **No `any` types** — use proper interfaces
- **Discriminated unions** for navigation (`AppView` type in `types/navigation.ts`)
- **Zod schemas** for runtime validation (not just TypeScript types)

### React Patterns

- **Functional components** only (no class components)
- **Custom hooks** for shared logic (`useAutoSave`, `useStepValidation`, etc.)
- **Props-down, callbacks-up** — no Redux/Context (data flows through props)
- **Dynamic imports** for heavy libraries:
  ```typescript
  const { jsPDF } = await import('jspdf');
  ```

### Styling

- **Tailwind CSS 4** — utility-first, no custom CSS files
- **Dark teal + amber** color scheme (see `WizardShell.tsx` header/footer), with full **dark mode** support via `useDarkMode` hook + `ThemeToggle` component
- **44px minimum touch targets** for interactive elements
- **WCAG AA contrast** — minimum 4.5:1 ratio for text

### State Management

The app uses **no external state library**. State is managed via:

- `useState` / `useReducer` in wizard orchestrators
- `useAutoSave` hook for encrypted persistence
- `AppView` discriminated union in `App.tsx` for navigation

### Form Data Pattern

```typescript
// Data flows as props + onChange callback
interface FormProps {
  data: SomeFormData;
  onChange: (updated: SomeFormData) => void;
  errors: Record<string, string>;
  onClearError: (field: string) => void;
}
```

### Error Handling

- Use `logger.error()` instead of `console.error()` (production-safe)
- `ErrorBoundary` wraps each wizard independently
- Global `window.onerror` and `unhandledrejection` log to audit trail
- Never expose stack traces in UI

### Security

- **Never store raw PHI unencrypted** — always use `useAutoSave` (encrypts automatically)
- **Never log PHI** — use `logger` which is dead-code eliminated in prod
- **CSV exports** must use `csvEscape()` to prevent formula injection
- **Sheets sync** must use `sanitizeForSync()` before transmission
- **Export privacy filters** — use `ExportPrivacyConfig` toggles to control PHI inclusion in exports
- **PHI field detection** — shared `phiFieldDetection.ts` module used by both export filters and Sheets sync sanitization

## Notable Hooks, Components & Utilities

### `useDarkMode` Hook (`hooks/useDarkMode.ts`)

Manages dark mode state with three modes: `'system'`, `'light'`, `'dark'`. Persists preference in `localStorage('ehc-theme')` and applies the `.dark` class on the `<html>` element. In `'system'` mode, listens to `prefers-color-scheme: dark` media query and auto-switches. Returns `{ mode, effectiveTheme, cycleMode }`.

### `ThemeToggle` Component (`ui/ThemeToggle.tsx`)

A button that cycles through light, dark, and system modes via `useDarkMode().cycleMode`. Renders a sun/moon/auto icon to indicate the current mode.

### `ToggleCardGroup` Component (`ui/ToggleCardGroup.tsx`)

Wraps a set of `ToggleCard` buttons and adds ArrowUp/ArrowDown keyboard navigation between them. Uses `data-toggle-card` attribute on child `ToggleCard` buttons to identify focusable elements. Ensures WCAG-compliant keyboard interaction for grouped toggle selections.

### `exportFilters` Utility (`utils/exportFilters.ts`)

Implements the HIPAA Minimum Necessary standard via the `ExportPrivacyConfig` interface. Provides 7 independent PHI category toggles (names, DOB, contact info, addresses, medical info, signatures, identifiers). The `applyExportFilters()` function strips toggled-off PHI fields from data before CSV/JSON/ZIP export. PDF exports are not affected (always include full data for clinical use).

### `phiFieldDetection` Utility (`utils/phiFieldDetection.ts`)

The single source of truth for identifying which form fields contain PHI. Exports a centralized catalog mapping field names to PHI categories. Shared by both `exportFilters.ts` (for redaction in exports) and `sanitizeForSync()` in `sheetsApi.ts` (for masking before Google Sheets transmission). This prevents drift between the two data egress paths.

## Testing

### Unit Tests (Vitest)

Tests live in `src/test/` and use Vitest + jsdom + Testing Library.

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/test/crypto.test.ts

# Watch mode
npm run test:watch
```

**Test conventions:**
- File naming: `*.test.ts` or `*.test.tsx`
- Use `describe`/`it` blocks
- Mock IndexedDB with `fake-indexeddb` (configured in `src/test/setup.ts`)
- Test validation schemas with both valid and invalid data
- Test export functions with snapshot-like assertions

### E2E Tests (Playwright)

E2E tests live in `e2e/` and use Playwright with Chromium.

```bash
# Install browsers (first time)
npx playwright install --with-deps chromium

# Run E2E tests
npm run test:e2e

# Run with UI
npx playwright test --ui
```

**E2E conventions:**
- Test critical user flows (navigation, form filling, draft save/resume)
- Tests run against the dev server
- Keep tests independent (no shared state between tests)

### Pre-commit Checklist

Before committing:
```bash
npx tsc --noEmit        # Type check
npm test                 # All unit tests pass
npm run build            # Production build succeeds
```

## Adding a New Form Field

1. **Type:** Add field to interface in `types/forms.ts` or `types/serviceContract.ts`
2. **Initial data:** Add default value in `utils/initialData.ts` or `utils/contractInitialData.ts`
3. **Form component:** Add input in the relevant form component
4. **Validation:** Add Zod constraint in `validation/schemas.ts` or `validation/contractSchemas.ts`
5. **Export:** Add to flatten function in `utils/exportData.ts` or `utils/contractExportData.ts`
6. **PDF:** Add to relevant PDF section renderer in `utils/pdf/sections/`
7. **Review:** Add to ReviewSubmit or ContractReviewSubmit display
8. **Test:** Add test cases for validation + export
9. **Migration:** Existing drafts auto-merge with defaults via `migrateData()` in `useAutoSave.ts`

## Adding a New Wizard Step

1. Create form component in `src/components/forms/` (or `forms/contract/`)
2. Add step to the wizard orchestrator's `STEPS` array
3. Add Zod schema to `validation/schemas.ts` (or `contractSchemas.ts`)
4. Add PDF section renderer in `utils/pdf/sections/`
5. Wire into review summary component
6. Update step labels in the orchestrator

## Key Architecture Decisions

See the Decisions Log in `SESSION.md` for the full history. Key choices:

- **No React Router** — `AppView` discriminated union for type-safe navigation
- **No state library** — Props-down pattern keeps data flow explicit
- **Zod over React Hook Form** — Direct `safeParse` is simpler with auto-save
- **jsPDF over html2canvas** — Works offline, lighter weight, direct image embedding
- **Two separate IndexedDB databases** — App data in `ehc-assessment-db`, crypto keys in `ehc-crypto-keys`
