import cron from 'node-cron';
import logger from '../../utils/logger';
import { runDailyExceptionCheck } from '../exception.service';
import { format, subDays } from 'date-fns';

export function startScheduledJobs(): void {
  // Daily exception check at 23:30
  cron.schedule('30 23 * * *', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    logger.info({ date: today }, 'Running daily exception check');
    try {
      await runDailyExceptionCheck(today);
      logger.info({ date: today }, 'Daily exception check complete');
    } catch (err) {
      logger.error({ err }, 'Daily exception check failed');
    }
  });

  // Retention cleanup at 02:00 daily
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running retention cleanup');
    try {
      await runRetentionCleanup();
    } catch (err) {
      logger.error({ err }, 'Retention cleanup failed');
    }
  });

  logger.info('Scheduled jobs registered');
}

async function runRetentionCleanup(): Promise<void> {
  const db = (await import('../../config/database')).default;
  const { getSettingInt } = await import('../settings.service');

  const selfieRetentionDays = await getSettingInt('selfie_retention_days', 90);
  const activityRetentionDays = await getSettingInt('activity_retention_days', 180);
  const auditRetentionDays = await getSettingInt('audit_retention_days', 365);

  const selfieThreshold = format(subDays(new Date(), selfieRetentionDays), 'yyyy-MM-dd');
  const activityThreshold = format(subDays(new Date(), activityRetentionDays), 'yyyy-MM-dd');
  const auditThreshold = format(subDays(new Date(), auditRetentionDays), 'yyyy-MM-dd');

  // Null out image paths for expired verifications
  const expiredVerifications = await db('attendance_verifications')
    .whereNotNull('image_path')
    .where('created_at', '<', selfieThreshold)
    .select('id', 'image_path');

  if (expiredVerifications.length > 0) {
    const { getStorageService } = await import('../storage');
    const storage = getStorageService();
    for (const v of expiredVerifications) {
      try {
        await storage.delete(v.image_path);
      } catch { /* file might already be gone */ }
    }
    await db('attendance_verifications')
      .whereIn('id', expiredVerifications.map((v: { id: number }) => v.id))
      .update({ image_path: null, image_hash: null });

    logger.info({ count: expiredVerifications.length }, 'Selfie retention cleanup done');
  }

  // Delete old activity logs
  const actDeleted = await db('activity_logs').where('timestamp', '<', activityThreshold).del();
  if (actDeleted > 0) logger.info({ count: actDeleted }, 'Activity log retention cleanup done');

  // Delete old audit logs (rotate — keep 365 days)
  const auditDeleted = await db('audit_logs').where('created_at', '<', auditThreshold).del();
  if (auditDeleted > 0) logger.info({ count: auditDeleted }, 'Audit log retention cleanup done');
}
