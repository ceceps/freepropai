import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('auto-imports qualifying pending rows and skips sold or incomplete ones', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('skip image download in tests'));
    const job = await makeJob();
    const urlOpen = 'https://www.acehome.co.id/project/detail/ACOPEN1';
    const urlSold = 'https://www.acehome.co.id/project/detail/ACSOLD1';
    const urlDup = 'https://www.acehome.co.id/project/detail/ACDUP1';

    await db.insert(listings).values({
      sourceUrl: urlDup,
      title: 'Already in listings',
      location: 'Bandung Barat',
      price: '1',
    } as any);

    await db.insert(scrapedListings).values([
      {
        scrapingJobId: job.id,
        sourceId: 'ACOPEN1',
        sourceUrl: urlOpen,
        title: 'Rumah Open',
        location: 'Parongpong',
        price: '2000000000',
        imageUrls: ['https://example.com/a.jpg'],
        importStatus: 'pending',
        rawData: { marketStatus: 'OPEN' },
      },
      {
        scrapingJobId: job.id,
        sourceId: 'ACSOLD1',
        sourceUrl: urlSold,
        title: 'Rumah Terjual',
        location: 'Cimahi',
        price: '1500000000',
        imageUrls: ['https://example.com/b.jpg'],
        importStatus: 'pending',
        rawData: { ribbonText: 'Sold' },
      },
      {
        scrapingJobId: job.id,
        sourceId: 'ACDUP1',
        sourceUrl: urlDup,
        title: 'Duplikat',
        location: 'Lembang',
        price: '900000000',
        imageUrls: ['https://example.com/c.jpg'],
        importStatus: 'pending',
        rawData: { marketStatus: 'OPEN' },
      },
    ] as any);

    const result = await call<{ imported: number; skipped: number }>('autoImportQualifying', job.id);

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);

    const rows = await db.select().from(scrapedListings);
    const byId = Object.fromEntries(rows.map((r) => [r.sourceId, r]));
    expect(byId.ACOPEN1.importStatus).toBe('imported');
    expect(byId.ACOPEN1.importedListingId).toBeTruthy();
    expect(byId.ACSOLD1.importStatus).toBe('skipped');
    expect(byId.ACDUP1.importStatus).toBe('imported');

    const listingRows = await db.select().from(listings);
    const sourced = listingRows.filter((r) => r.sourceUrl === urlOpen);
    expect(sourced).toHaveLength(1);
    expect(listingRows.filter((r) => r.sourceUrl === urlDup)).toHaveLength(1);
  });
});
