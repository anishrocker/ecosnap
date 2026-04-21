# EcoSnap deployment runbook

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) locally.
3. From the repo root, link and push migrations:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

4. Run seed (optional):

```bash
psql "$DATABASE_URL" -f supabase/seed/seed.sql
```

5. In the Supabase dashboard, enable **Auth → Email** (magic link) for admin users.
6. After a user signs up, set `profiles.role` to `admin` or `editor` in SQL if needed.

## Admin (Vercel)

1. Connect the GitHub repo to Vercel.
2. Set root directory to `apps/admin` **or** use monorepo settings with install `pnpm install` and build `pnpm exec turbo run build --filter=@ecosnap/admin`.
3. Add environment variables from `.env.example`.

## Mobile (EAS)

1. Install EAS CLI: `npm i -g eas-cli`.
2. In `apps/mobile`, run `eas init` and configure `eas.json` profiles (`preview`, `production`).
3. Set `EXPO_PUBLIC_SUPABASE_*` in EAS secrets for builds.

## CI

GitHub Actions runs `pnpm install`, `pnpm turbo run lint typecheck test` on push/PR.
