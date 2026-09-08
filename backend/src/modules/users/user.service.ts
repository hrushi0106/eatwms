import bcrypt from 'bcryptjs';
import db from '../../config/database';
import { env } from '../../config/env';
import { NotFoundError, ConflictError, AppError } from '../../utils/errors';
import { createAuditLog } from '../../services/audit.service';
import { Request } from 'express';

function safeUser(u: Record<string, unknown>) {
  const { password_hash, refresh_token_hash, password_reset_token, password_reset_expires, ...safe } = u;
  return safe;
}

export async function listUsers(query: Record<string, string | number>, viewerRole: string, viewerDeptId: number | null) {
  const { page = 1, limit = 20, search, role, department_id, status } = query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('departments', 'users.department_id', 'departments.id')
    .leftJoin('users as managers', 'users.manager_id', 'managers.id')
    .select(
      'users.id', 'users.employee_code', 'users.first_name', 'users.last_name',
      'users.email', 'users.phone', 'users.role_id', 'users.department_id',
      'users.manager_id', 'users.team_lead_id', 'users.joining_date', 'users.status',
      'users.created_at',
      'roles.name as role',
      'departments.name as department_name',
      db.raw("COALESCE(managers.first_name || ' ' || managers.last_name, '') as manager_name")
    );

  if (search) {
    q = q.where((b) => {
      b.whereILike('users.first_name', `%${search}%`)
        .orWhereILike('users.last_name', `%${search}%`)
        .orWhereILike('users.email', `%${search}%`)
        .orWhereILike('users.employee_code', `%${search}%`);
    });
  }
  if (role) q = q.where('roles.name', role);
  if (department_id) q = q.where('users.department_id', department_id);
  if (status) q = q.where('users.status', status);

  // Count using clean query — never clone a multi-select query for count (PostgreSQL GROUP BY requirement)
  let countQ = db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('departments', 'users.department_id', 'departments.id')
    .leftJoin('users as managers', 'users.manager_id', 'managers.id');
  if (search) {
    countQ = countQ.where((b) => {
      b.whereILike('users.first_name', `%${search}%`)
        .orWhereILike('users.last_name', `%${search}%`)
        .orWhereILike('users.email', `%${search}%`)
        .orWhereILike('users.employee_code', `%${search}%`);
    });
  }
  if (role) countQ = countQ.where('roles.name', role);
  if (department_id) countQ = countQ.where('users.department_id', department_id);
  if (status) countQ = countQ.where('users.status', status);
  const totalResult = await countQ.countDistinct('users.id as count').first();
  const total = Number((totalResult as any)?.count || 0);
  const users = await q.limit(Number(limit)).offset(offset).orderBy('users.first_name');

  return {
    users: users.map(safeUser),
    total,
  };
}

export async function getUserById(id: number) {
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('departments', 'users.department_id', 'departments.id')
    .leftJoin('users as managers', 'users.manager_id', 'managers.id')
    .select(
      'users.*', 'roles.name as role', 'departments.name as department_name',
      db.raw("COALESCE(managers.first_name || ' ' || managers.last_name, '') as manager_name")
    )
    .where('users.id', id)
    .first();

  if (!user) throw new NotFoundError('User');
  return safeUser(user);
}

export async function createUser(data: Record<string, unknown>, req: Request, createdBy: number) {
  const existing = await db('users').where('email', (data.email as string).toLowerCase()).first();
  if (existing) throw new ConflictError('Email already registered', 'EMAIL_TAKEN');

  // Generate employee code
  const last = await db('users').max('id as maxId').first();
  const nextId = ((last as { maxId: number })?.maxId || 0) + 1;
  const employee_code = `EMP-${String(nextId).padStart(3, '0')}`;

  const hash = await bcrypt.hash(data.password as string, env.BCRYPT_ROUNDS);

  const [id] = await db('users').insert({
    ...data,
    email: (data.email as string).toLowerCase().trim(),
    employee_code,
    password_hash: hash,
    status: data.status || 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('id');

  const userId = typeof id === 'object' ? (id as { id: number }).id : id;

  await createAuditLog({
    userId: createdBy,
    action: 'USER_CREATED',
    entityType: 'user',
    entityId: userId,
    newValue: { email: data.email, role_id: data.role_id },
    req,
  });

  // Create leave balances for current year
  const year = new Date().getFullYear();
  const leaveTypes = await db('leave_types').where('status', 'ACTIVE');
  await db('leave_balances').insert(
    leaveTypes.map((lt) => ({
      user_id: userId,
      leave_type_id: lt.id,
      year,
      allocated_days: lt.annual_limit,
      used_days: 0,
    }))
  );

  return getUserById(userId);
}

export async function updateUser(id: number, data: Record<string, unknown>, req: Request, updatedBy: number) {
  const user = await db('users').where('id', id).first();
  if (!user) throw new NotFoundError('User');

  const { password, ...updateData } = data;

  if (password) {
    (updateData as Record<string, unknown>).password_hash = await bcrypt.hash(password as string, env.BCRYPT_ROUNDS);
  }

  await db('users').where('id', id).update({ ...updateData, updated_at: new Date() });

  await createAuditLog({
    userId: updatedBy,
    action: 'USER_UPDATED',
    entityType: 'user',
    entityId: id,
    oldValue: safeUser(user) as Record<string, unknown>,
    newValue: updateData as Record<string, unknown>,
    req,
  });

  return getUserById(id);
}

export async function deactivateUser(id: number, req: Request, updatedBy: number) {
  const user = await db('users').where('id', id).first();
  if (!user) throw new NotFoundError('User');

  await db('users').where('id', id).update({ status: 'INACTIVE', updated_at: new Date() });

  await createAuditLog({
    userId: updatedBy,
    action: 'USER_DEACTIVATED',
    entityType: 'user',
    entityId: id,
    req,
  });
}
