import db from '../../config/database';
import { format } from 'date-fns';
import { ConflictError, NotFoundError, AppError } from '../../utils/errors';
import { sha256Hash, generateUUID, validateFileSignature } from '../../utils/crypto';
import { getStorageService } from '../../services/storage';
import { createAuditLog } from '../../services/audit.service';
import { checkLateCheckIn, checkEarlyCheckOut } from '../../services/exception.service';
import { getSettingInt } from '../../services/settings.service';
import fs from 'fs';
import { Request } from 'express';

export async function checkIn(
  userId: number,
  workModeId: number,
  file: Express.Multer.File,
  req: Request
) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const serverTime = new Date();

  // Check no active session
  const existing = await db('attendance')
    .where({ user_id: userId, attendance_date: today })
    .first();

  if (existing) {
    // Clean up uploaded file
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new ConflictError(
      'Employee is already checked in for today',
      'ATTENDANCE_ALREADY_ACTIVE'
    );
  }

  // Validate work mode
  const workMode = await db('work_modes').where({ id: workModeId, status: 'ACTIVE' }).first();
  if (!workMode) throw new AppError('Invalid work mode', 400, 'INVALID_WORK_MODE');

  // Validate file signature
  const buffer = fs.readFileSync(file.path);
  if (!validateFileSignature(buffer, file.mimetype)) {
    fs.unlinkSync(file.path);
    throw new AppError('Invalid image file', 400, 'INVALID_FILE');
  }

  const imageHash = sha256Hash(buffer);
  const storage = getStorageService();
  const storageResult = await storage.upload(file.path, file.filename);
  const sessionId = generateUUID();

  // Transaction: create attendance + verification + audit
  const result = await db.transaction(async (trx) => {
    const [attendanceId] = await trx('attendance').insert({
      user_id: userId,
      attendance_date: today,
      work_mode_id: workModeId,
      check_in_time: serverTime,
      status: 'CHECKED_IN',
      check_in_ip: req.ip,
      check_in_user_agent: req.headers['user-agent'] || null,
      session_id: sessionId,
      created_at: serverTime,
      updated_at: serverTime,
    }).returning('id');

    const attId = typeof attendanceId === 'object' ? (attendanceId as { id: number }).id : attendanceId;

    await trx('attendance_verifications').insert({
      attendance_id: attId,
      user_id: userId,
      verification_type: 'CHECK_IN',
      verification_method: 'SELFIE',
      image_path: storageResult.path,
      image_hash: imageHash,
      captured_at: serverTime,
      server_timestamp: serverTime,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
      verification_status: 'VERIFIED',
      created_at: serverTime,
      updated_at: serverTime,
    });

    await trx('audit_logs').insert({
      user_id: userId,
      action: 'CHECK_IN',
      entity_type: 'attendance',
      entity_id: attId,
      new_value: JSON.stringify({ date: today, work_mode: workMode.code, time: serverTime }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
      created_at: serverTime,
    });

    return attId;
  });

  // Async exception check (don't block response)
  checkLateCheckIn(userId, result, serverTime, today).catch(() => {});

  return getAttendanceById(result);
}

export async function checkOut(
  userId: number,
  file: Express.Multer.File,
  req: Request
) {
  const serverTime = new Date();
  const today = format(serverTime, 'yyyy-MM-dd');

  const attendance = await db('attendance')
    .where({ user_id: userId, attendance_date: today, status: 'CHECKED_IN' })
    .first();

  if (!attendance) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new NotFoundError('No active check-in session found');
  }

  // Validate file
  const buffer = fs.readFileSync(file.path);
  if (!validateFileSignature(buffer, file.mimetype)) {
    fs.unlinkSync(file.path);
    throw new AppError('Invalid image file', 400, 'INVALID_FILE');
  }

  const imageHash = sha256Hash(buffer);
  const storage = getStorageService();
  const storageResult = await storage.upload(file.path, file.filename);

  // Calculate durations
  const checkInTime = new Date(attendance.check_in_time);
  const totalWorkMinutes = Math.floor((serverTime.getTime() - checkInTime.getTime()) / 60_000);
  const standardWorkMinutes = (await getSettingInt('standard_work_hours', 8)) * 60;
  const regularWorkMinutes = Math.min(totalWorkMinutes, standardWorkMinutes);
  const overtimeMinutes = Math.max(0, totalWorkMinutes - standardWorkMinutes);

  await db.transaction(async (trx) => {
    await trx('attendance').where('id', attendance.id).update({
      check_out_time: serverTime,
      total_work_minutes: totalWorkMinutes,
      regular_work_minutes: regularWorkMinutes,
      overtime_minutes: overtimeMinutes,
      status: 'CHECKED_OUT',
      check_out_ip: req.ip,
      check_out_user_agent: req.headers['user-agent'] || null,
      updated_at: serverTime,
    });

    await trx('attendance_verifications').insert({
      attendance_id: attendance.id,
      user_id: userId,
      verification_type: 'CHECK_OUT',
      verification_method: 'SELFIE',
      image_path: storageResult.path,
      image_hash: imageHash,
      captured_at: serverTime,
      server_timestamp: serverTime,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
      verification_status: 'VERIFIED',
      created_at: serverTime,
      updated_at: serverTime,
    });

    await trx('audit_logs').insert({
      user_id: userId,
      action: 'CHECK_OUT',
      entity_type: 'attendance',
      entity_id: attendance.id,
      new_value: JSON.stringify({ time: serverTime, total_work_minutes: totalWorkMinutes }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
      created_at: serverTime,
    });
  });

  checkEarlyCheckOut(userId, attendance.id, serverTime, today).catch(() => {});

  return getAttendanceById(attendance.id);
}

