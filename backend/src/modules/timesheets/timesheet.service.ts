import db from '../../config/database';
import { NotFoundError, ForbiddenError, AppError } from '../../utils/errors';
import { createAuditLog } from '../../services/audit.service';
import { createNotification } from '../../services/notification.service';
import { format } from 'date-fns';
import { Request } from 'express';

export async function listTimesheets(userId: number, role: string, query: Record<string, string | number>) {
  const { page = 1, limit = 20, start_date, end_date, status, project_id } = query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = db('timesheets')
    .join('projects', 'timesheets.project_id', 'projects.id')
    .leftJoin('tasks', 'timesheets.task_id', 'tasks.id')
    .join('users', 'timesheets.user_id', 'users.id')
    .select(
      'timesheets.*',
      'projects.name as project_name', 'projects.project_code',
      'tasks.name as task_name',
      db.raw("COALESCE(users.first_name || ' ' || users.last_name, '') as employee_name")
    );

  if (role === 'EMPLOYEE') q = q.where('timesheets.user_id', userId);
  else if (role === 'TEAM_LEAD') {
    const teamIds = await db('users').where('team_lead_id', userId).pluck('id');
    teamIds.push(userId);
    q = q.whereIn('timesheets.user_id', teamIds);
  } else if (role === 'MANAGER') {
    const teamIds = await db('users').where('manager_id', userId).pluck('id');
    teamIds.push(userId);
    q = q.whereIn('timesheets.user_id', teamIds);
  }

  if (start_date) q = q.where('timesheets.date', '>=', start_date);
  if (end_date) q = q.where('timesheets.date', '<=', end_date);
  if (status) q = q.where('timesheets.status', status);
  if (project_id) q = q.where('timesheets.project_id', project_id);

  // Use a simple count-only query to avoid PostgreSQL GROUP BY requirement
  let countQ = db('timesheets');
  if (role === 'EMPLOYEE') countQ = countQ.where('user_id', userId);
  else if (role === 'TEAM_LEAD') {
    const ids2 = await db('users').where('team_lead_id', userId).pluck('id');
    ids2.push(userId);
    countQ = countQ.whereIn('user_id', ids2);
  } else if (role === 'MANAGER') {
    const ids2 = await db('users').where('manager_id', userId).pluck('id');
    ids2.push(userId);
    countQ = countQ.whereIn('user_id', ids2);
  }
  if (start_date) countQ = countQ.where('date', '>=', start_date);
  if (end_date) countQ = countQ.where('date', '<=', end_date);
  if (status) countQ = countQ.where('status', status);
  if (project_id) countQ = countQ.where('project_id', project_id);

  const totalResult = await countQ.count('id as count').first();
  const rows = await q.limit(Number(limit)).offset(offset).orderBy('timesheets.date', 'desc');

  return { rows, total: Number((totalResult as any)?.count || 0) };
}

export async function createTimesheet(userId: number, data: Record<string, unknown>, req: Request) {
  const [id] = await db('timesheets').insert({
    user_id: userId,
    ...data,
    status: 'DRAFT',
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('id');

  const tsId = typeof id === 'object' ? (id as { id: number }).id : id;
  await createAuditLog({ userId, action: 'TIMESHEET_CREATED', entityType: 'timesheet', entityId: tsId, req });

  return getTimesheetById(tsId);
}

export async function getTimesheetById(id: number) {
  return db('timesheets')
    .join('projects', 'timesheets.project_id', 'projects.id')
    .leftJoin('tasks', 'timesheets.task_id', 'tasks.id')
    .join('users', 'timesheets.user_id', 'users.id')
    .select(
      'timesheets.*',
      'projects.name as project_name',
      'tasks.name as task_name',
      db.raw("COALESCE(users.first_name || ' ' || users.last_name, '') as employee_name")
    )
    .where('timesheets.id', id)
    .first();
}

export async function updateTimesheet(id: number, userId: number, role: string, data: Record<string, unknown>, req: Request) {
  const ts = await db('timesheets').where('id', id).first();
  if (!ts) throw new NotFoundError('Timesheet');
  if (ts.user_id !== userId && role === 'EMPLOYEE') throw new ForbiddenError();
  if (!['DRAFT', 'REJECTED'].includes(ts.status)) throw new AppError('Only DRAFT or REJECTED timesheets can be edited', 400, 'INVALID_STATUS');

  await db('timesheets').where('id', id).update({ ...data, updated_at: new Date() });
  await createAuditLog({ userId, action: 'TIMESHEET_UPDATED', entityType: 'timesheet', entityId: id, oldValue: ts, req });
  return getTimesheetById(id);
}

export async function deleteTimesheet(id: number, userId: number, role: string, req: Request) {
  const ts = await db('timesheets').where('id', id).first();
  if (!ts) throw new NotFoundError('Timesheet');
  if (ts.user_id !== userId && role !== 'ADMIN') throw new ForbiddenError();
  if (ts.status !== 'DRAFT') throw new AppError('Only DRAFT timesheets can be deleted', 400);

  await db('timesheets').where('id', id).del();
  await createAuditLog({ userId, action: 'TIMESHEET_DELETED', entityType: 'timesheet', entityId: id, req });
}

export async function submitTimesheet(id: number, userId: number, req: Request) {
  const ts = await db('timesheets').where('id', id).first();
  if (!ts) throw new NotFoundError('Timesheet');
  if (ts.user_id !== userId) throw new ForbiddenError();
  if (!['DRAFT', 'REJECTED'].includes(ts.status)) throw new AppError('Timesheet cannot be submitted in current state', 400);

  await db('timesheets').where('id', id).update({ status: 'SUBMITTED', updated_at: new Date() });

  // Notify manager
  const user = await db('users').where('id', userId).first();
  if (user?.manager_id) {
    await createNotification({
      userId: user.manager_id,
      type: 'TIMESHEET_SUBMITTED',
      title: 'Timesheet Submitted',
      message: `${user.first_name} ${user.last_name} submitted a timesheet for ${ts.date}`,
      entityType: 'timesheet',
      entityId: id,
    });
  }
  return getTimesheetById(id);
}

export async function reviewTimesheet(id: number, reviewerId: number, action: 'approve' | 'reject', comment: string | undefined, req: Request) {
  const ts = await db('timesheets').where('id', id).first();
  if (!ts) throw new NotFoundError('Timesheet');
  if (ts.status !== 'SUBMITTED') throw new AppError('Timesheet is not in SUBMITTED state', 400);

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const auditAction = action === 'approve' ? 'TIMESHEET_APPROVED' : 'TIMESHEET_REJECTED';

  await db('timesheets').where('id', id).update({
    status: newStatus,
    reviewed_by: reviewerId,
    reviewed_at: new Date(),
    comment: comment || null,
    updated_at: new Date(),
  });

  await createAuditLog({ userId: reviewerId, action: auditAction, entityType: 'timesheet', entityId: id, req });

  await createNotification({
    userId: ts.user_id,
    type: 'LEAVE_STATUS', // reusing for timesheet status
    title: `Timesheet ${action === 'approve' ? 'Approved' : 'Rejected'}`,
    message: `Your timesheet for ${ts.date} has been ${newStatus.toLowerCase()}${comment ? `: ${comment}` : ''}`,
    entityType: 'timesheet',
    entityId: id,
  });

  return getTimesheetById(id);
}
