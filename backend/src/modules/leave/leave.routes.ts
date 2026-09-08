import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import db from '../../config/database';
import { successResponse, createdResponse } from '../../utils/response';
import { NotFoundError, AppError, ForbiddenError } from '../../utils/errors';
import { createAuditLog } from '../../services/audit.service';
import { createNotification } from '../../services/notification.service';

const router = Router();
router.use(authenticate);

const leaveRequestSchema = z.object({
  leave_type_id: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_days: z.number().positive(),
  reason: z.string().min(3).max(500),
});

router.get('/types', async (_req, res, next) => {
  try {
    return successResponse(res, await db('leave_types').where('status', 'ACTIVE').orderBy('name'));
  } catch (err) { next(err); }
});

router.get('/balance', async (req: any, res, next) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const balances = await db('leave_balances')
      .join('leave_types', 'leave_balances.leave_type_id', 'leave_types.id')
      .select('leave_balances.*', 'leave_types.name as leave_type_name',
        db.raw('leave_balances.allocated_days - leave_balances.used_days as remaining_days'))
      .where({ 'leave_balances.user_id': req.user.id, year });
    return successResponse(res, balances);
  } catch (err) { next(err); }
});

router.post('/request', validateBody(leaveRequestSchema), async (req: any, res, next) => {
  try {
    const { leave_type_id, start_date, end_date, total_days, reason } = req.body;
    const year = new Date(start_date).getFullYear();

    const balance = await db('leave_balances')
      .where({ user_id: req.user.id, leave_type_id, year }).first();

    if (!balance) throw new AppError('No leave balance found for this type', 400);
    if (balance.allocated_days - balance.used_days < total_days) {
      throw new AppError(`Insufficient leave balance. Available: ${balance.allocated_days - balance.used_days} days`, 400, 'INSUFFICIENT_BALANCE');
    }

    const [id] = await db('leave_requests').insert({
      user_id: req.user.id, leave_type_id, start_date, end_date, total_days, reason,
      status: 'PENDING', created_at: new Date(), updated_at: new Date(),
    }).returning('id');
    const reqId = typeof id === 'object' ? (id as any).id : id;

    await createAuditLog({ userId: req.user.id, action: 'LEAVE_CREATED', entityType: 'leave_request', entityId: reqId, req });

    const user = await db('users').where('id', req.user.id).first();
    if (user?.manager_id) {
      await createNotification({
        userId: user.manager_id, type: 'LEAVE_REQUEST',
        title: 'New Leave Request',
        message: `${user.first_name} ${user.last_name} has requested ${total_days} days leave from ${start_date} to ${end_date}`,
        entityType: 'leave_request', entityId: reqId,
      });
    }

    return createdResponse(res, await db('leave_requests').where('id', reqId).first(), 'Leave request submitted');
  } catch (err) { next(err); }
});

router.get('/my', async (req: any, res, next) => {
  try {
    const requests = await db('leave_requests')
      .join('leave_types', 'leave_requests.leave_type_id', 'leave_types.id')
      .select('leave_requests.*', 'leave_types.name as leave_type_name')
      .where('leave_requests.user_id', req.user.id)
      .orderBy('leave_requests.created_at', 'desc');
    return successResponse(res, requests);
  } catch (err) { next(err); }
});

router.get('/team', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    let teamIds: number[] = [];
    if (req.user.role === 'TEAM_LEAD') teamIds = await db('users').where('team_lead_id', req.user.id).pluck('id');
    else if (req.user.role === 'MANAGER') teamIds = await db('users').where('manager_id', req.user.id).pluck('id');

    let q = db('leave_requests')
      .join('leave_types', 'leave_requests.leave_type_id', 'leave_types.id')
      .join('users', 'leave_requests.user_id', 'users.id')
      .select('leave_requests.*', 'leave_types.name as leave_type_name',
        db.raw("users.first_name || ' ' || users.last_name as employee_name"));

    if (req.user.role !== 'ADMIN') q = q.whereIn('leave_requests.user_id', teamIds);
    if (req.query.status) q = q.where('leave_requests.status', req.query.status);

    return successResponse(res, await q.orderBy('leave_requests.created_at', 'desc'));
  } catch (err) { next(err); }
});

async function reviewLeave(req: any, res: any, next: any, action: 'approve' | 'reject') {
  try {
    const id = parseInt(req.params.id);
    const lr = await db('leave_requests').where('id', id).first();
    if (!lr) throw new NotFoundError('Leave request');
    if (lr.status !== 'PENDING') throw new AppError('Leave request is not pending', 400);

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    if (action === 'approve') {
      // Deduct balance
      const year = new Date(lr.start_date).getFullYear();
      await db('leave_balances')
        .where({ user_id: lr.user_id, leave_type_id: lr.leave_type_id, year })
        .increment('used_days', lr.total_days);
    }

    await db('leave_requests').where('id', id).update({
      status: newStatus, reviewed_by: req.user.id,
      reviewed_at: new Date(), review_comment: req.body.comment || null,
      updated_at: new Date(),
    });

    await createAuditLog({
      userId: req.user.id,
      action: action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      entityType: 'leave_request', entityId: id, req,
    });

    await createNotification({
      userId: lr.user_id, type: 'LEAVE_STATUS',
      title: `Leave ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your leave request (${lr.start_date} to ${lr.end_date}) has been ${newStatus.toLowerCase()}`,
      entityType: 'leave_request', entityId: id,
    });

    return successResponse(res, null, `Leave request ${newStatus.toLowerCase()}`);
  } catch (err) { next(err); }
}

router.post('/:id/approve', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), (req, res, next) => reviewLeave(req, res, next, 'approve'));
router.post('/:id/reject', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), (req, res, next) => reviewLeave(req, res, next, 'reject'));

router.post('/:id/cancel', async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const lr = await db('leave_requests').where('id', id).first();
    if (!lr) throw new NotFoundError('Leave request');
    if (lr.user_id !== req.user.id) throw new ForbiddenError();
    if (lr.status !== 'PENDING') throw new AppError('Only PENDING requests can be cancelled', 400);
    await db('leave_requests').where('id', id).update({ status: 'CANCELLED', updated_at: new Date() });
    return successResponse(res, null, 'Leave request cancelled');
  } catch (err) { next(err); }
});

export default router;
