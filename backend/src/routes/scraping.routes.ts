import { Router } from 'express';
import {
  createScrapingJob,
  getScrapingJobs,
  getScrapingJob,
  getScrapedListings,
  importScrapedListing,
  batchImportListings,
  skipScrapedListing,
  getScrapingConfigs,
} from '../controllers/scraping.controller';

const router = Router();

// Scraping job routes
router.post('/jobs', createScrapingJob);
router.get('/jobs', getScrapingJobs);
router.get('/jobs/:id', getScrapingJob);
router.get('/jobs/:id/listings', getScrapedListings);

// Scraped listing routes
router.post('/listings/:id/import', importScrapedListing);
router.post('/listings/import-batch', batchImportListings);
router.delete('/listings/:id', skipScrapedListing);

// Scraping config routes
router.get('/configs', getScrapingConfigs);

export default router;
