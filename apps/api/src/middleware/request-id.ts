import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  (req as any).requestId = req.headers['x-request-id'] || randomUUID();
  next();
}
