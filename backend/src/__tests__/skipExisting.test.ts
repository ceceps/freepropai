import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { AcehomeScraperService } from '../services/acehomeScraper.service';

/**
 * Rule under test (scraper level):
 *  - a card whose id is already stored is skipped, no detail fetch
 *  - paging CONTINUES past a page that was entirely already-stored
 *  - paging stops only when a page has no cards at all
 *  - single-listing (detail URL) path still returns exactly one item, so the
 *    orchestrator's filter can drop it when it is a duplicate
 */

const card = (id: string, title: string) => `
  <div class="col-6 mb-3"><div class="card h-100">
    <img class="card-img-top" src="https://content.prolov.id/${id}.jpeg" />
    <h5 class="card-title"><a href="https://www.acehome.co.id/project/detail/${id}">${title}</a></h5>
    <span class="card-text">Rp850.000.000</span>
  </div></div>`;

const pageHtml = (cards: string[]) => `<!DOCTYPE html><html><body>${cards.join('')}</body></html>`;

const detailHtml = (id: string, title: string) => `
<!DOCTYPE html><html><head><title>${title} - Acehome</title></head><body>
  <div class="mobile-view">
    <h4>${title}</h4><h6>${id}</h6>
    <ul id="imageGallery"><li data-src="https://content.prolov.id/${id}.jpeg"><img src="x"/></li></ul>
    <div class="row"><div class="col-md-12">
      <strong>Harga</strong><br>Rp850.000.000<br>
      <strong>Detail</strong><br>Luas Tanah: 159<br>Luas Bangunan: 90<br>Kamar Tidur: 2<br>Kamar Mandi: 2<br>
      <strong>Deskripsi</strong><p>Rumah bagus</p>
      <strong>Lokasi</strong><br>Batu Indah Regency
    </div></div>
  </div>
</body></html>`;

describe('AcehomeScraperService — skip already-scraped listings', () => {
  let service: AcehomeScraperService;
  let getSpy: any;
  let requested: string[];

  beforeEach(() => {
    service = new AcehomeScraperService();
    requested = [];
    getSpy = vi.spyOn(axios, 'get').mockImplementation(async (url: any) => {
      requested.push(String(url));
      // any /project/detail/<id> URL -> detail page
      const m = String(url).match(/\/project\/detail\/([^?]+)/);
      if (m) return { data: detailHtml(m[1], `Detail ${m[1]}`) } as any;
      if (String(url).includes('/page/2')) {
        return { data: pageHtml([card('ACNEW2', 'Baru Halaman 2'), card('ACOLD2', 'Lama Halaman 2')]) } as any;
      }
      // page 1: one old, one new
      return { data: pageHtml([card('ACOLD1', 'Lama Halaman 1'), card('ACNEW1', 'Baru Halaman 1')]) } as any;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('skips stored ids and does not fetch their detail page', async () => {
    const out = await service.scrapeListings({
      url: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      maxPages: 1,
      skipSourceIds: new Set(['ACOLD1']),
    });

    expect(out.map(l => l.sourceId)).toEqual(['ACNEW1']);
    // the skipped card's detail page must never be requested
    expect(requested.some(u => u.includes('ACOLD1'))).toBe(false);
    expect(requested.some(u => u.includes('ACNEW1'))).toBe(true);
  });

  it('continues to page 2 when a page is entirely already-stored', async () => {
    // page 1 will be all-duplicate, page 2 has one new listing
    getSpy.mockImplementation(async (url: any) => {
      requested.push(String(url));
      const m = String(url).match(/\/project\/detail\/([^?]+)/);
      if (m) return { data: detailHtml(m[1], `Detail ${m[1]}`) } as any;
      if (String(url).includes('/page/2')) {
        return { data: pageHtml([card('ACNEW2', 'Baru Halaman 2')]) } as any;
      }
      return { data: pageHtml([card('ACOLD1', 'Lama'), card('ACOLD2', 'Lama')]) } as any;
    });

    const out = await service.scrapeListings({
      url: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      maxPages: 2,
      skipSourceIds: new Set(['ACOLD1', 'ACOLD2']),
    });

    // must NOT stop after page 1 — page 2's new listing has to come through
    expect(out.map(l => l.sourceId)).toContain('ACNEW2');
    // ...and the stored ones on page 1 must still be gone
    expect(out.map(l => l.sourceId)).not.toContain('ACOLD1');
    expect(out.map(l => l.sourceId)).not.toContain('ACOLD2');
    expect(requested.some(u => u.includes('/page/2'))).toBe(true);
  });

  it('stops only when a page has no cards at all', async () => {
    getSpy.mockImplementation(async (url: any) => {
      requested.push(String(url));
      const m = String(url).match(/\/project\/detail\/([^?]+)/);
      if (m) return { data: detailHtml(m[1], `Detail ${m[1]}`) } as any;
      if (String(url).includes('/page/2')) return { data: pageHtml([]) } as any;
      if (String(url).includes('/page/3')) return { data: pageHtml([card('ACNEW3', 'Halaman 3')]) } as any;
      return { data: pageHtml([card('ACNEW1', 'Baru')]) } as any;
    });

    const out = await service.scrapeListings({
      url: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      maxPages: 3,
      skipSourceIds: new Set(),
    });

    expect(out.map(l => l.sourceId)).toEqual(['ACNEW1']);
    // page 3 must never be fetched — empty page 2 ends the run
    expect(requested.some(u => u.includes('/page/3'))).toBe(false);
  });

  it('does not emit the same id twice across pages', async () => {
    getSpy.mockImplementation(async (url: any) => {
      requested.push(String(url));
      const m = String(url).match(/\/project\/detail\/([^?]+)/);
      if (m) return { data: detailHtml(m[1], `Detail ${m[1]}`) } as any;
      // same listing on both pages (source reorders)
      return { data: pageHtml([card('ACSAME', 'Sama')]) } as any;
    });

    const out = await service.scrapeListings({
      url: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      maxPages: 2,
      skipSourceIds: new Set(),
    });

    expect(out.map(l => l.sourceId)).toEqual(['ACSAME']);
  });

  it('single detail URL still returns one item (orchestrator decides to skip)', async () => {
    const out = await service.scrapeListingDetail(
      'https://www.acehome.co.id/project/detail/ACOLD1'
    );
    expect(out).not.toBeNull();
    expect(out!.sourceId).toBe('ACOLD1');
  });
});
