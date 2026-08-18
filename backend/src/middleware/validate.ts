import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { AppError } from '../utils/AppError';

export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return next(new AppError(400, 'VALIDATION_ERROR', message));
    }
    req.body = result.data;
    next();
  };
}
