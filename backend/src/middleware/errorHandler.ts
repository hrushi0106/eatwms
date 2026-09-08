import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError && err.isOperational) {
    logger.warn({
      err: { message: err.message, statusCode: err.statusCode, errorCode: err.errorCode },
      req: { method: req.method, url: req.url },
    }, 'Operational error');

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errorCode && { errorCode: err.errorCode }),
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    const message = err.message.includes('File too large')
      ? `File size exceeds maximum allowed size`
      : err.message;
    res.status(400).json({
      success: false,
      message,
      errorCode: 'FILE_UPLOAD_ERROR',
    });
    return;
  }

  // JWT errors handled upstream in authenticate middleware

  // Unexpected errors
  const errMsg = (err as Error).message || String(err);
  const errStack = (err as Error).stack || '';
  console.error('UNHANDLED ERROR:', errMsg, errStack);
  logger.error({ errMsg, req: { method: req.method, url: req.url } }, 'Unexpected error');

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again.',
    errorCode: 'INTERNAL_SERVER_ERROR',
  });
}
