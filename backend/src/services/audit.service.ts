import db from '../config/database';
import { AuditAction } from '../types';
import { Request } from 'express';

interface AuditParams {
  userId: number | null;
  action: AuditAction;
  entityType?: string;
  entityId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  req?: Request;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await db('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
    new_value: params.newValue ? JSON.stringify(params.newValue) : null,
    ip_address: params.ipAddress || params.req?.ip || null,
    user_agent: params.userAgent || params.req?.headers['user-agent'] || null,
    created_at: new Date(),
  });
}
