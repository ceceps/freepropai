# AI Co-worker untuk Agen Properti - Planning Document

**Hackathon:** AI Builders Challenge with IBM Bob  
**Kategori:** Wildcard - Intelligent Systems for the Future of Work  
**Target User:** Agen properti freelance yang handle lead via WhatsApp

---

## 1. DATABASE SCHEMA (PostgreSQL)

### Tabel: `leads`
Menyimpan informasi lead dari chat WhatsApp yang sudah diekstrak.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  location VARCHAR(255),
  unit_type VARCHAR(100), -- apartemen, rumah, ruko, dll
  urgency VARCHAR(20) CHECK (urgency IN ('immediate', 'soon', 'flexible')),
  score VARCHAR(10) CHECK (score IN ('Hot', 'Warm', 'Cold')),
  raw_chat_text TEXT, -- simulasi chat WhatsApp
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, negotiating, closed, lost
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_last_contact ON leads(last_contact_at);
```

### Tabel: `follow_ups`
Menyimpan draft follow-up yang masuk approval queue.

```sql
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_draft TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'sent')) DEFAULT 'pending',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255), -- untuk tracking siapa yang approve
  sent_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_followups_lead ON follow_ups(lead_id);
CREATE INDEX idx_followups_status ON follow_ups(status);
CREATE INDEX idx_followups_scheduled ON follow_ups(scheduled_for);
```

### Tabel: `listings`
Menyimpan data listing properti.

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  land_area DECIMAL(10,2), -- LT dalam m2
  building_area DECIMAL(10,2), -- LB dalam m2
  location VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  bedrooms INT,
  bathrooms INT,
  property_type VARCHAR(100), -- rumah, apartemen, ruko, dll
  additional_info TEXT, -- info tambahan dari user
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, sold
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(location);
```

### Tabel: `listing_photos`
Menyimpan foto-foto listing (relasi one-to-many dengan listings).

```sql
CREATE TABLE listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  photo_order INT DEFAULT 0, -- urutan foto
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listing_photos_listing ON listing_photos(listing_id);
```

### Tabel: `listing_descriptions`
Menyimpan varian deskripsi yang di-generate untuk setiap listing.

```sql
CREATE TABLE listing_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  variant_type VARCHAR(50) CHECK (variant_type IN ('formal', 'casual_1', 'casual_2')),
  description_text TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_selected BOOLEAN DEFAULT false, -- user bisa pilih mana yang mau dipakai
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listing_descriptions_listing ON listing_descriptions(listing_id);
CREATE INDEX idx_listing_descriptions_variant ON listing_descriptions(variant_type);
```

### Relasi Antar Tabel

```
leads (1) ----< (N) follow_ups
listings (1) ----< (N) listing_photos
listings (1) ----< (N) listing_descriptions
```

---

## 2. STRUKTUR FOLDER PROJECT

