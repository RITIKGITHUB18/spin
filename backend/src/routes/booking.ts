import { Router } from 'express';
import { z } from 'zod';
import {
  startBooking,
  activeBookings,
  bookingHistory,
  extendBooking,
  markDone,
  notifyCollect,
  collectBooking,
  releaseBooking,
  cancelBooking,
  resumeBooking,
} from '../controllers/bookingController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const startSchema = z.object({
  machineId: z.string().min(1),
  cycleLabel: z.string().min(1),
  cycleMinutes: z.number().int().min(5).max(180),
});
const extendSchema = z.object({ minutes: z.number().int().positive().max(60) });

router.use(requireAuth);

router.post('/', validateBody(startSchema), asyncHandler(startBooking));
router.get('/active', asyncHandler(activeBookings));
router.get('/user', asyncHandler(bookingHistory));
router.post('/:id/extend', validateBody(extendSchema), asyncHandler(extendBooking));
router.post('/:id/cancel', asyncHandler(cancelBooking));
router.post('/:id/resume', asyncHandler(resumeBooking));
router.post('/:id/mark-done', asyncHandler(markDone));
router.post('/:id/notify-collect', asyncHandler(notifyCollect));
router.post('/:id/collect', asyncHandler(collectBooking));
router.post('/:id/release', asyncHandler(releaseBooking));

export default router;
