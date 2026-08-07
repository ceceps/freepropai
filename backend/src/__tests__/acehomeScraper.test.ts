import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { AcehomeScraperService } from '../services/acehomeScraper.service';

describe('AcehomeScraperService', () => {
  let service: AcehomeScraperService;

  const detailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="og:title" content="Rumah Siap Huni Strategis - Acehome" />
  <title>Rumah Siap Huni Strategis - Acehome</title>
</head>
<body>
  <div class="mobile-view">
    <h4>Rumah Siap Huni Strategis</h4>
    <h6>ACBBR1035</h6>
    <ul id="imageGallery" class="gallery">
      <li data-thumb="https://content.prolov.id/app/project/202608/thumbnail/img1.jpeg" data-src="https://content.prolov.id/app/project/202608/original/img1.jpeg">
        <img src="https://content.prolov.id/app/project/202608/thumbnail/img1.jpeg" />
      </li>
      <li data-src="https://content.prolov.id/app/project/202608/original/img2.jpeg"><img src="img2" /></li>
    </ul>
    <div class="row">
      <div class="col-md-12">
        <strong>Harga</strong><br>Rp850.000.000<br>
        <strong>Detail</strong><br>
        Jumlah Lantai: 1<br>
        Luas Tanah: 159<br>
        Luas Bangunan: 90<br>
        Kamar Tidur: 2<br>
        Kamar Mandi: 2<br>
        Sumber Air: Sumur Bor<br>
        Listrik: 1300<br>
        <strong>Deskripsi</strong>
        <p><strong>Rumah Siap Huni Strategis</strong></p>
        <p>Selling Point</p>
        <ul><li>Dekat stasiun</li></ul>
        <p><strong>Lokasi</strong><br>Batu Indah Regency Saphire</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

  beforeEach(() => {
    service = new AcehomeScraperService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parsePrice', () => {
    it('parses Indonesian price format to number', () => {
      // Use reflect to access private method for testing
      const parsePrice = (service as any).parsePrice.bind(service);
      expect(parsePrice('Rp850.000.000')).toBe(850000000);
      expect(parsePrice('Rp1.600.000.000')).toBe(1600000000);
      expect(parsePrice('Rp450.000.000')).toBe(450000000);
    });

    it('handles empty or invalid input', () => {
      const parsePrice = (service as any).parsePrice.bind(service);
      expect(parsePrice('')).toBeNull();
      expect(parsePrice(null)).toBeNull();
      expect(parsePrice('RpABC')).toBeNull();
    });
  });

  describe('isValidAcehomeUrl', () => {
    it('accepts valid acehome.co.id URLs', () => {
      expect(service.isValidAcehomeUrl('https://www.acehome.co.id/?reg=BBR&kat=rumah')).toBe(true);
      expect(service.isValidAcehomeUrl('https://www.acehome.co.id/project/detail/uuid')).toBe(true);
    });

    it('rejects non-acehome URLs', () => {
      expect(service.isValidAcehomeUrl('https://rumah123.com')).toBe(false);
      expect(service.isValidAcehomeUrl('https://example.com')).toBe(false);
      expect(service.isValidAcehomeUrl('not a url')).toBe(false);
    });
  });

  describe('buildPageUrl', () => {
    it('builds paginated URL from root listing URL', () => {
      const buildPageUrl = (service as any).buildPageUrl.bind(service);
      const url = buildPageUrl('https://www.acehome.co.id/?reg=BBR&kat=rumah', 2);
      expect(url).toBe('https://www.acehome.co.id/page/2?reg=BBR&kat=rumah');
    });

    it('replaces existing page number', () => {
      const buildPageUrl = (service as any).buildPageUrl.bind(service);
      const url = buildPageUrl('https://www.acehome.co.id/page/3?reg=BBR&kat=rumah', 5);
      expect(url).toBe('https://www.acehome.co.id/page/5?reg=BBR&kat=rumah');
    });
  });

  describe('extractIdFromUrl', () => {
    it('extracts UUID from detail URL', () => {
      const extractIdFromUrl = (service as any).extractIdFromUrl.bind(service);
      expect(extractIdFromUrl('https://www.acehome.co.id/project/detail/c6c20d4b-5e68-46e2-ad05-cfaea72a7b37'))
        .toBe('c6c20d4b-5e68-46e2-ad05-cfaea72a7b37');
    });

    it('returns empty string for invalid URL', () => {
      const extractIdFromUrl = (service as any).extractIdFromUrl.bind(service);
      expect(extractIdFromUrl('not a url')).toBe('');
    });
  });

  describe('scrapePage HTML parsing', () => {
    it('extracts listings from acehome card HTML structure', async () => {
      const sampleHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="mobile-view">
    <div class="row">
      <div class="col-6 mb-3">
        <div class="card h-100">
          <a href="https://www.acehome.co.id/project/detail/uuid1">
            <img class="card-img-top" src="https://content.prolov.id/app/project/202608/thumbnail/img1.jpeg" alt="Loading..">
          </a>
          <div class="card-body">
            <span class="card-text"> Rp850.000.000 </span>
            <h5 class="card-title"><a href="https://www.acehome.co.id/project/detail/uuid1">Rumah Siap Huni Strategis</a></h5>
            <span class="card-text" style="font-size:10px;"> NGAMPRAH, BANDUNG BARAT </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const axiosMock = vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/project/detail/')) {
          return { data: detailHtml };
        }
        return { data: sampleHtml };
      });

      const result = await (service as any).scrapePage('https://www.acehome.co.id/?reg=BBR&kat=rumah');

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Rumah Siap Huni Strategis');
      expect(result[0].price).toBe(850000000);
      expect(result[0].location).toBe('Batu Indah Regency Saphire');
      expect(result[0].listingUrl).toBe('https://www.acehome.co.id/project/detail/uuid1');
      expect(result[0].sourceId).toBe('ACBBR1035');
      expect(result[0].imageUrls.length).toBe(2);

      axiosMock.mockRestore();
    });
  });

  describe('scrapeListingDetail HTML parsing', () => {
    it('extracts full details including location, description and images', async () => {
      const axiosMock = vi.spyOn(axios, 'get').mockResolvedValue({
        data: detailHtml,
      });

      const result = await service.scrapeListingDetail('https://www.acehome.co.id/project/detail/uuid1');

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Rumah Siap Huni Strategis');
      expect(result!.price).toBe(850000000);
      expect(result!.landArea).toBe(159);
      expect(result!.buildingArea).toBe(90);
      expect(result!.bedrooms).toBe(2);
      expect(result!.bathrooms).toBe(2);
      expect(result!.location).toBe('Batu Indah Regency Saphire');
      expect(result!.description).toContain('Rumah Siap Huni Strategis');
      expect(result!.description).toContain('Dekat stasiun');
      expect(result!.sourceId).toBe('ACBBR1035');
      expect(result!.imageUrls.length).toBe(2);
      expect(result!.imageUrls[0]).toBe('https://content.prolov.id/app/project/202608/original/img1.jpeg');

      axiosMock.mockRestore();
    });
  });
});
