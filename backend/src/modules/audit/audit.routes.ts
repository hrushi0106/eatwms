import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse, paginationMeta } from '../../utils/response';
import { getPaginationParams } from '../../utils/pagination';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req: any, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    // Build filter conditions
    const filters: Record<string, any> = {};
    if (req.query.action) filters['audit_logs.action'] = req.query.action;
    if (req.query.user_id) filters['audit_logs.user_id'] = req.query.user_id;
    if (req.query.entity_type) filters['audit_logs.entity_type'] = req.query.entity_type;

    const baseQuery = db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .where(filters);

    if (req.query.start_date) {
      baseQuery.where('audit_logs.created_at', '>=', req.query.start_date);
    }
    if (req.query.end_date) {
      baseQuery.where('audit_logs.created_at', '<=', `${req.query.end_date}T23:59:59`);
    }

    const totalResult = await baseQuery.clone().count('audit_logs.id as count').first();
    const total = Number((totalResult as any)?.count || 0);

    const rows = await baseQuery
      .select(
        db.raw('audit_logs.id::text as id'),
        'audit_logs.user_id',
        'audit_logs.action',
        'audit_logs.entity_type',
        'audit_logs.entity_id',
        'audit_logs.old_value',
        'audit_logs.new_value',
        'audit_logs.ip_address',
        'audit_logs.created_at',
        db.raw("COALESCE(users.first_name || ' ' || users.last_name, 'System') as user_name")
      )
      .limit(limit)
      .offset(offset)
      .orderBy('audit_logs.created_at', 'desc');

    return successResponse(res, rows, 'Audit logs retrieved', 200, paginationMeta(page, limit, total));
  } catch (err) { next(err); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const log = await db('audit_logs')
      .select(db.raw('id::text as id'), 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'ip_address', 'created_at', 'user_id')
      .where('id', req.params.id)
      .first();
    return successResponse(res, log);
  } catch (err) { next(err); }
});

export default router;
