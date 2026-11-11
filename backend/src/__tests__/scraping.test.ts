import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { ScrapingOrchestratorService } from '../services/scrapingOrchestrator.service';

describe('Scraping API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/scraping/configs returns active sources', async () => {
    const res = await request(app).get('/api/scraping/configs').expect(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.map((c: { sourceName: string }) => c.sourceName);
    expect(names).toEqual(expect.arrayContaining(['acehome', 'prolov', 'hepihos']));
  });

  it('POST /api/scraping/jobs requires sourceUrl and sourceName', async () => {
    const res = await request(app).post('/api/scraping/jobs').send({}).expect(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/scraping/jobs rejects unknown sources', async () => {
    const res = await request(app)
      .post('/api/scraping/jobs')
      .send({ sourceUrl: 'https://example.com', sourceName: 'unknown' })
      .expect(400);
    expect(res.body.error).toMatch(/Invalid source name/);
  });

  it('POST /api/scraping/jobs rejects host mismatch', async () => {
    const res = await request(app)
      .post('/api/scraping/jobs')
      .send({
        sourceUrl: 'https://prolov.id/find/project/abc',
        sourceName: 'acehome',
      })
      .expect(400);
    expect(res.body.error).toMatch(/acehome.co.id/);
  });

  it('POST /api/scraping/jobs creates a job without running the live scraper', async () => {
    vi.spyOn(ScrapingOrchestratorService.prototype, 'processJob').mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/scraping/jobs')
      .send({
        sourceUrl: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
        sourceName: 'acehome',
        maxPages: 1,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
    expect(res.body.data.status).toBe('pending');
  });

  it('POST /api/scraping/listings/import-batch requires ids', async () => {
    const res = await request(app)
      .post('/api/scraping/listings/import-batch')
      .send({ scrapedListingIds: [] })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});
