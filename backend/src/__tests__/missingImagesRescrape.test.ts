import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { listings, listingPhotos } from '../db/schema';
import { ScrapingOrchestratorService } from '../services/scrapingOrchestrator.service';

const ORCH = new ScrapingOrchestratorService();

describe('Imported listings missing image assets', () => {
  let tmpDir: string;
  const originalUploadDir = (ORCH as any).uploadDir;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'listing-photos-'));
    (ORCH as any).uploadDir = tmpDir;
    await db.delete(listingPhotos);
    await db.delete(listings);
  });

  afterEach(() => {
    (ORCH as any).uploadDir = originalUploadDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('detects source names from listing URLs', () => {
    expect(ORCH.detectSourceName('https://www.acehome.co.id/project/detail/abc')).toBe('acehome');
    expect(ORCH.detectSourceName('https://hepihos.com/project/detail/abc?page=cecep')).toBe('hepihos');
    expect(ORCH.detectSourceName('https://prolov.id/find/project/abc')).toBe('prolov');
    expect(ORCH.detectSourceName('https://rumah123.com/listing/1')).toBeNull();
    expect(ORCH.detectSourceName('not-a-url')).toBeNull();
  });

  it('treats listings with no photos as missing assets', async () => {
    const [listing] = await db.insert(listings).values({
      title: 'No photos',
      location: 'Bandung',
      price: '1000000000',
      sourceUrl: 'https://hepihos.com/project/detail/abc',
    }).returning();

    expect(await ORCH.listingMissingImageAssets(listing.id)).toBe(true);
  });

  it('treats remote photo URLs as present assets', async () => {
    const [listing] = await db.insert(listings).values({
      title: 'Remote photos',
      location: 'Bandung',
      price: '1000000000',
      sourceUrl: 'https://www.acehome.co.id/project/detail/abc',
    }).returning();

    await db.insert(listingPhotos).values({
      listingId: listing.id,
      photoUrl: 'https://content.prolov.id/app/project/img.jpeg',
      photoOrder: 0,
    });

    expect(await ORCH.listingMissingImageAssets(listing.id)).toBe(false);
  });

  it('treats local photos as missing when the file is gone', async () => {
    const [listing] = await db.insert(listings).values({
      title: 'Broken local photos',
      location: 'Bandung',
      price: '1000000000',
      sourceUrl: 'https://hepihos.com/project/detail/missing-file',
    }).returning();

    await db.insert(listingPhotos).values({
      listingId: listing.id,
      photoUrl: '/uploads/does-not-exist.avif',
      photoOrder: 0,
    });

    expect(await ORCH.listingMissingImageAssets(listing.id)).toBe(true);
  });

  it('treats local photos as present when the file exists', async () => {
    const filename = 'present.avif';
    fs.writeFileSync(path.join(tmpDir, filename), 'avif');

    const [listing] = await db.insert(listings).values({
      title: 'Local photos',
      location: 'Bandung',
      price: '1000000000',
      sourceUrl: 'https://hepihos.com/project/detail/present-file',
    }).returning();

    await db.insert(listingPhotos).values({
      listingId: listing.id,
      photoUrl: `/uploads/${filename}`,
      photoOrder: 0,
    });

    expect(await ORCH.listingMissingImageAssets(listing.id)).toBe(false);
  });

  it('lists imported listings that are missing image files', async () => {
    await db.insert(listings).values([
      {
        title: 'Manual listing',
        location: 'Jakarta',
        price: '500000000',
      },
      {
        title: 'Sourced missing photos',
        location: 'Bandung',
        price: '900000000',
        sourceUrl: 'https://hepihos.com/project/detail/need-photos',
      },
    ]);

    const missing = await ORCH.findImportedListingsMissingImages();
    expect(missing).toHaveLength(1);
    expect(missing[0].title).toBe('Sourced missing photos');
  });

  it('rescrapes missing image listings and downloads photos', async () => {
    const [listing] = await db.insert(listings).values({
      title: 'Need refresh',
      location: 'Parongpong',
      price: '1500000000',
      sourceUrl: 'https://hepihos.com/project/detail/need-refresh',
    }).returning();

    vi.spyOn(ORCH, 'scrapeDetailBySource').mockResolvedValue({
      title: 'Need refresh',
      imageUrls: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
    });
    vi.spyOn(ORCH as any, 'downloadAndSaveImages').mockResolvedValue(2);

    const result = await ORCH.rescrapeImportedMissingImages();

    expect(result.missing).toBe(1);
    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0]).toMatchObject({
      listingId: listing.id,
      status: 'refreshed',
      imagesDownloaded: 2,
    });
    expect(ORCH.scrapeDetailBySource).toHaveBeenCalledWith(
      'hepihos',
      'https://hepihos.com/project/detail/need-refresh'
    );
  });

  it('skips listings whose source has no images', async () => {
    await db.insert(listings).values({
      title: 'No source images',
      location: 'Bandung',
      price: '700000000',
      sourceUrl: 'https://www.acehome.co.id/project/detail/no-images',
    });

    vi.spyOn(ORCH, 'scrapeDetailBySource').mockResolvedValue({
      title: 'No source images',
      imageUrls: [],
    });

    const result = await ORCH.rescrapeImportedMissingImages();
    expect(result.skipped).toBe(1);
    expect(result.results[0].status).toBe('skipped');
  });
});

describe('POST /api/scraping/listings/rescrape-missing-images', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns rescrape summary', async () => {
    vi.spyOn(ScrapingOrchestratorService.prototype, 'rescrapeImportedMissingImages').mockResolvedValue({
      scanned: 2,
      missing: 2,
      refreshed: 1,
      failed: 0,
      skipped: 1,
      results: [],
    });

    const res = await request(app)
      .post('/api/scraping/listings/rescrape-missing-images')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.refreshed).toBe(1);
    expect(res.body.data.skipped).toBe(1);
  });
});
