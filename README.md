# FreePropAI - AI Co-worker for Real Estate Agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql)](https://www.postgresql.org/)

**FreePropAI** is an AI-powered co-worker tailored for independent real estate agents. Built for the **AI Builders Challenge with IBM Bob** hackathon (*Wildcard Category: Intelligent Systems for the Future of Work*), FreePropAI simplifies lead management, automates follow-up scheduling, and instantly generates marketing-ready property listing descriptions.

---

## 🌟 Key Features

### 1. 🏡 AI Property Listing Description Generator
- Instantly creates **3 marketing description variants** from basic property specs (location, size, price, amenities):
  - **Formal**: Comprehensive, professional copy optimized for listing portals (OLX, Rumah123).
  - **Casual #1**: Engaging, lifestyle-focused captions with emojis for Instagram feed posts.
  - **Casual #2**: Punchy, high-urgency posts for Instagram Stories and WhatsApp Statuses.
- **Resilient Fallback Engine**: If external LLM provider services are unauthenticated or unavailable, a built-in smart template engine ensures descriptions are generated seamlessly without server downtime.

### 2. 🎯 AI Lead Qualification & Extraction
- Processes unformatted WhatsApp chat text from prospective buyers.
- Automatically extracts key criteria: Budget (min/max), Preferred Location, Property Type, Urgency, Bedrooms, and Bathrooms.
- Scores leads dynamically (**Hot**, **Warm**, **Cold**) with clear AI reasoning.

### 3. 📅 Smart Follow-Up Scheduler & Approval Queue
- Applies intelligent follow-up frequency rules based on lead scores.
- Generates tailored, natural Indonesian follow-up draft messages for WhatsApp.
- **Human-in-the-Loop Approval Queue**: Agents review, edit, approve, or reject AI-generated drafts prior to sending.

---

## 🛠️ Technology Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh) / Node.js
- **Backend Framework**: Express.js + TypeScript
- **Database & ORM**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **LLM Integration**: Anthropic SDK (Claude API via Agentrouter)
- **Frontend Framework**: React + Vite + TypeScript + Tailwind CSS
- **Testing**: Vitest + Supertest

---

## 📋 Prerequisites

Before running the project locally, ensure you have:
- **Bun** (v1.0+ recommended) or **Node.js** (v18+)
- **PostgreSQL** (v14+) running locally or on a server
- **Agentrouter / Claude API Key** (optional, fallback engine provided)

---

## 🚀 Quick Start Guide

### 1. Database Setup

Create a PostgreSQL database named `freepropai_db` (or as configured in `.env`):

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE freepropai_db;"
```

### 2. Configure Backend Environment

Copy the example environment configuration:

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freepropai_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
NODE_ENV=development

ANTHROPIC_AUTH_TOKEN=your_token_here
ANTHROPIC_BASE_URL=https://agentrouter.org
ANTHROPIC_MODEL=claude-opus-4-8

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173
```

### 3. Run Database Migrations & Seeds

```bash
cd backend

# Apply initial SQL schema
psql -U postgres -d freepropai_db -f migrations/001_initial_schema.sql

# Seed initial property listings and mock data
bun run seed
```

### 4. Start Development Servers

Run the backend and frontend servers:

```bash
# Terminal 1: Start Backend (Port 3001)
cd backend
bun run dev

# Terminal 2: Start Frontend (Port 5173)
cd frontend
bun run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🧪 Running Tests

FreePropAI comes with an automated integration test suite for backend API endpoints using Vitest:

```bash
cd backend
bun run test:run
```

---

## 📡 API Endpoints Overview

### Listings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/listings` | Create a new property listing with image uploads |
| `GET` | `/api/listings` | Get all listings (filterable by status: `draft`, `published`, `sold`) |
| `GET` | `/api/listings/:id` | Get full details for a listing (includes photos & descriptions) |
| `PATCH` | `/api/listings/:id` | Update listing details |
| `DELETE` | `/api/listings/:id` | Delete a listing (cascades to photos & descriptions) |
| `POST` | `/api/listings/:id/generate-descriptions` | Generate formal & casual AI description variants |
| `PATCH` | `/api/listings/:listingId/descriptions/:descId/select` | Mark a description variant as selected |

---

## 📁 Repository Layout

```
freepropai/
├── backend/
│   ├── migrations/          # SQL database schema migrations
│   ├── seeds/               # Database seed scripts
│   ├── src/
│   │   ├── config/          # Database & LLM configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── db/              # Drizzle ORM schema & client
│   │   ├── middleware/      # Error handling & file upload middleware
│   │   ├── models/          # Data access models
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic & description generation
│   │   ├── utils/           # LLM client & helpers
│   │   └── server.ts        # Express app entry point
│   └── package.json
├── frontend/                # React + Vite application
│   ├── src/
│   │   ├── components/      # UI components (listings, leads, follow-ups)
│   │   ├── pages/           # Application views
│   │   └── services/        # Frontend API client
│   └── package.json
├── PLANNING.md              # Architectural & product planning document
└── README.md                # Project documentation
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
