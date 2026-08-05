# AI Co-worker untuk Agen Properti - Planning Document

**Hackathon:** AI Builders Challenge with IBM Bob  
**Kategori:** Wildcard - Intelligent Systems for the Future of Work  
**Target User:** Agen properti freelance yang handle lead via WhatsApp

---

## CURRENT IMPLEMENTATION STATUS

### ✅ Completed Features

1. **Listing Management System**
   - Create listings with manual input
   - Upload multiple photos per listing
   - Generate AI-powered descriptions (3 variants: formal, casual_1, casual_2)
   - View and manage listings
   - Select preferred description variant

2. **Database Infrastructure**
   - PostgreSQL with Drizzle ORM
   - Schema for listings, listing_photos, listing_descriptions
   - Migration system in place

3. **Backend API**
   - Express.js server with TypeScript
   - File upload handling with Multer
   - LLM integration via Anthropic Claude API
   - RESTful API endpoints for listings

4. **Frontend Application**
   - React with TypeScript and Vite
   - Tailwind CSS for styling
   - Listing form with photo upload
   - Description variants display
   - Dashboard and listings pages

### 🚧 Pending Features (From Original Plan)

1. **Lead Qualifying System** - Not yet implemented
2. **Follow-up Scheduler** - Not yet implemented
3. **WhatsApp Chat Mock** - Not yet implemented

---

## 1. DATABASE SCHEMA (PostgreSQL)

### Existing Tables

#### `listings`
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  land_area DECIMAL(10,2),
  building_area DECIMAL(10,2),
  location VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  bedrooms INT,
  bathrooms INT,
  property_type VARCHAR(100),
  additional_info TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `listing_photos`
```sql
CREATE TABLE listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  photo_order INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `listing_descriptions`
```sql
CREATE TABLE listing_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  variant_type VARCHAR(50) CHECK (variant_type IN ('formal', 'casual_1', 'casual_2')),
  description_text TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🆕 NEW: Tables for Scraping Feature

#### `scraping_jobs`
Menyimpan history dan status scraping jobs.

```sql
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url VARCHAR(500) NOT NULL,
  source_name VARCHAR(100) NOT NULL, -- 'acehome', 'rumah123', dll
  status VARCHAR(50) CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  total_listings_found INT DEFAULT 0,
  total_listings_imported INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_source ON scraping_jobs(source_name);
CREATE INDEX idx_scraping_jobs_created ON scraping_jobs(created_at DESC);
```

#### `scraped_listings`
Menyimpan raw data hasil scraping sebelum di-import ke listings.

```sql
CREATE TABLE scraped_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  source_url VARCHAR(500) NOT NULL,
  source_id VARCHAR(255), -- ID dari website sumber
  title VARCHAR(255) NOT NULL,
  land_area DECIMAL(10,2),
  building_area DECIMAL(10,2),
  location VARCHAR(255),
  price DECIMAL(15,2),
  bedrooms INT,
  bathrooms INT,
  property_type VARCHAR(100),
  description TEXT,
  image_urls TEXT[], -- Array of image URLs
  contact_info JSONB, -- {name, phone, whatsapp, etc}
  raw_data JSONB, -- Full scraped data for reference
  import_status VARCHAR(50) CHECK (import_status IN ('pending', 'imported', 'skipped', 'failed')) DEFAULT 'pending',
  imported_listing_id UUID REFERENCES listings(id),
  imported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraped_listings_job ON scraped_listings(scraping_job_id);
CREATE INDEX idx_scraped_listings_import_status ON scraped_listings(import_status);
CREATE INDEX idx_scraped_listings_source_id ON scraped_listings(source_id);
```

#### `scraping_configs`
Menyimpan konfigurasi scraping untuk berbagai website.

```sql
CREATE TABLE scraping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL UNIQUE,
  base_url VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  scraping_prompt TEXT NOT NULL, -- Prompt untuk scrapegraph-js
  field_mappings JSONB NOT NULL, -- Mapping field dari scraped data ke schema kita
  rate_limit_delay INT DEFAULT 2000, -- Delay antar request (ms)
  max_pages INT DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraping_configs_source ON scraping_configs(source_name);
CREATE INDEX idx_scraping_configs_active ON scraping_configs(is_active);
```

