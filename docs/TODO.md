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
