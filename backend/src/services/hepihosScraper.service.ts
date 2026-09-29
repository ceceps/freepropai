import * as cheerio from 'cheerio';
import axios from 'axios';

/**
 * hepihos.com agent listing scraper
 * Agent page: https://hepihos.com/cecep-saefulloh
 * Detail page: https://hepihos.com/project/detail/{uuid}?page=cecep-saefulloh
 * Pagination: POST form with page parameter (same as acehome)
 */

interface PageStats {
  skipped: number;
  cardsSeen: number;
}

interface HepihosScrapeOptions {
  url: string;
  maxPages?: number;
  skipSourceIds?: Set<string>;
  filters?: {
    location?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

interface ScrapeMeta {
  propertyType: string;
  region: string | null;
  agentHandle: string;
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
  certificate?: string | null;
  yearBuilt?: number | null;
  floors?: number | null;
  garage?: number | null;
  features?: string[];
  nearbyPlaces?: string[];
  roadAccess?: string | null;
  electricity?: string | null;
  waterSource?: string | null;
}

export class HepihosScraperService {
  private baseUrl = 'https://hepihos.com';
  private agentHandle: string;

  constructor(agentHandle: string = 'cecep-saefulloh') {
    this.agentHandle = agentHandle;
  }

  /**
   * Scrape property listings from hepihos.com agent page
   */
  async scrapeListings(options: HepihosScrapeOptions): Promise<ScrapedProperty[]> {
    const { url, maxPages = 1 } = options;
    const allListings: ScrapedProperty[] = [];

    // Derive agent handle from URL
    const agentHandle = this.extractAgentHandle(url) || this.agentHandle;
    const listingBaseUrl = `${this.baseUrl}/${agentHandle}`;

    // Copy: ids found in this run are added below so one listing can't be stored
    // twice when pages reorder between fetches.
    const skipSourceIds = new Set(options.skipSourceIds ?? []);
    const knownCount = skipSourceIds.size;

    console.log(`[HepihosScraperService] Starting scrape for ${listingBaseUrl}, max pages: ${maxPages} (agent=${agentHandle}, skipping ${knownCount} known id(s))`);

    try {
      // Scrape first page
      const stats1: PageStats = { skipped: 0, cardsSeen: 0 };
      const first = await this.scrapePage(listingBaseUrl, agentHandle, skipSourceIds, stats1);
      allListings.push(...first);
      first.forEach(l => l.sourceId && skipSourceIds.add(l.sourceId));
      console.log(`[HepihosScraperService] Page 1: ${first.length} new, ${stats1.skipped} already stored`);

      // Scrape additional pages if maxPages > 1
      if (maxPages > 1) {
        for (let page = 2; page <= maxPages; page++) {
          await this.delay(2000);

          const pageUrl = this.buildPageUrl(listingBaseUrl, page);
          const stats: PageStats = { skipped: 0, cardsSeen: 0 };
          const result = await this.scrapePage(pageUrl, agentHandle, skipSourceIds, stats);

          // Stop only when the page held no cards at all. A page whose cards were
          // all already stored must NOT end the run — walk on to the next page.
          if (stats.cardsSeen === 0) {
            console.log(`[HepihosScraperService] Page ${page}: No cards found, stopping`);
            break;
          }

          allListings.push(...result);
          result.forEach(l => l.sourceId && skipSourceIds.add(l.sourceId));
          console.log(`[HepihosScraperService] Page ${page}: ${result.length} new, ${stats.skipped} already stored`);
        }
      }

      console.log(`[HepihosScraperService] Scraping completed. New listings: ${allListings.length}`);
      return allListings;

    } catch (error: any) {
      console.error(`[HepihosScraperService] Scraping failed:`, error);
      throw new Error(`Failed to scrape hepihos.com: ${error.message}`);
    }
  }

  /**
   * Scrape a single page using cheerio (no LLM needed).
   *
   * `cardsSeen` counts listing cards on the page regardless of whether they were
   * skipped, so the caller can tell "no more pages" from "this page was all
   * duplicates" — the two need opposite behaviour.
   */
  private async scrapePage(
    url: string,
    agentHandle: string,
    skipSourceIds?: Set<string>,
    stats?: PageStats
  ): Promise<ScrapedProperty[]> {
    const resolvedAgentHandle = agentHandle;
    if (stats) { stats.skipped = 0; stats.cardsSeen = 0; }
    try {
      console.log(`[HepihosScraperService] Fetching page: ${url}`);

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
      let skipped = 0;
      let cardsSeen = 0;

      // Each listing is in div.card with data attributes
      // The page has: <a href="/project/detail/{uuid}?page=cecep-saefulloh" target="_blank" rel="noopener noreferrer">
      // Inside: <div class="card h-100"> with img.card-img-top, h5.card-title, span.card-text
      $('div.card.h-100').each((_, element) => {
        try {
          const $card = $(element);

          // Find the parent link
          const $link = $card.closest('a[href*="/project/detail/"]');
          const detailUrl = $link.attr('href') || '';

          if (!detailUrl) return;
          cardsSeen++;

          // Extract property ID from URL
          const sourceId = this.extractIdFromUrl(detailUrl);

          // Already stored -> skip this card entirely, no detail fetch.
          if (sourceId && skipSourceIds?.has(sourceId)) {
            skipped++;
            return;
          }

          // Image URL
          const imageUrl = $card.find('img.card-img-top').attr('src') || '';

          // Title
          const title = $card.find('h5.card-title').text().trim();

          // Price - first card-text span
          const priceText = $card.find('span.card-text').first().text().trim();
          const price = this.parsePrice(priceText);

          // Location - small font-size span
          const locationText = $card.find('span.card-text[style*="font-size:10px"]').text().trim();

          // Ribbon/market status
          const ribbonText = $card.find('.ribbon span').text().trim();

          if (!title || !detailUrl) return;

          listings.push({
            title: this.clamp(title, 255),
            price,
            location: this.clamp(locationText || '', 255),
            landArea: null,
            buildingArea: null,
            bedrooms: null,
            bathrooms: null,
            propertyType: 'rumah', // default, will be refined in detail
            region: resolvedAgentHandle, // use agent handle as region
            description: '',
            imageUrls: imageUrl ? [imageUrl] : [],
            contactInfo: null,
            listingUrl: detailUrl.startsWith('http') ? detailUrl : `${this.baseUrl}${detailUrl}`,
            sourceId: this.clamp(sourceId, 255),
            certificate: null,
            yearBuilt: null,
            floors: null,
            garage: null,
            features: [],
            nearbyPlaces: [],
            roadAccess: null,
            electricity: null,
            waterSource: null,
          });
        } catch (err) {
          console.warn(`[HepihosScraperService] Error parsing card element:`, err);
        }
      });

      console.log(`[HepihosScraperService] Page: ${cardsSeen} cards, ${skipped} already stored, ${listings.length} new`);

      // Enrich with detail page data — only the new ones; skipped cards cost no fetch.
      const enrichedListings: ScrapedProperty[] = [];
      for (const listing of listings) {
        await this.delay(1500);
        try {
          const detail = await this.scrapeListingDetail(listing.listingUrl, { propertyType: 'rumah', region: resolvedAgentHandle });
          enrichedListings.push(detail || listing);
        } catch {
          enrichedListings.push(listing);
        }
      }

      if (stats) { stats.skipped = skipped; stats.cardsSeen = cardsSeen; }
      return enrichedListings;

    } catch (error: any) {
      console.error(`[HepihosScraperService] Error scraping page ${url}:`, error);
      return [];
    }
  }

  /**
   * Scrape detailed information from a single listing page
   */
  async scrapeListingDetail(url: string, meta?: ScrapeMeta): Promise<ScrapedProperty | null> {
    const resolvedMeta = meta ?? { propertyType: 'rumah', region: 'cecep-saefulloh', agentHandle: 'cecep-saefulloh' };
    try {
      console.log(`[HepihosScraperService] Scraping listing detail: ${url}`);

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
      const title = $('h4').first().text().trim() || $('title').text().replace(' - Hepihos', '').trim();

      // Price
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

      // Also check for other image containers
      if (imageUrls.length === 0) {
        $('.card-img-top, .property-image, .gallery img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src && src.startsWith('http')) imageUrls.push(src);
        });
      }

      // Detail fields - look for strong labels
      const detailText = $('body').text();
      const bedrooms = this.extractNumber(detailText, /Kamar Tidur:\s*(\d+)/);
      const bathrooms = this.extractNumber(detailText, /Kamar Mandi:\s*(\d+)/);
      const landArea = this.extractNumber(detailText, /Luas Tanah:\s*(\d+)/);
      const buildingArea = this.extractNumber(detailText, /Luas Bangunan:\s*(\d+)/);

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
        description = this.extractDescriptionAfter($(el), $);
      });

      // Certificate
      let certificate: string | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('sertifikat') || text.includes('sertif')) {
          const parent = $(el).parent();
          let certText = parent.clone().children('strong').remove().end().text().trim();
          if (!certText) certText = parent.text().replace(/sertifikat|sertif/gi, '').trim();
          if (certText) certificate = this.clamp(certText, 100);
        }
      });

      // Year built
      let yearBuilt: number | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('tahun dibangun') || text.includes('year built')) {
          const parent = $(el).parent();
          let yearText = parent.clone().children('strong').remove().end().text().trim();
          const yearMatch = yearText.match(/(\d{4})/);
          if (yearMatch) yearBuilt = parseInt(yearMatch[1], 10);
        }
      });

      // Floors
      let floors: number | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('lantai') || text.includes('jumlah lantai')) {
          const parent = $(el).parent();
          let floorText = parent.clone().children('strong').remove().end().text().trim();
          const floorMatch = floorText.match(/(\d+)/);
          if (floorMatch) floors = parseInt(floorMatch[1], 10);
        }
      });

      // Garage
      let garage: number | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('garasi') || text.includes('carport') || text.includes('parkir')) {
          const parent = $(el).parent();
          let garageText = parent.clone().children('strong').remove().end().text().trim();
          const garageMatch = garageText.match(/(\d+)/);
          if (garageMatch) garage = parseInt(garageMatch[1], 10);
        }
      });

      // Features / Fasilitas
      const features: string[] = [];
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text === 'fasilitas' || text === 'facilities') {
          const parent = $(el).parent();
          const listItems = parent.nextAll('ul').first().find('li');
          listItems.each((_, li) => {
            const featText = $(li).text().trim();
            if (featText && featText.length < 100) features.push(featText);
          });
          if (features.length === 0) {
            const featText = parent.next().text().trim();
            if (featText) {
              featText.split(/[,;]/).forEach(f => {
                const trimmed = f.trim();
                if (trimmed && trimmed.length < 100) features.push(trimmed);
              });
            }
          }
        }
      });

      // Nearby places
      const nearbyPlaces: string[] = [];
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('tempat terdekat') || text.includes('nearby') || text.includes('fasilitas umum')) {
          const parent = $(el).parent();
          const listItems = parent.nextAll('ul').first().find('li');
          listItems.each((_, li) => {
            const placeText = $(li).text().trim();
            if (placeText && placeText.length < 150) nearbyPlaces.push(placeText);
          });
        }
      });

      // Road access
      let roadAccess: string | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('akses') || text.includes('jalan') || text.includes('road access')) {
          const parent = $(el).parent();
          let accessText = parent.clone().children('strong').remove().end().text().trim();
          if (!accessText) accessText = parent.text().replace(/akses|jalan|road access/gi, '').trim();
          if (accessText) roadAccess = this.clamp(accessText, 255);
        }
      });

      // Electricity
      let electricity: string | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('listrik') || text.includes('daya listrik') || text.includes('electricity')) {
          const parent = $(el).parent();
          let elecText = parent.clone().children('strong').remove().end().text().trim();
          if (!elecText) elecText = parent.text().replace(/listrik|daya listrik|electricity/gi, '').trim();
          if (elecText) electricity = this.clamp(elecText, 100);
        }
      });

      // Water source
      let waterSource: string | null = null;
      $('strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('air') || text.includes('sumber air') || text.includes('water')) {
          const parent = $(el).parent();
          let waterText = parent.clone().children('strong').remove().end().text().trim();
          if (!waterText) waterText = parent.text().replace(/air|sumber air|water/gi, '').trim();
          if (waterText) waterSource = this.clamp(waterText, 100);
        }
      });

      return {
        title: this.clamp(title, 255),
        price,
        location: this.clamp(location, 255),
        landArea,
        buildingArea,
        bedrooms,
        bathrooms,
        propertyType: resolvedMeta.propertyType,
        region: resolvedMeta.region,
        description,
        imageUrls,
        contactInfo: null,
        listingUrl: url,
        sourceId: this.clamp(sourceId, 255),
        certificate,
        yearBuilt,
        floors,
        garage,
        features,
        nearbyPlaces,
        roadAccess,
        electricity,
        waterSource,
      };

    } catch (error: any) {
      console.error(`[HepihosScraperService] Error scraping listing detail:`, error);
      return null;
    }
  }

  /**
   * Collect description text after the Deskripsi label until the next section
   * heading (Lokasi / Harga / Detail / Share). List items become "- " lines.
   */
  private extractDescriptionAfter(
    $label: cheerio.Cheerio<any>,
    $: cheerio.CheerioAPI
  ): string {
    const parts: string[] = [];
    const SECTION_STOP = /^(lokasi|harga|detail|share)$/i;

    const collectFrom = (node: any): boolean => {
      if (!node) return false;
      if (node.type === 'text') {
        const t = String(node.data || '').replace(/\s+/g, ' ').trim();
        if (t) parts.push(t);
        return false;
      }
      if (node.type !== 'tag') return false;

      const name = String(node.name || '').toLowerCase();
      if (name === 'br') return false;

      if (name === 'strong' && SECTION_STOP.test($(node).text().trim())) {
        return true;
      }
      if (name === 'li') {
        const text = $(node).text().replace(/\s+/g, ' ').trim();
        if (text) parts.push(`- ${text}`);
        return false;
      }
      if (name === 'ul' || name === 'ol') {
        $(node)
          .children('li')
          .each((_, li) => {
            const text = $(li).text().replace(/\s+/g, ' ').trim();
            if (text) parts.push(`- ${text}`);
          });
        return false;
      }
      if (/^(p|div|h[1-6])$/.test(name)) {
        const innerStrong = $(node).find('strong').first();
        if (
          innerStrong.length &&
          SECTION_STOP.test(innerStrong.text().trim()) &&
          $(node).find('strong').length === 1 &&
          innerStrong.parent().is('p, div')
        ) {
          return true;
        }
        if (/^(p|h[4-6])$/.test(name)) {
          const text = $(node).text().replace(/\s+/g, ' ').trim();
          if (text) parts.push(text);
          return false;
        }
      }
      if (node.children) {
        for (const child of node.children) {
          if (collectFrom(child)) return true;
        }
      }
      return false;
    };

    const labelNode: any = $label.get(0);
    let sibling: any = labelNode?.nextSibling ?? labelNode?.parent?.nextSibling ?? null;

    while (sibling) {
      if (collectFrom(sibling)) break;
      sibling = sibling.nextSibling;
    }

    return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Parse Indonesian price string to number
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
   * Clamp a string to a max length
   */
  private clamp(value: string, max: number): string {
    if (!value) return value;
    return value.length > max ? value.slice(0, max) : value;
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
   * Extract ID from hepihos URL
   * e.g., "https://hepihos.com/project/detail/c6c20d4b-...?page=cecep-saefulloh" -> "c6c20d4b-..."
   */
  private extractIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      // URL format: /project/detail/{uuid}
      const detailIdx = parts.indexOf('detail');
      if (detailIdx >= 0 && detailIdx + 1 < parts.length) {
        return parts[detailIdx + 1] || '';
      }
      return parts[parts.length - 1] || '';
    } catch {
      return '';
    }
  }

  /**
   * Extract agent handle from URL
   */
  private extractAgentHandle(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/').filter(Boolean);
      // Agent page: /cecep-saefulloh
      if (path.length === 1) {
        return path[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build URL for pagination
   * hepihos uses POST form like acehome: ?page=cecep-saefulloh with form data
   * But for initial page, it's just /agent-handle
   */
  private buildPageUrl(baseUrl: string, page: number): string {
    if (page <= 1) {
      return baseUrl;
    }
    // hepihos uses the same pattern as acehome: POST form with page parameter
    // But we can try GET with page parameter first
    const u = new URL(baseUrl);
    // Add agent handle as page parameter
    u.searchParams.set('page', u.searchParams.get('page') || 'cecep-saefulloh');
    // Note: actual pagination uses POST form, but we'll try this first
    return u.toString();
  }

  /**
   * Validate hepihos.com URL
   */
  isValidHepihosUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('hepihos.com');
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