import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { getSettingInt } from '../../services/settings.service';
import { createException } from '../../services/exception.service';
import { format, differenceInMinutes } from 'date-fns';

const router = Router();
router.use(authenticate);

// Heartbeat ping from client
router.post('/ping', async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendance = await db('attendance')
      .where({ user_id: req.user.id, attendance_date: today, status: 'CHECKED_IN' })
      .first();

    if (!attendance) {
      return successResponse(res, { active: false }, 'No active session');
    }

    const now = new Date();
    await db('activity_logs').insert({
      user_id: req.user.id,
      attendance_id: attendance.id,
      activity_type: req.body.type || 'HEARTBEAT',
      metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : null,
      timestamp: now,
      ip_address: req.ip,
    });

    // Check idle threshold
    const idleThreshold = await getSettingInt('idle_threshold_minutes', 30);
    const lastActivity = await db('activity_logs')
      .where({ user_id: req.user.id })
      .orderBy('timestamp', 'desc')
      .offset(1)
      .first();

    if (lastActivity) {
      const minutesSinceActivity = differenceInMinutes(now, new Date(lastActivity.timestamp));
      if (minutesSinceActivity >= idleThreshold) {
        await createException({
          userId: req.user.id,
          attendanceId: attendance.id,
          exceptionType: 'LONG_IDLE',
          description: `Employee was idle for ${minutesSinceActivity} minutes`,
          exceptionDate: today,
          notifyManagerId: req.user.manager_id,
        });
      }
    }

    return successResponse(res, { active: true }, 'Activity recorded');
  } catch (err) { next(err); }
});

router.get('/my', async (req: any, res, next) => {
  try {
    const logs = await db('activity_logs')
      .where('user_id', req.user.id)
      .orderBy('timestamp', 'desc')
      .limit(100);
    return successResponse(res, logs);
  } catch (err) { next(err); }
});

router.get('/team', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    let teamIds: number[] = [];
    if (req.user.role === 'TEAM_LEAD') teamIds = await db('users').where('team_lead_id', req.user.id).pluck('id');
    else if (req.user.role === 'MANAGER') teamIds = await db('users').where('manager_id', req.user.id).pluck('id');
    else teamIds = await db('users').pluck('id');

    const today = format(new Date(), 'yyyy-MM-dd');
    const logs = await db('activity_logs')
      .join('users', 'activity_logs.user_id', 'users.id')
      .whereIn('activity_logs.user_id', teamIds)
      .where('activity_logs.timestamp', '>=', `${today}T00:00:00`)
      .select('activity_logs.*', db.raw("users.first_name || ' ' || users.last_name as user_name"))
      .orderBy('activity_logs.timestamp', 'desc')
      .limit(200);
    return successResponse(res, logs);
  } catch (err) { next(err); }
});

export default router;
