import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  userId?: number;
}

export function authenticate(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
): void {
  try {
    const authHeader = request.headers.authorization;
    const [scheme, token] = authHeader?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(
        401,
        'Authentication required.'
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is missing.');
    }

    const decoded = jwt.verify(token, secret) as {
      userId?: unknown;
    };

    const userId = Number(decoded.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new AppError(
        401,
        'Invalid or expired token.'
      );
    }

    request.userId = userId;

    next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(
        401,
        'Invalid or expired token.'
      )
    );
  }
}