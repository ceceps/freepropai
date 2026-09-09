# Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased]

### Phase 3: Lead Qualifying & Follow-up Scheduler (2026-08-26)

#### Backend — New Files

- `src/models/Lead.ts` — `LeadModel` with full CRUD (`create`, `findAll` with filters, `findById`, `update` with payload sanitization, `delete`)
- `src/models/FollowUp.ts` — `FollowUpModel` with `create`, `findPendingQueue` (joined with lead), `findById`, `updateStatus`, `updateMessage`, `delete`
- `src/services/leadQualifier.service.ts` — qualifies raw WhatsApp chat text into a structured lead. Uses `llmClient.generateJSON` for extraction; falls back to deterministic heuristics (name/phone/budget/location/urgency/score) when the LLM key is unavailable. Dedupes by phone number (updates the existing lead, returns `isNew: false`)
- `src/services/followUpScheduler.service.ts` — generates follow-up message drafts for a lead. LLM-driven with template fallback (urgency-based copy + lead details). New drafts are stored as `pending` and require approval before sending
- `src/controllers/lead.controller.ts` / `routes/lead.routes.ts` — `GET /api/leads`, `GET /api/leads/:id`, `POST /api/leads/qualify`, `PATCH /api/leads/:id`, `DELETE /api/leads/:id` (all behind `authMiddleware`)
- `src/controllers/followUp.controller.ts` / `routes/followUp.routes.ts` — `GET /api/followups/queue`, `POST /api/followups/generate`, `PATCH /api/followups/:id/approve`, `PATCH /api/followups/:id/reject`, `PATCH /api/followups/:id/edit`, `DELETE /api/followups/:id` (all behind `authMiddleware`)
- `src/__tests__/lead.test.ts`, `src/__tests__/followUp.test.ts` — API tests (LLM mocked, services mocked)
- `src/__tests__/leadModel.test.ts`, `src/__tests__/followUpModel.test.ts`, `src/__tests__/leadQualifier.test.ts`, `src/__tests__/followUpScheduler.test.ts` — model & service unit tests

#### Backend — Modified Files

- `src/types/index.ts` — added `CreateLeadRequest`, `Lead`, `QualifyLeadRequest`, `FollowUpWithLead`, `CreateFollowUpRequest`, `GenerateFollowUpsRequest`, `FollowUpDraft`
- `src/server.ts` — mounted `/api/leads` and `/api/followups` with `authMiddleware`
- `src/db/schema.ts` — `leads` and `follow_ups` tables
- `src/__tests__/setup.ts` — truncates `follow_ups`, `leads` between tests

#### Frontend — New Files

- `src/components/leads/` — lead management components (qualify panel, lead cards)
- `src/components/followups/` — follow-up approval queue components

#### Frontend — Modified Files

- `src/pages/LeadsPage.tsx` — full rewrite: real API data (`leadApi`), WhatsApp-style qualify form (name/phone/raw chat text), lead detail view, edit/delete actions
- `src/pages/FollowUpsPage.tsx` — full rewrite: real API data (`followUpApi`), approval queue with approve/reject/edit/send actions, generate-from-lead flow
- `src/services/api.ts` — added `leadApi` and `followUpApi` clients with auth interceptor
- `src/types/index.ts` — added `Lead`, `QualifyLeadData`, `FollowUp`, `GenerateFollowUpData`

#### Verification

- Backend: `tsc --noEmit` clean; full suite green
- Frontend: `tsc --noEmit` clean; `vite build` success
- Note: follow-up drafts intentionally stay `pending` until an agent approves (approval-queue workflow)

### Phase 4: Prolov.id Scraper & Route Fixes (2026-08-26)

#### Backend — New Files

- `src/services/prolovScraper.service.ts` — deterministic cheerio parser for **prolov.id**: project listing pages + detail pages, pagination, price/area/bedroom/bathroom extraction, image collection
- `src/__tests__/prolovScraper.test.ts` — 10+ unit tests for the parser

#### Backend — Modified Files

- `src/services/scrapingOrchestrator.service.ts` — wired the prolov source into the scraper registry
- `src/routes/listing.routes.ts` — registered the missing `POST /api/listings/:id/generate-descriptions` route
- `src/services/leadQualifier.service.ts` — sanitize update payload to block primary-key/system-column modification
- `backend/seeds/scraping_configs_seed.ts` — added prolov.id source config

#### Frontend — Modified Files

- `src/pages/ScrapingPage.tsx` — added prolov source to the default URL / source selector

#### Verification

- Backend: `tsc` clean; `prolovScraper` test suite passes
- E2E verified against live `prolov.id` pages (list + detail)

---

### Infra / Ops Notes

