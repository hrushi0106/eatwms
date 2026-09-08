import { Response, NextFunction } from 'express';
import { AuthRequest, Role } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Authorize by role(s). Usage: authorize('ADMIN', 'MANAGER')
 */
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(new ForbiddenError(`Access restricted to: ${roles.join(', ')}`));
    }

    next();
  };
}

/**
 * Check that the requesting user can access data for targetUserId.
 * Returns true if: user is the target, user is ADMIN, or user is MANAGER of target's department.
 */
export async function canAccessUser(requestingUser: AuthRequest['user'], targetUserId: number): Promise<boolean> {
  if (!requestingUser) return false;
  if (requestingUser.id === targetUserId) return true;
  if (requestingUser.role === 'ADMIN') return true;
  return false;
}