export async function getTodayAttendance(userId: number) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const row = await db('attendance')
    .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
    .select('attendance.*', 'work_modes.code as work_mode_code', 'work_modes.name as work_mode_name')
    .where({ 'attendance.user_id': userId, attendance_date: today })
    .first();
  return row || null;
}

export async function getAttendanceById(id: number) {
  return db('attendance')
    .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
    .select('attendance.*', 'work_modes.code as work_mode_code', 'work_modes.name as work_mode_name')
    .where('attendance.id', id)
    .first();
}

export async function getAttendanceHistory(
  userId: number,
  role: string,
  managerUserId: number,
  query: Record<string, string | number>
) {
  const { page = 1, limit = 20, start_date, end_date, work_mode, status } = query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = db('attendance')
    .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
    .join('users', 'attendance.user_id', 'users.id')
    .select(
      'attendance.*',
      'work_modes.code as work_mode_code', 'work_modes.name as work_mode_name',
      db.raw("COALESCE(users.first_name || ' ' || users.last_name, '') as employee_name"),
      'users.employee_code'
    );

  if (role === 'EMPLOYEE') {
    q = q.where('attendance.user_id', userId);
  } else if (role === 'TEAM_LEAD') {
    const teamIds = await db('users').where('team_lead_id', userId).pluck('id');
    teamIds.push(userId);
    q = q.whereIn('attendance.user_id', teamIds);
  } else if (role === 'MANAGER') {
    const teamIds = await db('users').where('manager_id', userId).pluck('id');
    teamIds.push(userId);
    q = q.whereIn('attendance.user_id', teamIds);
  }
  // ADMIN sees all

  if (start_date) q = q.where('attendance_date', '>=', start_date);
  if (end_date) q = q.where('attendance_date', '<=', end_date);
  if (work_mode) q = q.where('work_modes.code', work_mode);
  if (status) q = q.where('attendance.status', status);

  // Count on base attendance table — avoid GROUP BY requirement from multi-select clone
  let countQ = db('attendance').join('work_modes', 'attendance.work_mode_id', 'work_modes.id');
  if (role === 'EMPLOYEE') countQ = countQ.where('attendance.user_id', userId);
  else if (role === 'TEAM_LEAD') {
    const ids2 = await db('users').where('team_lead_id', userId).pluck('id');
    ids2.push(userId);
    countQ = countQ.whereIn('attendance.user_id', ids2);
  } else if (role === 'MANAGER') {
    const ids2 = await db('users').where('manager_id', userId).pluck('id');
    ids2.push(userId);
    countQ = countQ.whereIn('attendance.user_id', ids2);
  }
  if (start_date) countQ = countQ.where('attendance_date', '>=', start_date);
  if (end_date) countQ = countQ.where('attendance_date', '<=', end_date);
  if (work_mode) countQ = countQ.where('work_modes.code', work_mode);
  if (status) countQ = countQ.where('attendance.status', status);

  const totalResult = await countQ.count('attendance.id as count').first();
  const total = Number((totalResult as any)?.count || 0);
  const rows = await q.limit(Number(limit)).offset(offset).orderBy('attendance.attendance_date', 'desc');

  return { rows, total };
}

export async function getTeamAttendanceToday(userId: number, role: string) {
  const today = format(new Date(), 'yyyy-MM-dd');

  let memberIds: number[] = [];
  if (role === 'TEAM_LEAD') {
    memberIds = await db('users').where('team_lead_id', userId).pluck('id');
  } else if (role === 'MANAGER') {
    memberIds = await db('users').where('manager_id', userId).pluck('id');
  } else {
    memberIds = await db('users').where('status', 'ACTIVE').pluck('id');
  }

  const activeUsers = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .whereIn('users.id', memberIds)
    .where('users.status', 'ACTIVE')
    .select('users.id', 'users.first_name', 'users.last_name', 'users.employee_code', 'roles.name as role');

  const attendanceMap = new Map(
    (await db('attendance')
      .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
      .where('attendance_date', today)
      .whereIn('attendance.user_id', memberIds)
      .select('attendance.*', 'work_modes.code as work_mode_code')
    ).map((a) => [a.user_id, a])
  );

  const tsMap = new Map(
    (await db('timesheets')
      .where('date', today)
      .whereIn('user_id', memberIds)
      .select('user_id', db.raw('SUM(hours) as total_hours'))
      .groupBy('user_id')
    ).map((t) => [t.user_id, Number(t.total_hours)])
  );

  const excMap = new Map(
    (await db('attendance_exceptions')
      .where('exception_date', today)
      .whereIn('user_id', memberIds)
      .where('status', 'OPEN')
      .select('user_id', db.raw('COUNT(id) as count'))
      .groupBy('user_id')
    ).map((e) => [e.user_id, Number(e.count)])
  );

  return activeUsers.map((u) => {
    const att = attendanceMap.get(u.id);
    return {
      user_id: u.id,
      employee_name: `${u.first_name} ${u.last_name}`,
      employee_code: u.employee_code,
      work_mode: att?.work_mode_code || null,
      check_in_time: att?.check_in_time || null,
      check_out_time: att?.check_out_time || null,
      total_work_minutes: att?.total_work_minutes || 0,
      timesheet_hours: tsMap.get(u.id) || 0,
      status: att?.status || 'ABSENT',
      verification_status: att ? 'VERIFIED' : null,
      idle_status: 'NORMAL',
      open_exceptions: excMap.get(u.id) || 0,
    };
  });
}
