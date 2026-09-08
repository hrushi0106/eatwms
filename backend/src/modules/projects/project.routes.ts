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
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  client_name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED']).optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const projects = await db('projects').where('status', '!=', 'ARCHIVED').orderBy('name');
    return successResponse(res, projects);
  } catch (err) { next(err); }
});

router.post('/', authorize('MANAGER', 'ADMIN'), validateBody(schema), async (req: any, res, next) => {
  try {
    const last = await db('projects').max('id as maxId').first();
    const nextId = ((last as any)?.maxId || 0) + 1;
    const project_code = `PRJ-${String(nextId).padStart(3, '0')}`;
    const [id] = await db('projects').insert({
      ...req.body, project_code, created_by: req.user.id,
      created_at: new Date(), updated_at: new Date(),
    }).returning('id');
    const project = await db('projects').where('id', typeof id === 'object' ? (id as any).id : id).first();
    return createdResponse(res, project, 'Project created');
  } catch (err) { next(err); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const project = await db('projects').where('id', req.params.id).first();
    if (!project) throw new NotFoundError('Project');
    const tasks = await db('tasks').where('project_id', req.params.id).orderBy('created_at', 'desc');
    return successResponse(res, { ...project, tasks });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('MANAGER', 'ADMIN'), validateBody(schema.partial()), async (req: any, res, next) => {
  try {
    await db('projects').where('id', req.params.id).update({ ...req.body, updated_at: new Date() });
    return successResponse(res, await db('projects').where('id', req.params.id).first(), 'Project updated');
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    await db('projects').where('id', req.params.id).update({ status: req.body.status, updated_at: new Date() });
    return successResponse(res, null, 'Status updated');
  } catch (err) { next(err); }
});

export default router;
