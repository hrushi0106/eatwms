import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import { env } from '../../config/env';
import { UnauthorizedError, NotFoundError, AppError } from '../../utils/errors';
import { generateSecureToken, hashToken } from '../../utils/crypto';
import { createAuditLog } from '../../services/audit.service';
import { Request } from 'express';

export interface LoginResult {
  user: Record<string, unknown>;
  access_token: string;
  refresh_token: string;
}

export async function login(email: string, password: string, req: Request): Promise<LoginResult> {
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('departments', 'users.department_id', 'departments.id')
    .select(
      'users.id', 'users.employee_code', 'users.first_name', 'users.last_name',
      'users.email', 'users.password_hash', 'users.role_id', 'users.department_id',
      'users.manager_id', 'users.team_lead_id', 'users.status',
      'roles.name as role', 'departments.name as department_name'
    )
    .where('users.email', email.toLowerCase().trim())
    .first();

  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status !== 'ACTIVE') throw new UnauthorizedError('Account is inactive or suspended');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  // Generate tokens
  const access_token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  const refresh_token = generateSecureToken(40);
  const refresh_token_hash = await bcrypt.hash(refresh_token, 8);

  await db('users').where('id', user.id).update({ refresh_token_hash });

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    req,
  });

  const { password_hash, refresh_token_hash: _, ...safeUser } = user;
  return { user: safeUser, access_token, refresh_token };
}

export async function logout(userId: number, req: Request): Promise<void> {
  await db('users').where('id', userId).update({ refresh_token_hash: null });
  await createAuditLog({ userId, action: 'LOGOUT', entityType: 'user', entityId: userId, req });
}

export async function refreshToken(token: string): Promise<{ access_token: string }> {
  // We hash-compare rather than storing plain refresh token
  // For simplicity we find user by checking all — in production use a token index
  // Better approach: store token prefix for lookup
  const tokenHash = await bcrypt.hash(token, 8); // Re-hash won't match — use direct compare

  // Find user with a refresh_token_hash that matches
  const users = await db('users').whereNotNull('refresh_token_hash').select('id', 'email', 'role_id', 'refresh_token_hash', 'status');
  let matched: typeof users[0] | null = null;

  for (const u of users) {
    try {
      const match = await bcrypt.compare(token, u.refresh_token_hash);
      if (match) { matched = u; break; }
    } catch { continue; }
  }

  if (!matched) throw new UnauthorizedError('Invalid refresh token');
  if (matched.status !== 'ACTIVE') throw new UnauthorizedError('Account is inactive');

  const role = await db('roles').where('id', matched.role_id).first();
  const access_token = jwt.sign(
    { userId: matched.id, email: matched.email, role: role?.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  return { access_token };
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await db('users').where('email', email.toLowerCase()).first();
  if (!user) return; // Silent — don't reveal if email exists

  const token = generateSecureToken(32);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db('users').where('id', user.id).update({
    password_reset_token: token,
    password_reset_expires: expires,
  });

  // In production: send email with reset link
  // For dev: token is stored in DB, log it
  console.info(`[DEV] Password reset token for ${email}: ${token}`);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await db('users')
    .where('password_reset_token', token)
    .where('password_reset_expires', '>', new Date())
    .first();

  if (!user) throw new AppError('Reset token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');

  const hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await db('users').where('id', user.id).update({
    password_hash: hash,
    password_reset_token: null,
    password_reset_expires: null,
    refresh_token_hash: null,
  });
}
