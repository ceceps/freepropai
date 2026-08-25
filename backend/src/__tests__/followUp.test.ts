import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { leads, followUps } from '../db/schema';
import { followUpSchedulerService } from '../services/followUpScheduler.service';
import { llmClient } from '../utils/llmClient';

// Mock LLM Client
vi.spyOn(llmClient, 'generateCompletion').mockResolvedValue('Halo Kak Budi, mau menanyakan kelanjutan rumah di Batam Centre.');

describe('Follow-up Scheduler System (Phase 4)', () => {
  let testLeadId: string;

  beforeEach(async () => {
    // Clean up DB before each test
    await db.delete(followUps);
    await db.delete(leads);

    // Seed test lead
    const [lead] = await db.insert(leads).values({
      name: 'Budi Santoso',
      phone: '08123456789',
      unitType: 'Rumah',
      location: 'Batam Centre',
      urgency: 'immediate',
      score: 'Hot',
      notes: 'Cari rumah 3 KT',
      status: 'new',
    }).returning();

    testLeadId = lead.id;
  });

  describe('FollowUpSchedulerService', () => {
    it('should generate follow up message and schedule it', async () => {
      const followUp = await followUpSchedulerService.generateAndSchedule({
        leadId: testLeadId,
        contextMessage: 'Sudah di-follow up 1 kali',
        scheduledForDays: 2,
      });

      expect(followUp.id).toBeDefined();
      expect(followUp.leadId).toBe(testLeadId);
      expect(followUp.status).toBe('pending');
      expect(followUp.messageDraft).toBeDefined();
    });

    it('should approve and reject follow ups', async () => {
      const followUp = await followUpSchedulerService.generateAndSchedule({
        leadId: testLeadId,
      });

      const approved = await followUpSchedulerService.approve(followUp.id, 'Agent Budi');
      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('Agent Budi');

      const rejected = await followUpSchedulerService.reject(followUp.id, 'Not suitable');
      expect(rejected?.status).toBe('rejected');
      expect(rejected?.rejectionReason).toBe('Not suitable');
    });
  });

  describe('Follow-up API Endpoints', () => {
    it('POST /api/followups/generate - should generate a new follow-up', async () => {
      const response = await request(app)
        .post('/api/followups/generate')
        .send({
          leadId: testLeadId,
          contextMessage: 'Tawarkan opsi unit baru',
          scheduledForDays: 1,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leadId).toBe(testLeadId);
      expect(response.body.data.messageDraft).toBeDefined();
    });

    it('GET /api/followups/queue - should return queued follow-ups with lead details', async () => {
      await followUpSchedulerService.generateAndSchedule({ leadId: testLeadId });

      const response = await request(app)
        .get('/api/followups/queue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].leadName).toBe('Budi Santoso');
    });

    it('PATCH /api/followups/:id/approve - should approve follow-up draft', async () => {
      const followUp = await followUpSchedulerService.generateAndSchedule({ leadId: testLeadId });

      const response = await request(app)
        .patch(`/api/followups/${followUp.id}/approve`)
        .send({ approvedBy: 'John' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });

    it('PATCH /api/followups/:id/reject - should reject follow-up draft', async () => {
      const followUp = await followUpSchedulerService.generateAndSchedule({ leadId: testLeadId });

      const response = await request(app)
        .patch(`/api/followups/${followUp.id}/reject`)
        .send({ reason: 'Draft is wrong' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    it('PATCH /api/followups/:id/edit - should edit message draft', async () => {
      const followUp = await followUpSchedulerService.generateAndSchedule({ leadId: testLeadId });

      const response = await request(app)
        .patch(`/api/followups/${followUp.id}/edit`)
        .send({ messageDraft: 'Pesan kustom baru' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messageDraft).toBe('Pesan kustom baru');
    });
  });
});
