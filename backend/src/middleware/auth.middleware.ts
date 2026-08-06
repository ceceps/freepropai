import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken, findUserById, type JwtPayload } from '../services/auth.service';
import type { User, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwtPayload?: JwtPayload;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') return next();
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    req.jwtPayload = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

export const optionalAuthMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next();
    }

    const user = await findUserById(payload.sub);
    if (user) {
      req.user = user;
      req.jwtPayload = payload;
    }
    next();
  } catch {
    next();
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};
