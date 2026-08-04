# FreePropAI - AI Co-worker for Real Estate Agents

Prototype untuk hackathon **AI Builders Challenge with IBM Bob** - Kategori Wildcard: Intelligent Systems for the Future of Work.

## 🎯 Deskripsi Produk

AI Co-worker yang membantu agen properti independen mengelola lead, follow-up, dan listing properti secara lebih efisien menggunakan AI.

### Fitur Utama:
1. **Lead Qualifying** - Ekstrak info dari chat WhatsApp dan skor lead (Hot/Warm/Cold)
2. **Follow-up Scheduler** - Generate draft follow-up otomatis dengan approval queue
3. **Listing Description Generator** - Generate 3 varian deskripsi (formal & casual)

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: PostgreSQL
- **LLM**: Claude API via Agentrouter

## 📋 Prerequisites

- Node.js 18+ dan npm/yarn
- PostgreSQL 14+
- Agentrouter API key (untuk akses Claude)

## 🚀 Setup Instructions

### 1. Clone & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Database

```bash
# Create PostgreSQL database
createdb freepropai

# Or using psql
psql -U postgres
CREATE DATABASE freepropai;
\q
```

### 3. Configure Environment Variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env dengan database credentials dan API keys
```

Required environment variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/freepropai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freepropai
DB_USER=your_username
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development

AGENTROUTER_API_KEY=your_api_key_here
AGENTROUTER_API_URL=https://api.agentrouter.com/v1
LLM_MODEL=claude-3-5-sonnet-20241022

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173
```

### 4. Run Database Migrations

```bash
cd backend
psql -U your_username -d freepropai -f migrations/001_initial_schema.sql
```

### 5. Create Upload Directory

```bash
cd backend
mkdir uploads
```

### 6. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Backend akan berjalan di: http://localhost:3001
Frontend akan berjalan di: http://localhost:5173

## 📁 Project Structure

```
freepropai/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & LLM configuration
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic & LLM integrations
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   ├── migrations/         # Database migrations
│   └── seeds/              # Mock data for demo
│
├── frontend/
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Page components
│       ├── services/       # API client
│       ├── hooks/          # Custom React hooks
│       └── types/          # TypeScript types
│
└── docs/                   # Documentation
```

## 🔧 Development

### Backend Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
```

### Frontend Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 📊 Database Schema

Lihat file `backend/migrations/001_initial_schema.sql` untuk detail schema lengkap.

**Tables:**
- `leads` - Lead information dan scoring
- `follow_ups` - Follow-up drafts dan approval queue
- `listings` - Property listings
- `listing_photos` - Listing photos
- `listing_descriptions` - Generated description variants

## 🎨 API Endpoints

### Leads
- `POST /api/leads/qualify` - Qualify lead dari chat WhatsApp
- `GET /api/leads` - List semua leads
- `GET /api/leads/:id` - Detail lead
- `PATCH /api/leads/:id` - Update lead

### Follow-ups
- `POST /api/followups/generate` - Generate follow-up drafts
- `GET /api/followups/queue` - Approval queue
- `PATCH /api/followups/:id/approve` - Approve draft
- `PATCH /api/followups/:id/reject` - Reject draft
- `PATCH /api/followups/:id/edit` - Edit draft

### Listings
- `POST /api/listings` - Create listing
- `POST /api/listings/:id/generate-descriptions` - Generate descriptions
- `GET /api/listings` - List listings
- `GET /api/listings/:id` - Detail listing

Lihat `PLANNING.md` untuk detail lengkap API specification.

## 🏗️ Build Order

Implementasi mengikuti urutan:
1. **Phase 1**: Listing Generator (paling independen)
2. **Phase 2**: Lead Qualifying
3. **Phase 3**: Follow-up Scheduler
4. **Phase 4**: Integration & Polish

## 📝 Notes

- WhatsApp chat disimulasikan via UI mock (bukan integrasi Meta Cloud API)
- Follow-up approval queue tidak auto-send (untuk demo)
- LLM reasoning menggunakan Claude API via Agentrouter
- Upload foto disimpan lokal (production pakai cloud storage)

## 🎯 Demo Script

Lihat `docs/DEMO_SCRIPT.md` untuk panduan demo hackathon.

## 📄 License

MIT

## 👥 Author

Hackathon Project - AI Builders Challenge with IBM Bob
