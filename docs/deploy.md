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
6. **Auth redirect URLs (required for admin magic link):** In **Authentication → URL Configuration → Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (local Next.js admin)
   - Your production admin URL with the same path, e.g. `https://your-domain.com/auth/callback`  
   Without this, the link in the email may not complete sign-in (loop back to login).
7. After a user signs up, set `profiles.role` to `admin` or `editor` in SQL if needed.

## Admin (Vercel)

1. Connect the GitHub repo to Vercel.
2. Set root directory to `apps/admin` **or** use monorepo settings with install `pnpm install` and build `pnpm exec turbo run build --filter=@ecosnap/admin`.
3. Add environment variables from `.env.example` (use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` when your Supabase project provides publishable keys; legacy `*_ANON_KEY` still works as fallback).

## Mobile (EAS)

1. Install EAS CLI: `npm i -g eas-cli`.
2. In `apps/mobile`, run `eas init` and configure `eas.json` profiles (`preview`, `production`).
3. Set `EXPO_PUBLIC_SUPABASE_*` in EAS secrets for builds.

## CI

GitHub Actions runs `pnpm install`, `pnpm turbo run lint typecheck test` on push/PR.