```
freepropai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # PostgreSQL connection config
│   │   │   └── llm.ts                # Claude API config via Agentrouter
│   │   ├── models/
│   │   │   ├── Lead.ts
│   │   │   ├── FollowUp.ts
│   │   │   ├── Listing.ts
│   │   │   ├── ListingPhoto.ts
│   │   │   └── ListingDescription.ts
│   │   ├── services/
│   │   │   ├── leadQualifier.service.ts    # LLM integration #1
│   │   │   ├── followUpScheduler.service.ts # Rule engine + LLM integration #2
│   │   │   └── descriptionGenerator.service.ts # LLM integration #3
│   │   ├── controllers/
│   │   │   ├── lead.controller.ts
│   │   │   ├── followUp.controller.ts
│   │   │   └── listing.controller.ts
│   │   ├── routes/
│   │   │   ├── lead.routes.ts
│   │   │   ├── followUp.routes.ts
│   │   │   └── listing.routes.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── utils/
│   │   │   ├── llmClient.ts          # Wrapper untuk Agentrouter API
│   │   │   └── dateHelper.ts
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   └── server.ts                 # Express app entry point
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seeds/
│   │   └── mock_data.sql             # Mock data untuk demo
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── leads/
│   │   │   │   ├── ChatMockInput.tsx      # UI simulasi chat WhatsApp
│   │   │   │   ├── LeadCard.tsx
│   │   │   │   └── LeadScoreBadge.tsx
│   │   │   ├── followups/
│   │   │   │   ├── ApprovalQueue.tsx      # UI approval queue (PENTING)
│   │   │   │   ├── FollowUpCard.tsx
│   │   │   │   └── FollowUpTimeline.tsx
│   │   │   └── listings/
│   │   │       ├── ListingForm.tsx
│   │   │       ├── PhotoUploader.tsx
│   │   │       └── DescriptionVariants.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LeadsPage.tsx
│   │   │   ├── FollowUpsPage.tsx
│   │   │   └── ListingsPage.tsx
│   │   ├── services/
│   │   │   └── api.ts                     # Axios instance + API calls
│   │   ├── hooks/
│   │   │   ├── useLeads.ts
│   │   │   ├── useFollowUps.ts
│   │   │   └── useListings.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── docs/
│   ├── API.md                              # API documentation
│   └── DEMO_SCRIPT.md                      # Script untuk demo hackathon
│
├── .gitignore
├── README.md
└── PLANNING.md                             # Dokumen ini
```

---

## 3. API ENDPOINTS

### A. Lead Qualifying Endpoints

#### `POST /api/leads/qualify`
**Deskripsi:** Submit chat WhatsApp (mock) untuk ekstraksi info dan scoring.

**Request Body:**
```json
{
  "rawChatText": "Halo pak, saya cari rumah di BSD budget 1-1.5M, 2 kamar cukup. Butuh cepat bulan depan.",
  "phoneNumber": "+6281234567890",
  "contactName": "Budi Santoso"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "leadId": "uuid-here",
    "extractedInfo": {
      "name": "Budi Santoso",
      "phone": "+6281234567890",
      "budget": {
        "min": 1000000000,
        "max": 1500000000
      },
      "location": "BSD",
      "unitType": "rumah",
      "urgency": "soon",
      "bedrooms": 2
    },
    "score": "Hot",
    "reasoning": "Budget jelas, lokasi spesifik, urgency tinggi (bulan depan)"
  }
}
```

#### `GET /api/leads`
**Deskripsi:** List semua leads dengan filter.

**Query Params:**
- `score` (optional): Hot | Warm | Cold
- `status` (optional): new | contacted | negotiating | closed | lost
- `sortBy` (optional): score | created_at | last_contact_at

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Budi Santoso",
      "phone": "+6281234567890",
      "budget": { "min": 1000000000, "max": 1500000000 },
      "location": "BSD",
      "unitType": "rumah",
      "urgency": "soon",
      "score": "Hot",
      "status": "new",
      "lastContactAt": null,
      "createdAt": "2026-08-04T01:00:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "hotCount": 5,
    "warmCount": 7,
    "coldCount": 3
  }
}
```

#### `GET /api/leads/:id`
**Deskripsi:** Detail satu lead.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Budi Santoso",
    "phone": "+6281234567890",
    "budget": { "min": 1000000000, "max": 1500000000 },
    "location": "BSD",
    "unitType": "rumah",
    "urgency": "soon",
    "score": "Hot",
    "status": "new",
    "rawChatText": "Halo pak, saya cari rumah...",
    "notes": "",
    "lastContactAt": null,
    "createdAt": "2026-08-04T01:00:00Z",
    "updatedAt": "2026-08-04T01:00:00Z"
  }
}
```

#### `PATCH /api/leads/:id`
**Deskripsi:** Update status atau notes lead secara manual.

**Request Body:**
```json
{
  "status": "contacted",
  "notes": "Sudah dihubungi via WA, tertarik lihat unit"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { /* updated lead object */ }
}
```

---

### B. Follow-up Scheduler Endpoints

#### `POST /api/followups/generate`
**Deskripsi:** Trigger rule engine untuk generate follow-up drafts untuk leads yang eligible.

