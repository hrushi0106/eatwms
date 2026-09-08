import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { getStorageService } from '../../services/storage';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// Get verifications for an attendance record
router.get('/attendance/:attendanceId/verifications', async (req: any, res, next) => {
  try {
    const attendanceId = parseInt(req.params.attendanceId);
    const att = await db('attendance').where('id', attendanceId).first();
    if (!att) throw new NotFoundError('Attendance');

    if (req.user.role === 'EMPLOYEE' && att.user_id !== req.user.id) {
      throw new ForbiddenError();
    }

    const verifications = await db('attendance_verifications')
      .where('attendance_id', attendanceId)
      .select('id', 'attendance_id', 'user_id', 'verification_type', 'verification_method',
              'image_hash', 'captured_at', 'server_timestamp', 'verification_status', 'failure_reason', 'created_at');

    return successResponse(res, verifications, 'Verifications retrieved');
  } catch (err) { next(err); }
});

// Serve selfie image (auth required, RBAC enforced)
router.get('/:id/image', async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const ver = await db('attendance_verifications').where('id', id).first();
    if (!ver) throw new NotFoundError('Verification');

    // RBAC: employee can only see own selfie
    if (req.user.role === 'EMPLOYEE' && ver.user_id !== req.user.id) {
      throw new ForbiddenError();
    }

    if (!ver.image_path) {
      return res.status(404).json({ success: false, message: 'Image not available (may have been purged per retention policy)' });
    }

    const storage = getStorageService();
    const absPath = storage.getAbsolutePath(ver.image_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'Image file not found' });
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp',
    };
    const mime = mimeMap[ext] || 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) { next(err); }
});

export default router;