### Planned Tables (Not Yet Implemented)

#### `leads`
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  location VARCHAR(255),
  unit_type VARCHAR(100),
  urgency VARCHAR(20) CHECK (urgency IN ('immediate', 'soon', 'flexible')),
  score VARCHAR(10) CHECK (score IN ('Hot', 'Warm', 'Cold')),
  raw_chat_text TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `follow_ups`
```sql
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_draft TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'sent')) DEFAULT 'pending',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  sent_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. STRUKTUR FOLDER PROJECT

```
freepropai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # ✅ PostgreSQL connection config
│   │   │   └── llm.ts                # ✅ Claude API config
│   │   ├── models/
│   │   │   ├── Listing.ts            # ✅ Implemented
│   │   │   ├── 🆕 ScrapingJob.ts     # NEW: Scraping job model
│   │   │   ├── 🆕 ScrapedListing.ts  # NEW: Scraped listing model
│   │   │   ├── Lead.ts               # 🚧 Planned
│   │   │   └── FollowUp.ts           # 🚧 Planned
│   │   ├── services/
│   │   │   ├── descriptionGenerator.service.ts  # ✅ Implemented
│   │   │   ├── 🆕 scraper.service.ts            # NEW: Core scraping logic
│   │   │   ├── 🆕 acehomeScraper.service.ts     # NEW: Acehome-specific scraper
│   │   │   ├── 🆕 scrapingOrchestrator.service.ts # NEW: Job management
│   │   │   ├── leadQualifier.service.ts         # 🚧 Planned
│   │   │   └── followUpScheduler.service.ts     # 🚧 Planned
│   │   ├── controllers/
│   │   │   ├── listing.controller.ts  # ✅ Implemented
│   │   │   ├── 🆕 scraping.controller.ts # NEW: Scraping endpoints
│   │   │   ├── lead.controller.ts     # 🚧 Planned
│   │   │   └── followUp.controller.ts # 🚧 Planned
│   │   ├── routes/
│   │   │   ├── listing.routes.ts      # ✅ Implemented
│   │   │   ├── 🆕 scraping.routes.ts  # NEW: Scraping routes
│   │   │   ├── lead.routes.ts         # 🚧 Planned
│   │   │   └── followUp.routes.ts     # 🚧 Planned
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts        # ✅ Implemented
│   │   │   └── upload.ts              # ✅ Implemented
│   │   ├── utils/
│   │   │   ├── llmClient.ts           # ✅ Implemented
│   │   │   └── 🆕 imageDownloader.ts  # NEW: Download images from URLs
│   │   ├── types/
│   │   │   └── index.ts               # ✅ Implemented
│   │   └── server.ts                  # ✅ Implemented
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     # ✅ Implemented
│   │   └── 🆕 002_scraping_tables.sql # NEW: Scraping tables migration
│   ├── seeds/
│   │   ├── seed.ts                    # ✅ Implemented
│   │   └── 🆕 scraping_configs_seed.ts # NEW: Seed scraping configs
│   ├── package.json                   # ✅ Implemented
│   ├── tsconfig.json                  # ✅ Implemented
│   └── .env.example                   # ✅ Implemented
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                # ✅ Implemented
│   │   │   ├── listings/
│   │   │   │   ├── ListingForm.tsx    # ✅ Implemented
│   │   │   │   ├── DescriptionVariants.tsx # ✅ Implemented
│   │   │   │   └── 🆕 ScrapingPanel.tsx    # NEW: Scraping UI
│   │   │   ├── 🆕 scraping/
│   │   │   │   ├── ScrapingJobCard.tsx     # NEW: Job status card
│   │   │   │   ├── ScrapedListingCard.tsx  # NEW: Preview scraped data
│   │   │   │   └── ImportReviewModal.tsx   # NEW: Review before import
│   │   │   ├── leads/                 # 🚧 Planned
│   │   │   └── followups/             # 🚧 Planned
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # ✅ Implemented
│   │   │   ├── ListingsPage.tsx       # ✅ Implemented
│   │   │   ├── 🆕 ScrapingPage.tsx    # NEW: Scraping management page
│   │   │   ├── LeadsPage.tsx          # 🚧 Planned
│   │   │   └── FollowUpsPage.tsx      # 🚧 Planned
│   │   ├── services/
│   │   │   └── api.ts                 # ✅ Implemented
│   │   ├── hooks/
│   │   │   ├── useListings.ts         # ✅ Implemented
│   │   │   └── 🆕 useScraping.ts      # NEW: Scraping hooks
│   │   ├── types/
│   │   │   └── index.ts               # ✅ Implemented
│   │   ├── utils/
│   │   │   └── formatters.ts          # ✅ Implemented
│   │   ├── App.tsx                    # ✅ Implemented
│   │   ├── main.tsx                   # ✅ Implemented
│   │   └── index.css                  # ✅ Implemented
│   ├── package.json                   # ✅ Implemented
│   ├── tsconfig.json                  # ✅ Implemented
│   └── vite.config.ts                 # ✅ Implemented
│
├── docs/
│   ├── API.md                         # 🚧 To be updated
│   └── DEMO_SCRIPT.md                 # 🚧 To be updated
│
├── .gitignore                         # ✅ Implemented
├── README.md                          # ✅ Implemented
└── PLANNING.md                        # ✅ This document
```

---

## 3. 🆕 NEW FEATURE: Property Scraping with ScrapeGraph-JS

### Overview

Fitur scraping memungkinkan agen properti untuk:
1. **Otomatis mengambil listing** dari website properti (acehome.com)
2. **AI-powered extraction** menggunakan scrapegraph-js + LLM
3. **Review sebelum import** - agen bisa review dan pilih listing mana yang mau di-import
4. **Batch import** - import multiple listings sekaligus
5. **Track scraping history** - lihat history scraping jobs dan hasilnya

### Technology Stack

- **scrapegraph-js**: AI-powered web scraping library
- **Anthropic Claude**: LLM untuk intelligent data extraction
- **PostgreSQL**: Store scraping jobs, scraped data, dan configs
- **Express.js**: API endpoints untuk scraping operations

### How It Works

```mermaid
graph TD
    A[User Input: URL acehome.com] --> B[Create Scraping Job]
    B --> C[ScrapeGraph-JS + Claude]
    C --> D[Extract Property Data]
    D --> E[Store in scraped_listings]
    E --> F[User Reviews Data]
    F --> G{Import Decision}
    G -->|Import| H[Create Listing + Photos]
    G -->|Skip| I[Mark as Skipped]
    H --> J[Generate Descriptions]
    J --> K[Ready for Marketing]
