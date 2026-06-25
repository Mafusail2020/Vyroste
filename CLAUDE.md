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
- [x] Slice 8 — GDD Cron + Weather
  - Manual trigger (for testing): POST /api/gdd/run (requires auth)
- [x] Slice 9 — Freemium + WayForPay
  - Set WAYFORPAY_MERCHANT_ACCOUNT, WAYFORPAY_MERCHANT_KEY, WAYFORPAY_MERCHANT_DOMAIN in backend/.env
  - Set BACKEND_ORIGIN=https://your-api.domain in backend/.env (for webhook URL)
- [x] Slice 10 — Email Alerts (SendPulse)
  - Migration: `backend/migrations/003_gdd_alerts.sql` — run in Supabase SQL Editor
  - Set SENDPULSE_SMTP_USER, SENDPULSE_SMTP_PASS, FROM_EMAIL in backend/.env
- [x] Slice 11 — Polish
  - Deploy: `frontend/vercel.json` for SPA routing, `.env.example` files in both apps
  - ErrorBoundary wraps all Layout pages (`src/components/ErrorBoundary.tsx`)
  - Toast notifications via react-hot-toast (replaces inline error divs)
  - Loading skeletons on CalendarPage + MapPage
- [x] Slice 12 — Blog CMS
  - Migration: `backend/migrations/004_blog_posts.sql` — run in Supabase SQL Editor
  - Seed: `python scripts/seed_blog_posts.py`
- [x] Slice 13 — Crop Categories + Varieties (frost-relative offsets)
  - Migration: `backend/migrations/005_crop_categories_varieties.sql`
  - Splits flat `crops` → `crop_categories` (Томат) 1─many `crop_varieties` (Сорт). Variety
    planting dates are stored as integer DAY offsets relative to the region's
    `avg_last_frost_date` — calendar computes real dates per region, no hardcoded months.
  - `growing_method` enum: `seedling` / `direct` / `both`; NULL offset = phase N/A.
  - Seed: `python scripts/seed_crop_varieties.py` (parses `*Календар*.csv`; `--dry-run` to preview).
    Offsets anchored on true agro-zone frost (constants in the script) to match climate_zones.
  - `lib/api.ts` calendar shape stays flat (`CropWindow`); `/api/categories` returns nested
    categories→varieties for the grouped picker. SQLAlchemy models in `app/models.py` are
    schema docs only — runtime stays on the Supabase client (RLS intact).
- [x] Slice 14 — Multiple Calendars + Types
  - Migrations: `006_calendars.sql` (calendars table, owner RLS), `007_drop_legacy_crops.sql`
    (drops `crops` + `user_profiles.selected_crops`; drops stale `gdd_alerts_sent` FK),
    `008_calendar_type.sql` (`calendar_type` horod/sad/mixed),
    `013_calendar_type_kviti.sql` (adds `kviti`; flowers split out of `sad`).
  - Each calendar owns its own `region_id` + `selected_varieties` + `calendar_type`.
    Type gates which crop kinds can be added: horod→vegetable/herb, sad→berry/tree,
    kviti→flower, mixed→all (enforced in `app/calendars.py` add-variety + frontend picker filter).
  - Endpoints: `GET/POST/PATCH/DELETE /api/calendars`, `.../varieties/{id}`,
    `GET .../windows` (flat CropWindow[]). `/api/gdd/me?calendar_id=` keyed by variety id.
  - UI: right-side calendar panel in `CalendarPage.tsx` (switch/create/inline-rename/region+type
    edit); grouped category→variety picker in Onboarding + AddCrop.
- [x] Slice 15 — Nursery Media + Tags (map detail panel)
  - Migration: `backend/migrations/009_nursery_media_tags.sql` (photos/videos/tags/admin_tags
    TEXT[] + GIN tag index)
  - Owner sets tags/photos/videos on create or PATCH; `admin_tags` are moderator-only
    (`PATCH /api/nurseries/{id}/admin-tags`, is_admin checked). List filter `?tag=`.
  - `MapPage.tsx`: left list + map + right detail panel that slides in on marker click
    (photos, videos, tags/admin badges, contacts, route); hidden until a marker is selected.
- [x] Slice 16 — Персональний кабінет
  - Migrations: `backend/migrations/010_saved_articles.sql` (saved_articles, owner RLS;
    article_id is a plain uuid — Knowledge Base ships later),
    `014_user_profile_avatar_name.sql` (`display_name` + `avatar_url` on user_profiles).
  - **Supabase Storage**: create a public bucket `avatars` (profile uploads land there).
  - `PATCH /api/users/me` (region/plot_type/display_name/avatar_url);
    `POST /api/users/me/avatar` (image → Storage); `GET/POST/DELETE /api/users/me/saved-articles`
  - `CabinetPage.tsx` at `/cabinet` (nav link «Кабінет»): Налаштування + Збережені статті tabs.
    Settings top «Профіль» card: avatar picker + Імʼя; «Зберегти зміни» → inline
    «Ви впевнені?» Так/Ні confirm, server update only on Так.
- [x] Slice 17 — Knowledge Base (База знань)
  - Migration: `backend/migrations/011_knowledge_base.sql` (kb_categories, kb_articles; article
    `content` is a TipTap doc in JSONB; public read where published).
  - **Supabase Storage**: create a public bucket `article-images` (admin image uploads land there).
  - Seed: `python scripts/seed_knowledge.py` (4 categories + sample articles, idempotent).
  - Backend `app/knowledge.py` (mirrors `blog.py`): public list/get/view + related; admin CRUD
    (`require_admin`) for articles + categories; `POST /api/knowledge/upload` (image → Storage);
    `reading_minutes` auto-computed from content; UA-transliterated slugs.
  - Frontend: TipTap v3 editor (`components/TipTapEditor.tsx`, `lib/tiptap.ts` shared
    extensions + `renderArticleHtml`/`extractToc`). Admin editor `AdminKnowledgePage.tsx`
    (`/admin/knowledge`). Reading UI: `KnowledgePage.tsx` (`/knowledge`, 2-col list + sidebar) +
    `ArticlePage.tsx` (`/knowledge/:slug`, content left; sidebar search/categories + auto TOC +
    related right; views, reading time, tags, bookmark).
  - Bookmarks: `BookmarkButton.tsx` → `saved-articles`; cabinet Saved tab resolves real
    titles/links (users.py merges kb_articles meta — no FK, Python join).
  - `.prose-article` CSS in `src/index.css` styles both the editor and the reading view.
  - Migration `012_kb_category_meta.sql`: kb_categories `description` + `subcategories[]`.
    `/knowledge` landing is a category grid (count badge + description + subtopic links per
    card); selecting a category/search switches to the article-list + sidebar view.
- [x] Slice 18 — Nursery Reviews (moderated) + helpful votes
  - Migration: `backend/migrations/015_nursery_reviews.sql` (nursery_reviews + nursery_review_votes,
    owner/admin RLS; one review per user per nursery; status pending/approved/rejected).
  - `app/reviews.py`: `GET/POST /api/nurseries/{id}/reviews` (approved + caller's vote; submit →
    pending, snapshots profile name+avatar), `POST /api/reviews/{id}/vote` (recomputes likes),
    admin `GET /api/admin/reviews` + `PATCH /api/admin/reviews/{id}` (approve/reject).
  - `/api/nurseries` list now includes `review_count` + `avg_rating` (approved). MapPage cards +
    `NurseryDetailOverlay` show real rating/count; overlay form posts from the account
    (avatar + display_name), votes hit the API. Admin moderation UI still TODO (approve via
    `/api/admin/reviews` or SQL for now).