**Request Body:**
```json
{
  "leadIds": ["uuid1", "uuid2"] // optional, kalau kosong process semua eligible leads
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "generated": 3,
    "followUps": [
      {
        "id": "uuid",
        "leadId": "uuid1",
        "leadName": "Budi Santoso",
        "messageDraft": "Halo Pak Budi, bagaimana kabarnya? Saya ada update listing rumah di BSD yang sesuai budget Bapak...",
        "scheduledFor": "2026-08-05T01:00:00Z",
        "status": "pending"
      }
    ]
  }
}
```

#### `GET /api/followups/queue`
**Deskripsi:** List follow-ups yang pending approval (APPROVAL QUEUE).

**Query Params:**
- `status` (optional): pending | approved | rejected | sent

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "lead": {
        "id": "uuid1",
        "name": "Budi Santoso",
        "score": "Hot",
        "lastContactAt": "2026-08-03T01:00:00Z"
      },
      "messageDraft": "Halo Pak Budi...",
      "scheduledFor": "2026-08-05T01:00:00Z",
      "status": "pending",
      "generatedAt": "2026-08-04T01:00:00Z"
    }
  ],
  "meta": {
    "pendingCount": 5,
    "approvedCount": 12,
    "rejectedCount": 2
  }
}
```

#### `PATCH /api/followups/:id/approve`
**Deskripsi:** Approve follow-up draft (untuk demo, tidak auto-send).

**Request Body:**
```json
{
  "approvedBy": "Agent Name" // optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvedAt": "2026-08-04T02:00:00Z",
    "message": "Follow-up approved. Dalam implementasi production, ini akan dikirim otomatis pada waktu terjadwal."
  }
}
```

#### `PATCH /api/followups/:id/reject`
**Deskripsi:** Reject follow-up draft.

**Request Body:**
```json
{
  "reason": "Pesan terlalu formal, lead ini lebih suka casual"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejectionReason": "Pesan terlalu formal..."
  }
}
```

#### `PATCH /api/followups/:id/edit`
**Deskripsi:** Edit draft message sebelum approve.

**Request Body:**
```json
{
  "messageDraft": "Halo Pak Budi, apa kabar? Ada update listing baru nih..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { /* updated follow-up object */ }
}
```

---

### C. Listing Description Generator Endpoints

#### `POST /api/listings`
**Deskripsi:** Create listing baru dengan input manual.

**Request Body (multipart/form-data):**
```json
{
  "title": "Rumah Minimalis BSD",
  "landArea": 120,
  "buildingArea": 90,
  "location": "BSD City, Tangerang Selatan",
  "price": 1200000000,
  "bedrooms": 3,
  "bathrooms": 2,
  "propertyType": "rumah",
  "additionalInfo": "Dekat sekolah, akses tol, cluster aman",
  "photos": [File, File, File] // array of image files
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "listingId": "uuid",
    "title": "Rumah Minimalis BSD",
    "landArea": 120,
    "buildingArea": 90,
    "location": "BSD City, Tangerang Selatan",
    "price": 1200000000,
    "bedrooms": 3,
    "bathrooms": 2,
    "propertyType": "rumah",
    "photos": [
      { "id": "uuid1", "url": "/uploads/photo1.jpg", "order": 0 },
      { "id": "uuid2", "url": "/uploads/photo2.jpg", "order": 1 }
    ],
    "status": "draft",
    "createdAt": "2026-08-04T02:00:00Z"
  }
}
```

#### `POST /api/listings/:id/generate-descriptions`
**Deskripsi:** Generate 2-3 varian deskripsi untuk listing yang sudah dibuat.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "listingId": "uuid",
    "descriptions": [
      {
        "id": "uuid1",
        "variantType": "formal",
        "text": "Dijual Rumah Minimalis di BSD City dengan luas tanah 120m² dan luas bangunan 90m². Properti ini memiliki 3 kamar tidur dan 2 kamar mandi. Lokasi strategis dekat dengan sekolah dan akses tol. Harga: Rp 1.200.000.000 (nego).",
        "generatedAt": "2026-08-04T02:05:00Z"
      },
      {
        "id": "uuid2",
        "variantType": "casual_1",
        "text": "🏡 Rumah impian di BSD nih! LT 120m², LB 90m², 3KT 2KM. Lokasi juara, deket sekolah & tol. Cluster aman, cocok buat keluarga muda. Harga 1.2M nego tipis ya 😊",
        "generatedAt": "2026-08-04T02:05:00Z"
      },
      {
        "id": "uuid3",
        "variantType": "casual_2",
        "text": "Ada yang lagi cari rumah di BSD? Nih ada ready stock! 3 kamar 2 kamar mandi, tanah 120 bangunan 90. Lokasi strategis banget, tinggal jalan kaki ke sekolah. Harga 1.2M masih bisa nego. DM kalau serius ya! 📲",
        "generatedAt": "2026-08-04T02:05:00Z"
      }
    ]
  }
}
```

