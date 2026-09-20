import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import upload from '../middleware/upload';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', optionalAuthMiddleware, authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authMiddleware, authController.me);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/profile/photo', authMiddleware, upload.single('photo'), authController.uploadProfilePhoto);

export default router;
