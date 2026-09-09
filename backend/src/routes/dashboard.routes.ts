import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware if not in test environment
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticate);
}

router.get('/stats', dashboardController.getStats);

export default router;
