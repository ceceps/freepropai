import { db } from '../db';
import { leads, listings, followUps } from '../db/schema';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';

export class DashboardStatsService {
  async getStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Leads
    const [[totalLeads], [newLeads7d], leadScores] = await Promise.all([
      db.select({ value: count() }).from(leads),
      db.select({ value: count() }).from(leads).where(gte(leads.createdAt, sevenDaysAgo)),
      db.select({ score: leads.score, value: count() }).from(leads).groupBy(leads.score),
    ]);

    const scoreMap: Record<string, number> = {};
    for (const row of leadScores) {
      if (row.score) scoreMap[row.score] = Number(row.value);
    }

    // Listings (excluding soft-deleted)
    const [[totalListings], [activeListings], [draftListings]] = await Promise.all([
      db.select({ value: count() }).from(listings).where(isNull(listings.deletedAt)),
      db
        .select({ value: count() })
        .from(listings)
        .where(and(isNull(listings.deletedAt), inArray(listings.status, ['published', 'active']))),
      db
        .select({ value: count() })
        .from(listings)
        .where(and(isNull(listings.deletedAt), eq(listings.status, 'draft'))),
    ]);

    // Follow-ups
    const [[totalFollowUps], [pendingFollowUps]] = await Promise.all([
      db.select({ value: count() }).from(followUps),
      db.select({ value: count() }).from(followUps).where(eq(followUps.status, 'pending')),
    ]);

    // Recent leads for the dashboard tab
    const recentLeads = await db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        location: leads.location,
        unitType: leads.unitType,
        score: leads.score,
        urgency: leads.urgency,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(8);

    // Recent listings (lightweight, no per-listing photo/desc queries)
    const recentListings = await db
      .select({
        id: listings.id,
        title: listings.title,
        location: listings.location,
        price: listings.price,
        bedrooms: listings.bedrooms,
        bathrooms: listings.bathrooms,
        status: listings.status,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(isNull(listings.deletedAt))
      .orderBy(desc(listings.createdAt))
      .limit(8);

    // Recent follow-ups (joined with lead name for the activity feed)
    const recentFollowUps = await db
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        status: followUps.status,
        scheduledFor: followUps.scheduledFor,
        createdAt: followUps.createdAt,
        leadName: leads.name,
        leadPhone: leads.phone,
      })
      .from(followUps)
      .innerJoin(leads, eq(followUps.leadId, leads.id))
      .orderBy(desc(followUps.createdAt))
      .limit(8);

    return {
      counts: {
        totalLeads: Number(totalLeads.value),
        hotLeads: scoreMap.Hot || 0,
        warmLeads: scoreMap.Warm || 0,
        coldLeads: scoreMap.Cold || 0,
        newLeads7d: Number(newLeads7d.value),
        totalListings: Number(totalListings.value),
        activeListings: Number(activeListings.value),
        draftListings: Number(draftListings.value),
        totalFollowUps: Number(totalFollowUps.value),
        pendingFollowUps: Number(pendingFollowUps.value),
      },
      recentLeads,
      recentListings: recentListings.map((l) => ({
        ...l,
        price: l.price ? parseFloat(l.price) : null,
      })),
      recentFollowUps,
    };
  }
}

export const dashboardStatsService = new DashboardStatsService();
