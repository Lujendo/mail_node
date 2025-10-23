/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/connection';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, secret) as { userId: number; email: string };

    // Verify user still exists
    const user = await queryOne('SELECT id, email FROM users WHERE id = ?', [decoded.userId]);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function getAuthUser(req: AuthRequest) {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

export function generateToken(userId: number, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    { userId, email },
    secret,
    { expiresIn }
  );
}

export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export function getTokenExpiry(hours: number = 24): number {
  return Math.floor(Date.now() / 1000) + (hours * 3600);
}

