# Database migrations

`0001_schema.sql` is safe to re-run. It drops existing WorkFlow tables and types first, then recreates them.

For the full local + Vercel setup (env vars, Auth URLs, custom domain), see the root [`README.md`](../README.md).

## Apply in the dashboard

1. Create a project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**.
3. Paste and run `migrations/0001_schema.sql`.
4. Paste and run `migrations/0002_rls.sql`.
5. Paste and run `migrations/0003_files_storage.sql` (private `workspace-files` bucket, invoice attachments, and storage policies).
6. Paste and run `migrations/0004_client_portal.sql` (portal invite links; clients cannot see draft invoices).
7. Paste and run `migrations/0005_settings.sql` (notification prefs and staff invite links).
8. Paste and run `migrations/0006_notifications.sql` (in-app notification links and deadline dedupe).
9. Paste and run `migrations/0007_security_hardening.sql` (storage tenant isolation, membership role guards, invite atomicity, related-row workspace checks).
10. Paste and run `migrations/0008_perf_indexes.sql` (list/report indexes for invoices, files, time entries, tasks, projects, notifications).
11. Copy the project URL and anon key into `.env.local` (and Vercel env for deploy).

If `0001` failed with “type already exists”, run the updated `0001_schema.sql` again, then `0002_rls.sql`.

## Auth redirects

In Supabase: **Authentication → URL Configuration**

### Local

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/onboarding`
  - `http://localhost:3000/auth/callback?next=/reset-password`

### Production

Replace `https://your-app.vercel.app` with your Vercel or custom domain:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/auth/callback?next=/onboarding`
  - `https://your-app.vercel.app/auth/callback?next=/reset-password`

For local testing, you can turn off **Confirm email** under Authentication → Providers → Email. Otherwise signup waits for a confirmation email.

Optional: add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`.

## Storage

Created by `0003_files_storage.sql`, hardened by `0007_security_hardening.sql`:

- Bucket: `workspace-files` (private, 20 MB limit)
- No manual bucket setup required after those migrations succeed
