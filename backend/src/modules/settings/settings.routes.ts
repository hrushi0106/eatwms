import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { createAuditLog } from '../../services/audit.service';
import { invalidateSettingsCache } from '../../services/settings.service';

const router = Router();
router.use(authenticate);

// Public settings (non-sensitive)
const PUBLIC_KEYS = ['organization_name', 'timezone', 'standard_work_hours', 'standard_start_time', 'standard_end_time'];

router.get('/', async (req: any, res, next) => {
  try {
    const settings = await db('system_settings').select('setting_key', 'setting_value', 'description', 'updated_at');
    if (req.user.role !== 'ADMIN') {
      return successResponse(res, settings.filter((s: any) => PUBLIC_KEYS.includes(s.setting_key)));
    }
    return successResponse(res, settings);
  } catch (err) { next(err); }
});

router.put('/', authorize('ADMIN'), async (req: any, res, next) => {
  try {
    const updates: Record<string, string> = req.body;

    for (const [key, value] of Object.entries(updates)) {
      const old = await db('system_settings').where('setting_key', key).first();
      await db('system_settings').where('setting_key', key).update({
        setting_value: String(value),
        updated_by: req.user.id,
        updated_at: new Date(),
      });
      await createAuditLog({
        userId: req.user.id,
        action: 'SETTINGS_CHANGED',
        entityType: 'system_settings',
        oldValue: { [key]: old?.setting_value },
        newValue: { [key]: value },
        req,
      });
    }

    invalidateSettingsCache();
    return successResponse(res, null, 'Settings updated');
  } catch (err) { next(err); }
});

export default router;
