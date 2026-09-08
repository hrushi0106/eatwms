import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import * as controller from './user.controller';

const router = Router();
router.use(authenticate);

const createUserSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role_id: z.number().int().positive(),
  department_id: z.number().int().positive().optional(),
  manager_id: z.number().int().positive().optional(),
  team_lead_id: z.number().int().positive().optional(),
  phone: z.string().optional(),
  joining_date: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

router.get('/me/profile', controller.getMyProfileHandler);
router.put('/me/profile', controller.updateMyProfileHandler);

router.get('/', authorize('ADMIN', 'MANAGER'), controller.listUsersHandler);
router.post('/', authorize('ADMIN'), validateBody(createUserSchema), controller.createUserHandler);
router.get('/:id', controller.getUserHandler);
router.put('/:id', authorize('ADMIN'), validateBody(updateUserSchema), controller.updateUserHandler);
router.patch('/:id/deactivate', authorize('ADMIN'), controller.deactivateUserHandler);

export default router;
