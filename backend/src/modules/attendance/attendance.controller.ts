import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as svc from './attendance.service';
import { successResponse, createdResponse, paginationMeta } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { getPaginationParams } from '../../utils/pagination';

export async function checkInHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('Selfie image is required', 400, 'FILE_REQUIRED');
    const workModeId = parseInt(req.body.work_mode_id);
    if (!workModeId) throw new AppError('Work mode is required', 400, 'WORK_MODE_REQUIRED');
    const attendance = await svc.checkIn(req.user!.id, workModeId, req.file, req);
    return createdResponse(res, { attendance }, 'Check-in successful');
  } catch (err) { next(err); }
}

export async function checkOutHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('Selfie image is required', 400, 'FILE_REQUIRED');
    const attendance = await svc.checkOut(req.user!.id, req.file, req);
    return successResponse(res, { attendance }, 'Check-out successful');
  } catch (err) { next(err); }
}

export async function todayHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const attendance = await svc.getTodayAttendance(req.user!.id);
    return successResponse(res, { attendance }, 'Today attendance retrieved');
  } catch (err) { next(err); }
}

export async function historyHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req);
    const { rows, total } = await svc.getAttendanceHistory(
      req.user!.id, req.user!.role, req.user!.id,
      { ...req.query as Record<string, string>, page, limit }
    );
    return successResponse(res, rows, 'Attendance history retrieved', 200, paginationMeta(page, limit, total));
  } catch (err) { next(err); }
}

export async function getByIdHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id']);
    const att = await svc.getAttendanceById(id);
    if (!att) throw new AppError('Attendance not found', 404, 'NOT_FOUND');
    if (req.user!.role === 'EMPLOYEE' && att.user_id !== req.user!.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return successResponse(res, { attendance: att }, 'Attendance retrieved');
  } catch (err) { next(err); }
}

export async function teamHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await svc.getTeamAttendanceToday(req.user!.id, req.user!.role);
    return successResponse(res, rows, 'Team attendance retrieved');
  } catch (err) { next(err); }
}
