import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { getPaginationParams } from '../../utils/pagination';
import { paginationMeta } from '../../utils/response';

const router = Router();
router.use(authenticate);

function exceptionsQuery() {
  return db('attendance_exceptions')
    .join('users', 'attendance_exceptions.user_id', 'users.id')
    .leftJoin('users as reviewer', 'attendance_exceptions.reviewed_by', 'reviewer.id')
    .select(
      'attendance_exceptions.*',
      db.raw("users.first_name || ' ' || users.last_name as employee_name"),
      db.raw("reviewer.first_name || ' ' || reviewer.last_name as reviewer_name")
    );
}

router.get('/my', async (req: any, res, next) => {
  try {
    const exceptions = await exceptionsQuery()
      .where('attendance_exceptions.user_id', req.user.id)
      .orderBy('attendance_exceptions.exception_date', 'desc')
      .limit(50);
    return successResponse(res, exceptions);
  } catch (err) { next(err); }
});

router.get('/', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    let q = exceptionsQuery();

    if (req.user.role === 'TEAM_LEAD') {
      const ids = await db('users').where('team_lead_id', req.user.id).pluck('id');
      q = q.whereIn('attendance_exceptions.user_id', ids);
    } else if (req.user.role === 'MANAGER') {
      const ids = await db('users').where('manager_id', req.user.id).pluck('id');
      q = q.whereIn('attendance_exceptions.user_id', ids);
    }

    if (req.query.status) q = q.where('attendance_exceptions.status', req.query.status);
    if (req.query.severity) q = q.where('attendance_exceptions.severity', req.query.severity);
    if (req.query.type) q = q.where('attendance_exceptions.exception_type', req.query.type);
    if (req.query.start_date) q = q.where('attendance_exceptions.exception_date', '>=', req.query.start_date);
    if (req.query.end_date) q = q.where('attendance_exceptions.exception_date', '<=', req.query.end_date);

    // Count on base table — avoid PostgreSQL GROUP BY requirement
    let countQ = db('attendance_exceptions');
    if (req.user.role === 'TEAM_LEAD') {
      const ids2 = await db('users').where('team_lead_id', req.user.id).pluck('id');
      countQ = countQ.whereIn('user_id', ids2);
    } else if (req.user.role === 'MANAGER') {
      const ids2 = await db('users').where('manager_id', req.user.id).pluck('id');
      countQ = countQ.whereIn('user_id', ids2);
    }
    if (req.query.status) countQ = countQ.where('status', req.query.status);
    if (req.query.severity) countQ = countQ.where('severity', req.query.severity);
    if (req.query.type) countQ = countQ.where('exception_type', req.query.type);
    if (req.query.start_date) countQ = countQ.where('exception_date', '>=', req.query.start_date);
    if (req.query.end_date) countQ = countQ.where('exception_date', '<=', req.query.end_date);

    const totalResult = await countQ.count('id as count').first();
    const rows = await q.limit(limit).offset(offset).orderBy('attendance_exceptions.created_at', 'desc');

    return successResponse(res, rows, 'Exceptions retrieved', 200, paginationMeta(page, limit, Number((totalResult as any)?.count || 0)));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const exc = await exceptionsQuery().where('attendance_exceptions.id', req.params.id).first();
    if (!exc) throw new NotFoundError('Exception');
    if (req.user.role === 'EMPLOYEE' && exc.user_id !== req.user.id) throw new ForbiddenError();
    return successResponse(res, exc);
  } catch (err) { next(err); }
});

router.post('/:id/review', authorize('MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const exc = await db('attendance_exceptions').where('id', id).first();
    if (!exc) throw new NotFoundError('Exception');

    await db('attendance_exceptions').where('id', id).update({
      status: req.body.status || 'RESOLVED',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      review_comment: req.body.comment || null,
      updated_at: new Date(),
    });

    return successResponse(res, null, 'Exception reviewed');
  } catch (err) { next(err); }
});

export default router;
