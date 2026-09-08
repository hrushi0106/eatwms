import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { calculateKPIs } from '../../services/kpi/kpi.service';

const router = Router();
router.use(authenticate);

// Employee dashboard
router.get('/employee', async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const userId = req.user.id;

    const [attendance, tasksResult, timesheetResult, leaveBalance, notifications] = await Promise.all([
      db('attendance').join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
        .select('attendance.*', 'work_modes.code as work_mode_code', 'work_modes.name as work_mode_name')
        .where({ 'attendance.user_id': userId, attendance_date: today }).first(),

      db('tasks').where('assigned_to', userId)
        .select('status', db.raw('COUNT(id) as count')).groupBy('status'),

      db('timesheets').where({ user_id: userId, date: today })
        .sum('hours as total').first(),

      db('leave_balances')
        .join('leave_types', 'leave_balances.leave_type_id', 'leave_types.id')
        .select('leave_balances.*', 'leave_types.name as leave_type_name',
          db.raw('leave_balances.allocated_days - leave_balances.used_days as remaining_days'))
        .where({ 'leave_balances.user_id': userId, year: new Date().getFullYear() }),

      db('notifications').where({ user_id: userId, is_read: false })
        .orderBy('created_at', 'desc').limit(5),
    ]);

    const taskCounts = tasksResult.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = Number(r.count); return acc;
    }, {});

    const recentTasks = await db('tasks')
      .join('projects', 'tasks.project_id', 'projects.id')
      .select('tasks.*', 'projects.name as project_name')
      .where('tasks.assigned_to', userId)
      .whereNotIn('tasks.status', ['COMPLETED', 'CANCELLED'])
      .orderBy('tasks.due_date', 'asc')
      .limit(5);

    return successResponse(res, {
      today_attendance: attendance || null,
      today_timesheet_hours: Number((timesheetResult as any)?.total || 0),
      tasks: { ...taskCounts, assigned: Object.values(taskCounts).reduce((a, b) => a + b, 0) },
      recent_tasks: recentTasks,
      leave_balance: leaveBalance,
      unread_notifications: notifications.length,
    });
  } catch (err) { next(err); }
});

// Manager dashboard
router.get('/manager', authorize('MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const userId = req.user.id;

    let teamIds: number[] = [];
    if (req.user.role === 'MANAGER') {
      teamIds = await db('users').where({ manager_id: userId, status: 'ACTIVE' }).pluck('id');
    } else {
      teamIds = await db('users').where('status', 'ACTIVE').pluck('id');
    }

    const total = teamIds.length;

    const attendanceToday = await db('attendance')
      .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
      .whereIn('attendance.user_id', teamIds)
      .where('attendance_date', today)
      .select('attendance.user_id', 'attendance.status', 'attendance.check_in_time', 'work_modes.code as work_mode_code');

    const onLeave = await db('leave_requests')
      .whereIn('user_id', teamIds)
      .where('status', 'APPROVED')
      .where('start_date', '<=', today)
      .where('end_date', '>=', today)
      .pluck('user_id');

    const presentIds = new Set(attendanceToday.map((a: any) => a.user_id));
    const onLeaveIds = new Set(onLeave);

    const present = attendanceToday.filter((a: any) => a.status !== 'ABSENT').length;
    const absent = total - present - onLeaveIds.size;
    const wfh = attendanceToday.filter((a: any) => a.work_mode_code === 'WFH').length;
    const office = attendanceToday.filter((a: any) => a.work_mode_code === 'OFFICE').length;
    const checkedOut = attendanceToday.filter((a: any) => a.status === 'CHECKED_OUT').length;

    const pendingLeave = await db('leave_requests')
      .whereIn('user_id', teamIds).where('status', 'PENDING').count('id as count').first();

    const openExceptions = await db('attendance_exceptions')
      .whereIn('user_id', teamIds).where('status', 'OPEN').count('id as count').first();

    const teamAttendance = await db('users')
      .leftJoin('attendance', (qb) => {
        qb.on('users.id', 'attendance.user_id').andOn(db.raw('attendance.attendance_date = ?', [today]));
      })
      .leftJoin('work_modes', 'attendance.work_mode_id', 'work_modes.id')
      .whereIn('users.id', teamIds)
      .select(
        'users.id as user_id',
        db.raw("users.first_name || ' ' || users.last_name as employee_name"),
        'users.employee_code',
        'work_modes.code as work_mode',
        'attendance.check_in_time', 'attendance.check_out_time',
        'attendance.total_work_minutes', 'attendance.status as attendance_status',
      )
      .orderBy('users.first_name');

    return successResponse(res, {
      summary: {
        total, present, absent: Math.max(0, absent), wfh, office,
        on_leave: onLeaveIds.size, late: 0, pending_review: 0, checked_out: checkedOut,
      },
      team_attendance: teamAttendance,
      pending_leave_requests: Number((pendingLeave as any)?.count || 0),
      open_exceptions: Number((openExceptions as any)?.count || 0),
    });
  } catch (err) { next(err); }
});

