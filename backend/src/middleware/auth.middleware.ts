import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { verifyToken } from '../utils/jwt.util';

export interface AuthRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(new AppError('No token provided', 401));
    return;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    next(new AppError('Invalid token format', 401));
    return;
  }

  const decoded = verifyToken(parts[1]);
  if (!decoded) {
    next(new AppError('Invalid or expired token', 401));
    return;
  }

  req.userId = decoded.userId;
  next();
}