```

### ScrapeGraph-JS Integration

**Installation:**
```bash
npm install scrapegraph-js
```

**Basic Usage:**
```typescript
import { ScrapeGraphAI } from 'scrapegraph-js';

const scraper = new ScrapeGraphAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

const result = await scraper.scrape({
  url: 'https://acehome.com/listings',
  prompt: `Extract all property listings with: title, price, location, 
           land area, building area, bedrooms, bathrooms, images, 
           and contact info. Return as JSON array.`
});
```

---

## 4. API ENDPOINTS

### A. Existing Listing Endpoints (✅ Implemented)

#### `POST /api/listings`
Create listing dengan input manual + photo upload.

#### `POST /api/listings/:id/generate-descriptions`
Generate 3 varian deskripsi untuk listing.

#### `GET /api/listings`
List semua listings dengan filter.

#### `GET /api/listings/:id`
Detail listing dengan descriptions dan photos.

#### `PATCH /api/listings/:listingId/descriptions/:descId/select`
Pilih varian deskripsi untuk digunakan.

---

### B. 🆕 NEW: Scraping Endpoints

#### `POST /api/scraping/jobs`
**Deskripsi:** Start new scraping job untuk acehome.com.

**Request Body:**
```json
{
  "sourceUrl": "https://acehome.com/properti-dijual",
  "sourceName": "acehome",
  "maxPages": 5,
  "filters": {
    "location": "Banda Aceh",
    "propertyType": "rumah",
    "priceMin": 500000000,
    "priceMax": 2000000000
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "status": "pending",
    "sourceUrl": "https://acehome.com/properti-dijual",
    "sourceName": "acehome",
    "createdAt": "2026-08-05T01:00:00Z",
    "message": "Scraping job created. Processing will start shortly."
  }
}
```

#### `GET /api/scraping/jobs`
**Deskripsi:** List semua scraping jobs dengan status.

**Query Params:**
- `status` (optional): pending | running | completed | failed
- `sourceName` (optional): acehome | rumah123 | etc
- `limit` (optional): default 20
- `offset` (optional): for pagination

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceUrl": "https://acehome.com/properti-dijual",
      "sourceName": "acehome",
      "status": "completed",
      "totalListingsFound": 45,
      "totalListingsImported": 12,
      "startedAt": "2026-08-05T01:00:00Z",
      "completedAt": "2026-08-05T01:15:00Z",
      "createdAt": "2026-08-05T01:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

#### `GET /api/scraping/jobs/:id`
**Deskripsi:** Detail scraping job dengan progress.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sourceUrl": "https://acehome.com/properti-dijual",
    "sourceName": "acehome",
    "status": "running",
    "totalListingsFound": 45,
    "totalListingsImported": 0,
    "startedAt": "2026-08-05T01:00:00Z",
    "completedAt": null,
    "errorMessage": null,
    "progress": {
      "currentPage": 3,
      "totalPages": 5,
      "percentage": 60
    }
  }
}
```