#### `GET /api/listings`
**Deskripsi:** List semua listings.

**Query Params:**
- `status` (optional): draft | published | sold

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Rumah Minimalis BSD",
      "location": "BSD City",
      "price": 1200000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "status": "draft",
      "photoCount": 3,
      "hasDescriptions": true,
      "createdAt": "2026-08-04T02:00:00Z"
    }
  ]
}
```

#### `GET /api/listings/:id`
**Deskripsi:** Detail listing dengan semua varian deskripsi.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Rumah Minimalis BSD",
    "landArea": 120,
    "buildingArea": 90,
    "location": "BSD City, Tangerang Selatan",
    "price": 1200000000,
    "bedrooms": 3,
    "bathrooms": 2,
    "propertyType": "rumah",
    "additionalInfo": "Dekat sekolah, akses tol, cluster aman",
    "photos": [
      { "id": "uuid1", "url": "/uploads/photo1.jpg", "order": 0 },
      { "id": "uuid2", "url": "/uploads/photo2.jpg", "order": 1 }
    ],
    "descriptions": [
      {
        "id": "uuid1",
        "variantType": "formal",
        "text": "Dijual Rumah Minimalis...",
        "isSelected": false
      },
      {
        "id": "uuid2",
        "variantType": "casual_1",
        "text": "🏡 Rumah impian...",
        "isSelected": true
      },
      {
        "id": "uuid3",
        "variantType": "casual_2",
        "text": "Ada yang lagi cari...",
        "isSelected": false
      }
    ],
    "status": "draft",
    "createdAt": "2026-08-04T02:00:00Z"
  }
}
```

#### `PATCH /api/listings/:listingId/descriptions/:descId/select`
**Deskripsi:** Pilih salah satu varian deskripsi untuk digunakan.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "descriptionId": "uuid2",
    "isSelected": true
  }
}
```

---

## 4. TITIK INTEGRASI LLM & SYSTEM PROMPTS

### Integrasi #1: Lead Qualifying (`leadQualifier.service.ts`)

**Kapan dipanggil:**  
Saat endpoint `POST /api/leads/qualify` menerima raw chat text dari UI mock WhatsApp.

**Input ke LLM:**
- Raw chat text dari user
- Phone number & contact name (metadata)

**Output yang diharapkan:**
- Structured JSON dengan fields: budget (min/max), location, unitType, urgency, bedrooms, bathrooms
- Lead score: Hot/Warm/Cold
- Reasoning singkat untuk scoring

**System Prompt:**
```
You are an AI assistant for Indonesian real estate agents. Your task is to analyze WhatsApp chat messages from potential property buyers and extract key information.

Extract the following information from the chat:
1. Budget range (in IDR, convert if mentioned in millions/billions)
2. Preferred location (city, area, or neighborhood)
3. Property type (rumah, apartemen, ruko, tanah, etc.)
4. Urgency level: "immediate" (butuh segera/minggu ini), "soon" (1-2 bulan), or "flexible" (masih survey/belum urgent)
5. Number of bedrooms (if mentioned)
6. Number of bathrooms (if mentioned)

