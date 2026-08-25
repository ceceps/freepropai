# FreeProp AI - API Documentation

Base URL: `/api`

## Authentication

### `POST /api/auth/register`
Register new user.
- **Body**: `{ "email": "user@example.com", "password": "password123", "name": "John Doe" }`

### `POST /api/auth/login`
Authenticate user.
- **Body**: `{ "email": "user@example.com", "password": "password123" }`

---

## Listings Management

### `POST /api/listings`
Create listing with optional photos.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `title`, `location`, `price`, `landArea`, `buildingArea`, `bedrooms`, `bathrooms`, `propertyType`, `additionalInfo`, `photos`

### `GET /api/listings`
Get list of all listings.
- **Query Params**: `status` (optional: `draft`, `published`)

### `GET /api/listings/:id`
Get full listing details including photos and description variants.

### `PATCH /api/listings/:id`
Update listing details or update photos.

### `DELETE /api/listings/:id`
Soft-delete a listing.

### `POST /api/listings/:id/generate-descriptions`
Generate AI marketing descriptions (3 variants: `formal`, `casual_1`, `casual_2`).

### `PATCH /api/listings/:listingId/descriptions/:descId/select`
Select a description variant to feature.

---

## Lead Qualifying System

### `POST /api/leads/qualify`
Extract lead information from raw WhatsApp text using AI, and save lead.
- **Body**: `{ "rawChatText": "Halo, saya Budi cari rumah BSD budget 1.5M", "name": "Budi", "phone": "08123456789" }`
- **Response**: Extracted details including `budgetMin`, `budgetMax`, `urgency`, `score` (Hot/Warm/Cold).

### `GET /api/leads`
Get list of all qualified leads.

### `GET /api/leads/:id`
Get lead details.

### `PATCH /api/leads/:id`
Update lead details (e.g. status, score, notes).

---

## Follow-up Scheduler

### `POST /api/followups/generate`
Generate AI follow-up message for a lead and schedule it.
- **Body**: `{ "leadId": "uuid" }`

### `GET /api/followups/queue`
List pending follow-up queue requiring agent approval.

### `PATCH /api/followups/:id/approve`
Approve scheduled follow-up draft.

### `PATCH /api/followups/:id/reject`
Reject follow-up message draft with optional reason.

### `PATCH /api/followups/:id/edit`
Manually edit follow-up message text before sending.

---

## Property Scraping

### `POST /api/scraping/jobs`
Start scraping job for property portal (e.g., `acehome`).
- **Body**: `{ "sourceUrl": "https://acehome.co.id/listings", "sourceName": "acehome" }`

### `GET /api/scraping/jobs`
List background scraping jobs.

### `GET /api/scraping/jobs/:id/listings`
Get raw scraped listings from a job.

### `POST /api/scraping/listings/:id/import`
Import scraped listing to main database.
