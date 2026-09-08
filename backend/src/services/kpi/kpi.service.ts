import db from '../../config/database';
import { getSettingInt, getSetting } from '../settings.service';
import { KPIData } from '../../types';
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns';

export interface KPIFilters {
  userId?: number;
  departmentId?: number;
  managerUserId?: number; // scope to manager's team
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export async function calculateKPIs(filters: KPIFilters): Promise<KPIData> {
  const { startDate, endDate, userId, managerUserId } = filters;

  const standardWorkHours = await getSettingInt('standard_work_hours', 8);
  const standardStartTime = await getSetting('standard_start_time', '09:00');
  const gracePeriodMinutes = await getSettingInt('grace_period_minutes', 15);

  // Expected working days (excl weekends + approved leave)
  const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  const workingDays = allDays.filter((d: Date) => !isWeekend(d));
  let expectedWorkingDays = workingDays.length;

  let userQuery = db('attendance').whereBetween('attendance_date', [startDate, endDate]);
  if (userId) userQuery = userQuery.where('user_id', userId);
  if (managerUserId) {
    const teamIds = await db('users').where('manager_id', managerUserId).pluck('id');
    userQuery = userQuery.whereIn('user_id', teamIds);
  }

  const attendanceRows = await userQuery;
  const totalAttendanceRecords = attendanceRows.length;
  const presentDays = attendanceRows.filter((a) => a.status !== 'ABSENT').length;
  const wfhDays = attendanceRows.filter((a) => {
    // Need to join work_mode — simplified by checking mode separately
    return false; // handled below
  }).length;

  // WFH count via join
  const wfhCount = await db('attendance')
    .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
    .whereBetween('attendance.attendance_date', [startDate, endDate])
    .where('work_modes.code', 'WFH')
    .modify((q) => {
      if (userId) q.where('attendance.user_id', userId);
      if (managerUserId) q.whereIn('attendance.user_id',
        db('users').where('manager_id', managerUserId).select('id'));
    })
    .count('attendance.id as count')
    .first();

  const actualWfhDays = Number((wfhCount as { count: string })?.count || 0);

  // On-time check-ins
  const [startHour, startMin] = standardStartTime.split(':').map(Number);
  const graceMs = gracePeriodMinutes * 60 * 1000;
  const latestOnTimeMs = (startHour * 60 + startMin + gracePeriodMinutes) * 60 * 1000;

  let onTimeCheckIns = 0;
  for (const row of attendanceRows) {
    const checkInDate = new Date(row.check_in_time);
    const dayMs = (checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes()) * 60 * 1000;
    if (dayMs <= latestOnTimeMs) onTimeCheckIns++;
  }

  // Timesheets
  let tsQuery = db('timesheets')
    .whereBetween('date', [startDate, endDate])
    .whereIn('status', ['SUBMITTED', 'APPROVED']);
  if (userId) tsQuery = tsQuery.where('user_id', userId);
  const submittedTimesheets = await tsQuery.count('id as count').first();
  const submittedCount = Number((submittedTimesheets as { count: string })?.count || 0);

  // Tasks
  let taskBase = db('tasks');
  if (userId) taskBase = taskBase.where('assigned_to', userId);
  const [assignedResult, completedResult] = await Promise.all([
    taskBase.clone().count('id as count').first(),
    taskBase.clone().where('status', 'COMPLETED').count('id as count').first(),
  ]);
  const assignedTasks = Number((assignedResult as { count: string })?.count || 0);
  const completedTasks = Number((completedResult as { count: string })?.count || 0);

  // Verifications
  const verResult = await db('attendance_verifications')
    .join('attendance', 'attendance_verifications.attendance_id', 'attendance.id')
    .whereBetween('attendance.attendance_date', [startDate, endDate])
    .modify((q) => {
      if (userId) q.where('attendance.user_id', userId);
    })
    .count('attendance_verifications.id as count')
    .first();
  const successfulVerifications = Number((verResult as { count: string })?.count || 0);
  const expectedVerifications = totalAttendanceRecords * 2; // checkin + checkout per day

  // Exceptions
  const excResult = await db('attendance_exceptions')
    .whereBetween('exception_date', [startDate, endDate])
    .modify((q) => {
      if (userId) q.where('user_id', userId);
    })
    .count('id as count')
    .first();
  const totalExceptions = Number((excResult as { count: string })?.count || 0);

  // Overtime
  const overtimeResult = await db('attendance')
    .whereBetween('attendance_date', [startDate, endDate])
    .modify((q) => {
      if (userId) q.where('user_id', userId);
    })
    .sum('overtime_minutes as total')
    .first();
  const totalOvertimeMinutes = Number((overtimeResult as { total: string })?.total || 0);

  // KPI calculations
  const attendanceRate = expectedWorkingDays > 0
    ? Math.min(100, (presentDays / expectedWorkingDays) * 100) : 0;
  const totalCheckIns = attendanceRows.length;
  const onTimeCheckInRate = totalCheckIns > 0 ? (onTimeCheckIns / totalCheckIns) * 100 : 0;
  const wfhRate = presentDays > 0 ? (actualWfhDays / presentDays) * 100 : 0;
  const timesheetCompletion = presentDays > 0 ? (submittedCount / presentDays) * 100 : 0;
  const taskCompletionRate = assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0;
  const verificationCompletion = expectedVerifications > 0
    ? (successfulVerifications / expectedVerifications) * 100 : 0;
  const exceptionRate = totalAttendanceRecords > 0
    ? (totalExceptions / totalAttendanceRecords) * 100 : 0;

  return {
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    onTimeCheckInRate: Math.round(onTimeCheckInRate * 10) / 10,
    wfhRate: Math.round(wfhRate * 10) / 10,
    timesheetCompletion: Math.round(timesheetCompletion * 10) / 10,
    taskCompletionRate: Math.round(taskCompletionRate * 10) / 10,
    verificationCompletion: Math.round(verificationCompletion * 10) / 10,
    exceptionRate: Math.round(exceptionRate * 10) / 10,
    totalOvertimeMinutes,
    presentDays,
    expectedWorkingDays,
    totalCheckIns,
    onTimeCheckIns,
    wfhDays: actualWfhDays,
    totalPresentDays: presentDays,
    submittedTimesheets: submittedCount,
    expectedTimesheets: presentDays,
    completedTasks,
    assignedTasks,
    successfulVerifications,
    expectedVerifications,
    totalExceptions,
    totalAttendanceRecords,
  };
}
