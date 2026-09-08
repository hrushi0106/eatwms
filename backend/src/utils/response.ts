import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errorCode?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Patch BigInt serialization globally — must be done once at startup
// This is the only safe way to handle pg BigInt columns in JSON responses
if (!(BigInt.prototype as any).toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function () { return this.toString(); },
    writable: true,
    configurable: true,
  });
}

// Replacer used as safety net for BigInt and other non-serializable values
function safeReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function safeSerialize(obj: unknown): string {
  try {
    return JSON.stringify(obj, safeReplacer);
  } catch (e1) {
    console.error('STRINGIFY FAILED (pass1):', (e1 as Error).message);
    // Walk the object and convert problem values
    try {
      return JSON.stringify(obj, (_key, val) => {
        if (typeof val === 'bigint') return val.toString();
        if (val instanceof Buffer) return '[Buffer]';
        return val;
      });
    } catch (e2) {
      console.error('STRINGIFY FAILED (pass2):', (e2 as Error).message);
      return JSON.stringify({ error: 'Serialization failed' });
    }
  }
}

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  try {
    const serialized = safeSerialize(body);
    res.status(statusCode).set('Content-Type', 'application/json').end(serialized);
  } catch (err) {
    console.error('SERIALIZE ERROR (final):', (err as Error).message);
    if (!res.headersSent) {
      res.status(statusCode).set('Content-Type', 'application/json')
        .end(JSON.stringify({ success: true, message }));
    }
  }
  return res;
}

export function createdResponse<T>(res: Response, data: T, message = 'Created successfully'): Response {
  return successResponse(res, data, message, 201);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errorCode?: string
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode && { errorCode }),
  });
}

export function paginationMeta(page: number, limit: number, total: number | bigint): PaginationMeta {
  const t = typeof total === 'bigint' ? Number(total) : Number(total);
  return {
    page: Number(page),
    limit: Number(limit),
    total: t,
    totalPages: t > 0 ? Math.ceil(t / Number(limit)) : 0,
  };
}
