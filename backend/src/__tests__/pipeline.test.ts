import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { PipelineNotConfiguredError } from '../db/pipeline';
import { pipelineService } from '../services/pipeline.service';

const sampleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Rumah Contoh',
  price: 1000000000,
  sourceName: 'Acehome',
};

describe('Pipeline Endpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns pipeline overview', async () => {
    vi.spyOn(pipelineService, 'getOverview').mockResolvedValue({
      sources: 2,
      listings: 62,
      activeListings: 62,
      analyses: 6,
      promoContent: 352,
      calendarItems: 735,
      pendingCalendar: 735,
    });

    const res = await request(app).get('/api/pipeline/overview').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.listings).toBe(62);
  });

  it('returns sources with listing counts', async () => {
    vi.spyOn(pipelineService, 'listSources').mockResolvedValue([
      { id: 1, code: 'acehome', name: 'Acehome', baseUrl: 'https://acehome.co.id', listingCount: 61 } as any,
      { id: 2, code: 'prolov', name: 'Prolov', baseUrl: 'https://prolov.id', listingCount: 1 } as any,
    ]);

    const res = await request(app).get('/api/pipeline/sources').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[1].name).toBe('Prolov');
  });

  it('returns paginated scraped listings and parses query params', async () => {
    const spy = vi
      .spyOn(pipelineService, 'listScrapedListings')
      .mockResolvedValue({ data: [sampleListing as any], total: 1, limit: 10, offset: 0 });

    const res = await request(app)
      .get('/api/pipeline/listings?sourceId=1&search=rumah&isActive=true&limit=10&offset=0')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].title).toBe('Rumah Contoh');
    expect(spy).toHaveBeenCalledWith({
      sourceId: 1,
      search: 'rumah',
      marketStatus: undefined,
      isActive: true,
      limit: 10,
      offset: 0,
    });
  });

  it('returns 404 for a missing scraped listing', async () => {
    vi.spyOn(pipelineService, 'getScrapedListing').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/pipeline/listings/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('returns a scraped listing with its analysis', async () => {
    vi.spyOn(pipelineService, 'getScrapedListing').mockResolvedValue({
      ...sampleListing,
      analysis: { id: 'a1', buyerPersona: 'Keluarga muda' },
    } as any);

    const res = await request(app).get(`/api/pipeline/listings/${sampleListing.id}`).expect(200);

    expect(res.body.data.analysis.buyerPersona).toBe('Keluarga muda');
  });

  it('returns listing analyses', async () => {
    vi.spyOn(pipelineService, 'listAnalyses').mockResolvedValue({
      data: [{ id: 'a1', buyerPersona: 'Investor' } as any],
      total: 1,
      limit: 24,
      offset: 0,
    });

    const res = await request(app).get('/api/pipeline/analyses').expect(200);

    expect(res.body.data[0].buyerPersona).toBe('Investor');
  });

  it('returns promo content', async () => {
    vi.spyOn(pipelineService, 'listPromoContent').mockResolvedValue({
      data: [{ id: 'p1', dayNum: 1, angle: 'Investasi' } as any],
      total: 1,
      limit: 24,
      offset: 0,
    });

    const res = await request(app).get('/api/pipeline/promo-content').expect(200);

    expect(res.body.data[0].angle).toBe('Investasi');
  });

  it('returns content calendar with parsed filters', async () => {
    const spy = vi
      .spyOn(pipelineService, 'listContentCalendar')
      .mockResolvedValue({ data: [], total: 0, limit: 24, offset: 0 });

    await request(app)
      .get('/api/pipeline/content-calendar?platform=instagram&approvalStatus=pending&from=2026-01-01')
      .expect(200);

    expect(spy).toHaveBeenCalledWith({
      listingId: undefined,
      platform: 'instagram',
      approvalStatus: 'pending',
      from: '2026-01-01',
      to: undefined,
      limit: undefined,
      offset: undefined,
    });
  });

  it('returns a content calendar item with its matched promo content', async () => {
    vi.spyOn(pipelineService, 'getContentCalendarItem').mockResolvedValue({
      id: 'cc1',
      hook: 'Dijual rumah',
      contentType: 'property_showcase',
      promo: {
        id: 'p1',
        angle: 'showcase',
        captionHpsc: 'Dijual rumah...',
        posterSpec: { public_url: '/posters/poster_1.jpg' },
        videoScript: null,
        videoMeta: null,
      },
    } as any);

    const res = await request(app).get('/api/pipeline/content-calendar/cc1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.promo.posterSpec.public_url).toBe('/posters/poster_1.jpg');
  });

  it('returns 404 for a missing content calendar item', async () => {
    vi.spyOn(pipelineService, 'getContentCalendarItem').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/pipeline/content-calendar/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('returns facets', async () => {
    vi.spyOn(pipelineService, 'getFacets').mockResolvedValue({
      platforms: ['instagram', 'tiktok'],
      approvalStatuses: ['approved', 'pending'],
      marketStatuses: ['UNKNOWN'],
      contentTypes: ['feed', 'story'],
    });

    const res = await request(app).get('/api/pipeline/facets').expect(200);

    expect(res.body.data.platforms).toContain('tiktok');
  });

  it('returns 503 when the pipeline database is not configured', async () => {
    vi.spyOn(pipelineService, 'getOverview').mockRejectedValue(new PipelineNotConfiguredError());

    const res = await request(app).get('/api/pipeline/overview').expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not configured');
  });
});
