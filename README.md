# EcoSnap

Local recycling helper for **Cedar Park**, **Leander**, and **Austin** — non-AI MVP (Expo + Supabase + Next.js admin).

## Repo layout

| Path | Purpose |
|------|---------|
| `apps/mobile` | Expo (React Native) resident app |
| `apps/admin` | Next.js content admin |
| `packages/shared` | Zod + shared types (`normalizeSearchQuery`, item flow schema) |
| `packages/rules-engine` | Pure TS rule evaluation, flow helpers, publish validators |
| `supabase/migrations` | Postgres schema + RLS + `search_items` RPC |
| `docs/` | Deploy + search ranking notes |

## Quick start

```bash
pnpm install
pnpm turbo run build typecheck test lint
```

Copy `.env.example` to `.env` / `apps/mobile/.env` and set Supabase URLs and keys. Apply migrations with the Supabase CLI (`supabase db push`). See [docs/deploy.md](docs/deploy.md).

## Scripts

- `pnpm --filter @ecosnap/mobile start` — Expo dev server  
- `pnpm --filter @ecosnap/admin dev` — Admin Next.js  
- `pnpm rules:export` — Stub rules bundle JSON (replace with DB export in CI)
