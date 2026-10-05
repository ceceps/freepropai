# Fitur Belum Dikerjakan

## 1. Lead Qualifying System (Phase 3)

### Backend
- [ ] `leads` table migration
- [ ] Lead model (`Lead.ts`)
- [ ] Service: `leadQualifier.service.ts` — AI extract data lead dari chat WhatsApp, scoring Hot/Warm/Cold
- [ ] Controller: `lead.controller.ts`
- [ ] Routes: `lead.routes.ts`

### Endpoints
- [ ] `POST /api/leads/qualify` — input chat WhatsApp, AI extract + score
- [ ] `GET /api/leads` — list semua leads
- [ ] `GET /api/leads/:id` — detail lead
- [ ] `PATCH /api/leads/:id` — update lead

### Frontend
- [ ] `LeadsPage.tsx`
- [ ] Komponen leads (WhatsApp chat mock input, lead card, scoring display)

---

## 2. Follow-up Scheduler (Phase 4)

### Backend
- [ ] `follow_ups` table migration
- [ ] FollowUp model (`FollowUp.ts`)
- [ ] Service: `followUpScheduler.service.ts` — auto-generate follow-up messages via LLM
- [ ] Controller: `followUp.controller.ts`
- [ ] Routes: `followUp.routes.ts`

### Endpoints
- [ ] `POST /api/followups/generate` — generate follow-up untuk lead
- [ ] `GET /api/followups/queue` — list follow-up queue
- [ ] `PATCH /api/followups/:id/approve`
- [ ] `PATCH /api/followups/:id/reject`
- [ ] `PATCH /api/followups/:id/edit`

### Frontend
- [ ] `FollowUpsPage.tsx`
- [ ] Approval queue UI
- [ ] Timeline visualization

---

## 3. Integration & Polish (Phase 5)

- [ ] Dashboard dengan metrics real
- [ ] Seed data komprehensif
- [ ] Error handling & loading states lengkap
- [ ] Responsive design final
- [ ] Demo script (`docs/DEMO_SCRIPT.md`)
- [ ] API documentation (`docs/API.md`)

---

## 4. Cek Status Implementasi

- [ ] Scraping Feature (Phase 2) — sudah di-plan detail, perlu verifikasi implementasi aktual
- [ ] `docs/API.md` — belum ada
- [ ] `docs/DEMO_SCRIPT.md` — belum ada

---

## 5. Security: Hardcoded Credentials

Hasil audit kredensial di source code. Nilai rahasia tidak ditulis di sini; cek file terkait. Rotasi semua nilai yang benar-benar live, lalu hapus dari source.

### Real secret, git-tracked (masuk riwayat Git — prioritas tinggi)
- [ ] `backend/src/config/llm.ts:13` — fallback token image API (`sk-...`) hardcoded di source
- [ ] `backend/.env.test:6` — password Postgres
- [ ] `backend/.env.test:7` — `DATABASE_URL` berisi password yang sama
- [ ] `backend/src/config/auth.ts:2` — fallback `JWT_SECRET` (`dev-secret-change-in-production`)
- [ ] `Changelog.md:74` — kredensial login pgAdmin (email + password)

### Real secret, ada lokal tapi sudah gitignored
- [ ] `backend/.env:2,7` — `DATABASE_URL` + password DB live
- [ ] `backend/.env:14` — `AGENTROUTER_API_KEY` live
- [ ] `backend/.env.test.local:3` — API key live yang sama

### Placeholder saja (bukan secret, tidak perlu rotasi)
- `backend/.env.example`, `README.md`, `PLANNING.md`, `backend/TEST_SETUP.md`, `backend/DRIZZLE_SETUP.md`

### Tindakan
- [ ] Rotasi token image API (`LLM_TOKEN_IMAGE`)
- [ ] Rotasi `AGENTROUTER_API_KEY`
- [ ] Rotasi password DB
- [x] Hapus fallback hardcoded di `backend/src/config/llm.ts:13` (wajib dari env) — done; token kini hanya dari `LLM_TOKEN_IMAGE`, generation di-skip dengan warning bila kosong
- [ ] Wajibkan `JWT_SECRET` dari env; hapus default `dev-secret-change-in-production`
- [ ] Ganti `backend/.env.test` agar pakai password dummy/non-produksi
- [ ] Pindahkan kredensial pgAdmin dari `Changelog.md` ke secret manager
- [ ] Pastikan `.env` dan `.env.test.local` tetap gitignored, jangan pernah di-commit
- [ ] (Opsional) Bersihkan riwayat Git yang sudah terlanjur memuat token
