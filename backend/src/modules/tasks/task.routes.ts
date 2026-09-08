import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import db from '../../config/database';
import { successResponse, createdResponse } from '../../utils/response';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { createNotification } from '../../services/notification.service';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  project_id: z.number().int().positive(),
  assigned_to: z.number().int().positive().optional(),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  estimated_hours: z.number().positive().optional(),
  due_date: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).optional(),
});

const progressSchema = z.object({
  progress_percentage: z.number().int().min(0).max(100),
  work_update: z.string().min(1),
  time_spent: z.number().positive().optional(),
  remaining_work: z.string().optional(),
  blocker: z.string().optional(),
});

function taskQuery() {
  return db('tasks')
    .join('projects', 'tasks.project_id', 'projects.id')
    .leftJoin('users as assignee', 'tasks.assigned_to', 'assignee.id')
    .leftJoin('users as assigner', 'tasks.assigned_by', 'assigner.id')
    .select(
      'tasks.*',
      'projects.name as project_name', 'projects.project_code',
      db.raw("assignee.first_name || ' ' || assignee.last_name as assigned_to_name"),
      db.raw("assigner.first_name || ' ' || assigner.last_name as assigned_by_name")
    );
}

router.get('/', async (req: any, res, next) => {
  try {
    let q = taskQuery();
    if (req.user.role === 'EMPLOYEE') {
      q = q.where('tasks.assigned_to', req.user.id);
    } else if (req.user.role === 'TEAM_LEAD') {
      const teamIds = await db('users').where('team_lead_id', req.user.id).pluck('id');
      teamIds.push(req.user.id);
      q = q.whereIn('tasks.assigned_to', teamIds);
    } else if (req.user.role === 'MANAGER') {
      const teamIds = await db('users').where('manager_id', req.user.id).pluck('id');
      teamIds.push(req.user.id);
      q = q.whereIn('tasks.assigned_to', teamIds);
    }
    if (req.query.status) q = q.where('tasks.status', req.query.status);
    if (req.query.priority) q = q.where('tasks.priority', req.query.priority);
    if (req.query.project_id) q = q.where('tasks.project_id', req.query.project_id);
    const tasks = await q.orderBy('tasks.due_date', 'asc');
    return successResponse(res, tasks);
  } catch (err) { next(err); }
});

router.post('/', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), validateBody(taskSchema), async (req: any, res, next) => {
  try {
    const [id] = await db('tasks').insert({
      ...req.body, assigned_by: req.user.id,
      progress_percentage: 0,
      created_at: new Date(), updated_at: new Date(),
    }).returning('id');
    const taskId = typeof id === 'object' ? (id as any).id : id;

    if (req.body.assigned_to) {
      await createNotification({
        userId: req.body.assigned_to,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${req.body.name}`,
        entityType: 'task', entityId: taskId,
      });
    }

    const task = await taskQuery().where('tasks.id', taskId).first();
    return createdResponse(res, task, 'Task created');
  } catch (err) { next(err); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const task = await taskQuery().where('tasks.id', req.params.id).first();
    if (!task) throw new NotFoundError('Task');
    if (req.user.role === 'EMPLOYEE' && task.assigned_to !== req.user.id) throw new ForbiddenError();
    return successResponse(res, task);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), validateBody(taskSchema.partial()), async (req: any, res, next) => {
  try {
    await db('tasks').where('id', req.params.id).update({ ...req.body, updated_at: new Date() });
    return successResponse(res, await taskQuery().where('tasks.id', req.params.id).first(), 'Task updated');
  } catch (err) { next(err); }
});

router.post('/:id/progress', validateBody(progressSchema), async (req: any, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await db('tasks').where('id', taskId).first();
    if (!task) throw new NotFoundError('Task');

    await db('task_updates').insert({
      task_id: taskId, user_id: req.user.id,
      ...req.body, created_at: new Date(), updated_at: new Date(),
    });

    await db('tasks').where('id', taskId).update({
      progress_percentage: req.body.progress_percentage,
      status: req.body.progress_percentage === 100 ? 'COMPLETED' : task.status === 'TODO' ? 'IN_PROGRESS' : task.status,
      updated_at: new Date(),
    });

    return successResponse(res, null, 'Progress updated');
  } catch (err) { next(err); }
});

router.get('/:id/updates', async (req: any, res, next) => {
  try {
    const updates = await db('task_updates')
      .join('users', 'task_updates.user_id', 'users.id')
      .select('task_updates.*', db.raw("users.first_name || ' ' || users.last_name as user_name"))
      .where('task_id', req.params.id)
      .orderBy('task_updates.created_at', 'desc');
    return successResponse(res, updates);
  } catch (err) { next(err); }
});

export default router;
