import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import StatusCode from 'http-status-codes';
import { sendError } from '../utils/response.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'contributor' | 'maintainer';
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Missing or invalid authorization header', undefined, StatusCode.UNAUTHORIZED);
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      id: number;
      name: string;
      email: string;
      role: 'contributor' | 'maintainer';
    };

    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', undefined, StatusCode.UNAUTHORIZED);
  }
};

export const isMaintainer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'maintainer') {
    sendError(res, 'Forbidden: Only maintainers can perform this action', undefined, StatusCode.FORBIDDEN);
    return;
  }
  next();
};
