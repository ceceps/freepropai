import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();

if (process.env.NODE_ENV !== 'test') {
  router.use(authenticate);
}

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
