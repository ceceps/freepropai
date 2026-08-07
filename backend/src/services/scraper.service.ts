import Anthropic from '@anthropic-ai/sdk';
import { llmConfig } from '../config/llm';

interface ScraperConfig {
  apiKey: string;
  model: string;
  timeout?: number;
}

interface ScrapeOptions {
  url: string;
  prompt: string;
  timeout?: number;
}

interface ScrapeResult {
  success: boolean;
  data?: any;
  error?: string;
  rawResponse?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ScrapeGraphAI: any;
try {
  ScrapeGraphAI = require('scrapegraph-js').ScrapeGraphAI;
} catch {
  console.warn('[ScraperService] scrapegraph-js not available, using Axios + Claude only');
}

export class ScraperService {
  private anthropic: Anthropic;
  private config: ScraperConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scrapeGraph: any;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = {
      apiKey: config?.apiKey || llmConfig.apiKey,
      model: config?.model || llmConfig.model || 'claude-opus-4-8',
      timeout: config?.timeout || 120000,
    };

    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_AUTH_TOKEN is required for ScraperService');
    }

    this.anthropic = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: llmConfig.baseURL,
      timeout: this.config.timeout,
      maxRetries: 2,
    });

    if (ScrapeGraphAI) {
      try {
        this.scrapeGraph = new ScrapeGraphAI({
          apiKey: this.config.apiKey,
        });
      } catch (err: any) {
        console.warn(`[ScraperService] Failed to init ScrapeGraphAI: ${err.message}`);
      }
    }
  }

  /**
   * Scrape a URL using Claude to extract data from HTML
   */
  async scrapeUrl(options: ScrapeOptions): Promise<ScrapeResult> {
    try {
      console.log(`[ScraperService] Starting scrape for URL: ${options.url}`);

      // Try scrapegraph-js first
      if (this.scrapeGraph) {
        try {
          console.log(`[ScraperService] Trying scrapegraph-js...`);
          const sgResult = await this.scrapeGraph.scrape({
            url: options.url,
            prompt: options.prompt,
          });

          if (sgResult && (sgResult.data || sgResult.result)) {
            const data = sgResult.data || sgResult.result;
            console.log(`[ScraperService] Scrapegraph successful`);
            return { success: true, data };
          }
        } catch (sgError: any) {
          console.warn(`[ScraperService] Scrapegraph failed: ${sgError.message}. Falling back to Axios + Claude.`);
        }
      }

      // Fallback: Fetch HTML + Claude extraction
      const axios = require('axios');
      const response = await axios.get(options.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: options.timeout || 30000,
      });

      const result = await this.extractFromHtml(response.data, options.prompt);
      console.log(`[ScraperService] Scrape completed successfully`);
      return result;
    } catch (error: any) {
      console.error(`[ScraperService] Scrape failed:`, error);
      return {
        success: false,
        error: error.message || 'Unknown scraping error',
      };
    }
  }

  /**
   * Extract structured data from HTML using Claude directly
   */
  async extractFromHtml(html: string, prompt: string): Promise<ScrapeResult> {
    try {
      console.log(`[ScraperService] Extracting data from HTML using Claude`);
      console.log(`[ScraperService] HTML length: ${html.length} characters`);

      const message = await this.anthropic.messages.create(
        {
          model: this.config.model as any,
          max_tokens: llmConfig.maxTokens,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nHTML Content:\n${html.substring(0, 50000)}`,
            },
          ],
        },
        {
          timeout: this.config.timeout,
          maxRetries: 2,
        }
      );

      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      console.log(`[ScraperService] Claude response length: ${textContent.text.length}`);

      let data;
      try {
        const jsonMatch = textContent.text.match(/```json\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : textContent.text;
        data = JSON.parse(jsonText);
        console.log(`[ScraperService] Parsed JSON successfully`);
      } catch {
        console.warn(`[ScraperService] Failed to parse JSON, returning raw text`);
        data = textContent.text;
      }

      return {
        success: true,
        data,
        rawResponse: textContent.text,
      };
    } catch (error: any) {
      console.error(`[ScraperService] Extraction failed:`, error);
      return {
        success: false,
        error: error.message || 'Unknown extraction error',
      };
    }
  }

  /**
   * Validate scraped property data
   */
  validatePropertyData(data: any): boolean {
    if (!data) return false;

    if (!Array.isArray(data)) {
      if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 1 && Array.isArray(data[keys[0]])) {
          return true;
        }
      }
      return false;
    }

    if (data.length === 0) return false;

    const firstItem = data[0];
    const requiredFields = ['title', 'price'];
    return requiredFields.every(field => field in firstItem);
  }

  /**
   * Normalize scraped data to consistent format
   */
  normalizePropertyData(data: any): any[] {
    if (!data) return [];

    if (!Array.isArray(data) && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 1 && Array.isArray(data[keys[0]])) {
        data = data[keys[0]];
      } else {
        return [];
      }
    }

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      title: item.title || item.propertyTitle || '',
      price: this.normalizePrice(item.price || item.listingPrice),
      location: item.location || item.propertyLocation || '',
      landArea: this.normalizeArea(item.landArea || item.land_area),
      buildingArea: this.normalizeArea(item.buildingArea || item.building_area),
      bedrooms: this.normalizeNumber(item.bedrooms || item.bedroom),
      bathrooms: this.normalizeNumber(item.bathrooms || item.bathroom),
      propertyType: item.propertyType || item.property_type || item.type || 'rumah',
      description: item.description || item.desc || '',
      imageUrls: this.normalizeImageUrls(item.imageUrls || item.images || item.image_urls),
      contactInfo: this.normalizeContactInfo(item.contactInfo || item.contact),
      listingUrl: item.listingUrl || item.url || item.source_url || '',
      sourceId: item.sourceId || item.id || '',
    }));
  }

  private normalizePrice(price: any): number | null {
    if (typeof price === 'number') return price;
    if (!price) return null;

    const priceStr = String(price)
      .replace(/[Rp.,\s]/g, '')
      .replace(/juta/i, '000000')
      .replace(/miliar/i, '000000000');

    const parsed = parseFloat(priceStr);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeArea(area: any): number | null {
    if (typeof area === 'number') return area;
    if (!area) return null;

    const areaStr = String(area).replace(/[m²\s]/g, '');
    const parsed = parseFloat(areaStr);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (!value) return null;

    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeImageUrls(urls: any): string[] {
    if (!urls) return [];
    if (typeof urls === 'string') return [urls];
    if (Array.isArray(urls)) {
      return urls
        .filter(url => typeof url === 'string')
        .map(url => url.replace(/-thumbnail(?=\.)/i, ''));
    }
    return [];
  }

  private normalizeContactInfo(contact: any): any {
    if (!contact) return null;
    if (typeof contact === 'string') {
      return { name: contact };
    }
    return {
      name: contact.name || '',
      phone: contact.phone || contact.phoneNumber || '',
      whatsapp: contact.whatsapp || contact.wa || contact.phone || '',
    };
  }
}
