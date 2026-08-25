import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { leads } from '../db/schema';
import { leadQualifierService } from '../services/leadQualifier.service';
import { llmClient } from '../utils/llmClient';

// Mock LLM client
vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue(JSON.stringify({
  name: 'Budi',
  phone: '08123456789',
  budgetMin: 800000000,
  budgetMax: 1000000000,
  location: 'Batam Centre',
  unitType: 'Rumah',
  urgency: 'immediate',
  score: 'Hot',
  notes: 'Butuh cepat bulan ini'
}));

describe('Lead Qualifying System (Phase 3)', () => {
  beforeEach(async () => {
    // Cleanup leads before each test
    await db.delete(leads);
  });

  describe('LeadQualifierService', () => {
    it('should qualify lead and fallback gracefully on error or parse chat text', async () => {
      const chatText = "Halo mas, saya Budi (08123456789). Mau cari rumah 3 kamar di Batam Centre budget 800jt-1M, butuh cepat bulan ini ya.";
      
      const qualified = await leadQualifierService.extractAndQualify(chatText, 'Budi', '08123456789');

      expect(qualified).toBeDefined();
      expect(qualified.urgency).toBeDefined();
      expect(qualified.score).toBeDefined();
      expect(['Hot', 'Warm', 'Cold']).toContain(qualified.score);
    });

    it('should save qualified lead to database', async () => {
      const result = await leadQualifierService.qualifyAndSaveLead({
        name: 'Siti',
        phone: '08987654321',
        rawChatText: 'Halo mau tanya rumah murah di Sekupang',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Budi');
      expect(result.phone).toBe('08123456789');
      expect(result.status).toBe('new');
    });
  });

  describe('Lead API Endpoints', () => {
    it('POST /api/leads/qualify - should require rawChatText', async () => {
      const response = await request(app)
        .post('/api/leads/qualify')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('rawChatText is required');
    });

    it('POST /api/leads/qualify - should qualify and save lead', async () => {
      const response = await request(app)
        .post('/api/leads/qualify')
        .send({
          name: 'Ahmad',
          phone: '08111122233',
          rawChatText: 'Cari ruko 2 lantai di Nagoya budget 1.5M, butuh segera minggu ini',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('Budi');
      expect(response.body.data.score).toBeDefined();
    });

    it('GET /api/leads - should list all leads', async () => {
      // Ensure DB clean before test
      await db.delete(leads);

      await db.insert(leads).values([
        { name: 'Lead 1', phone: '123', status: 'new' },
        { name: 'Lead 2', phone: '456', status: 'new' },
      ]);

      const response = await request(app)
        .get('/api/leads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('GET /api/leads/:id - should get single lead by ID', async () => {
      const [inserted] = await db.insert(leads).values({
        name: 'Test Lead',
        phone: '08123',
        status: 'new',
      }).returning();

      const response = await request(app)
        .get(`/api/leads/${inserted.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Lead');
    });

    it('PATCH /api/leads/:id - should update lead details', async () => {
      const [inserted] = await db.insert(leads).values({
        name: 'Original Lead',
        phone: '08123',
        status: 'new',
      }).returning();

      const response = await request(app)
        .patch(`/api/leads/${inserted.id}`)
        .send({ name: 'Updated Lead Name', status: 'contacted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Lead Name');
      expect(response.body.data.status).toBe('contacted');
    });
  });
});