#### `GET /api/scraping/jobs/:id/listings`
**Deskripsi:** List scraped listings dari job tertentu.

**Query Params:**
- `importStatus` (optional): pending | imported | skipped | failed

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "scrapingJobId": "job-uuid",
      "sourceUrl": "https://acehome.com/listing/12345",
      "sourceId": "12345",
      "title": "Rumah Minimalis 2 Lantai di Banda Aceh",
      "landArea": 120,
      "buildingArea": 90,
      "location": "Banda Aceh, Aceh",
      "price": 1200000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "propertyType": "rumah",
      "description": "Rumah minimalis modern...",
      "imageUrls": [
        "https://acehome.com/images/listing1.jpg",
        "https://acehome.com/images/listing2.jpg"
      ],
      "contactInfo": {
        "name": "Agen Properti",
        "phone": "+62812345678",
        "whatsapp": "+62812345678"
      },
      "importStatus": "pending",
      "createdAt": "2026-08-05T01:05:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "pending": 33,
    "imported": 12,
    "skipped": 0,
    "failed": 0
  }
}
```

#### `POST /api/scraping/listings/:id/import`
**Deskripsi:** Import single scraped listing ke listings table.

**Request Body:**
```json
{
  "downloadImages": true,
  "generateDescriptions": true,
  "additionalInfo": "Listing dari acehome.com"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "scrapedListingId": "uuid",
    "listingId": "new-listing-uuid",
    "importedAt": "2026-08-05T01:10:00Z",
    "imagesDownloaded": 3,
    "descriptionsGenerated": true
  }
}
```

#### `POST /api/scraping/listings/import-batch`
**Deskripsi:** Import multiple scraped listings sekaligus.

**Request Body:**
```json
{
  "scrapedListingIds": ["uuid1", "uuid2", "uuid3"],
  "downloadImages": true,
  "generateDescriptions": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "totalRequested": 3,
    "successfulImports": 3,
    "failedImports": 0,
    "results": [
      {
        "scrapedListingId": "uuid1",
        "listingId": "new-uuid1",
        "status": "success"
      },
      {
        "scrapedListingId": "uuid2",
        "listingId": "new-uuid2",
        "status": "success"
      },
      {
        "scrapedListingId": "uuid3",
        "listingId": "new-uuid3",
        "status": "success"
      }
    ]
  }
}
```

#### `DELETE /api/scraping/listings/:id`
**Deskripsi:** Delete scraped listing (mark as skipped).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Scraped listing marked as skipped"
}
```

