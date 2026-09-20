import * as cheerio from 'cheerio';
import axios from 'axios';

/**
 * acehome.co.id "Wilayah" region codes -> readable names.
 * Harvested from the live homepage region pill selector (?reg=CODE buttons).
 */
const REGION_MAP: Record<string, string> = {
  BTM: 'Bandung Timur',
  BBR: 'Bandung Barat',
  BSL: 'Bandung Selatan',
  BUT: 'Bandung Utara',
  BTG: 'Bandung Tengah',
  KWG: 'Karawang',
  BKS: 'Bekasi',
  PWK: 'Purwakarta',
};

/**
 * acehome.co.id "Kategori" tokens (?kat=) -> normalized property type label.
 */
const KAT_MAP: Record<string, string> = {
  rumah: 'rumah',
  tanah: 'tanah',
  rukost: 'rukost',
  kost: 'rukost',
  apartemen: 'apartement',
  apartement: 'apartement',
  komersil: 'komersil',
};

/** Per-page counters written back by scrapePage (cards seen vs cards skipped). */
interface PageStats {
  skipped: number;
  cardsSeen: number;
}

interface AcehomeScrapeOptions {
  url: string;
  maxPages?: number;
  /**
   * Source ids already stored in the DB. Their cards are skipped without a
   * detail fetch, and paging continues to the next page instead of stopping.
   */
  skipSourceIds?: Set<string>;
  filters?: {
    location?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

/** Category + region derived once from the source listing URL, stamped on every row. */
interface ScrapeMeta {
  propertyType: string;
  region: string | null;
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

export class AcehomeScraperService {
  private baseUrl = 'https://www.acehome.co.id';

  /**
   * Scrape property listings from acehome.co.id using cheerio
   */
  async scrapeListings(options: AcehomeScrapeOptions): Promise<ScrapedProperty[]> {
    const { url, maxPages = 1 } = options;
    const allListings: ScrapedProperty[] = [];

    // Derive category + region once from the source URL; stamp on every row.
    const meta = this.deriveMeta(url);

    // Copy: ids found in this run are added below so one listing can't be stored
    // twice when pages reorder between fetches.
    const skipSourceIds = new Set(options.skipSourceIds ?? []);
    const knownCount = skipSourceIds.size;

    console.log(`[AcehomeScraperService] Starting scrape for ${url}, max pages: ${maxPages} (type=${meta.propertyType}, region=${meta.region}, skipping ${knownCount} known id(s))`);

    try {
      // Scrape first page
      const stats1: PageStats = { skipped: 0, cardsSeen: 0 };
      const first = await this.scrapePage(url, meta, skipSourceIds, stats1);
      allListings.push(...first);
      first.forEach(l => l.sourceId && skipSourceIds.add(l.sourceId));
      console.log(`[AcehomeScraperService] Page 1: ${first.length} new, ${stats1.skipped} already stored`);

      // Scrape additional pages if maxPages > 1
      if (maxPages > 1) {
        for (let page = 2; page <= maxPages; page++) {
          await this.delay(2000);

          const pageUrl = this.buildPageUrl(url, page);
          const stats: PageStats = { skipped: 0, cardsSeen: 0 };
          const result = await this.scrapePage(pageUrl, meta, skipSourceIds, stats);

          // Stop only when the page held no cards at all. A page whose cards were
          // all already stored must NOT end the run — walk on to the next page.
          if (stats.cardsSeen === 0) {
            console.log(`[AcehomeScraperService] Page ${page}: No cards found, stopping`);
            break;
          }

          allListings.push(...result);
          result.forEach(l => l.sourceId && skipSourceIds.add(l.sourceId));
          console.log(`[AcehomeScraperService] Page ${page}: ${result.length} new, ${stats.skipped} already stored`);
        }
      }

      console.log(`[AcehomeScraperService] Scraping completed. New listings: ${allListings.length}`);
      return allListings;

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Scraping failed:`, error);
      throw new Error(`Failed to scrape acehome.co.id: ${error.message}`);
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
    meta?: ScrapeMeta,
    skipSourceIds?: Set<string>,
    stats?: PageStats
  ): Promise<ScrapedProperty[]> {
    const resolvedMeta = meta ?? this.deriveMeta(url);
    if (stats) { stats.skipped = 0; stats.cardsSeen = 0; }
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
      let skipped = 0;
      let cardsSeen = 0;

      // Each listing is in div.col-6.mb-3 > div.card.h-100
      $('div.col-6.mb-3').each((_, element) => {
        try {
          const $card = $(element);

          // Title and detail URL
          const $titleLink = $card.find('h5.card-title a');
          const title = $titleLink.text().trim();
          const detailUrl = $titleLink.attr('href') || '';

          if (!title || !detailUrl) return;
          cardsSeen++;

          // Extract property ID from URL
          const sourceId = this.extractIdFromUrl(detailUrl);

          // Already stored -> skip this card entirely, no detail fetch. The
          // caller keeps paging, so the job advances instead of stopping.
          if (sourceId && skipSourceIds?.has(sourceId)) {
            skipped++;
            return;
          }

          // Image URL
          const imageUrl = $card.find('img.card-img-top').attr('src') || '';

          // Price
          const priceText = $card.find('span.card-text').first().text().trim();
          const price = this.parsePrice(priceText);

          // Location
          const locationText = $card.find('span.card-text[style*="font-size:10px"]').text().trim();

          listings.push({
            title: this.clamp(title, 255),
            price,
            location: this.clamp(locationText || '', 255),
            landArea: null,
            buildingArea: null,
            bedrooms: null,
            bathrooms: null,
            propertyType: resolvedMeta.propertyType,
            region: resolvedMeta.region,
            description: '',
            imageUrls: imageUrl ? [imageUrl] : [],
            contactInfo: null,
            listingUrl: detailUrl,
            sourceId: this.clamp(sourceId, 255),
          });
        } catch (err) {
          console.warn(`[AcehomeScraperService] Error parsing card element:`, err);
        }
      });

      console.log(`[AcehomeScraperService] Page: ${cardsSeen} cards, ${skipped} already stored, ${listings.length} new`);

      // Enrich with detail page data — only the new ones; skipped cards cost no fetch.
      const enrichedListings: ScrapedProperty[] = [];
      for (const listing of listings) {
        await this.delay(1500);
        try {
          const detail = await this.scrapeListingDetail(listing.listingUrl, resolvedMeta);
          enrichedListings.push(detail || listing);
        } catch {
          enrichedListings.push(listing);
        }
      }

      if (stats) { stats.skipped = skipped; stats.cardsSeen = cardsSeen; }
      return enrichedListings;

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Error scraping page ${url}:`, error);
      return [];
    }
  }

  /**
   * Scrape detailed information from a single listing page
   */
  async scrapeListingDetail(url: string, meta?: ScrapeMeta): Promise<ScrapedProperty | null> {
    // Fall back to deriving category/region from the URL if not passed in.
    const resolvedMeta = meta ?? this.deriveMeta(url);
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

      // Location - exact <strong>Lokasi</strong> label only.
      // NOTE: descriptions can contain sentences starting with "Lokasi ...", so a
      // substring match (:contains) wrongly grabs the whole paragraph. Match the
      // label exactly, then read the parent's remaining text (e.g. "pondok hijau").
      let location = '';
      $('strong').each((_, el) => {
        if (location) return;
        if ($(el).text().trim().toLowerCase() !== 'lokasi') return;
        const parent = $(el).parent();
        let text = parent.clone().children('strong').remove().end().text().trim();
        if (!text) text = parent.text().replace(/lokasi/i, '').trim();
        location = text;
      });

      // Description - after <strong>Deskripsi</strong>, collect following siblings
      // until the next section label (typically <strong>Lokasi</strong>).
      let description = '';
      $('strong').each((_, el) => {
        if (description) return;
        if ($(el).text().trim().toLowerCase() !== 'deskripsi') return;
        description = this.extractDescriptionAfter($(el), $);
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
      };

    } catch (error: any) {
      console.error(`[AcehomeScraperService] Error scraping listing detail:`, error);
      return null;
    }
  }

  /**
   * Collect description text after the Deskripsi label until the next section
   * heading (Lokasi / Harga / Detail / Share). List items become "- " lines.
   *
   * Walks raw DOM siblings and wraps each with $(node): re-parsing a node via
   * cheerio.load(node) detaches it from the tree (nextSibling becomes null),
   * which silently ended the walk after the first element.
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

    // A wrapped <strong>Deskripsi</strong> has no sibling of its own, so fall
    // back to the parent's next sibling to reach the description text.
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
   * Clamp a string to a max length so it never overflows a VARCHAR column.
   * DB columns: title/location/sourceId = 255, propertyType = 100, sourceUrl = 500.
   */
  private clamp(value: string, max: number): string {
    if (!value) return value;
    return value.length > max ? value.slice(0, max) : value;
  }

  /**
   * Derive category (propertyType) + readable region from a listing-page URL.
   * acehome URL shape: ?reg=BUT&kat=rumah[&status=jual|sewa]
   * - status=sewa  -> propertyType 'sewa'
   * - otherwise    -> KAT_MAP[kat] (rumah/tanah/rukost/apartement/komersil), default 'rumah'
   * - region       -> REGION_MAP[reg] readable name, or null if unknown/absent
   */
  private deriveMeta(url: string): ScrapeMeta {
    let propertyType = 'rumah';
    let region: string | null = null;
    try {
      const params = new URL(url).searchParams;
      const kat = (params.get('kat') || '').toLowerCase();
      const status = (params.get('status') || '').toLowerCase();
      const reg = (params.get('reg') || '').toUpperCase();

      if (status === 'sewa') {
        propertyType = 'sewa';
      } else if (kat && KAT_MAP[kat]) {
        propertyType = KAT_MAP[kat];
      }

      if (reg && REGION_MAP[reg]) {
        region = REGION_MAP[reg];
      }
    } catch {
      // malformed URL -> keep defaults
    }
    return { propertyType, region };
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
