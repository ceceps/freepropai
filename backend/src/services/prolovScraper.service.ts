import * as cheerio from 'cheerio';
import axios from 'axios';

interface ProlovScrapeOptions {
  url: string;
  maxPages?: number;
  filters?: {
    location?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

interface ScrapedProperty {
  title: string;
  price: number | null;
  location: string;
  landArea: number | null;
  buildingArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  region: string | null;
  description: string;
  imageUrls: string[];
  contactInfo: any;
  listingUrl: string;
  sourceId: string;
}

export class ProlovScraperService {
  private baseUrl = 'https://prolov.id';

  /**
   * Scrape property listings from prolov.id
   */
  async scrapeListings(options: ProlovScrapeOptions): Promise<ScrapedProperty[]> {
    const { url } = options;
    console.log(`[ProlovScraperService] Scraping single detail url: ${url}`);
    
    // Prolov is a single listing page when scraped with a project detail URL
    const detail = await this.scrapeListingDetail(url);
    return detail ? [detail] : [];
  }

  /**
   * Scrape detailed information from a single listing page
   */
  async scrapeListingDetail(url: string): Promise<ScrapedProperty | null> {
    try {
      console.log(`[ProlovScraperService] Scraping listing detail: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      // Title
      const title = $('h4').first().text().trim() || $('title').text().replace(' - Prolov', '').trim() || 'Properti Prolov';

      // Price - look for Price section
      let price: number | null = null;
      const priceText = $('strong').filter((_, el) => $(el).text().trim().toLowerCase() === 'harga').parent().text();
      const priceMatch = priceText.match(/Rp\s*([\d.,]+)/i);
      if (priceMatch) {
        price = this.parsePrice(priceMatch[0]);
      } else {
        const bodyText = $('body').text();
        const bodyPriceMatch = bodyText.match(/Rp\s*([\d.,]+)/i);
        if (bodyPriceMatch) {
          price = this.parsePrice(bodyPriceMatch[0]);
        }
      }

      // Code/ID
      const sourceId = this.extractIdFromUrl(url);

      // Images - from imageGallery
      const imageUrls: string[] = [];
      $('ul#imageGallery li').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).find('img').attr('src');
        if (src) imageUrls.push(src);
      });

      // Detail fields
      const detailText = $('body').text();
      const bedrooms = this.extractNumber(detailText, /Kamar Tidur:\s*(\d+)/i);
      const bathrooms = this.extractNumber(detailText, /Kamar Mandi:\s*(\d+)/i);
      const landArea = this.extractNumber(detailText, /Luas Tanah:\s*([\d.,]+)/i);
      const buildingArea = this.extractNumber(detailText, /Luas Bangunan:\s*([\d.,]+)/i);

      // Location
      let location = '';
      $('strong').each((_, el) => {
        if (location) return;
        if ($(el).text().trim().toLowerCase() !== 'lokasi') return;
        const parent = $(el).parent();
        let text = parent.clone().children('strong').remove().end().text().trim();
        if (!text) text = parent.text().replace(/lokasi/i, '').trim();
        location = text;
      });

      // Description
      let description = '';
      $('strong').each((_, el) => {
        if (description) return;
        if ($(el).text().trim().toLowerCase() !== 'deskripsi') return;
        const parts: string[] = [];
        $(el).nextAll('p, ul, ol').each((__, n) => {
          const t = $(n).text().trim();
          if (t) parts.push(t);
        });
        description = parts.join('\n').trim();
      });

      // Property type fallback
      let propertyType = 'rumah';
      if (title.toLowerCase().includes('tanah')) {
        propertyType = 'tanah';
      } else if (title.toLowerCase().includes('ruko') || title.toLowerCase().includes('rukost')) {
        propertyType = 'rukost';
      } else if (title.toLowerCase().includes('apartemen')) {
        propertyType = 'apartement';
      }

      return {
        title: this.clamp(title, 255),
        price,
        location: this.clamp(location || 'Indonesia', 255),
        landArea,
        buildingArea,
        bedrooms,
        bathrooms,
        propertyType,
        region: location ? this.clamp(location.split(',')[0].trim(), 100) : null,
        description: description || title,
        imageUrls,
        contactInfo: null,
        listingUrl: url,
        sourceId: this.clamp(sourceId, 255),
      };

    } catch (error: any) {
      console.error(`[ProlovScraperService] Error scraping listing detail:`, error);
      return null;
    }
  }

  private parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    const cleaned = priceStr
      .replace(/Rp/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '')
      .trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  private clamp(value: string, max: number): string {
    if (!value) return value;
    return value.length > max ? value.slice(0, max) : value;
  }

  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;
    const cleaned = match[1].replace(/\./g, '').replace(/,/g, '').trim();
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  private extractIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      return '';
    }
  }

  isValidProlovUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('prolov.id');
    } catch {
      return false;
    }
  }
}