#### `GET /api/scraping/configs`
**Deskripsi:** List scraping configurations untuk berbagai website.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceName": "acehome",
      "baseUrl": "https://acehome.com",
      "isActive": true,
      "maxPages": 10,
      "rateLimitDelay": 2000,
      "notes": "Scraping config for acehome.com"
    }
  ]
}
```

#### `POST /api/scraping/configs`
**Deskripsi:** Create new scraping config (admin only).

**Request Body:**
```json
{
  "sourceName": "rumah123",
  "baseUrl": "https://www.rumah123.com",
  "scrapingPrompt": "Extract property listings...",
  "fieldMappings": {
    "title": "propertyTitle",
    "price": "listingPrice",
    "location": "propertyLocation"
  },
  "rateLimitDelay": 3000,
  "maxPages": 5
}
```

---

### C. Planned Endpoints (🚧 Not Yet Implemented)

#### Lead Qualifying Endpoints
- `POST /api/leads/qualify`
- `GET /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`

#### Follow-up Scheduler Endpoints
- `POST /api/followups/generate`
- `GET /api/followups/queue`
- `PATCH /api/followups/:id/approve`
- `PATCH /api/followups/:id/reject`
- `PATCH /api/followups/:id/edit`

---

## 5. SCRAPING IMPLEMENTATION DETAILS

### A. Scraper Service Architecture

```typescript
// src/services/scraper.service.ts
export class ScraperService {
  private scrapeGraphAI: ScrapeGraphAI;
  
  constructor() {
    this.scrapeGraphAI = new ScrapeGraphAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022'
    });
  }
  
  async scrapeUrl(url: string, prompt: string): Promise<any> {
    // Core scraping logic using scrapegraph-js
  }
  
  async extractPropertyData(html: string): Promise<PropertyData[]> {
    // Extract structured data from HTML
  }
}
```

### B. Acehome-Specific Scraper

```typescript
// src/services/acehomeScraper.service.ts
export class AcehomeScraperService {
  private scraperService: ScraperService;
  
  async scrapeListings(options: ScrapeOptions): Promise<ScrapedListing[]> {
    // Acehome-specific scraping logic
    // Handle pagination
    // Extract property details
    // Download images
  }
  
  async scrapeListingDetail(url: string): Promise<ScrapedListing> {
    // Scrape individual listing page for full details
  }
  
  private buildScrapingPrompt(filters?: any): string {
    return `
      Extract all property listings from this page with the following information:
      - Title (judul properti)
      - Price (harga dalam Rupiah)
      - Location (lokasi lengkap)
      - Land area (luas tanah dalam m²)
      - Building area (luas bangunan dalam m²)
      - Number of bedrooms (jumlah kamar tidur)
      - Number of bathrooms (jumlah kamar mandi)
      - Property type (tipe properti: rumah, apartemen, ruko, dll)
      - Description (deskripsi properti)
      - Image URLs (array of image URLs)
      - Contact information (nama, nomor telepon, WhatsApp)
      - Listing URL (link ke detail listing)
      
      Return as JSON array with this structure:
      [
        {
          "title": "string",
          "price": number,
          "location": "string",
          "landArea": number,
          "buildingArea": number,
          "bedrooms": number,
          "bathrooms": number,
          "propertyType": "string",
          "description": "string",
          "imageUrls": ["string"],
          "contactInfo": {
            "name": "string",
            "phone": "string",
            "whatsapp": "string"
          },
          "listingUrl": "string"
        }
      ]
    `;
  }
}
```

### C. Scraping Orchestrator

```typescript
// src/services/scrapingOrchestrator.service.ts
export class ScrapingOrchestratorService {
  async createJob(options: CreateJobOptions): Promise<ScrapingJob> {
    // Create scraping job in database
    // Start background processing
  }
  
  async processJob(jobId: string): Promise<void> {
    // Update job status to 'running'
    // Call appropriate scraper based on source
    // Store scraped listings
    // Update job with results
    // Handle errors
  }
  
