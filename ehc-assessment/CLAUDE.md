# Claude Code Instructions

## Dev Server — Always Running
After completing ANY code change, always check that the Vite dev server is running (`lsof -i :5173`). If it's not running, start it in the background before telling the user the work is done. The user should never have to ask for the dev server — it must always be up so changes are immediately visible.

```
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" && cd /Users/snegi/Downloads/SIE/Assessment/ehc-assessment && npx vite --host
```

## PATH
Always prefix npm/npx commands with:
```
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
```

## Commands
- **Dev server:** `npx vite --host` (port 5173)
- **TypeScript check:** `npx tsc --noEmit`
- **Unit tests:** `npx vitest run` (238 tests, 18 files)
- **E2E tests:** `npx playwright test` (16 tests: 11 smoke + 5 accessibility)
