# Виросте 🌱

Ukrainian gardening platform — a region-aware planting calendar, a verified nursery map,
and a knowledge base. Built as a decoupled SPA + API.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19 · Vite · TypeScript (strict) · Tailwind v4 · React Router v7 |
| Backend  | Python 3.10 · FastAPI · Supabase (PostgreSQL) client |
| Auth     | Supabase Auth (JWT verified in FastAPI) |
| Maps     | Leaflet / react-leaflet + OpenStreetMap |
| Editor   | TipTap (knowledge-base articles, JSONB content) |

## Features

- **Planting calendar** — frost-anchored sow/transplant/harvest windows per region; GDD progress
  from real weather (Open-Meteo); moon-phase overlay. Users keep multiple calendars (Город / Сад /
  Змішаний), each with its own region + crop varieties.
- **Nursery map** — verified nurseries with photos, videos, tags; resizable detail panel;
  multi-tag filtering; self-registration with a map location picker; admin verification.
- **Knowledge base** — admin-authored wiki (TipTap editor, image uploads), 2-column reading UI
  with search, table of contents, related articles; users bookmark articles to their cabinet.
- **Freemium** — WayForPay subscriptions; GDD email alerts (SendPulse).

## Project structure

```
frontend/   React + Vite SPA
backend/    FastAPI app
  app/          routers (calendar, calendars, nurseries, knowledge, blog, gdd, …)
  core/         Pydantic settings
  migrations/   SQL run manually in the Supabase SQL Editor (001 … 012)
  scripts/      seed_*.py data loaders
```

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET, FRONTEND_ORIGIN
uvicorn main:app --reload   # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                 # http://localhost:5173
```

### Database
Run the migrations in `backend/migrations/` **in order** (001 → 012) in the Supabase SQL Editor,
then seed:
```bash
cd backend
python scripts/seed_climate_zones.py
python scripts/seed_crop_varieties.py
python scripts/seed_nurseries.py
python scripts/seed_knowledge.py
python scripts/seed_blog_posts.py
```

Two **public Storage buckets** are needed for uploads: `article-images` (knowledge base) and
`nursery-photos` (nursery registration).

### Admin access
There is no admin signup. Register a normal user, then in the Supabase SQL Editor:
```sql
UPDATE public.user_profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```
Admin pages: `/admin` (nurseries + blog) and `/admin/knowledge` (wiki editor).

## Commands

**Frontend** (`frontend/`): `npm run dev` · `npm run build` · `npm run lint`
**Backend** (`backend/`): `uvicorn main:app --reload`

## Notes

- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`); enums are disallowed — use
  `as const` objects.
- SQLAlchemy models in `backend/app/models.py` are **schema documentation only** — the runtime
  uses the Supabase client (so Postgres RLS stays in force).
- See `CLAUDE.md` for the full slice-by-slice history and per-migration run notes.