  async importScrapedListing(
    scrapedListingId: string, 
    options: ImportOptions
  ): Promise<Listing> {
    // Download images if requested
    // Create listing in database
    // Create listing_photos records
    // Generate descriptions if requested
    // Update scraped_listing status
  }
  
  async batchImport(
    scrapedListingIds: string[], 
    options: ImportOptions
  ): Promise<BatchImportResult> {
    // Import multiple listings in parallel
    // Track success/failure for each
  }
}
```

### D. Image Downloader Utility

```typescript
// src/utils/imageDownloader.ts
export class ImageDownloader {
  async downloadImage(url: string, listingId: string): Promise<string> {
    // Download image from URL
    // Save to uploads folder
    // Return local file path
  }
  
  async downloadMultiple(urls: string[], listingId: string): Promise<string[]> {
    // Download multiple images in parallel
    // Handle failures gracefully
  }
}
```

---

## 6. FRONTEND IMPLEMENTATION

### A. Scraping Page

```typescript
// src/pages/ScrapingPage.tsx
export function ScrapingPage() {
  return (
    <div>
      <ScrapingPanel />
      <ScrapingJobsList />
      <ScrapedListingsGrid />
    </div>
  );
}
```

### B. Scraping Panel Component

```typescript
// src/components/scraping/ScrapingPanel.tsx
export function ScrapingPanel() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(5);
  
  const handleStartScraping = async () => {
    // Call POST /api/scraping/jobs
    // Show loading state
    // Redirect to job detail or refresh list
  };
  
  return (
    <Card>
      <h2>Start New Scraping Job</h2>
      <input 
        type="url" 
        placeholder="https://acehome.com/properti-dijual"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <input 
        type="number" 
        placeholder="Max pages"
        value={maxPages}
        onChange={(e) => setMaxPages(Number(e.target.value))}
      />
      <button onClick={handleStartScraping}>
        Start Scraping
      </button>
    </Card>
  );
}
```

### C. Scraped Listing Card

```typescript
// src/components/scraping/ScrapedListingCard.tsx
export function ScrapedListingCard({ listing }: Props) {
  const handleImport = async () => {
    // Call POST /api/scraping/listings/:id/import
  };
  
  const handleSkip = async () => {
    // Call DELETE /api/scraping/listings/:id
  };
  
  return (
    <Card>
      <img src={listing.imageUrls[0]} alt={listing.title} />
      <h3>{listing.title}</h3>
      <p>{listing.location}</p>
      <p>Rp {formatPrice(listing.price)}</p>
      <p>LT: {listing.landArea}m² | LB: {listing.buildingArea}m²</p>
      <p>{listing.bedrooms} KT | {listing.bathrooms} KM</p>
      
      <div className="actions">
        <button onClick={handleImport}>Import</button>
        <button onClick={handleSkip}>Skip</button>
      </div>
    </Card>
  );
}
```

### D. Import Review Modal

```typescript
// src/components/scraping/ImportReviewModal.tsx
export function ImportReviewModal({ scrapedListing, onClose }: Props) {
  const [downloadImages, setDownloadImages] = useState(true);
  const [generateDescriptions, setGenerateDescriptions] = useState(true);
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  const handleConfirmImport = async () => {
    // Call import API with options
    // Show success message
    // Close modal
  };
  
  return (
    <Modal>
      <h2>Review Before Import</h2>
      <ListingPreview listing={scrapedListing} />
      
      <label>
        <input 
          type="checkbox" 
          checked={downloadImages}
          onChange={(e) => setDownloadImages(e.target.checked)}
        />
        Download images to local storage
      </label>
      
      <label>
        <input 
          type="checkbox" 
          checked={generateDescriptions}
          onChange={(e) => setGenerateDescriptions(e.target.checked)}
        />
        Generate AI descriptions after import
      </label>
      
      <textarea 
        placeholder="Additional info (optional)"
        value={additionalInfo}
        onChange={(e) => setAdditionalInfo(e.target.value)}
      />
      
      <button onClick={handleConfirmImport}>Confirm Import</button>
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
}
```

---

## 7. BUILD ORDER (Updated)

### Phase 1: ✅ Listing Generator (COMPLETED)
- Setup project structure
- Database schema & migrations
- Listing CRUD endpoints
- Description generation with LLM
- Frontend listing form & display
- Photo upload functionality

### Phase 2: 🆕 Property Scraping Feature (NEXT)
**Estimasi: 3-4 hari**

#### Day 1: Backend Foundation
1. Install scrapegraph-js dependency
2. Create database migration for scraping tables
3. Implement ScraperService (core scraping logic)
4. Implement AcehomeScraperService (acehome-specific)
5. Test scraping with sample URLs

#### Day 2: Scraping Orchestration
1. Implement ScrapingOrchestratorService
2. Create scraping job management endpoints
3. Implement background job processing
4. Add image downloader utility
5. Test end-to-end scraping flow

#### Day 3: Import & Integration
1. Implement import endpoints (single & batch)
2. Connect scraped data to listings table
3. Auto-generate descriptions for imported listings
4. Add error handling & retry logic
5. Test import workflow

#### Day 4: Frontend UI
1. Create ScrapingPage component
2. Build ScrapingPanel (start job UI)
3. Build ScrapedListingCard (preview & actions)
4. Build ImportReviewModal
5. Add scraping to navigation
6. Test full user flow

### Phase 3: 🚧 Lead Qualifying (PLANNED)
**Estimasi: 2 hari**
- Lead endpoints & LLM integration
- WhatsApp chat mock UI
- Lead scoring & display

### Phase 4: 🚧 Follow-up Scheduler (PLANNED)
**Estimasi: 2-3 hari**
- Rule engine implementation
- Follow-up generation with LLM
- Approval queue UI
- Timeline visualization

### Phase 5: 🚧 Integration & Polish (PLANNED)
**Estimasi: 1-2 hari**
- Dashboard with metrics
- Seed comprehensive mock data
- Error handling & loading states
- Responsive design
- Demo script & documentation

---

## 8. TECHNICAL CONSIDERATIONS

### A. Scraping Best Practices

1. **Rate Limiting**
   - Add delay between requests (2-3 seconds)
   - Respect robots.txt
   - Use configurable rate limits per source

2. **Error Handling**
   - Retry failed requests (max 3 attempts)
   - Log errors for debugging
   - Continue scraping even if some listings fail

3. **Data Validation**
   - Validate scraped data before storing
   - Handle missing fields gracefully
   - Normalize price formats (remove currency symbols, convert to number)

4. **Image Handling**
   - Download images asynchronously
   - Compress images to reduce storage
   - Generate thumbnails for faster loading
   - Handle broken image URLs

5. **Performance**
   - Use background jobs for scraping (don't block API response)
   - Implement pagination for large result sets
   - Cache scraping configs
   - Use database indexes for queries

### B. Security Considerations

1. **Input Validation**
   - Validate URLs before scraping
   - Sanitize scraped data before storing
   - Prevent SQL injection in queries

2. **Access Control**
   - Limit scraping to authorized users
   - Rate limit API endpoints
   - Monitor for abuse

3. **Data Privacy**
   - Don't store sensitive contact info unnecessarily
   - Comply with website terms of service
   - Add option to delete scraped data

### C. Scalability

1. **Background Processing**
   - Use job queue (e.g., Bull, BullMQ) for production
   - Process multiple jobs in parallel
   - Implement job prioritization

2. **Database Optimization**
   - Add indexes on frequently queried fields
   - Archive old scraping jobs
   - Implement pagination for large datasets

3. **Caching**
   - Cache scraping configs
   - Cache frequently accessed listings
   - Use Redis for session management (future)

---

## 9. ENVIRONMENT VARIABLES

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/freepropai

# LLM API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server
PORT=3001
NODE_ENV=development

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Scraping
SCRAPING_RATE_LIMIT=2000
SCRAPING_MAX_RETRIES=3
SCRAPING_TIMEOUT=30000
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001/api
```

---

## 10. DEPENDENCIES TO ADD

### Backend

```json
{
  "dependencies": {
    "scrapegraph-js": "^1.0.0",
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12",
    "sharp": "^0.33.0"
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "react-query": "^3.39.3",
    "date-fns": "^2.30.0"
  }
}
```

---

## 11. DEMO SCRIPT (Updated)

### Demo Flow

1. **Introduction** (1 min)
   - Problem: Agen properti overwhelmed dengan manual tasks
   - Solution: AI co-worker untuk automate repetitive work

2. **Feature 1: Property Scraping** (3 min)
   - Show scraping panel
   - Input acehome.com URL
   - Start scraping job
   - Show real-time progress
   - Review scraped listings
   - Import selected listings
   - Show imported listings with photos

3. **Feature 2: AI Description Generator** (2 min)
   - Select imported listing
   - Generate 3 description variants
   - Show formal vs casual styles
   - Select preferred variant
   - Copy to clipboard

4. **Feature 3: Lead Qualifying** (2 min) - If implemented
   - Input mock WhatsApp chat
   - Show AI extraction
   - Display lead score (Hot/Warm/Cold)
   - Show reasoning

5. **Feature 4: Follow-up Scheduler** (2 min) - If implemented
   - Show approval queue
   - Review generated follow-ups
   - Approve/reject/edit
   - Show timeline

6. **Conclusion** (1 min)
   - Time savings calculation
   - Future roadmap
   - Q&A

---

## 12. SUCCESS METRICS

### For Hackathon Demo

1. **Scraping Performance**
   - Successfully scrape 20+ listings from acehome.com
   - Extract all required fields (title, price, location, etc.)
   - Download and store images
   - Complete scraping in < 2 minutes

2. **Import Accuracy**
   - 100% successful imports (no data loss)
   - Images properly downloaded and linked
   - Descriptions auto-generated for imported listings

3. **User Experience**
   - Clear visual feedback during scraping
   - Easy review and selection process
   - One-click import functionality
   - Responsive UI on desktop and mobile

4. **Code Quality**
   - Type-safe TypeScript implementation
   - Proper error handling
   - Clean separation of concerns
   - Well-documented code

---

## 13. FUTURE ENHANCEMENTS

### Post-Hackathon Roadmap

1. **Multi-Source Scraping**
   - Add support for rumah123.com
   - Add support for olx.co.id
   - Add support for lamudi.co.id
   - Unified scraping interface

2. **Advanced Filtering**
   - Filter by price range during scraping
   - Filter by location/area
   - Filter by property type
   - Save filter presets

3. **Duplicate Detection**
   - Detect duplicate listings across sources
   - Merge duplicate data intelligently
   - Alert user about duplicates

4. **Scheduled Scraping**
   - Set up recurring scraping jobs
   - Daily/weekly scraping schedules
   - Email notifications for new listings

5. **Lead Matching**
   - Auto-match scraped listings to leads
   - Suggest listings based on lead preferences
   - Send automated recommendations

6. **Analytics Dashboard**
   - Scraping success rates
   - Most active sources
   - Import conversion rates
   - Time saved metrics

---

## NOTES UNTUK DEMO HACKATHON

### Key Differentiators

1. **AI-Powered Scraping**: Not just regex, but intelligent extraction using LLM
2. **Review Before Import**: Human-in-the-loop approach, not fully automated
3. **Integrated Workflow**: Scraping → Import → Description Generation → Marketing
4. **Time Savings**: Calculate hours saved per week (scraping + description writing)

### Demo Tips

- **Prepare Sample URLs**: Have 2-3 acehome.com URLs ready
- **Show Real Data**: Use actual acehome.com listings, not mock data
- **Highlight AI**: Emphasize LLM's role in extraction and description generation
- **Show Errors Gracefully**: If scraping fails, show how system handles it
- **Mobile Demo**: Show responsive design on phone/tablet

### Backup Plan

- If live scraping fails, have pre-scraped data ready
- If API is slow, explain it's due to LLM processing
- If images don't load, explain it's a network issue

---

**Status:** ✅ Planning Updated with Scraping Feature - Ready for Implementation

**Next Steps:**
1. Review updated planning document
2. Install scrapegraph-js dependency
3. Create database migration for scraping tables
4. Start Phase 2 implementation (Scraping Feature)