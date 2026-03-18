import { type NextFunction, type Request, type Response } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/jwt.js';

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[env.COOKIE_NAME];
  const authHeader = req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
}