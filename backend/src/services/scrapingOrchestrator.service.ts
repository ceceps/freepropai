import { db } from '../db';
import { scrapingJobs, scrapedListings, listings, listingPhotos } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AcehomeScraperService } from './acehomeScraper.service';
import descriptionGenerator from './descriptionGenerator.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface CreateJobOptions {
  sourceUrl: string;
  sourceName: string;
  maxPages?: number;
  filters?: any;
}

interface ImportOptions {
  downloadImages?: boolean;
  generateDescriptions?: boolean;
  additionalInfo?: string;
  userId?: string;
  teamId?: string;
}

interface BatchImportResult {
  totalRequested: number;
  successfulImports: number;
  failedImports: number;
  results: Array<{
    scrapedListingId: string;
    listingId?: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export class ScrapingOrchestratorService {
  private acehomeScraper: AcehomeScraperService;
  private uploadDir: string;

  constructor() {
    this.acehomeScraper = new AcehomeScraperService();
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Create a new scraping job
   */
  async createJob(options: CreateJobOptions): Promise<any> {
    try {
      console.log(`[ScrapingOrchestrator] Creating job for ${options.sourceUrl}`);

      const [job] = await db.insert(scrapingJobs).values({
        sourceUrl: options.sourceUrl,
        sourceName: options.sourceName,
        status: 'pending',
      }).returning();

      // Start processing in background (don't await)
      this.processJob(job.id).catch(error => {
        console.error(`[ScrapingOrchestrator] Background job processing failed:`, error);
      });

      return job;
    } catch (error: any) {
      console.error(`[ScrapingOrchestrator] Failed to create job:`, error);
      throw new Error(`Failed to create scraping job: ${error.message}`);
    }
  }

  /**
   * Process a scraping job
   */
  async processJob(jobId: string): Promise<void> {
    try {
      console.log(`[ScrapingOrchestrator] Processing job ${jobId}`);

      // Update job status to running
      await db.update(scrapingJobs)
        .set({ 
          status: 'running',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, jobId));

      // Get job details
      const [job] = await db.select()
        .from(scrapingJobs)
        .where(eq(scrapingJobs.id, jobId));

      if (!job) {
        throw new Error('Job not found');
      }

      // Scrape based on source
      let scrapedData: any[] = [];
      
      if (job.sourceName === 'acehome') {
        scrapedData = await this.acehomeScraper.scrapeListings({
          url: job.sourceUrl,
          maxPages: 3, // Default to 3 pages for testing
        });
      } else {
        throw new Error(`Unsupported source: ${job.sourceName}`);
      }

      console.log(`[ScrapingOrchestrator] Scraped ${scrapedData.length} listings`);

      // Store scraped listings
      if (scrapedData.length > 0) {
        const listingsToInsert = scrapedData.map(item => ({
          scrapingJobId: jobId,
          sourceUrl: item.listingUrl || job.sourceUrl,
          sourceId: item.sourceId || null,
          title: item.title,
          landArea: item.landArea?.toString() || null,
          buildingArea: item.buildingArea?.toString() || null,
          location: item.location || null,
          price: item.price?.toString() || null,
          bedrooms: item.bedrooms || null,
          bathrooms: item.bathrooms || null,
          propertyType: item.propertyType || null,
          description: item.description || null,
          imageUrls: item.imageUrls || [],
          contactInfo: item.contactInfo || null,
          rawData: item,
          importStatus: 'pending',
        }));

        await db.insert(scrapedListings).values(listingsToInsert);
      }

      // Update job as completed
      await db.update(scrapingJobs)
        .set({
          status: 'completed',
          totalListingsFound: scrapedData.length,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, jobId));

      console.log(`[ScrapingOrchestrator] Job ${jobId} completed successfully`);

    } catch (error: any) {
      console.error(`[ScrapingOrchestrator] Job ${jobId} failed:`, error);

      // Update job as failed
      await db.update(scrapingJobs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, jobId));
    }
  }

  /**
   * Import a single scraped listing
   */
  async importScrapedListing(
    scrapedListingId: string,
    options: ImportOptions = {}
  ): Promise<any> {
    try {
      console.log(`[ScrapingOrchestrator] Importing scraped listing ${scrapedListingId}`);

      // Get scraped listing
      const [scraped] = await db.select()
        .from(scrapedListings)
        .where(eq(scrapedListings.id, scrapedListingId));

      if (!scraped) {
        throw new Error('Scraped listing not found');
      }

      if (scraped.importStatus === 'imported') {
        throw new Error('Listing already imported');
      }

      // Create listing
      const [listing] = await db.insert(listings).values({
        userId: options.userId || null,
        teamId: options.teamId || null,
        title: scraped.title,
        landArea: scraped.landArea,
        buildingArea: scraped.buildingArea,
        location: scraped.location || '',
        price: scraped.price || '0',
        bedrooms: scraped.bedrooms,
        bathrooms: scraped.bathrooms,
        propertyType: scraped.propertyType,
        additionalInfo: options.additionalInfo || `Imported from ${scraped.sourceUrl}`,
        status: 'active',
      }).returning();

      console.log(`[ScrapingOrchestrator] Created listing ${listing.id}`);

      // Download and save images if requested
      let imagesDownloaded = 0;
      if (options.downloadImages && scraped.imageUrls && scraped.imageUrls.length > 0) {
        imagesDownloaded = await this.downloadAndSaveImages(
          listing.id,
          scraped.imageUrls
        );
      }

      // Generate descriptions if requested
      let descriptionsGenerated = false;
      if (options.generateDescriptions) {
        try {
          await descriptionGenerator.generateDescriptions(listing as any);
          descriptionsGenerated = true;
          console.log(`[ScrapingOrchestrator] Generated descriptions for listing ${listing.id}`);
        } catch (error) {
          console.warn(`[ScrapingOrchestrator] Failed to generate descriptions:`, error);
        }
      }

      // Update scraped listing status
      await db.update(scrapedListings)
        .set({
          importStatus: 'imported',
          importedListingId: listing.id,
          importedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scrapedListings.id, scrapedListingId));

      // Update job import count
      await db.update(scrapingJobs)
        .set({
          totalListingsImported: sql`${scrapingJobs.totalListingsImported} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, scraped.scrapingJobId));

      return {
        scrapedListingId,
        listingId: listing.id,
        importedAt: new Date(),
        imagesDownloaded,
        descriptionsGenerated,
      };

    } catch (error: any) {
      console.error(`[ScrapingOrchestrator] Import failed:`, error);

      // Mark as failed
      await db.update(scrapedListings)
        .set({
          importStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(scrapedListings.id, scrapedListingId));

      throw new Error(`Failed to import listing: ${error.message}`);
    }
  }

  /**
   * Batch import multiple scraped listings
   */
  async batchImport(
    scrapedListingIds: string[],
    options: ImportOptions = {}
  ): Promise<BatchImportResult> {
    console.log(`[ScrapingOrchestrator] Batch importing ${scrapedListingIds.length} listings`);

    const results: BatchImportResult['results'] = [];
    let successCount = 0;
    let failCount = 0;

    for (const id of scrapedListingIds) {
      try {
        const result = await this.importScrapedListing(id, options);
        results.push({
          scrapedListingId: id,
          listingId: result.listingId,
          status: 'success',
        });
        successCount++;
      } catch (error: any) {
        results.push({
          scrapedListingId: id,
          status: 'failed',
          error: error.message,
        });
        failCount++;
      }

      // Add small delay between imports
      await this.delay(500);
    }

    return {
      totalRequested: scrapedListingIds.length,
      successfulImports: successCount,
      failedImports: failCount,
      results,
    };
  }

  /**
   * Download images from URLs and save to uploads folder
   */
  private async downloadAndSaveImages(
    listingId: string,
    imageUrls: string[]
  ): Promise<number> {
    let downloadedCount = 0;

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        const filename = `${listingId}_${i}_${uuidv4()}.jpg`;
        const filepath = path.join(this.uploadDir, filename);

        // Download image
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        // Save to file
        fs.writeFileSync(filepath, response.data);

        // Create listing_photos record
        await db.insert(listingPhotos).values({
          listingId,
          photoUrl: `/uploads/${filename}`,
          photoOrder: i,
          isFeatured: i === 0, // First image is featured
        });

        downloadedCount++;
        console.log(`[ScrapingOrchestrator] Downloaded image ${i + 1}/${imageUrls.length}`);

      } catch (error) {
        console.warn(`[ScrapingOrchestrator] Failed to download image ${i}:`, error);
      }
    }

    return downloadedCount;
  }

  /**
   * Get scraping job by ID
   */
  async getJob(jobId: string): Promise<any> {
    const [job] = await db.select()
      .from(scrapingJobs)
      .where(eq(scrapingJobs.id, jobId));

    return job || null;
  }

  /**
   * Get all scraping jobs
   */
  async getJobs(filters?: { status?: string; sourceName?: string }): Promise<any[]> {
    let query = db.select().from(scrapingJobs);

    if (filters?.status) {
      query = query.where(eq(scrapingJobs.status, filters.status)) as any;
    }

    if (filters?.sourceName) {
      query = query.where(eq(scrapingJobs.sourceName, filters.sourceName)) as any;
    }

    const jobs = await query.orderBy(desc(scrapingJobs.createdAt));
    return jobs;
  }

  /**
   * Get scraped listings for a job
   */
  async getScrapedListings(
    jobId: string,
    filters?: { importStatus?: string }
  ): Promise<any[]> {
    if (filters?.importStatus) {
      const listings = await db.select()
        .from(scrapedListings)
        .where(
          and(
            eq(scrapedListings.scrapingJobId, jobId),
            eq(scrapedListings.importStatus, filters.importStatus)
          )
        )
        .orderBy(scrapedListings.createdAt);
      return listings;
    }

    const listings = await db.select()
      .from(scrapedListings)
      .where(eq(scrapedListings.scrapingJobId, jobId))
      .orderBy(desc(scrapedListings.createdAt));
    return listings;
  }

  /**
   * Delete (skip) a scraped listing
   */
  async skipScrapedListing(scrapedListingId: string): Promise<void> {
    await db.update(scrapedListings)
      .set({
        importStatus: 'skipped',
        updatedAt: new Date(),
      })
      .where(eq(scrapedListings.id, scrapedListingId));
  }

  /**
   * Helper: Delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
