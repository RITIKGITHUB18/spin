import { Router } from 'express';
import { z } from 'zod';
import { listMachines, createMachine, setMachineActive } from '../controllers/machinesController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const programSchema = z.object({ label: z.string().min(1), minutes: z.number().int().positive(), desc: z.string().min(1) });
const createSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['wash', 'dry']),
  model: z.string().min(1),
  programs: z.array(programSchema).min(1),
});
const statusSchema = z.object({ active: z.boolean() });

router.use(requireAuth);

router.get('/', asyncHandler(listMachines));
router.post('/', requireAdmin, validateBody(createSchema), asyncHandler(createMachine));
router.patch('/:id/status', requireAdmin, validateBody(statusSchema), asyncHandler(setMachineActive));

export default router;
