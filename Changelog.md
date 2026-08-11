# Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased]

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
