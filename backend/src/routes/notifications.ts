import { Router } from 'express';
import { listNotifications, markAllRead } from '../controllers/notificationsController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listNotifications));
router.post('/read', asyncHandler(markAllRead));

export default router;
