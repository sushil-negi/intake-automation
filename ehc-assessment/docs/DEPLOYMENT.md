# EHC Assessment App — Deployment Guide

> Checklist for promoting from local dev to production, with separate Supabase databases per environment.

---

## Architecture Overview

```
                     ┌──────────────────┐
                     │   GitHub (main)  │
                     └────────┬─────────┘
                              │ auto-deploy on push
                     ┌────────▼─────────┐
                     │     Netlify      │
                     │  ┌─────────────┐ │
                     │  │  Vite Build │ │  ← VITE_* env vars baked in
                     │  │  (static)   │ │
                     │  └─────────────┘ │
                     │  ┌─────────────┐ │
                     │  │  Functions  │ │  ← Server-side env vars
                     │  │  /api/*     │ │
                     │  └─────────────┘ │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
     │   Supabase    │ │   Resend   │ │   Google    │
     │   (Postgres)  │ │   (Email)  │ │   (OAuth)   │
     └───────────────┘ └────────────┘ └─────────────┘
```

---

## Environment Isolation

Dev and prod use **completely separate** Supabase projects — different databases, auth users, and RLS policies.

| Component | Dev | Prod |
|-----------|-----|------|
| App URL | `localhost:5173` | `your-site.netlify.app` |
| Supabase | `yfmuglqzdlrmpojuuzkd.supabase.co` | `dpeygehqahfskcxpwzru.supabase.co` |
| Database | Dev Postgres | Prod Postgres |
| Auth users | Dev Google OAuth | Prod Google OAuth |
| Functions | `localhost:9999` | Netlify Edge |

The code is **environment-agnostic** — all config comes from environment variables.

---

## Production Promotion Checklist

### Step 1: Prod Database — Run Migrations

Open **prod Supabase → SQL Editor** and run in order:

#### 1a. Base Schema
Copy and run the entire contents of **`supabase/schema.sql`**.

Creates: `organizations`, `profiles`, `drafts`, `audit_logs`, `app_config` tables + RLS policies + helper functions (`user_org_id()`, `user_is_admin()`) + seed org ("EHC Chester County").

> Note the org ID returned by the seed INSERT — needed for Step 5.

#### 1b. Multi-Tenant Migration
Copy and run the entire contents of **`supabase/schema-v2-multi-tenant.sql`**.

Adds: `is_active` column, `super_admin` role, nullable `org_id`, `is_super_admin()` function, fixed RLS policies (no circular deps), `handle_new_user()` trigger, `org_summary` view.

### Step 2: Prod Supabase — Enable Google OAuth

1. **Supabase Dashboard** → Authentication → Providers → Google → Enable
2. Enter your **Google OAuth Client ID** and **Client Secret**
3. In **Google Cloud Console** → OAuth Client → Authorized redirect URIs, add:
   ```
   https://dpeygehqahfskcxpwzru.supabase.co/auth/v1/callback
   ```
4. In Authorized JavaScript origins, add your prod URL:
   ```
   https://your-site.netlify.app
   ```

### Step 3: Netlify — Set Environment Variables

**Netlify Dashboard → Site Settings → Environment Variables:**

#### Required — Supabase

| Variable | Notes |
|----------|-------|
| `VITE_SUPABASE_URL` | Prod Supabase URL — baked into client JS at build |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key — baked into client JS at build |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod service_role key — server-side only (Netlify Functions) |

