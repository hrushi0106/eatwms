import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { selfieUpload } from '../../middleware/upload';
import { uploadRateLimiter as urlr } from '../../middleware/rateLimiter';
import * as controller from './attendance.controller';

const router = Router();
router.use(authenticate);

router.post('/check-in', urlr, selfieUpload.single('selfie'), controller.checkInHandler);
router.post('/check-out', urlr, selfieUpload.single('selfie'), controller.checkOutHandler);
router.get('/today', controller.todayHandler);
router.get('/history', controller.historyHandler);
router.get('/team', authorize('TEAM_LEAD', 'MANAGER', 'ADMIN'), controller.teamHandler);
router.get('/:id', controller.getByIdHandler);

export default router;
