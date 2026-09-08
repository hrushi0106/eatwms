import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import db from '../../config/database';
import { successResponse } from '../../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (req: any, res, next) => {
  try {
    const notifications = await db('notifications')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(50);
    const unreadCount = await db('notifications')
      .where({ user_id: req.user.id, is_read: false })
      .count('id as count').first();
    return successResponse(res, {
      notifications,
      unread_count: Number((unreadCount as any)?.count || 0),
    });
  } catch (err) { next(err); }
});

router.post('/:id/read', async (req: any, res, next) => {
  try {
    await db('notifications')
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ is_read: true, read_at: new Date() });
    return successResponse(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

router.post('/read-all', async (req: any, res, next) => {
  try {
    await db('notifications')
      .where({ user_id: req.user.id, is_read: false })
      .update({ is_read: true, read_at: new Date() });
    return successResponse(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: any, res, next) => {
  try {
    await db('notifications').where({ id: req.params.id, user_id: req.user.id }).del();
    return successResponse(res, null, 'Notification deleted');
  } catch (err) { next(err); }
});

export default router;