> `VITE_*` vars are injected at build time. `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed to the browser.

#### Required — Email

| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `EHC_EMAIL_FROM` | Verified sender, e.g. `EHC Assessments & Contracts <snegi@executivehomecare.com>` |

#### Required — Remote Config

| Variable | Value |
|----------|-------|
| `EHC_CONFIG_ENABLED` | `true` |
| `EHC_REQUIRE_AUTH` | `true` |
| `EHC_IDLE_TIMEOUT_MINUTES` | `15` |

#### Optional — Google Sheets

| Variable | Notes |
|----------|-------|
| `EHC_OAUTH_CLIENT_ID` | Google Cloud OAuth Client ID |
| `EHC_SPREADSHEET_ID` | Target Google Sheet ID |
| `EHC_AUTH_METHOD` | `oauth` |
| `EHC_AUTO_SYNC_ON_SUBMIT` | `true` |
| `EHC_ALLOWED_EMAILS` | Comma-separated allowed emails |

See `.env.example` for full documentation of all variables.

### Step 4: Deploy

```bash
git push origin main
```

Netlify auto-builds with prod env vars and deploys.

### Step 5: Bootstrap Super Admin

1. **Sign in** to the prod app once (creates your `auth.users` row)
2. You'll see the "Account Setup Required" screen — this is expected
3. Run in **prod SQL Editor**:

```sql
INSERT INTO profiles (id, email, full_name, org_id, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Sushil Negi'),
  o.id,
  'super_admin'
FROM auth.users u
CROSS JOIN organizations o
WHERE u.email = 'snegi@executivehomecare.com'
  AND o.slug = 'ehc-chester'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  org_id = EXCLUDED.org_id;
```

4. **Refresh the browser** — you'll land on the Dashboard with full super_admin access.

### Step 6: Verify

- [ ] Sign in with Google — lands on Dashboard (not OrgSetupScreen)
- [ ] Settings → Cloud Sync — shows org name and "Connected"
- [ ] Admin Portal — lists your org with user count
- [ ] Create a test draft — check Supabase Table Editor → drafts
- [ ] Email a test PDF — verify delivery
- [ ] Security headers present — check with [securityheaders.com](https://securityheaders.com)
- [ ] PWA install flow works on tablet/mobile

---

## Two-Level Admin Model

### Level 1: SIE Super Admin (Tenant Administration)

- **Role:** `super_admin` in profiles table
- **Access:** Admin Portal — create orgs, invite users, suspend orgs
- **Backend:** Netlify Function `/api/admin` with `service_role` key (bypasses RLS)
- **Promotion:** SQL only — `UPDATE profiles SET role = 'super_admin' WHERE email = '...'`

### Level 2: Agency Admin (per-org Settings)

- **Role:** `admin` in profiles table
- **Access:** Settings screen — Google Sheets, auth, email templates, data management
- **Backend:** Supabase direct with RLS (scoped to their `org_id`)
- **Promotion:** Super admin invites with `admin` role via Admin Portal

### Role Matrix

| Feature | `super_admin` | `admin` | `staff` |
|---------|:---:|:---:|:---:|
| Create/manage orgs | Yes | - | - |
| Invite/remove users | Yes | - | - |
| Suspend/reactivate orgs | Yes | - | - |
| Configure Sheets/Auth/Email | Yes* | Yes | - |
| Create assessments/contracts | Yes | Yes | Yes |
| View/manage drafts | Yes | Yes | Yes |

*Super admins have admin capabilities within their assigned org.

---

## Local Development

Two terminals needed:

```bash
# Terminal 1: Vite dev server (port 5173)
cd ehc-assessment
npm run dev

# Terminal 2: Netlify Functions — admin API, email, config (port 9999)
cd ehc-assessment
npm run dev:functions
```

Vite proxies `/api/*` → `localhost:9999` automatically (see `vite.config.ts`).

Required `.env` in `ehc-assessment/` (gitignored):
```bash
# Supabase (dev project)
VITE_SUPABASE_URL=https://yfmuglqzdlrmpojuuzkd.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Email (Resend)
RESEND_API_KEY=...
EHC_EMAIL_FROM="EHC Assessments & Contracts <onboarding@resend.dev>"
```

---

## Netlify Configuration

`netlify.toml` (at repo root) includes:

| Feature | Configuration |
|---------|--------------|
| SPA routing | `/* → /index.html` (status 200) |
| Security headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Functions | `netlify/functions/` directory — auto-deployed |
| SW caching | `sw.js`, `workbox-*.js`, `registerSW.js` — `no-cache` |
| Asset caching | `/assets/*` — `immutable, max-age=31536000` |

---

## Build Output

```
dist/
  index.html              # SPA entry point (with CSP meta tag)
  sw.js                   # Service worker (Workbox)
  assets/
    index-*.js            # Main app bundle (hashed)
    react-*.js            # React chunk (hashed)
    pdf-*.js              # jsPDF chunk (hashed, lazy-loaded)
    zip-*.js              # JSZip chunk (hashed, lazy-loaded)
    validation-*.js       # Zod chunk (hashed)
    supabase-*.js         # Supabase chunk (hashed)
    index-*.css           # Tailwind CSS (hashed)
```

---

## Future Migrations

When adding new database changes:

1. Create `supabase/schema-v3-*.sql` with the migration
2. Test on dev Supabase first
3. **Run on prod Supabase before deploying code** that depends on it
4. Keep `schema.sql` updated as the canonical "fresh install" schema

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Account Setup Required" screen | Profile missing or no `org_id` | Super admin invites user via Admin Portal, or assign org via SQL |
| "infinite recursion in policy" | Circular RLS policy | Run `schema-v2-multi-tenant.sql` (replaces policies with SECURITY DEFINER functions) |
| Admin Portal JSON parse error | Functions server not running | Local: run `npm run dev:functions`. Prod: set `SUPABASE_SERVICE_ROLE_KEY` in Netlify |
| "Admin API not configured" (503) | Missing env var | Add `SUPABASE_SERVICE_ROLE_KEY` + `VITE_SUPABASE_URL` to Netlify env vars |
| Google OAuth redirect fails | Missing redirect URI | Add `https://<project>.supabase.co/auth/v1/callback` to Google Cloud Console |
| App loads but Supabase not working | Missing VITE_ vars | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Netlify, redeploy |
| "Email service not configured" | Missing Resend key | Set `RESEND_API_KEY` in Netlify env vars |

---

## Monitoring

Built-in:
- **Global error handlers** (`window.onerror`, `unhandledrejection`) → audit trail
- **ErrorBoundary** catches React errors with recovery UI
- **Storage quota monitoring** warns at 80% IndexedDB usage
- **Audit log** tracks all user actions for compliance

Recommended for production:
- Sentry, LogRocket, or Datadog RUM for error tracking
- Netlify deploy notifications (Slack/email)
- Uptime monitoring for the deployed URL
