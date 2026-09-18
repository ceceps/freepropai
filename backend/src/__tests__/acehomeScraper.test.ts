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
      expect(result[0].description).toContain('Rumah Siap Huni Strategis');
      expect(result[0].description).toContain('Selling Point');
      expect(result[0].description).toContain('- Dekat stasiun');
      expect(result[0].description).not.toMatch(/Lokasi\s*Batu Indah/i);

      axiosMock.mockRestore();
    });
  });

  describe('deriveMeta (category + region from URL)', () => {
    const derive = (url: string) => (new AcehomeScraperService() as any).deriveMeta(url);

    it('maps reg code to readable region name and kat to propertyType', () => {
      expect(derive('https://www.acehome.co.id/?reg=BUT&kat=rumah'))
        .toEqual({ propertyType: 'rumah', region: 'Bandung Utara' });
      expect(derive('https://www.acehome.co.id/?reg=BBR&kat=tanah'))
        .toEqual({ propertyType: 'tanah', region: 'Bandung Barat' });
      expect(derive('https://www.acehome.co.id/?reg=KWG&kat=komersil'))
        .toEqual({ propertyType: 'komersil', region: 'Karawang' });
    });

    it('treats status=sewa as the property type regardless of kat', () => {
      expect(derive('https://www.acehome.co.id/?reg=BKS&kat=rumah&status=sewa'))
        .toEqual({ propertyType: 'sewa', region: 'Bekasi' });
    });

    it('falls back to defaults for unknown reg/kat', () => {
      expect(derive('https://www.acehome.co.id/?reg=ZZZ&kat=unknown'))
        .toEqual({ propertyType: 'rumah', region: null });
      expect(derive('https://www.acehome.co.id/'))
        .toEqual({ propertyType: 'rumah', region: null });
    });
  });

  describe('Deskripsi parsing (full block, stop at Lokasi)', () => {
    it('captures paragraphs and list items and excludes the Lokasi block', async () => {
      const html = `
<!DOCTYPE html><html><body>
  <h4>Rumah Villa 2 Lantai Asri di Graha Puspa Parongpong</h4>
  <h6>ACBBR1054</h6>
  <div class="col-md-12">
    <strong>Harga</strong><br>Rp1.800.000.000<br><br>
    <strong>Detail</strong><br>
    Jumlah Lantai: 2<br>
    Luas Tanah: 375<br>
    Luas Bangunan: 200<br>
    Kamar Tidur: 5<br>
    Kamar Mandi: 3<br>
    Sertifikat: shm<br><br>
    <strong>Deskripsi</strong>
    <p><strong>Rumah Villa 2 Lantai Asri di Graha Puspa Parongpong</strong></p>
    <p><strong>Note:</strong></p>
    <ul>
      <li>Investasi Terbaik &amp; Harga Kompetitif</li>
      <li>Kawasan Elite, Asri &amp; Bebas Banjir</li>
      <li>Kapasitas Besar 2 Lantai 5 KT &amp; 3 KM</li>
    </ul>
    <p><strong>CARA BAYAR : CASH DAN KPR</strong></p>
    <p><strong>AKSES LOKASI : 2 MOBIL</strong></p>
    <p><strong>SURVEY : JANJIAN SATU HARI SEBELUMNYA</strong></p>
    <br>
    <p><strong>Lokasi</strong><br>Graha Puspa </p>
  </div>
</body></html>`;
      const axiosMock = vi.spyOn(axios, 'get').mockResolvedValue({ data: html });

      const result = await service.scrapeListingDetail('https://www.acehome.co.id/project/detail/f2f9567a-d96a-4859-a362-33b78ada92a6?reg=BBR&kat=rumah');

      expect(result!.description).toContain('Rumah Villa 2 Lantai Asri di Graha Puspa Parongpong');
      expect(result!.description).toContain('Note:');
      expect(result!.description).toContain('- Investasi Terbaik & Harga Kompetitif');
      expect(result!.description).toContain('- Kawasan Elite, Asri & Bebas Banjir');
      expect(result!.description).toContain('CARA BAYAR : CASH DAN KPR');
      expect(result!.description).toContain('AKSES LOKASI : 2 MOBIL');
      expect(result!.description).toContain('SURVEY : JANJIAN SATU HARI SEBELUMNYA');
      expect(result!.description).not.toMatch(/Graha Puspa\s*$/);
      expect(result!.location).toBe('Graha Puspa');

      axiosMock.mockRestore();
    });
  });

  describe('Lokasi parsing (exact label, not description sentences)', () => {
    it('returns the short Lokasi label value, not a "Lokasi ..." description paragraph', async () => {
      const trickyHtml = `
<!DOCTYPE html><html><body>
  <h4>Rumah Test</h4>
  <h6>ACBUT1009</h6>
  <div class="col-md-12">
    <strong>Deskripsi</strong>
    <p><strong>Lokasi strategis di kawasan Pondok Hijau Gerlong, dekat ke Setiabudi, UPI, pusat kuliner, sekolah, dan berbagai fasilitas umum lainnya yang sangat lengkap sekali di sini</strong></p>
    <p><strong>Lokasi</strong><br>pondok hijau</p>
  </div>
</body></html>`;
      const axiosMock = vi.spyOn(axios, 'get').mockResolvedValue({ data: trickyHtml });

      const result = await service.scrapeListingDetail('https://www.acehome.co.id/project/detail/x?reg=BUT&kat=rumah');

      expect(result!.location).toBe('pondok hijau');
      expect(result!.location.length).toBeLessThanOrEqual(255);
      expect(result!.region).toBe('Bandung Utara');
      expect(result!.propertyType).toBe('rumah');

      axiosMock.mockRestore();
    });
  });
});