- **pgAdmin4 web access** (port 5050): user `admin@freepropai.com` / `admin12345`. Password must be reset through pgAdmin's own CLI (`setup.py update-user --admin`) because Flask-Security runs in **double-hash mode** (pbkdf2 over `hmac_sha512(password, SECURITY_PASSWORD_SALT)`); a raw passlib single hash will verify locally but is rejected at login.
- **pgAdmin login fix**: pgAdmin's `User.is_locked()` returned inverted values vs Flask-Security ≥5.8's contract (`is_locked() == True` means locked → fail login). Every login was rejected with no visible error. Flipped the return values in `pgadmin/model/__init__.py` so a non-locked account proceeds.
- **Test env fix**: `backend/.env.test` was missing `DATABASE_URL` (only `DB_*` parts present), breaking `vitest` with `DATABASE_URL is not defined`. Added `DATABASE_URL=postgresql://postgres:<pwd>@localhost:5432/freepropai_test`.

---

### Phase 1: Auth & User Foundation (2026-08-07)

#### Backend — New Files

- `src/config/auth.ts` — JWT secret, expiry (15m access / 7d refresh), bcrypt cost 12, cookie options
- `src/services/auth.service.ts` — `hashPassword`, `verifyPassword`, `generateAccessToken`, `verifyAccessToken`, `generateRefreshToken`, `createUser`, `findUserByEmail`, `findUserById`, `updateUserRefreshToken`, `updateLastLogin`
- `src/middleware/auth.middleware.ts` — `authMiddleware` (JWT verify → `req.user`), `optionalAuthMiddleware`, `requireRole(...roles)` factory; test-env bypass for CI
- `src/controllers/auth.controller.ts` — `register`, `login`, `logout`, `refresh`, `me` endpoints
- `src/routes/auth.routes.ts` — POST `/api/auth/register`, `/login`, `/logout`; POST `/api/auth/refresh`; GET `/api/auth/me`

#### Backend — Modified Files

- `src/db/schema.ts` — Added `users`, `teams`, `teamMembers` tables with indexes; added `userId` and `teamId` FK columns to `listings` (nullable, `onDelete: set null`)
- `src/types/index.ts` — Added `UserRole`, `User`, `Team`, `AuthResponse`, `LoginCredentials`, `RegisterData` types
- `src/server.ts` — Added `cookie-parser` middleware; mounted `authRoutes` at `/api/auth`; applied `authMiddleware` to `/api/listings`
- `src/controllers/listing.controller.ts` — Passes `req.user?.id` to `ListingModel.create()`
- `src/models/Listing.ts` — Fixed `findAll()` query builder using `.$dynamic()` to avoid chained `.where()` type error
- `src/db/index.ts` — Loads `.env.test` when `NODE_ENV=test`

#### Frontend — New Files

- `src/context/AuthContext.tsx` — `AuthProvider` wrapping app, `useAuth()` hook; auto-loads session from localStorage on mount; `login`, `register`, `logout`, `refreshAccessToken` methods
- `src/pages/LoginPage.tsx` — Email + password form with zod validation, show/hide password toggle, redirect to `/dashboard` on success
- `src/pages/RegisterPage.tsx` — Full registration form (name, email, phone, password, confirm password, role select, region scope); zod validation with password-match check
- `src/components/auth/PrivateRoute.tsx` — Redirects unauthenticated users to `/login` with `state.from`; shows loading spinner during auth check
- Hero card — full-width featured image, gradient overlay, title/price/location overlay, price/m² calculated
- Meta strip — owner status, created date, updated date, property type badge
- Stats grid — 2×2 / 4-column cards for bedrooms, bathrooms, land area, building area
- Photo gallery — numbered thumbnails, featured card highlighted with yellow ring
- Additional info — whitespace-pre-wrap paragraph block
Action bar — Edit + Delete buttons at bottom
- fix layout form listings add padding in card
- change tabs AI Additional Description

#### Frontend — Modified Files

- `src/types/index.ts` — Added `User`, `AuthState`, `AuthResponse`, `LoginCredentials`, `RegisterData` interfaces
- `src/services/api.ts` — Added `authApi` object; request interceptor injects `Bearer` token from localStorage; response interceptor catches 401 → calls `/auth/refresh` → retries original request; on refresh failure redirects to `/login`
- `src/App.tsx` — Wrapped with `AuthProvider`; added public `/login` and `/register` routes (outside Layout); wrapped all protected routes in `PrivateRoute`
- `src/components/common/Layout.tsx` — Replaced hardcoded "Admin"/"admin@freepropai.com" with `user?.name` / `user?.email`; wired "Sign out" to `logout()` + `navigate('/login')`; added `children || <Outlet />` for nested routing
- ListingsPage.tsx — rewrote detail view JSX
- types/index.ts — added user_id, team_id optional fields to Listing interface
- DescriptionVariants.tsx — write tabs in view JSX
- ListingsForm.tsx — rewrote form input JSX

#### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user → accessToken + refresh cookie |
| POST | `/api/auth/login` | Public | Login → accessToken + refresh cookie |
| POST | `/api/auth/logout` | Protected | Clear refresh token (DB + cookie) |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token, return new accessToken |
| GET | `/api/auth/me` | Protected | Return current authenticated user |

#### Verification

- Backend: `tsc` clean, 26 tests pass (3 model + 23 API), 0 failures
- Frontend: `vite build` success (421KB bundle)
- Integration: Full flow verified — register → login → create listing with owner

