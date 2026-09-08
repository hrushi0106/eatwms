import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import db from '../../config/database';
import { successResponse, createdResponse } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

const router = Router();
router.use(authenticate);

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const depts = await db('departments').orderBy('name');
    return successResponse(res, depts);
  } catch (err) { next(err); }
});

router.post('/', authorize('ADMIN'), validateBody(schema), async (req, res, next) => {
  try {
    const [id] = await db('departments').insert({ ...req.body, created_at: new Date(), updated_at: new Date() }).returning('id');
    const dept = await db('departments').where('id', typeof id === 'object' ? (id as { id: number }).id : id).first();
    return createdResponse(res, dept, 'Department created');
  } catch (err) { next(err); }
});

router.put('/:id', authorize('ADMIN'), validateBody(schema.partial()), async (req, res, next) => {
  try {
    const id = parseInt(req.params['id']);
    const dept = await db('departments').where('id', id).first();
    if (!dept) throw new NotFoundError('Department');
    await db('departments').where('id', id).update({ ...req.body, updated_at: new Date() });
    return successResponse(res, await db('departments').where('id', id).first(), 'Department updated');
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params['id']);
    await db('departments').where('id', id).update({ status: req.body.status, updated_at: new Date() });
    return successResponse(res, null, 'Status updated');
  } catch (err) { next(err); }
});

export default router;
