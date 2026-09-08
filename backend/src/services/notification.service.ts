import db from '../config/database';
import { NotificationType } from '../types';

interface NotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

export async function createNotification(params: NotificationParams): Promise<void> {
  await db('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    is_read: false,
    created_at: new Date(),
  });
}

export async function createNotifications(notifications: NotificationParams[]): Promise<void> {
  if (notifications.length === 0) return;
  await db('notifications').insert(
    notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      entity_type: n.entityType || null,
      entity_id: n.entityId || null,
      is_read: false,
      created_at: new Date(),
    }))
  );
}
