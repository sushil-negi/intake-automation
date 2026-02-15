# Deployment Guide

This guide covers deploying the EHC Assessment App to production.

## Netlify (Recommended)

The app is pre-configured for Netlify via `netlify.toml`.

### Setup

1. **Connect repository** to Netlify (Git-based deploy)
2. **Build settings** (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 22 (from `.node-version`)
3. **Deploy** — Netlify builds and publishes automatically on push to `main`

### What's Configured

`netlify.toml` includes:

| Feature | Configuration |
|---------|--------------|
| SPA routing | `/* → /index.html` (status 200) |
| Security headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| SW caching | `sw.js`, `workbox-*.js`, `registerSW.js` served with `no-cache` |
| Manifest caching | `manifest.webmanifest` served with `no-cache` |
| Asset caching | `/assets/*` served with `immutable, max-age=31536000` |

### Custom Domain

1. Add custom domain in Netlify dashboard
2. HSTS header is already configured — HTTPS is enforced
3. Update CSP `frame-src` if embedding in iframes (currently `DENY`)

## Vercel (Alternative)

A `vercel.json` configuration is also included for Vercel deployments.

### Setup

1. Connect repository to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node version: 22

## Environment Variables

**This app requires no environment variables.** All configuration is managed through the in-app Settings screen:

| Setting | Where Configured | Stored In |
|---------|-----------------|-----------|
| Google OAuth Client ID | Settings > Google Sheets | IndexedDB (encrypted) |
| Spreadsheet ID | Settings > Google Sheets | IndexedDB (encrypted) |
| Require authentication | Settings > User Access Control | IndexedDB |
| Allowed emails | Settings > User Access Control | IndexedDB |
| Idle timeout | Settings > User Access Control | IndexedDB |

See `.env.example` for documentation.

## Google OAuth Setup

If using Google OAuth for login and/or Sheets sync, you need a Google Cloud OAuth Client ID. See [GOOGLE-SHEETS-SETUP.md](GOOGLE-SHEETS-SETUP.md) for full instructions.

**Key requirement:** Add your deployment domain to the OAuth client's authorized JavaScript origins:
```
https://your-app.netlify.app
https://your-custom-domain.com
```

## Security Checklist

Before going live, verify:

- [ ] HTTPS is enforced (Netlify provides this automatically)
- [ ] Security headers are present (check with [securityheaders.com](https://securityheaders.com))
- [ ] CSP is not blocking required resources (check browser console)
- [ ] Google OAuth Client ID is configured with correct authorized origins
- [ ] Allowed email list is configured in Settings
- [ ] `robots.txt` is serving `Disallow: /` (prevents search indexing)
- [ ] `<meta name="robots" content="noindex, nofollow">` is in HTML head
- [ ] Test the PWA install flow on a tablet/mobile device
- [ ] Verify offline functionality works after first load
- [ ] Test dark mode toggle functions correctly and persists across sessions
- [ ] Verify dark mode renders properly on all form steps and PDF preview
- [ ] Run `npm audit` and address any high/critical vulnerabilities

## Build Output

The production build creates:

```
dist/
  index.html              # SPA entry point (with CSP meta tag)
  sw.js                   # Service worker
  registerSW.js           # SW registration
  workbox-*.js            # Workbox runtime
  manifest.webmanifest    # PWA manifest
  robots.txt              # Search engine exclusion
  favicon.ico             # Favicon
  pwa-192x192.png         # PWA icon (192px)
  pwa-512x512.png         # PWA icon (512px)
  assets/
    index-*.js            # Main app bundle (hashed)
    react-*.js            # React chunk (hashed)
    pdf-*.js              # jsPDF chunk (hashed, lazy-loaded)
    zip-*.js              # JSZip chunk (hashed, lazy-loaded)
    validation-*.js       # Zod chunk (hashed)
    index-*.css           # Tailwind CSS (hashed)
    *.png, *.jpg          # Optimized images
```

### Bundle Splitting

Heavy libraries are split into separate chunks for optimal loading:

| Chunk | Libraries | Load Strategy |
|-------|----------|---------------|
| `react` | react, react-dom | Loaded immediately |
| `pdf` | jspdf, jspdf-autotable | Dynamic import (on PDF export) |
| `zip` | jszip | Dynamic import (on ZIP export) |
| `validation` | zod | Loaded with app |

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

1. **npm ci** — install dependencies
2. **npm audit** — security vulnerability check
3. **tsc --noEmit** — TypeScript type checking
4. **vitest run** — 226 unit tests (18 files)
5. **vite build** — production build
6. **playwright test** — 11 E2E smoke tests

## Monitoring

The app includes built-in monitoring:

- **Global error handlers** (`window.onerror`, `unhandledrejection`) log to audit trail
- **ErrorBoundary** catches React component errors with recovery UI
- **Storage quota monitoring** warns when IndexedDB usage exceeds 80%
- **Audit log** tracks all user actions for compliance review

For external monitoring (recommended for production):
- Add a service like Sentry, LogRocket, or Datadog RUM
- Monitor Netlify deploy logs for build failures
- Set up uptime monitoring for the deployed URL