Then, score the lead as:
- **Hot**: Clear budget + specific location + high urgency (immediate/soon)
- **Warm**: Budget mentioned + general location OR clear budget + low urgency
- **Cold**: Vague budget + vague location + flexible timeline

Return your response as JSON:
{
  "budget": { "min": number, "max": number },
  "location": "string",
  "unitType": "string",
  "urgency": "immediate" | "soon" | "flexible",
  "bedrooms": number | null,
  "bathrooms": number | null,
  "score": "Hot" | "Warm" | "Cold",
  "reasoning": "brief explanation in Indonesian"
}

If information is not mentioned, use null for that field.
```

---

### Integrasi #2: Follow-up Scheduler (`followUpScheduler.service.ts`)

**Kapan dipanggil:**  
Saat endpoint `POST /api/followups/generate` dipanggil, setelah rule engine menentukan lead mana yang perlu follow-up.

**Rule Engine Logic (sebelum LLM):**
```typescript
// Pseudo-code
for each lead:
  if lead.score === 'Hot' && daysSinceLastContact >= 1:
    generateFollowUp(lead, interval: '24 hours')
  else if lead.score === 'Warm' && daysSinceLastContact >= 3:
    generateFollowUp(lead, interval: '3 days')
  else if lead.score === 'Cold' && daysSinceLastContact >= 14:
    generateFollowUp(lead, interval: '2 weeks')
```

**Input ke LLM:**
- Lead data (name, budget, location, unitType, urgency, score)
- Last contact date
- Lead status (new, contacted, negotiating)

**Output yang diharapkan:**
- Draft pesan follow-up dalam Bahasa Indonesia yang natural
- Tone disesuaikan dengan lead score (Hot = lebih urgent, Cold = lebih santai)

**System Prompt:**
```
You are an AI assistant helping Indonesian real estate agents write follow-up messages to property leads via WhatsApp.

Given lead information, generate a natural, friendly follow-up message in Indonesian. Guidelines:
- Use casual but professional tone (like chatting with a friend, but respectful)
- For **Hot leads**: Show urgency, mention new listings that match their criteria
- For **Warm leads**: Check in casually, ask if they're still looking, offer help
- For **Cold leads**: Very light touch, just staying top-of-mind, no pressure
- Keep messages short (2-4 sentences max)
- Use WhatsApp-style language (boleh pakai emoji 1-2 aja, jangan berlebihan)
- DO NOT include greetings like "Selamat pagi/siang/malam" (agent will add this manually)
- End with a soft call-to-action or question

Lead context:
- Name: {name}
- Budget: {budget}
- Location interest: {location}
- Property type: {unitType}
- Lead score: {score}
- Last contacted: {lastContactDate}
- Current status: {status}

Return only the message text, no JSON wrapper.
```

---

### Integrasi #3: Listing Description Generator (`descriptionGenerator.service.ts`)

**Kapan dipanggil:**  
Saat endpoint `POST /api/listings/:id/generate-descriptions` dipanggil setelah listing dibuat.

**Input ke LLM:**
- Listing data (title, landArea, buildingArea, location, price, bedrooms, bathrooms, propertyType, additionalInfo)
- Photo URLs (untuk context, tapi LLM tidak perlu analyze image untuk prototype ini)

**Output yang diharapkan:**
- 3 varian deskripsi:
  1. **Formal** - untuk portal listing (OLX, Rumah123, dll)
  2. **Casual #1** - untuk Instagram caption (dengan emoji)
  3. **Casual #2** - untuk Instagram story atau WhatsApp status

**System Prompt:**
```
You are an AI assistant helping Indonesian real estate agents write property listing descriptions.

Given property details, generate 3 description variants:

**Variant 1 - FORMAL (for listing portals like OLX, Rumah123):**
- Professional tone, complete information
- Format: "Dijual [PropertyType] di [Location]..."
- Include: LT, LB, bedrooms, bathrooms, price, key features
- 3-5 sentences, clear and informative
- No emoji

