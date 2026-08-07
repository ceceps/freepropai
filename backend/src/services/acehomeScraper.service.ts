import * as cheerio from 'cheerio';
import axios from 'axios';

interface AcehomeScrapeOptions {
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
  description: string;
  imageUrls: string[];
  contactInfo: any;
  listingUrl: string;
  sourceId: string;
}

export class AcehomeScraperService {
  private baseUrl = 'https://www.acehome.co.id';

  /**
   * Scrape property listings from acehome.co.id using cheerio
   */
  async scrapeListings(options: AcehomeScrapeOptions): Promise<ScrapedProperty[]> {
    const { url, maxPages = 1 } = options;
    const allListings: ScrapedProperty[] = [];

    console.log(`[AcehomeScraperService] Starting scrape for ${url}, max pages: ${maxPages}`);

    try {
      // Scrape first page
      const firstPageListings = await this.scrapePage(url);
      allListings.push(...firstPageListings);
      console.log(`[AcehomeScraperService] Page 1: Found ${firstPageListings.length} listings`);

      // Scrape additional pages if maxPages > 1
      if (maxPages > 1) {
        for (let page = 2; page <= maxPages; page++) {
          await this.delay(2000);

          const pageUrl = this.buildPageUrl(url, page);
          const pageListings = await this.scrapePage(pageUrl);

          if (pageListings.length === 0) {
            console.log(`[AcehomeScraperService] Page ${page}: No more listings found, stopping`);
            break;
          }

          allListings.push(...pageListings);
          console.log(`[AcehomeScraperService] Page ${page}: Found ${pageListings.length} listings`);
        }
      }

      console.log(`[AcehomeScraperService] Scraping completed. Total listings: ${allListings.length}`);
      return allListings;

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Scraping failed:`, error);
      throw new Error(`Failed to scrape acehome.co.id: ${error.message}`);
    }
  }

  /**
   * Scrape a single page using cheerio (no LLM needed)
   */
  private async scrapePage(url: string): Promise<ScrapedProperty[]> {
    try {
      console.log(`[AcehomeScraperService] Fetching page: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const listings: ScrapedProperty[] = [];

      // Each listing is in div.col-6.mb-3 > div.card.h-100
      $('div.col-6.mb-3').each((_, element) => {
        try {
          const $card = $(element);

          // Title and detail URL
          const $titleLink = $card.find('h5.card-title a');
          const title = $titleLink.text().trim();
          const detailUrl = $titleLink.attr('href') || '';

          if (!title || !detailUrl) return;

          // Image URL
          const imageUrl = $card.find('img.card-img-top').attr('src') || '';

          // Price
          const priceText = $card.find('span.card-text').first().text().trim();
          const price = this.parsePrice(priceText);

          // Location
          const locationText = $card.find('span.card-text[style*="font-size:10px"]').text().trim();

          // Extract property ID from URL
          const sourceId = this.extractIdFromUrl(detailUrl);

          listings.push({
            title,
            price,
            location: locationText || '',
            landArea: null,
            buildingArea: null,
            bedrooms: null,
            bathrooms: null,
            propertyType: 'rumah',
            description: '',
            imageUrls: imageUrl ? [imageUrl] : [],
            contactInfo: null,
            listingUrl: detailUrl,
            sourceId,
          });
        } catch (err) {
          console.warn(`[AcehomeScraperService] Error parsing card element:`, err);
        }
      });

      console.log(`[AcehomeScraperService] Parsed ${listings.length} listings from page`);

      // Enrich with detail page data
      const enrichedListings: ScrapedProperty[] = [];
      for (const listing of listings) {
        await this.delay(1500);
        try {
          const detail = await this.scrapeListingDetail(listing.listingUrl);
          enrichedListings.push(detail || listing);
        } catch {
          enrichedListings.push(listing);
        }
      }

      return enrichedListings;

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Error scraping page ${url}:`, error);
      return [];
    }
  }

  /**
   * Scrape detailed information from a single listing page
   */
  async scrapeListingDetail(url: string): Promise<ScrapedProperty | null> {
    try {
      console.log(`[AcehomeScraperService] Scraping listing detail: ${url}`);

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
      const title = $('h4').first().text().trim() || $('title').text().replace(' - Acehome', '').trim();

      // Price - look for "Harga" section or price-like text
      let price: number | null = null;
      const bodyText = $('body').text();
      const priceMatch = bodyText.match(/Rp[\d.,]+/);
      if (priceMatch) {
        price = this.parsePrice(priceMatch[0]);
      }

      // Code/ID
      const codeEl = $('h6').first().text().trim();
      const sourceId = codeEl || this.extractIdFromUrl(url);

      // Images - from lightSlider gallery
      const imageUrls: string[] = [];
      $('ul#imageGallery li').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).find('img').attr('src');
        if (src) imageUrls.push(src);
      });

      // Detail fields from "Detail" section
      const detailText = $('body').text();
      const bedrooms = this.extractNumber(detailText, /Kamar Tidur:\s*(\d+)/);
      const bathrooms = this.extractNumber(detailText, /Kamar Mandi:\s*(\d+)/);
      const landArea = this.extractNumber(detailText, /Luas Tanah:\s*(\d+)/);
      const buildingArea = this.extractNumber(detailText, /Luas Bangunan:\s*(\d+)/);

      // Location - <strong>Lokasi</strong><br>Batu Indah Regency
      let location = '';
      $('strong:contains("Lokasi")').each((_, el) => {
        if (location) return;
        const parent = $(el).parent();
        let text = parent.clone().children('strong').remove().end().text().trim();
        if (!text && parent.is('p')) {
          text = parent.text().replace(/Lokasi/i, '').trim();
        }
        location = text || '';
      });

      // Description - after <strong>Deskripsi</strong>, collect following p/ul siblings
      let description = '';
      $('strong:contains("Deskripsi")').each((_, el) => {
        if (description) return;
        const parts: string[] = [];
        $(el).nextAll('p, ul').each((__, n) => {
          const t = $(n).text().trim();
          if (t) parts.push(t);
        });
        description = parts.join('\n').trim();
      });

      return {
        title,
        price,
        location,
        landArea,
        buildingArea,
        bedrooms,
        bathrooms,
        propertyType: 'rumah',
        description,
        imageUrls,
        contactInfo: null,
        listingUrl: url,
        sourceId,
      };

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Error scraping listing detail:`, error);
      return null;
    }
  }

  /**
   * Parse Indonesian price string to number
   * e.g., "Rp850.000.000" -> 850000000
   * e.g., "Rp1.600.000.000" -> 1600000000
   */
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

  /**
   * Extract number from text using regex
   */
  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Extract ID from acehome URL
   * e.g., "https://www.acehome.co.id/project/detail/c6c20d4b-..." -> "c6c20d4b-..."
   */
  private extractIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      return '';
    }
  }

  /**
   * Build URL for pagination
   * acehome.co.id uses /page/N?reg=BBR&kat=rumah format
   */
  private buildPageUrl(baseUrl: string, page: number): string {
    try {
      const url = new URL(baseUrl);

      // Check if it's the root URL with query params
      if (url.pathname === '/' || url.pathname === '') {
        // Build paginated URL: /page/N?reg=BBR&kat=rumah
        const params = url.searchParams.toString();
        return `${this.baseUrl}/page/${page}${params ? '?' + params : ''}`;
      }

      // If already has /page/N, replace it
      const pageMatch = url.pathname.match(/\/page\/(\d+)/);
      if (pageMatch) {
        url.pathname = url.pathname.replace(/\/page\/\d+/, `/page/${page}`);
        return url.toString();
      }

      // Append page param
      url.searchParams.set('page', page.toString());
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  /**
   * Validate acehome.co.id URL
   */
  isValidAcehomeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('acehome.co.id');
    } catch {
      return false;
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
