import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
}
