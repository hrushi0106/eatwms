import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as userService from './user.service';
import { successResponse, createdResponse, paginationMeta } from '../../utils/response';
import { ForbiddenError } from '../../utils/errors';
import { getPaginationParams } from '../../utils/pagination';

export async function listUsersHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req);
    const { users, total } = await userService.listUsers(
      { ...req.query as Record<string, string>, page, limit },
      req.user!.role,
      req.user!.department_id
    );
    return successResponse(res, users, 'Users retrieved', 200, paginationMeta(page, limit, total));
  } catch (err) { next(err); }
}

export async function getUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id']);
    if (req.user!.role === 'EMPLOYEE' && req.user!.id !== id) {
      throw new ForbiddenError();
    }
    const user = await userService.getUserById(id);
    return successResponse(res, user, 'User retrieved');
  } catch (err) { next(err); }
}

export async function createUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body, req, req.user!.id);
    return createdResponse(res, user, 'User created successfully');
  } catch (err) { next(err); }
}

export async function updateUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id']);
    const user = await userService.updateUser(id, req.body, req, req.user!.id);
    return successResponse(res, user, 'User updated successfully');
  } catch (err) { next(err); }
}

export async function deactivateUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id']);
    await userService.deactivateUser(id, req, req.user!.id);
    return successResponse(res, null, 'User deactivated successfully');
  } catch (err) { next(err); }
}

export async function getMyProfileHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.id);
    return successResponse(res, user, 'Profile retrieved');
  } catch (err) { next(err); }
}

export async function updateMyProfileHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Employees can only update limited fields
    const { first_name, last_name, phone } = req.body;
    const user = await userService.updateUser(req.user!.id, { first_name, last_name, phone }, req, req.user!.id);
    return successResponse(res, user, 'Profile updated');
  } catch (err) { next(err); }
}