// Team Lead dashboard
router.get('/teamlead', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const teamIds = req.user.role === 'TEAM_LEAD'
      ? await db('users').where({ team_lead_id: req.user.id, status: 'ACTIVE' }).pluck('id')
      : await db('users').where('status', 'ACTIVE').pluck('id');

    const [attendance, tasks, exceptions] = await Promise.all([
      db('attendance')
        .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
        .join('users', 'attendance.user_id', 'users.id')
        .whereIn('attendance.user_id', teamIds)
        .where('attendance_date', today)
        .select('attendance.*', 'work_modes.code as work_mode_code',
          db.raw("users.first_name || ' ' || users.last_name as employee_name")),

      db('tasks').whereIn('assigned_to', teamIds).whereNotIn('status', ['COMPLETED', 'CANCELLED']),

      db('attendance_exceptions')
        .whereIn('user_id', teamIds).where('status', 'OPEN')
        .where('exception_date', today),
    ]);

    return successResponse(res, {
      team_attendance: attendance,
      active_tasks: tasks.length,
      open_exceptions: exceptions.length,
      team_size: teamIds.length,
    });
  } catch (err) { next(err); }
});

// Admin dashboard
router.get('/admin', authorize('ADMIN'), async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const [totalUsers, activeUsers, attendanceToday, pendingLeave, openExceptions, activeSessions] = await Promise.all([
      db('users').count('id as count').first(),
      db('users').where('status', 'ACTIVE').count('id as count').first(),
      db('attendance').where('attendance_date', today).select('status', 'work_mode_id'),
      db('leave_requests').where('status', 'PENDING').count('id as count').first(),
      db('attendance_exceptions').where('status', 'OPEN').count('id as count').first(),
      db('attendance').where({ attendance_date: today, status: 'CHECKED_IN' }).count('id as count').first(),
    ]);

    const wfhIds = (await db('work_modes').where('code', 'WFH').pluck('id'));
    const officeIds = (await db('work_modes').where('code', 'OFFICE').pluck('id'));

    const att = attendanceToday as any[];
    const present = att.filter((a) => a.status !== 'ABSENT').length;
    const wfh = att.filter((a) => wfhIds.includes(a.work_mode_id)).length;
    const office = att.filter((a) => officeIds.includes(a.work_mode_id)).length;

    // Chart: Daily attendance last 7 days
    const last7 = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
        return db('attendance').where('attendance_date', d).count('id as count').first()
          .then((r: any) => ({ date: d, count: Number(r?.count || 0) }));
      })
    );

    return successResponse(res, {
      summary: {
        total_employees: Number((totalUsers as any)?.count || 0),
        active_employees: Number((activeUsers as any)?.count || 0),
        active_sessions: Number((activeSessions as any)?.count || 0),
        present,
        wfh,
        office,
        absent: Number((activeUsers as any)?.count || 0) - present,
        on_leave: 0,
        pending_approvals: Number((pendingLeave as any)?.count || 0),
        open_exceptions: Number((openExceptions as any)?.count || 0),
      },
      charts: { daily_attendance: last7 },
    });
  } catch (err) { next(err); }
});

// KPI data
router.get('/kpi', authorize('MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const range = req.query.range || 'month';
    let start = startMonth;
    if (range === 'week') start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    if (range === 'today') start = today;
    if (req.query.start_date) start = req.query.start_date as string;
    const end = req.query.end_date as string || today;

    const filters = {
      startDate: start,
      endDate: end,
      ...(req.query.user_id ? { userId: parseInt(req.query.user_id as string) } : {}),
      ...(req.user.role === 'MANAGER' ? { managerUserId: req.user.id } : {}),
    };

    const kpi = await calculateKPIs(filters);
    return successResponse(res, kpi);
  } catch (err) { next(err); }
});

export default router;
