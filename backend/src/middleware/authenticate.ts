import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, AuthUser } from '../types';
import { UnauthorizedError } from '../utils/errors';
import db from '../config/database';

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Load user from DB to get current role/status
    const user = await db('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select(
        'users.id',
        'users.email',
        'users.employee_code',
        'users.first_name',
        'users.last_name',
        'users.role_id',
        'users.department_id',
        'users.manager_id',
        'users.team_lead_id',
        'users.status',
        'roles.name as role'
      )
      .where('users.id', payload.userId)
      .first();

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    req.user = user as AuthUser;
    next();
  } catch (err) {
    next(err);
  }
}