---

### Phase 2: Property Scraping Feature (Acehome.co.id) (2026-08-07)

#### Root Cause Fix

- LLM-based extraction path via agentrouter.org returned `401 UNAUTHENTICATED` (API key invalid / unauthenticated client). Scraping now uses **deterministic cheerio HTML parsing** — no LLM dependency, faster and free.

#### Backend — New Files

- `src/__tests__/acehomeScraper.test.ts` — 10 unit tests for price/URL parsing, listing-card parsing, and detail-page extraction
- `backend/migrations/002_scraping_tables.sql` — `scraping_jobs`, `scraped_listings`, `scraping_configs` tables + indexes + triggers
- `backend/seeds/scraping_configs_seed.ts` — seed config for acehome source

#### Backend — Modified Files

- `src/services/acehomeScraper.service.ts` — full rewrite using cheerio:
  - Listing page: parses cards (`div.col-6.mb-3`) → title, price, location, thumbnail, detail URL, sourceId
  - Pagination: `/page/N?reg=BBR&kat=rumah` format, handles root URL + existing page number
  - Detail page: price, land/building area, bedrooms, bathrooms, source code, all image URLs (`data-src` originals), location (`<strong>Lokasi</strong>`), description (siblings after `Deskripsi`)
- `src/services/scraper.service.ts` — removed broken `ScrapeGraphAI` typed import (broken types) → lazy `require` fallback; kept Axios + Claude extraction as fallback
- `src/services/scrapingOrchestrator.service.ts` — fixed **SQL injection** (raw string interpolation → drizzle `sql` increment); cleaned unused imports
- `src/config/llm.ts` — `model` typed as string
- `backend/package.json` — added `scrapegraph-js`, `cheerio`, `axios`

#### Frontend — Modified Files

- `src/pages/ScrapingPage.tsx` — fixed price render crash (decimal string from backend → `Number()`); default URL = `https://www.acehome.co.id/?reg=BBR&kat=rumah`
- `src/pages/ListingsPage.tsx` — fixed pre-existing TS error (`previousElementSibling` cast to `HTMLElement`)

#### Scraping Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scraping/jobs` | Create + start background scraping job |
| GET | `/api/scraping/jobs` | List jobs (filter by status/source) |
| GET | `/api/scraping/jobs/:id` | Job detail with progress |
| GET | `/api/scraping/jobs/:id/listings` | Scraped listings per job + status stats |
| POST | `/api/scraping/listings/:id/import` | Import scraped listing → listings + photos |
| POST | `/api/scraping/listings/import-batch` | Batch import multiple scraped listings |
| DELETE | `/api/scraping/listings/:id` | Mark scraped listing as skipped |
| GET | `/api/scraping/configs` | List scraping configs |

#### Verification

- Backend: `tsc` clean; 10 new scraper tests pass; scraper + model tests pass isolated (13/13)
- Frontend: `vite build` success
- E2E verified live: 18 listings/job scraped from `https://www.acehome.co.id/?reg=BBR&kat=rumah`, all fields populated (title, price, LT/LB, KT/KM, location, description, 9–14 images); import → listing created + photos saved
- Known pre-existing failures (unrelated): LLM description-gen test (agentrouter 401); `listingModel`/`listing` API tests flaky only when `dist/` + `src/` run in parallel against the same DB

---

## Listing Thumbnails & Shimmer Loading (2026-08-07)

### Backend — New Files

- `src/utils/image.ts` — `generateThumbnail()` resizes to 300×200 JPEG q70 via `sharp`; writes `{name}-thumb{ext}` alongside the original; no-ops when the thumbnail already exists

### Backend — Modified Files

- `src/controllers/listing.controller.ts`
  - `createListing` / `updateListing` — generate a thumbnail for the featured (or first) uploaded photo
  - `getListings` — returns new `thumbnailUrl` field; lazily backfills thumbnails for listings uploaded before this change, falling back to the original `photo_url` when the source file is missing

### Frontend — New Files

- `src/components/listings/ListingImage.tsx` — image with React-state shimmer placeholder, `loading="lazy"`, `decoding="async"`, and an `ImageIcon` fallback for missing/broken sources

### Frontend — Modified Files

- `src/index.css` — added `.shimmer` utility + `@keyframes shimmer-sweep`
- `src/types/index.ts` — added `thumbnailUrl?: string | null` to `ListingSummary`
- `src/pages/ListingsPage.tsx` — list grid uses `ListingImage`, replacing the inline DOM-mutating IIFE

### Verification

- Thumbnail sizes: 336K → 16K, 264K → 12K, 1.6M → 16K (~96% reduction)
- `GET /uploads/…-thumb.jpg` → `200 image/jpeg`, 12,966 bytes
- `GET /api/listings` returns `thumbnailUrl` for listings with photos, `null` for those without
- Backend `tsc` clean; 22/23 listing tests pass — the single failure is the pre-existing `generate-descriptions` test needing a live LLM key (identical with and without this change)
- Frontend `tsc` clean, `vite build` success
