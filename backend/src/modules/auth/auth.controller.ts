import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as authService from './auth.service';
import { successResponse, createdResponse } from '../../utils/response';

export async function loginHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req);
    return successResponse(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function logoutHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.id, req);
    return successResponse(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}

export async function meHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    return successResponse(res, { user: req.user }, 'Profile retrieved');
  } catch (err) { next(err); }
}

export async function refreshHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = req.body;
    const result = await authService.refreshToken(refresh_token);
    return successResponse(res, result, 'Token refreshed');
  } catch (err) { next(err); }
}

export async function forgotPasswordHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email);
    return successResponse(res, null, 'If that email is registered, a reset link has been sent');
  } catch (err) { next(err); }
}

export async function resetPasswordHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    return successResponse(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
}
