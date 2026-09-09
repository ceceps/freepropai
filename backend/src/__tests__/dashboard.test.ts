import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { leads, listings, followUps } from '../db/schema';
import { dashboardStatsService } from '../services/dashboardStats.service';

describe('Dashboard Stats Endpoint', () => {
  beforeEach(async () => {
    const [lead] = await db
      .insert(leads)
      .values([
        {
          name: 'Budi',
          phone: '08123456789',
          location: 'Batam Centre',
          unitType: 'Rumah',
          urgency: 'immediate',
          score: 'Hot',
          status: 'new',
        },
        {
          name: 'Siti',
          phone: '08987654321',
          location: 'Sekupang',
          unitType: 'Apartemen',
          urgency: 'soon',
          score: 'Warm',
          status: 'new',
        },
        {
          name: 'Andi',
          phone: '08219876543',
          location: 'Nagoya',
          unitType: 'Rumah',
          urgency: 'flexible',
          score: 'Cold',
          status: 'new',
        },
      ])
      .returning();

    await db.insert(listings).values([
      {
        title: 'Rumah Minimalis Batam Centre',
        location: 'Batam Centre',
        price: '1000000000',
        bedrooms: 3,
        bathrooms: 2,
        status: 'published',
      },
      {
        title: 'Apartemen Nagoya View',
        location: 'Nagoya',
        price: '750000000',
        bedrooms: 2,
        bathrooms: 1,
        status: 'draft',
      },
    ]);

    await db.insert(followUps).values([
      {
        leadId: lead.id,
        messageDraft: 'Halo Budi, ...',
        scheduledFor: new Date(Date.now() + 3600000),
        status: 'pending',
      },
    ]);
  });

  describe('DashboardStatsService', () => {
    it('should return aggregate counts from real data', async () => {
      const stats = await dashboardStatsService.getStats();

      expect(stats.counts.totalLeads).toBe(3);
      expect(stats.counts.hotLeads).toBe(1);
      expect(stats.counts.warmLeads).toBe(1);
      expect(stats.counts.coldLeads).toBe(1);
      expect(stats.counts.newLeads7d).toBe(3);

      expect(stats.counts.totalListings).toBe(2);
      expect(stats.counts.activeListings).toBe(1);
      expect(stats.counts.draftListings).toBe(1);

      expect(stats.counts.totalFollowUps).toBe(1);
      expect(stats.counts.pendingFollowUps).toBe(1);
    });

    it('should exclude soft-deleted listings from counts', async () => {
      const [target] = await db
        .select()
        .from(listings)
        .where(eq(listings.title, 'Rumah Minimalis Batam Centre'))
        .limit(1);

      await db.update(listings).set({ deletedAt: new Date() }).where(eq(listings.id, target.id));

      const stats = await dashboardStatsService.getStats();

      expect(stats.counts.totalListings).toBe(1);
      expect(stats.counts.activeListings).toBe(0);
    });

    it('should return recent leads and listings', async () => {
      const stats = await dashboardStatsService.getStats();

      expect(stats.recentLeads.length).toBe(3);
      expect(stats.recentLeads[0].name).toBeDefined();
      expect(stats.recentLeads[0].phone).toBeDefined();

      expect(stats.recentListings.length).toBe(2);
      expect(stats.recentListings[0].title).toBeDefined();
      expect(typeof stats.recentListings[0].price).toBe('number');

      expect(stats.recentFollowUps.length).toBe(1);
      expect(stats.recentFollowUps[0].leadName).toBe('Budi');
    });
  });

  describe('Dashboard API Endpoint', () => {
    it('GET /api/dashboard/stats - should return stats payload', async () => {
      const response = await request(app).get('/api/dashboard/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.counts.totalLeads).toBe(3);
      expect(response.body.data.counts.activeListings).toBe(1);
      expect(response.body.data.counts.pendingFollowUps).toBe(1);
      expect(response.body.data.recentLeads).toBeDefined();
      expect(response.body.data.recentListings).toBeDefined();
    });
  });
});
