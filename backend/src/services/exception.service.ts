import db from '../config/database';
import { getSettingInt, getSetting } from './settings.service';
import { createNotification } from './notification.service';
import { ExceptionType, ExceptionSeverity } from '../types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface CreateExceptionParams {
  userId: number;
  attendanceId?: number;
  exceptionType: ExceptionType;
  description: string;
  exceptionDate: string;
  notifyManagerId?: number;
}

function getSeverity(type: ExceptionType, minutesLate = 0): ExceptionSeverity {
  switch (type) {
    case 'MISSING_CHECKOUT':
    case 'MISSING_CHECKIN':
      return 'HIGH';
    case 'LATE_CHECKIN':
    case 'EARLY_CHECKOUT':
      if (minutesLate > 60) return 'HIGH';
      if (minutesLate > 30) return 'MEDIUM';
      return 'LOW';
    case 'LONG_IDLE':
      return 'MEDIUM';
    case 'MISSING_SELFIE':
      return 'MEDIUM';
    case 'TIMESHEET_MISMATCH':
    case 'MISSING_TIMESHEET':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

export async function createException(params: CreateExceptionParams): Promise<number> {
  // Deduplicate — don't create same exception type for same user+date
  const existing = await db('attendance_exceptions')
    .where({
      user_id: params.userId,
      exception_type: params.exceptionType,
      exception_date: params.exceptionDate,
    })
    .whereNotIn('status', ['RESOLVED', 'DISMISSED'])
    .first();

  if (existing) return existing.id;

  const severity = getSeverity(params.exceptionType);

  const [id] = await db('attendance_exceptions').insert({
    user_id: params.userId,
    attendance_id: params.attendanceId || null,
    exception_type: params.exceptionType,
    severity,
    description: params.description,
    status: 'OPEN',
    exception_date: params.exceptionDate,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('id');

  // Notify employee
  await createNotification({
    userId: params.userId,
    type: 'ATTENDANCE_EXCEPTION',
    title: 'Attendance Exception',
    message: params.description,
    entityType: 'attendance_exception',
    entityId: typeof id === 'object' ? (id as { id: number }).id : id,
  });

  // Notify manager if provided
  if (params.notifyManagerId) {
    const user = await db('users').where('id', params.userId).first();
    await createNotification({
      userId: params.notifyManagerId,
      type: 'ATTENDANCE_EXCEPTION',
      title: 'Team Attendance Exception',
      message: `${user?.first_name} ${user?.last_name}: ${params.description}`,
      entityType: 'attendance_exception',
      entityId: typeof id === 'object' ? (id as { id: number }).id : id,
    });
  }

  return typeof id === 'object' ? (id as { id: number }).id : id;
}

export async function checkLateCheckIn(
  userId: number,
  attendanceId: number,
  checkInTime: Date,
  attendanceDate: string
): Promise<void> {
  const standardStartTime = await getSetting('standard_start_time', '09:00');
  const gracePeriodMinutes = await getSettingInt('grace_period_minutes', 15);

  const [startHour, startMin] = standardStartTime.split(':').map(Number);
  const today = format(checkInTime, 'yyyy-MM-dd');
  const standardStart = new Date(`${today}T${standardStartTime}:00Z`);
  const graceEnd = new Date(standardStart.getTime() + gracePeriodMinutes * 60_000);

  // Normalize check-in time to same timezone logic
  const checkInHour = checkInTime.getUTCHours();
  const checkInMin = checkInTime.getUTCMinutes();
  const checkInMinutes = checkInHour * 60 + checkInMin;
  const graceEndMinutes = startHour * 60 + startMin + gracePeriodMinutes;

  if (checkInMinutes > graceEndMinutes) {
    const minutesLate = checkInMinutes - (startHour * 60 + startMin);
    const user = await db('users').where('id', userId).select('manager_id').first();
    await createException({
      userId,
      attendanceId,
      exceptionType: 'LATE_CHECKIN',
      description: `Late check-in: ${minutesLate} minutes after standard start time (${standardStartTime})`,
      exceptionDate: attendanceDate,
      notifyManagerId: user?.manager_id,
    });
  }
}

export async function checkEarlyCheckOut(
  userId: number,
  attendanceId: number,
  checkOutTime: Date,
  attendanceDate: string
): Promise<void> {
  const standardEndTime = await getSetting('standard_end_time', '18:00');
  const gracePeriodMinutes = await getSettingInt('grace_period_minutes', 15);

  const [endHour, endMin] = standardEndTime.split(':').map(Number);
  const checkOutHour = checkOutTime.getUTCHours();
  const checkOutMin = checkOutTime.getUTCMinutes();
  const checkOutMinutes = checkOutHour * 60 + checkOutMin;
  const graceStartMinutes = endHour * 60 + endMin - gracePeriodMinutes;

  if (checkOutMinutes < graceStartMinutes) {
    const minutesEarly = graceStartMinutes - checkOutMinutes + gracePeriodMinutes;
    const user = await db('users').where('id', userId).select('manager_id').first();
    await createException({
      userId,
      attendanceId,
      exceptionType: 'EARLY_CHECKOUT',
      description: `Early check-out: ${minutesEarly} minutes before standard end time (${standardEndTime})`,
      exceptionDate: attendanceDate,
      notifyManagerId: user?.manager_id,
    });
  }
}

export async function runDailyExceptionCheck(date: string): Promise<void> {
  const activeUsers = await db('users').where('status', 'ACTIVE');

  for (const user of activeUsers) {
    // Check approved leave
    const onLeave = await db('leave_requests')
      .where('user_id', user.id)
      .where('status', 'APPROVED')
      .where('start_date', '<=', date)
      .where('end_date', '>=', date)
      .first();

    if (onLeave) continue; // Skip — approved leave

    // Check if it's a weekend (basic check)
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    const attendance = await db('attendance')
      .where({ user_id: user.id, attendance_date: date })
      .first();

    if (!attendance) {
      // MISSING_CHECKIN
      await createException({
        userId: user.id,
        exceptionType: 'MISSING_CHECKIN',
        description: `No check-in recorded for ${date}`,
        exceptionDate: date,
        notifyManagerId: user.manager_id,
      });
      continue;
    }

    if (attendance.status === 'CHECKED_IN') {
      // MISSING_CHECKOUT
      await createException({
        userId: user.id,
        attendanceId: attendance.id,
        exceptionType: 'MISSING_CHECKOUT',
        description: `No check-out recorded. Session started at ${attendance.check_in_time}`,
        exceptionDate: date,
        notifyManagerId: user.manager_id,
      });
    }

    // MISSING_TIMESHEET
    const timesheet = await db('timesheets')
      .where({ user_id: user.id, date })
      .whereIn('status', ['SUBMITTED', 'APPROVED'])
      .first();

    if (!timesheet && attendance.status === 'CHECKED_OUT') {
      await createException({
        userId: user.id,
        attendanceId: attendance.id,
        exceptionType: 'MISSING_TIMESHEET',
        description: `No timesheet submitted for ${date}`,
        exceptionDate: date,
        notifyManagerId: user.manager_id,
      });
    }
  }
}
