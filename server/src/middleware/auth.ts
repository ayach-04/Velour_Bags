import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AdminPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function generateToken(payload: AdminPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? '30d' : '8h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Non autorisé' });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}
