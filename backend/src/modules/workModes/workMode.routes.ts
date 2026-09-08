import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const modes = await db('work_modes').where('status', 'ACTIVE').orderBy('name');
    return successResponse(res, modes);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await db('work_modes').where('id', req.params['id']).update({ ...req.body, updated_at: new Date() });
    return successResponse(res, null, 'Work mode updated');
  } catch (err) { next(err); }
});

export default router;
