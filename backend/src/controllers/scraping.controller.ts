import { Request, Response } from 'express';
import { ScrapingOrchestratorService } from '../services/scrapingOrchestrator.service';

// Lazy initialization to avoid startup errors if ANTHROPIC_API_KEY is not set
let orchestrator: ScrapingOrchestratorService | null = null;

const getOrchestrator = () => {
  if (!orchestrator) {
    orchestrator = new ScrapingOrchestratorService();
  }
  return orchestrator;
};

/**
 * POST /api/scraping/jobs
 * Create a new scraping job
 */
export const createScrapingJob = async (req: Request, res: Response) => {
  try {
    const { sourceUrl, sourceName, maxPages, filters } = req.body;

    // Validate required fields
    if (!sourceUrl || !sourceName) {
      return res.status(400).json({
        success: false,
        error: 'sourceUrl and sourceName are required',
      });
    }

    // Validate source name
    const validSources = ['acehome', 'rumah123', 'olx'];
    if (!validSources.includes(sourceName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source name. Must be one of: ${validSources.join(', ')}`,
      });
    }

    const job = await getOrchestrator().createJob({
      sourceUrl,
      sourceName,
      maxPages: maxPages || 5,
      filters,
    });

    res.status(201).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        sourceUrl: job.sourceUrl,
        sourceName: job.sourceName,
        createdAt: job.createdAt,
        message: 'Scraping job created. Processing will start shortly.',
      },
    });
  } catch (error: any) {
    console.error('[ScrapingController] Create job error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create scraping job',
    });
  }
};

/**
 * GET /api/scraping/jobs
 * List all scraping jobs
 */
export const getScrapingJobs = async (req: Request, res: Response) => {
  try {
    const { status, sourceName, limit = '20', offset = '0' } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (sourceName) filters.sourceName = sourceName as string;

    const jobs = await getOrchestrator().getJobs(filters);

    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedJobs = jobs.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: paginatedJobs,
      meta: {
        total: jobs.length,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error: any) {
    console.error('[ScrapingController] Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scraping jobs',
    });
  }
};

/**
 * GET /api/scraping/jobs/:id
 * Get scraping job details
 */
export const getScrapingJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await getOrchestrator().getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Scraping job not found',
      });
    }

    // Calculate progress if job is running
    let progress = null;
    if (job.status === 'running') {
      progress = {
        currentPage: 0, // This would need to be tracked in real implementation
        totalPages: 5,
        percentage: 50,
      };
    }

    res.json({
      success: true,
      data: {
        ...job,
        progress,
      },
    });
  } catch (error: any) {
    console.error('[ScrapingController] Get job error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scraping job',
    });
  }
};

/**
 * GET /api/scraping/jobs/:id/listings
 * Get scraped listings for a job
 */
export const getScrapedListings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { importStatus } = req.query;

    const filters: any = {};
    if (importStatus) filters.importStatus = importStatus as string;

    const listings = await getOrchestrator().getScrapedListings(id, filters);

    // Calculate stats
    const stats = {
      total: listings.length,
      pending: listings.filter(l => l.importStatus === 'pending').length,
      imported: listings.filter(l => l.importStatus === 'imported').length,
      skipped: listings.filter(l => l.importStatus === 'skipped').length,
      failed: listings.filter(l => l.importStatus === 'failed').length,
    };

    res.json({
      success: true,
      data: listings,
      meta: stats,
    });
  } catch (error: any) {
    console.error('[ScrapingController] Get scraped listings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scraped listings',
    });
  }
};

/**
 * POST /api/scraping/listings/:id/import
 * Import a single scraped listing
 */
export const importScrapedListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { downloadImages = true, generateDescriptions = true, additionalInfo } = req.body;

    // Get user info from auth middleware (if available)
    const userId = (req as any).user?.id;
    const teamId = (req as any).user?.teamId;

    const result = await getOrchestrator().importScrapedListing(id, {
      downloadImages,
      generateDescriptions,
      additionalInfo,
      userId,
      teamId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[ScrapingController] Import listing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import listing',
    });
  }
};

/**
 * POST /api/scraping/listings/import-batch
 * Import multiple scraped listings
 */
export const batchImportListings = async (req: Request, res: Response) => {
  try {
    const { scrapedListingIds, downloadImages = true, generateDescriptions = true } = req.body;

    if (!scrapedListingIds || !Array.isArray(scrapedListingIds) || scrapedListingIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'scrapedListingIds must be a non-empty array',
      });
    }

    // Get user info from auth middleware (if available)
    const userId = (req as any).user?.id;
    const teamId = (req as any).user?.teamId;

    const result = await getOrchestrator().batchImport(scrapedListingIds, {
      downloadImages,
      generateDescriptions,
      userId,
      teamId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[ScrapingController] Batch import error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch import listings',
    });
  }
};

/**
 * DELETE /api/scraping/listings/:id
 * Skip (delete) a scraped listing
 */
export const skipScrapedListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await getOrchestrator().skipScrapedListing(id);

    res.json({
      success: true,
      message: 'Scraped listing marked as skipped',
    });
  } catch (error: any) {
    console.error('[ScrapingController] Skip listing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to skip listing',
    });
  }
};

/**
 * GET /api/scraping/configs
 * Get scraping configurations
 */
export const getScrapingConfigs = async (req: Request, res: Response) => {
  try {
    // This would query the scraping_configs table
    // For now, return a simple response
    res.json({
      success: true,
      data: [
        {
          id: '1',
          sourceName: 'acehome',
          baseUrl: 'https://acehome.com',
          isActive: true,
          maxPages: 10,
          rateLimitDelay: 2000,
          notes: 'Scraping config for acehome.com',
        },
      ],
    });
  } catch (error: any) {
    console.error('[ScrapingController] Get configs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scraping configs',
    });
  }
};
