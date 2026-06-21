import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;
  logger.error({ err, status }, 'Request error');

  res.status(status).json({
    error: err.message ?? 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { details: err.details }),
  });
}
