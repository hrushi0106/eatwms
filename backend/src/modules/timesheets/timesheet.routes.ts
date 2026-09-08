import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import * as svc from './timesheet.service';
import { successResponse, createdResponse, paginationMeta } from '../../utils/response';
import { getPaginationParams } from '../../utils/pagination';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project_id: z.number().int().positive(),
  task_id: z.number().int().positive().optional(),
  hours: z.number().positive().max(24),
  overtime_hours: z.number().min(0).optional(),
  description: z.string().min(1).max(500),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_billable: z.boolean().optional(),
  attendance_id: z.number().int().positive().optional(),
});

router.get('/', async (req: any, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const { rows, total } = await svc.listTimesheets(req.user.id, req.user.role, { ...req.query, page, limit });
    return successResponse(res, rows, 'Timesheets retrieved', 200, paginationMeta(page, limit, total));
  } catch (err) { next(err); }
});

router.post('/', validateBody(createSchema), async (req: any, res, next) => {
  try {
    const ts = await svc.createTimesheet(req.user.id, req.body, req);
    return createdResponse(res, ts, 'Timesheet created');
  } catch (err) { next(err); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const ts = await svc.getTimesheetById(parseInt(req.params.id));
    return successResponse(res, ts, 'Timesheet retrieved');
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(createSchema.partial()), async (req: any, res, next) => {
  try {
    const ts = await svc.updateTimesheet(parseInt(req.params.id), req.user.id, req.user.role, req.body, req);
    return successResponse(res, ts, 'Timesheet updated');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: any, res, next) => {
  try {
    await svc.deleteTimesheet(parseInt(req.params.id), req.user.id, req.user.role, req);
    return successResponse(res, null, 'Timesheet deleted');
  } catch (err) { next(err); }
});

router.post('/:id/submit', async (req: any, res, next) => {
  try {
    const ts = await svc.submitTimesheet(parseInt(req.params.id), req.user.id, req);
    return successResponse(res, ts, 'Timesheet submitted for approval');
  } catch (err) { next(err); }
});

router.post('/:id/approve', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const ts = await svc.reviewTimesheet(parseInt(req.params.id), req.user.id, 'approve', req.body.comment, req);
    return successResponse(res, ts, 'Timesheet approved');
  } catch (err) { next(err); }
});

router.post('/:id/reject', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const ts = await svc.reviewTimesheet(parseInt(req.params.id), req.user.id, 'reject', req.body.comment, req);
    return successResponse(res, ts, 'Timesheet rejected');
  } catch (err) { next(err); }
});

export default router;