**Variant 2 - CASUAL #1 (for Instagram feed post):**
- Friendly, engaging tone
- Use 2-4 relevant emoji (🏡 🏠 ✨ 📍 💰 etc.)
- Highlight lifestyle benefits (dekat sekolah, akses mudah, dll)
- 2-4 sentences
- End with soft CTA like "DM untuk info lebih lanjut ya!"

**Variant 3 - CASUAL #2 (for Instagram story / WhatsApp status):**
- Very casual, conversational
- Short and punchy (1-3 sentences)
- Use emoji liberally but not excessive (3-5 emoji)
- Create FOMO or urgency if appropriate
- Direct CTA like "Serius? Langsung chat aja!" or "Tanya-tanya boleh banget!"

Property details:
- Type: {propertyType}
- Location: {location}
- Land area: {landArea} m²
- Building area: {buildingArea} m²
- Bedrooms: {bedrooms}
- Bathrooms: {bathrooms}
- Price: Rp {price} (format with thousand separators)
- Additional info: {additionalInfo}

Return as JSON:
{
  "formal": "description text",
  "casual_1": "description text",
  "casual_2": "description text"
}
```

---

## 5. BUILD ORDER (Urutan Implementasi)

### Phase 1: Foundation & Listing Generator (Paling Independen)
**Estimasi: 2-3 hari**

1. ✅ Setup project structure (backend + frontend)
2. ✅ Setup database PostgreSQL + run migrations
3. ✅ Setup LLM client wrapper (Agentrouter API)
4. ✅ Implement Listing endpoints:
   - `POST /api/listings` (create listing + upload photos)
   - `POST /api/listings/:id/generate-descriptions` (LLM integration #3)
   - `GET /api/listings` & `GET /api/listings/:id`
5. ✅ Build Listing UI:
   - ListingForm component (input manual + photo uploader)
   - DescriptionVariants component (display 3 varian)
   - Select/copy functionality
6. ✅ Test end-to-end: input listing → generate descriptions → pilih varian

**Kenapa mulai dari sini:**
- Paling independen (tidak depend on leads atau follow-ups)
- Paling mudah di-demo (input form → output text)
- LLM integration paling straightforward (single call, predictable output)

---

### Phase 2: Lead Qualifying (Dependency: None)
**Estimasi: 2 hari**

1. ✅ Implement Lead endpoints:
   - `POST /api/leads/qualify` (LLM integration #1)
   - `GET /api/leads` (with filters)
   - `GET /api/leads/:id`
   - `PATCH /api/leads/:id` (update status/notes)
2. ✅ Build Lead UI:
   - ChatMockInput component (simulasi WhatsApp chat)
   - LeadCard component (display extracted info + score badge)
   - Lead list page dengan filter by score
3. ✅ Test end-to-end: input chat → ekstraksi info → scoring → display

**Kenapa setelah Listing:**
- Masih independen (tidak depend on follow-ups)
- LLM integration lebih complex (structured extraction + scoring logic)
- Butuh UI mock chat yang believable untuk demo

---

### Phase 3: Follow-up Scheduler (Dependency: Leads)
**Estimasi: 2-3 hari**

1. ✅ Implement rule engine logic di `followUpScheduler.service.ts`
2. ✅ Implement Follow-up endpoints:
   - `POST /api/followups/generate` (rule engine + LLM integration #2)
   - `GET /api/followups/queue` (approval queue)
   - `PATCH /api/followups/:id/approve`
   - `PATCH /api/followups/:id/reject`
   - `PATCH /api/followups/:id/edit`
3. ✅ Build Follow-up UI:
   - ApprovalQueue component (CRITICAL - harus jelas untuk demo)
   - FollowUpCard component (display draft + approve/reject/edit actions)
   - FollowUpTimeline component (visual timeline untuk scheduled follow-ups)
4. ✅ Test end-to-end: generate follow-ups → review di queue → approve/reject

**Kenapa terakhir:**
- Paling complex (depend on leads data)
- Rule engine + LLM integration
- Approval queue harus polished untuk demo (ini unique selling point)

---

### Phase 4: Integration & Polish
**Estimasi: 1-2 hari**

1. ✅ Dashboard page (overview metrics: hot/warm/cold leads, pending approvals, listings count)
2. ✅ Seed mock data untuk demo (5-10 leads, 3-5 listings, beberapa follow-ups)
3. ✅ Error handling & loading states
4. ✅ Responsive design (minimal mobile-friendly)
5. ✅ Write demo script (`docs/DEMO_SCRIPT.md`)
6. ✅ Final testing & bug fixes

---

## 6. MOCK DATA vs REAL DATA

### MOCK DATA (untuk demo):

1. **WhatsApp Chat Simulation:**
   - ❌ TIDAK pakai Meta Cloud API asli
   - ✅ UI mock: textarea untuk input chat text
   - ✅ Seed 5-10 contoh chat text yang realistic:
     ```
     "Halo pak, saya cari apartemen di Jakarta Selatan budget 500jt-700jt, 1BR cukup. Butuh cepat bulan ini."
     "Mas, ada rumah di Bintaro ga? Budget 1.5M, minimal 2 kamar. Masih survey sih."
     "Pak agen, saya lagi cari ruko di Tangerang buat usaha. Budget 2-3M. Lokasi strategis ya."
     ```

2. **Photo Upload:**
   - ✅ Real file upload (multipart/form-data)
   - ✅ Store di `/uploads` folder (untuk prototype, production pakai cloud storage)
   - ✅ Seed 3-5 sample property photos

3. **Follow-up Scheduling:**
   - ❌ TIDAK auto-send ke WhatsApp asli
   - ✅ Approval queue UI yang jelas
   - ✅ Status "approved" hanya update database, tidak trigger actual send
   - ✅ Seed beberapa follow-ups dengan status pending/approved untuk demo

4. **Lead Data:**
   - ✅ Seed 10-15 leads dengan variasi score (Hot/Warm/Cold)
   - ✅ Variasi status (new, contacted, negotiating)
   - ✅ Realistic Indonesian names, phone numbers, locations

5. **Listing Data:**
   - ✅ Seed 5-7 listings dengan variasi property type
   - ✅ Realistic prices untuk area Jakarta/Tangerang/BSD
   - ✅ Sample photos (bisa pakai placeholder images atau free stock photos)

---

### REAL DATA (actual implementation):

1. **LLM API Calls:**
   - ✅ REAL calls ke Claude via Agentrouter API
   - ✅ Actual token usage & costs
   - ✅ Real-time generation (bukan pre-generated responses)

2. **Database:**
   - ✅ Real PostgreSQL database
   - ✅ Actual CRUD operations
   - ✅ Real timestamps & UUIDs

3. **File Uploads:**
   - ✅ Real file handling (multer middleware)
   - ✅ Actual file storage (local filesystem untuk prototype)

4. **Business Logic:**
   - ✅ Real rule engine untuk follow-up scheduling
   - ✅ Actual date calculations (interval 24h/3d/14d)
   - ✅ Real scoring algorithm (Hot/Warm/Cold)

---

## NEXT STEPS

1. **Review Planning Document:**
   - Apakah database schema sudah cover semua kebutuhan?
   - Apakah API endpoints sudah lengkap?
   - Apakah build order masuk akal?

2. **Prepare Environment:**
   - Setup PostgreSQL database
   - Get Agentrouter API credentials
   - Prepare sample property photos

3. **Approval:**
   - Setelah planning di-approve, switch ke `code` mode untuk implementasi
   - Mulai dari Phase 1 (Listing Generator)

---

## NOTES UNTUK DEMO HACKATHON

- **Highlight Approval Queue:** Ini yang membedakan dari auto-send chatbot biasa
- **Show LLM Reasoning:** Display reasoning untuk lead scoring (transparency)
- **Emphasize Time Savings:** Hitung berapa jam yang dihemat per minggu
- **Real-world Scenario:** Pakai persona agen properti yang believable
- **Mobile-first:** Agen properti sering kerja dari HP, pastikan UI responsive

---

**Status:** ✅ Planning Complete - Waiting for Review & Approval
