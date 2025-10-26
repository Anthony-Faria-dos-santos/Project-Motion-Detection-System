import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getPermissionsForRole } from '../lib/permissions';


export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.motionops_access || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'No token provided', retryable: false } });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'User not found', retryable: false } });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
    };
    next();
  } catch {
    res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid token', retryable: false } });
  }
}

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'Not authenticated', retryable: false } });
      return;
    }

    const hasAll = requiredPermissions.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) {
      res.status(403).json({ error: { code: 'AUTH_INSUFFICIENT_ROLE', message: 'Insufficient permissions', retryable: false } });
      return;
    }
    next();
  };
}
