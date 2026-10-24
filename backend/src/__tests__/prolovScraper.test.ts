import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ProlovScraperService } from '../services/prolovScraper.service';

describe('ProlovScraperService', () => {
  let service: ProlovScraperService;

  const detailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="og:title" content="Rumah Super Luas Di Sindanglaya  - Prolov" />
  <title>Rumah Super Luas Di Sindanglaya  - Prolov</title>
</head>
<body>
  <div class="mobile-view">
    <h4>Rumah Super Luas Di Sindanglaya </h4>
    <ul id="imageGallery" class="gallery">
      <li data-thumb="https://content.prolov.id/app/project/202508/thumbnail/img1.jpeg" data-src="https://content.prolov.id/app/project/202508/original/img1.jpeg">
        <img src="https://content.prolov.id/app/project/202508/thumbnail/img1.jpeg" />
      </li>
      <li data-src="https://content.prolov.id/app/project/202508/original/img2.jpeg"><img src="img2" /></li>
    </ul>
    <div class="row">
      <div class="col-md-12">
        <strong>Harga</strong><br>Rp44.910.000.000<br>
        <strong>Detail</strong><br>
        Jumlah Lantai: 1<br>
        Luas Tanah: 9.980<br>
        Luas Bangunan: 900<br>
        Kamar Tidur: 8<br>
        Kamar Mandi: 5<br>
        Sumber Air: jetpump<br>
        Listrik: 3600<br>
        Sertifikat: shm<br>
        <strong>Deskripsi</strong>
        <p><strong>Dijual! Rumah luas dan strategis di Sindanglaya Bandung Timur</strong></p>
        <p>Spesifikasi:</p>
        <ul><li>Luas tanah: 9.980m²</li></ul>
        <p><strong>Lokasi</strong><br>sindanglaya</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

  const labelledDescriptionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="og:description" content="  Rumah Apik Full Furnish SHM di Sariwangi 30 menit ke Pintu Tol Pasteur    Note:    1,5 Lantai SHM   One Gate System    Lokasi Strategis ke :    5 - 7 menit ke Kampus P" />
  <title>Turun Harga Rumah Apik Full Furnish SHM di Sariwangi - Prolov</title>
</head>
<body>
  <div class="mobile-view">
    <div class="dinding">
      <h4>Turun Harga Rumah Apik Full Furnish SHM di Sariwangi 30 menit ke Pintu Tol Pasteur </h4>
      <ul id="imageGallery" class="gallery">
        <li data-src="https://content.prolov.id/app/project/202511/original/img1.jpeg"><img src="img1" /></li>
      </ul>
      <div class="row">
        <div class="col-md-12">
          <strong>Harga</strong><br>Rp1.399.000.000<br><br>
          <strong>Detail</strong><br>
          Jumlah Lantai: 1<br>
          Luas Tanah: 132<br>
          Luas Bangunan: 118<br>
          Kamar Tidur: 3<br>
          Kamar Mandi: 3<br>
          Sertifikat: shm<br><br>
          <strong>Deskripsi</strong>
          <p><strong>Rumah Apik Full Furnish SHM di Sariwangi 30 menit ke Pintu Tol Pasteur&nbsp;</strong></p>
          <p><strong>Note:</strong></p>
          <ul><li>1,5 Lantai SHM&nbsp;</li><li>One Gate System</li></ul>
          <p><strong>Lokasi Strategis ke :</strong></p>
          <ul><li>5 - 7 menit ke Kampus Politeknik Bandung (POLBAN)</li><li>20 - 25 menit ke Pintu Tol Pasteur</li></ul>
          <p><strong>CARA BAYAR : CASH DAN KPR</strong></p>
          <p><strong>AKSES LOKASI : 2 MOBIL</strong></p>
          <br><p><strong>Lokasi</strong><br>Jl. Bukit Raya</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
      `;

  const projectHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="og:description" content="Botanical View Residence Merupakan hunian dengan mengusung konsep Rumah Villa" />
  <title>Botanical View Residence - Prolov</title>
</head>
<body>
  <div class="mobile-view">
    <div class="dinding">
      <div class="row mt-3">
        <div class="col-md-12">
          <h4>Botanical View Residence </h4>
        </div>
      </div>
      <ul id="imageGallery" class="gallery">
        <li data-src="https://content.prolov.id/assets/dist/img/img1.png"><img src="img1" /></li>
      </ul>
      <div class="row">
        <div class="col-md-12">
          <p>Botanical View Residence Merupakan hunian dengan mengusung konsep Rumah Villa yang tidak hanya cocok untuk di tinggali namun juga cocok untuk investasi.</p>
          <p>Lokasi ini berlokasi Strategis di jalan pasir embe . cijamil, ngamprah bandung barat</p>
          <p></p>
          <p>KEUNGGULAN</p>
          <ul><li>Lokasi Strategis</li><li>Dekat IKEA</li></ul>
          <p>Total Unit : 98 Unit</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
      `;

  beforeEach(() => {
    service = new ProlovScraperService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parsePrice', () => {
    it('parses Indonesian price format to number', () => {
      const parsePrice = (service as any).parsePrice.bind(service);
      expect(parsePrice('Rp44.910.000.000')).toBe(44910000000);
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

  describe('isValidProlovUrl', () => {
    it('accepts valid prolov.id URLs', () => {
      expect(service.isValidProlovUrl('https://prolov.id/find/project/2da80438-7b7f-4395-8118-9dd4f12ca84b')).toBe(true);
    });

    it('rejects non-prolov URLs', () => {
      expect(service.isValidProlovUrl('https://rumah123.com')).toBe(false);
      expect(service.isValidProlovUrl('https://example.com')).toBe(false);
      expect(service.isValidProlovUrl('not a url')).toBe(false);
    });
  });

  describe('extractIdFromUrl', () => {
    it('extracts listing ID from URL', () => {
      const extractIdFromUrl = (service as any).extractIdFromUrl.bind(service);
      expect(extractIdFromUrl('https://prolov.id/find/project/2da80438-7b7f-4395-8118-9dd4f12ca84b')).toBe('2da80438-7b7f-4395-8118-9dd4f12ca84b');
    });
  });

  describe('scrapeListingDetail', () => {
    it('should parse detail page HTML correctly', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({ data: detailHtml });

      const result = await service.scrapeListingDetail('https://prolov.id/find/project/2da80438-7b7f-4395-8118-9dd4f12ca84b');

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Rumah Super Luas Di Sindanglaya');
      expect(result!.price).toBe(44910000000);
      expect(result!.location).toBe('sindanglaya');
      expect(result!.landArea).toBe(9980);
      expect(result!.buildingArea).toBe(900);
      expect(result!.bedrooms).toBe(8);
      expect(result!.bathrooms).toBe(5);
      expect(result!.imageUrls).toContain('https://content.prolov.id/app/project/202508/original/img1.jpeg');
      expect(result!.imageUrls).toContain('https://content.prolov.id/app/project/202508/original/img2.jpeg');
    });

    it('extracts the description from a project page that has no "Deskripsi" label', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({ data: projectHtml });

      const result = await service.scrapeListingDetail('https://prolov.id/find/project/adb4ae683d7d25a4e99e314bc779604f');

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Botanical View Residence');
      expect(result!.description).toContain('Merupakan hunian dengan mengusung konsep Rumah Villa');
      expect(result!.description).toContain('KEUNGGULAN');
      expect(result!.description).toContain('- Lokasi Strategis');
      expect(result!.description).not.toBe(result!.title);
    });

    it('captures the full labelled description and keeps the Lokasi section out of it', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({ data: labelledDescriptionHtml });

      const result = await service.scrapeListingDetail('https://prolov.id/find/project/cbecbaec-f3c0-41a1-bb38-70fb891a5173');

      expect(result).not.toBeNull();
      expect(result!.description).toContain('Rumah Apik Full Furnish SHM di Sariwangi');
      expect(result!.description).toContain('- 1,5 Lantai SHM');
      expect(result!.description).toContain('- 5 - 7 menit ke Kampus Politeknik Bandung (POLBAN)');
      expect(result!.description).toContain('CARA BAYAR : CASH DAN KPR');
      expect(result!.description).not.toContain('Jl. Bukit Raya');
      expect(result!.description).not.toBe(result!.title);
      expect(result!.location).toBe('Jl. Bukit Raya');
    });
  });
});
