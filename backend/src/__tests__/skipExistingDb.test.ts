import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { scrapedListings, scrapingJobs, listings } from '../db/schema';
import { ScrapingOrchestratorService } from '../services/scrapingOrchestrator.service';

/**
 * DB-level half of the skip rule. The scraper test proves cards are skipped;
 * this proves the orchestrator refuses to store a row that is already in the DB
 * — including the single/detail path, which is what caused the duplicates.
 *
 * Runs against the test DB (NODE_ENV=test -> .env.test -> freepropai_test);
 * setup.ts TRUNCATEs between tests, production data is never touched.
 */

const ORCH = new ScrapingOrchestratorService();
const call = <T,>(fn: string, ...args: any[]) =>
  (ORCH as any)[fn](...args) as Promise<T>;

const row = (sourceId: string | null, listingUrl: string, title = 'Rumah Test') => ({
  sourceId,
  listingUrl,
  title,
  price: 850000000,
  location: 'Bandung Barat',
  propertyType: 'rumah',
  region: 'BBR',
  description: 'desc',
  imageUrls: [],
});

async function makeJob() {
  const [job] = await db
    .insert(scrapingJobs)
    .values({
      sourceName: 'acehome',
      sourceUrl: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      status: 'running',
    } as any)
    .returning();
  return job;
}

describe('ScrapingOrchestratorService — skip listings already in DB', () => {
  beforeEach(async () => {
    await db.delete(scrapedListings);
    await db.delete(scrapingJobs);
    await db.delete(listings);
  });

  it('drops a scraped row whose source_id is already stored', async () => {
    const job = await makeJob();
    await db.insert(scrapedListings).values({
      scrapingJobId: job.id,
      sourceId: 'ACBBR1035',
      sourceUrl: 'https://www.acehome.co.id/project/detail/ACBBR1035',
      title: 'Sudah Ada',
    } as any);

    const { fresh, skipped } = await call<{ fresh: any[]; skipped: number }>(
      'filterExisting',
      [row('ACBBR1035', 'https://www.acehome.co.id/project/detail/ACBBR1035')]
    );

    expect(fresh).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('drops a scraped row whose url is already imported into listings', async () => {
    // the single/detail path: no scraped_listings row, but already in listings
    const url = 'https://www.acehome.co.id/project/detail/ACOLD9';
    await db.insert(listings).values({
      sourceUrl: url,
      title: 'Sudah Diimpor',
      location: 'Bandung Barat',
      price: '850000000',
    } as any);

    const { fresh, skipped } = await call<{ fresh: any[]; skipped: number }>(
      'filterExisting',
      [row('ACOLD9', url)]
    );

    expect(fresh).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('keeps rows that are genuinely new', async () => {
    const job = await makeJob();
    await db.insert(scrapedListings).values({
      scrapingJobId: job.id,
      sourceId: 'ACOLD1',
      sourceUrl: 'https://www.acehome.co.id/project/detail/ACOLD1',
      title: 'Lama',
    } as any);

    const { fresh, skipped } = await call<{ fresh: any[]; skipped: number }>(
      'filterExisting',
      [
        row('ACOLD1', 'https://www.acehome.co.id/project/detail/ACOLD1'),
        row('ACNEW1', 'https://www.acehome.co.id/project/detail/ACNEW1'),
      ]
    );

    expect(fresh.map(r => r.sourceId)).toEqual(['ACNEW1']);
    expect(skipped).toBe(1);
  });

  it('drops duplicates inside one batch', async () => {
    const url = 'https://www.acehome.co.id/project/detail/ACSAME';
    const { fresh, skipped } = await call<{ fresh: any[]; skipped: number }>(
      'filterExisting',
      [row('ACSAME', url), row('ACSAME', url)]
    );

    expect(fresh).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('loadKnownSourceIds covers both tables and derives ids from listings URLs', async () => {
    const job = await makeJob();
    await db.insert(scrapedListings).values({
      scrapingJobId: job.id,
      sourceId: 'ACFROMSCRAPED',
      sourceUrl: 'https://www.acehome.co.id/project/detail/ACFROMSCRAPED',
      title: 'A',
    } as any);
    await db.insert(listings).values({
      sourceUrl: 'https://www.acehome.co.id/project/detail/ACFROMLISTINGS',
      title: 'B',
      location: 'Bandung Barat',
      price: '1',
    } as any);

    const ids = await call<Set<string>>('loadKnownSourceIds');

    expect(ids.has('ACFROMSCRAPED')).toBe(true);
    expect(ids.has('ACFROMLISTINGS')).toBe(true);
    expect(ids.has('ACNOTHING')).toBe(false);
  });
});
