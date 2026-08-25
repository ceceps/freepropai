import { Router } from 'express';
import { followUpController } from '../controllers/followUp.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/generate', followUpController.generate);
router.get('/queue', followUpController.getQueue);
router.patch('/:id/approve', followUpController.approve);
router.patch('/:id/reject', followUpController.reject);
router.patch('/:id/edit', followUpController.edit);

export default router;
