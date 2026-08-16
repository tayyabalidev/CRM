# WorkFlow CRM

Freelancer CRM and project management. Phase 1 is the application foundation only.

## Run locally

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Supabase values in `.env.local` are optional for the Phase 1 shell. Add them before Phase 3 (authentication).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Database (Phase 2)

1. Create a free Supabase project.
2. In **SQL Editor**, run `supabase/migrations/0001_schema.sql` (safe to re-run).
3. Then run `supabase/migrations/0002_rls.sql`.

See `supabase/README.md` for details.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```
