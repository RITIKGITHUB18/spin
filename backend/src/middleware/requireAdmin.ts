import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
  }
  next();
}
