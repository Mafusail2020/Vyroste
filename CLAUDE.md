# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with two separate apps:

- `frontend/` — React 19 + TypeScript + Vite + Tailwind v4 + React Router v7
- `backend/` — Python 3.10 + FastAPI + Supabase client

## Frontend Commands

Run from `frontend/`:

```bash
npm run dev       # dev server with HMR on :5173
npm run build     # tsc type-check + Vite build
npm run lint      # ESLint
npm run preview   # preview production build
```

No test runner configured yet.

## Backend Commands

Run from `backend/`:

```bash
pip install -r requirements.txt
uvicorn main:app --reload   # dev server on :8000
```

## Frontend Architecture

- Entry: `src/main.tsx` → `src/App.tsx`
- Router: React Router v7 with `<BrowserRouter>` in main.tsx, `<Routes>` in App.tsx
- Layout shell: `src/components/Layout.tsx` wraps all pages via `<Outlet />`
- React Compiler enabled via `@rolldown/plugin-babel` + `reactCompilerPreset` — no manual `useMemo`/`useCallback`
- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` all on — enums not allowed (use `as const` objects instead)
- Tailwind v4 via `@tailwindcss/vite` plugin — import with `@import "tailwindcss"` in CSS
- HTTP client: axios instance in `src/lib/api.ts` (not yet created)
- Supabase JS client: `src/lib/supabase.ts` (not yet created)
- Env vars: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local`

## Backend Architecture

- `main.py` — FastAPI app + CORS middleware (allows `FRONTEND_ORIGIN`)
- `app/api.py` — router with all endpoints; Supabase client lazy-initialized via `lru_cache`
- `core/config.py` — Pydantic Settings reading `.env`
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `FRONTEND_ORIGIN` in `.env`

## Commit Convention

Structured commits, one per slice/workstream:

```
feat(slice-N/scope): short description
fix(scope): short description
chore: short description
```

Scopes: `ui`, `db`, `api`, `auth`, `calendar`, `map`, `infra`

## Slice Progress

- [x] Slice 0 — Foundation & Scaffolding
- [x] Slice 1 — Database Schema & Seed Data
  - Migration: `backend/migrations/001_initial.sql` — run manually in Supabase SQL Editor
  - Seeds: `python scripts/seed_climate_zones.py && python scripts/seed_crops.py`
  - Homepage UI matches design mockups
- [x] Slice 2 — Auth (Register / Login)
- [x] Slice 3 — Onboarding Quiz
- [x] Slice 4 — Planting Calendar (Algorithm Core)
- [x] Slice 5 — Moon Phases Overlay
- [x] Slice 6 — Nursery Map
  - Seed: `python scripts/seed_nurseries.py` (adds 3 verified test nurseries)
- [x] Slice 7 — B2B Registration + Admin
  - Migration: `backend/migrations/002_add_admin.sql` — run in Supabase SQL Editor
  - Set admin: `UPDATE user_profiles SET is_admin = true WHERE id = '<your-user-id>';`
- [ ] Slice 8 — GDD Cron + Weather
- [ ] Slice 9 — Freemium + WayForPay
- [ ] Slice 10 — Email Alerts (SendPulse)
- [ ] Slice 11 — Polish
