import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HepihosScraperService } from '../services/hepihosScraper.service';

describe('HepihosScraperService', () => {
  let service: HepihosScraperService;

  const agentPageHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="card h-100">
    <a href="https://hepihos.com/project/detail/2f70a28b-ec29-4205-a4d7-aad7313c9f3f?page=cecep-saefulloh" target="_blank">
      <img class="card-img-top" src="https://content.prolov.id/test.jpeg" />
    </a>
    <div class="card-body">
      <span class="card-text"> Rp2.700.000.000 </span>
      <h5 class="card-title">
        <a href="https://hepihos.com/project/detail/2f70a28b-ec29-4205-a4d7-aad7313c9f3f?page=cecep-saefulloh">
          Rumah Strategis Sukaati Permai Pasir Luyu Regol
        </a>
      </h5>
      <span class="card-text d-flex justify-content-between" style="font-size:10px;"> REGOL, BANDUNG </span>
      <div class="ribbon"><span>Dijual</span></div>
    </div>
  </div>
</body>
</html>
  `;

  beforeEach(() => {
    service = new HepihosScraperService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scrapeListings - detail URL extraction', () => {
    it('correctly extracts nested detail URL from card without skipping', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        data: agentPageHtml,
      } as any);

      // Mock scrapeListingDetail to return null so we see the base listing
      vi.spyOn(service, 'scrapeListingDetail').mockResolvedValueOnce(null);

      const listings = await service.scrapeListings({
        url: 'https://hepihos.com/cecep-saefulloh',
        maxPages: 1,
      });

      expect(listings.length).toBe(1);
      expect(listings[0].listingUrl).toBe(
        'https://hepihos.com/project/detail/2f70a28b-ec29-4205-a4d7-aad7313c9f3f?page=cecep-saefulloh'
      );
      expect(listings[0].sourceId).toBe('2f70a28b-ec29-4205-a4d7-aad7313c9f3f');
      expect(listings[0].title).toBe('Rumah Strategis Sukaati Permai Pasir Luyu Regol');
      expect(listings[0].price).toBe(2700000000);
      expect(listings[0].marketStatus).toBe('Dijual');
    });
  });

  describe('extractIdFromUrl', () => {
    it('extracts UUID from detail URL with query parameter', () => {
      const extractId = (service as any).extractIdFromUrl.bind(service);
      const id = extractId(
        'https://hepihos.com/project/detail/7c5c0d98-6b8c-4ba8-805e-02f7015f10f0?page=cecep-saefulloh'
      );
      expect(id).toBe('7c5c0d98-6b8c-4ba8-805e-02f7015f10f0');
    });
  });

  describe('isValidHepihosUrl', () => {
    it('validates hepihos hostname', () => {
      expect(service.isValidHepihosUrl('https://hepihos.com/cecep-saefulloh')).toBe(true);
      expect(
        service.isValidHepihosUrl(
          'https://hepihos.com/project/detail/7c5c0d98-6b8c-4ba8-805e-02f7015f10f0?page=cecep-saefulloh'
        )
      ).toBe(true);
      expect(service.isValidHepihosUrl('https://acehome.co.id/test')).toBe(false);
    });
  });
});
