import { Router } from 'express';
import { pipelineController } from '../controllers/pipeline.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware if not in test environment
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticate);
}

router.get('/overview', pipelineController.getOverview);
router.get('/facets', pipelineController.getFacets);
router.get('/sources', pipelineController.getSources);
router.get('/listings', pipelineController.getListings);
router.get('/listings/:id', pipelineController.getListing);
router.get('/analyses', pipelineController.getAnalyses);
router.get('/promo-content', pipelineController.getPromoContent);
router.get('/content-calendar', pipelineController.getContentCalendar);
router.get('/content-calendar/:id', pipelineController.getContentCalendarItem);
router.post('/promo-content/:promoId/schedule', pipelineController.schedulePromo);
router.post('/listings/:listingId/generate-calendar', pipelineController.generateCalendar);
router.post('/listings/:id/import', pipelineController.importListing);

export default router;
