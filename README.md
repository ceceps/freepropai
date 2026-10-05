# FreePropAI

AI co-worker for independent Indonesian real estate agents. FreePropAI is the work layer behind the agent — listings, scraped inventory, promotional content, leads, and follow-ups in one place — so agents spend time closing, not doing admin.

It is not a buyer marketplace. Agents own their records, content, and conversations.

---

## What it does

### Auth and workspace

- Register, login, logout, and JWT refresh (15-minute access token, 7-day refresh cookie)
- Forgot password: enter email, receive a one-hour reset link, set a new password
- Roles: `solo_agent`, `team_owner`, `team_agent`
- Protected app routes, automatic token refresh, profile photo upload
- Dark/light theme, mobile-friendly shell

### Listings

- Manual create/edit with photos, featured image, and auto thumbnails
- Origin filter: **All / Mine / Sourced** (`source_url` present = sourced)
- Status: draft, published, sold
- Extra fields from richer sources: certificate, year built, floors, garage, features, nearby places, utilities, market status

### AI listing copy and analysis

- Three description variants from property specs:
  - **Formal** — listing-portal copy (OLX, Rumah123)
  - **Casual 1** — lifestyle Instagram caption
  - **Casual 2** — short urgency copy for Stories / WhatsApp Status
- Buyer-persona / target-market / channel analysis per listing
- Template fallback when the LLM provider is unavailable (`ALLOW_MISSING_LLM=true`)

### Video scripts and storyboards

- Omni Flash scene JSON (`shot_framing_and_motion`, `action`, `audio.dialogue`)
- English JSON `constraints`: keep model/objects/faces; do not rewrite defined voice-over
- Spoken narration forced to English
- Storyboard image generation; skips when `LLM_TOKEN_IMAGE` is empty; reuses a previous PNG if a fresh render fails
- Header bell fires only when storyboard images were produced (`imageCount > 0`)

### Pipeline and scraping

Scraping lives under **Pipeline → Jobs**. `/scraping` redirects to `/pipeline?tab=jobs` and keeps `?job=`.

Sources with deterministic HTML parsers (no LLM required):

- Acehome.co.id
- Hepihos (agent pages and `/project/detail`)
- prolov.id

After a job finishes, **qualifying** rows are auto-upserted into `listings`:

- Market status OPEN
- Title, location, price > 0, at least one photo
- Unique `source_url` (existing URL is linked, not duplicated)

SOLD / Terjual / incomplete rows stay in `scraped_listings` as skipped. Raw scrapes are never dumped wholesale.

Pipeline tabs (when `PIPELINE_DB_*` is set):

| Tab | What you see |
| --- | --- |
| Jobs | Start scrape jobs, progress, auto-import results |
| Scraped Listings | Raw inventory from the pipeline DB |
| Analyses | Listing analyses |
| Promo | Promo content |
| Content Calendar | Calendar items and scheduling |

Jobs still works if the pipeline database is down. Other tabs need `PIPELINE_DB_NAME` or `PIPELINE_DATABASE_URL`. The pipeline DB is treated as **read-only**; targeted writes go through `getPipelineWriteDb()`.

### Leads and follow-ups

- Paste unformatted WhatsApp chat → structured lead (budget, location, type, urgency, bedrooms, bathrooms)
- Score: Hot / Warm / Cold, with AI reasoning (heuristic fallback without LLM)
- Dedupes by phone number
- Follow-up drafts with human-in-the-loop approve / edit / reject / send

### Notifications

Persisted header bell (15s poll):

- Scrape job complete or failed → opens `/pipeline?tab=jobs&job=…`
- Storyboard images ready → opens the listing
- Mark one read or mark all read

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Bun or Node.js 18+ |
| Backend | Express + TypeScript |
| Database | PostgreSQL 14+ + Drizzle ORM |
| LLM | Anthropic SDK (Claude via Agentrouter); image model via `LLM_*_IMAGE` |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Tests | Vitest + Supertest |

Two databases:

- **App DB** (`DB_NAME`, default `freepropai`) — users, listings, leads, follow-ups, scrape jobs, notifications
- **Pipeline DB** (`PIPELINE_DB_NAME`, default `freepropai_db`) — read-only inventory, analyses, promo, calendar

---

## Prerequisites

- Bun 1.0+ or Node.js 18+
- PostgreSQL 14+
- Optional: Agentrouter / Claude key and image-generation token (template fallbacks exist)

---

## Quick start

### 1. App database

```bash
# Create the application database
psql -U postgres -c "CREATE DATABASE freepropai;"
```

Optional pipeline database (Scraped Listings / Analyses / Promo / Calendar tabs):

```bash
# Create the pipeline database
psql -U postgres -c "CREATE DATABASE freepropai_db;"
```

### 2. Backend environment

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env` (never commit real secrets):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freepropai
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/freepropai

PIPELINE_DB_NAME=freepropai_db

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

ANTHROPIC_AUTH_TOKEN=your_token_here
ANTHROPIC_BASE_URL=https://agentrouter.org
ANTHROPIC_MODEL=claude-opus-4-8
ALLOW_MISSING_LLM=true

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

LLM keys belong in this gitignored file. Use placeholders from `.env.example`; do not copy keys from the agent runtime.

### 3. Migrate and seed

```bash
cd backend
bun install
bun run db:migrate
bun run seed
```

### 4. Run

```bash
# From repo root: backend :3001 and frontend :5173
./dev.sh
```

Or two terminals:

```bash
# Backend
cd backend && bun run dev

