# WorkFlow CRM

Freelancer CRM and project management built with **Next.js**, **Supabase**, and **Vercel** — free tiers only.

## Requirements

- Node.js 20+ (22 recommended)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Free [Supabase](https://supabase.com/) project
- Free [Vercel](https://vercel.com/) account (for deploy)

---

## 1. Install dependencies

```bash
git clone <your-repo-url>
cd CRM
pnpm install
cp .env.local.example .env.local
```

---

## 2. Create a Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project** → pick an org, name, database password, and region.
3. Wait until the project is ready.
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the free Free plan. Do not enable paid add-ons.

---

## 3. Run database migrations

In Supabase: **SQL Editor** → New query. Paste and run each file **in order** from `supabase/migrations/`:

| Step | File | Purpose |
|------|------|---------|
| 1 | `0001_schema.sql` | Tables, enums, indexes (safe to re-run; drops WorkFlow tables first) |
| 2 | `0002_rls.sql` | Row Level Security policies |
| 3 | `0003_files_storage.sql` | Private `workspace-files` bucket + storage policies |
| 4 | `0004_client_portal.sql` | Client portal invites; clients cannot see draft invoices |
| 5 | `0005_settings.sql` | Notification prefs + staff invites |
| 6 | `0006_notifications.sql` | In-app notification links + deadline dedupe |
| 7 | `0007_security_hardening.sql` | Tenant isolation, role guards, invite atomicity |
| 8 | `0008_perf_indexes.sql` | List/report performance indexes |

If `0001` fails with “type already exists”, run the current `0001_schema.sql` again, then continue from `0002`.

More detail: [`supabase/README.md`](supabase/README.md).

---

## 4. Configure Supabase Auth

In Supabase: **Authentication → URL Configuration**

### Local development

- **Site URL:** `http://localhost:3000`
- **Redirect URLs** (add each):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/onboarding`
  - `http://localhost:3000/auth/callback?next=/reset-password`

### Production (after you have a Vercel URL)

- **Site URL:** `https://your-app.vercel.app` (or your custom domain)
- **Redirect URLs** (add alongside local, or replace if you only use production):
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/auth/callback?next=/onboarding`
  - `https://your-app.vercel.app/auth/callback?next=/reset-password`

Also under **Authentication → Providers → Email**:

- Keep **Email** enabled.
- For local testing you may turn **Confirm email** off so signup works without inbox access.
- For production, leave confirm email **on** if you want verified accounts.

---

## 5. Configure Storage

Storage is created by migration `0003_files_storage.sql` (and hardened in `0007`):

- Bucket id: **`workspace-files`** (private)
- Max file size: 20 MB
- Paths are scoped per workspace; RLS blocks cross-tenant access

You should **not** need to create the bucket manually if `0003` and `0007` ran successfully.

Verify in Supabase: **Storage** → `workspace-files` exists and is **Private**.

---

## 6. Environment variables

### Local (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional — show Settings → Demo data on a deployed host (off in production by default)
# ALLOW_DEMO_DATA=true

# Optional — Resend API key for email invites (https://resend.com, free: 100/day)
# RESEND_API_KEY=re_...

# Optional — Sentry error tracking
# NEXT_PUBLIC_SENTRY_DSN=https://<public-key>@o0.ingest.sentry.io/0
# SENTRY_DSN=https://<public-key>@o0.ingest.sentry.io/0
```

Never commit `.env.local` or real keys.

### Vercel (Project → Settings → Environment Variables)

Add for **Production** and **Preview**, available at **Build** and **Runtime**:

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from Supabase |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
| `RESEND_API_KEY` *(optional)* | Resend API key for email invites |
| `NEXT_PUBLIC_SENTRY_DSN` *(optional)* | Public Sentry DSN for browser errors |
| `SENTRY_DSN` *(optional)* | Sentry DSN for server/runtime errors |

`NEXT_PUBLIC_*` values are inlined at **build** time — set them before the first deploy, then redeploy if you change them.

---

## 7. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Sign up → confirm email if required → complete onboarding.
2. Optional: **Settings → Demo data** (local/dev) to seed sample workspace data tagged `[Demo]`.

Other scripts:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start   # serves the production build locally
```

---

## 8. Build

```bash
pnpm build
```

This must succeed with your `.env.local` (or Vercel env) set. Auth pages are server-rendered on demand; missing Supabase env vars will fail the app at runtime (and can fail the build if routes still need them).

---

## 9. Deploy to Vercel (Hobby / free)

1. Push the repo to GitHub (or GitLab / Bitbucket).
2. Open [https://vercel.com/new](https://vercel.com/new) → import the repository.
3. Framework: **Next.js** (auto-detected).
4. Install command: `pnpm install` (set if not auto).
5. Build command: `pnpm build` (default `next build` is fine if Vercel uses the package script).
6. Add the environment variables from [§6](#6-environment-variables).
7. Deploy.

After the first deploy:

1. Copy the `*.vercel.app` URL.
2. Set `NEXT_PUBLIC_SITE_URL` to that URL (and redeploy).
3. Update Supabase Auth Site URL + Redirect URLs ([§4](#4-configure-supabase-auth)).

You do **not** need a paid Vercel plan for this app.

---

## 10. Connect a custom domain (optional, free on Hobby)

1. In Vercel: **Project → Settings → Domains** → add your domain.
2. Follow Vercel’s DNS instructions (usually an `A` / `CNAME` at your registrar).
3. Wait until the domain shows as valid.
4. Update:
   - Vercel env: `NEXT_PUBLIC_SITE_URL=https://your-domain.com` → redeploy
   - Supabase Auth Site URL + Redirect URLs to use `https://your-domain.com/...`

---

## Post-deploy checklist

- [ ] Sign up / log in / log out on the production URL
- [ ] Password reset email link lands on `/reset-password`
- [ ] Create a client, project, task, invoice, and payment
- [ ] Upload a file under Files
- [ ] Add a screenshot note on a project and a task
- [ ] Open an invoice PDF / print view
- [ ] (Optional) Invite a client portal user and confirm they only see their data

---

## Final quality check (Phase 26)

Verified in-repo (lint, typecheck, production build, and code/RLS audit):

| Area | Status |
|------|--------|
| Auth (signup, login, logout, reset, protected routes) | Pass |
| Clients / projects / tasks / payments / invoices / time / files | Pass |
| Client portal scoping + draft/private data hidden | Pass |
| Security (RLS, workspace filters, anon key only, unauthorized page) | Pass |
| Responsive (drawer, dual card/table layouts) | Pass |
| No `ComingSoon` placeholders on routes | Pass |

Manual smoke on your deployed URL (recommended once):

1. Auth: signup → login → logout → forgot/reset password  
2. CRUD: client, project (status/budget), task (+ comment), payment, invoice (+ PDF)  
3. Time: start/stop timer  
4. Files: upload / download / delete  
5. Portal: invite a client user; confirm only their projects/invoices/files; no drafts/private notes; staff URLs → `/unauthorized`  
6. Resize to mobile/tablet and spot-check lists and the sidebar drawer  

---

## Security notes

- Use only the **anon** key in the Next.js app (never the `service_role` key in client or Vercel env for this project).
- Workspace isolation is enforced with Supabase RLS.
- Demo seed tools are disabled in production unless `ALLOW_DEMO_DATA=true`.

---

## License

Private project — all rights reserved unless you add a license.
