import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import db from '../../config/database';
import { successResponse, createdResponse } from '../../utils/response';
import { getSettingInt } from '../../services/settings.service';
import { format, subMinutes } from 'date-fns';

const router = Router();
router.use(authenticate);

router.get('/current', async (req: any, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendance = await db('attendance')
      .where({ user_id: req.user.id, attendance_date: today, status: 'CHECKED_IN' })
      .first();

    if (!attendance) return successResponse(res, { prompt: null });

    const interval = await getSettingInt('engagement_interval_minutes', 24);
    const now = new Date();

    // Find pending prompt
    const pending = await db('engagement_prompts')
      .where({ attendance_id: attendance.id, status: 'PENDING' })
      .orderBy('prompt_time', 'desc')
      .first();

    if (pending) return successResponse(res, { prompt: pending });

    // Check if it's time for a new prompt
    const lastPrompt = await db('engagement_prompts')
      .where('attendance_id', attendance.id)
      .orderBy('prompt_time', 'desc')
      .first();

    const shouldCreate = !lastPrompt ||
      (now.getTime() - new Date(lastPrompt.prompt_time).getTime()) >= interval * 60_000;

    if (shouldCreate) {
      const [id] = await db('engagement_prompts').insert({
        user_id: req.user.id,
        attendance_id: attendance.id,
        prompt_time: now,
        status: 'PENDING',
        created_at: now,
      }).returning('id');
      const prompt = await db('engagement_prompts').where('id', typeof id === 'object' ? (id as any).id : id).first();
      return successResponse(res, { prompt });
    }

    return successResponse(res, { prompt: null });
  } catch (err) { next(err); }
});

router.post('/:id/respond', async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const prompt = await db('engagement_prompts').where({ id, user_id: req.user.id }).first();
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - new Date(prompt.prompt_time).getTime()) / 1000);

    await db('engagement_prompts').where('id', id).update({
      response: req.body.response,
      response_time: now,
      response_duration_seconds: durationSeconds,
      status: 'RESPONDED',
    });

    return successResponse(res, null, 'Response recorded');
  } catch (err) { next(err); }
});

export default router;