# Frontend
cd frontend && bun run dev
```

- App: http://localhost:5173
- API: http://localhost:3001/api
- Health: http://localhost:3001/health

Demo login (if seeded): `demo@freepropai.com` / `demo1234`

Vite proxies `/api` to the backend. Pipeline routes require auth (unauthenticated GET returns 401).

---

## Setting up on another machine

Cloning does not copy gitignored data: `backend/.env`, `backend/uploads/`, and PostgreSQL itself.

```bash
git clone git@github.com:ceceps/freepropai.git
git checkout main
```

Copy `.env` and uploads from a configured machine, then either restore a dump:

```bash
# On the source machine
pg_dump -U postgres -h localhost -Fc freepropai > /tmp/freepropai.dump

# On the new machine
createdb -U postgres freepropai
pg_restore -U postgres -h localhost -d freepropai /path/to/freepropai.dump
```

or rebuild schema + seed only:

```bash
cd backend
bun install
bun run db:migrate
bun run seed
```

```bash
bun install --cwd backend
bun install --cwd frontend
./dev.sh
```

`backend/.env.test` is tracked; recreate `freepropai_test` and migrate before running tests.

---

## Tests

```bash
cd backend
bun run test:run
bun run typecheck
```

```bash
cd frontend
npx tsc --noEmit
```

Related suites: `scrapeImportGate`, `skipExistingDb`, `listing`, `hepihosScraper`, `notification`, `videoScriptGenerator`, `passwordReset`.

---

## API overview

Auth required unless noted. Base path `/api`.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |
| POST | `/auth/forgot-password` | Email a reset link (same message if unknown) |
| POST | `/auth/reset-password` | Set a new password with the email token |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Rotate access token |
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update profile |
| POST | `/auth/profile/photo` | Upload profile photo |

### Listings

| Method | Path | Description |
| --- | --- | --- |
| GET | `/listings` | List (`status`, `origin=mine\|sourced`) |
| POST | `/listings` | Create (multipart photos) |
| GET | `/listings/:id` | Detail + photos + descriptions |
| PATCH | `/listings/:id` | Update |
| DELETE | `/listings/:id` | Delete |
| POST | `/listings/:id/generate-descriptions` | AI description variants |
| PATCH | `/listings/:listingId/descriptions/:descId/select` | Select variant |
| POST | `/listings/:id/generate-video-script` | Video script JSON |
| POST | `/listings/:id/generate-storyboard` | Storyboard images |
| GET/POST | `/listings/:id/video-scripts` | List / save scripts |
| POST | `/listings/:id/generate-analysis` | Buyer / channel analysis |
| GET | `/listings/:id/analysis` | Saved analysis |

### Scraping

| Method | Path | Description |
| --- | --- | --- |
| POST | `/scraping/jobs` | Start job (auto-import runs on complete) |
| GET | `/scraping/jobs` | List jobs |
| GET | `/scraping/jobs/:id` | Job + progress |
| GET | `/scraping/jobs/:id/listings` | Scraped rows for a job |
| POST | `/scraping/listings/:id/import` | Manual import |
| POST | `/scraping/listings/import-batch` | Batch import |
| DELETE | `/scraping/listings/:id` | Skip |
| GET | `/scraping/configs` | Source configs |

### Pipeline

| Method | Path | Description |
| --- | --- | --- |
| GET | `/pipeline/overview` | Counts |
| GET | `/pipeline/listings` | Pipeline listings |
| GET | `/pipeline/analyses` | Analyses |
| GET | `/pipeline/promo-content` | Promo items |
| GET | `/pipeline/content-calendar` | Calendar |
| POST | `/pipeline/listings/:id/import` | Import into app listings |

### Leads, follow-ups, notifications, dashboard

| Method | Path | Description |
| --- | --- | --- |
| POST | `/leads/qualify` | Extract + score from chat text |
| GET/PATCH/DELETE | `/leads`, `/leads/:id` | Lead CRUD |
| GET | `/followups/queue` | Approval queue |
| POST | `/followups/generate` | Draft messages |
| PATCH | `/followups/:id/approve\|reject\|edit` | Review drafts |
| GET | `/notifications` | Bell list |
| PATCH | `/notifications/:id/read` | Mark one read |
| PATCH | `/notifications/read-all` | Mark all read |
| GET | `/dashboard/stats` | Dashboard counts |

---

## Repository layout

```
freepropai/
├── backend/
│   ├── drizzle/             # SQL migrations (e.g. notifications)
│   ├── migrations/
│   ├── seeds/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── db/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/        # scrapers, gate, video, notifications
│       └── __tests__/
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/         # auth, theme, notifications
│       ├── pages/           # dashboard, listings, pipeline, leads, follow-ups
│       └── services/
├── clients/freeprop-ai/     # brand and product context
├── PLANNING.md
└── README.md
```

---

## License

MIT. See [LICENSE](LICENSE).
