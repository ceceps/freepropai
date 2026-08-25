import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware if necessary, though Lead system usually requires it
router.use(authenticate);

router.post('/qualify', leadController.qualify);
router.get('/', leadController.getAll);
router.get('/:id', leadController.getById);
router.patch('/:id', leadController.update);

export default router;
