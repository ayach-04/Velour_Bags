import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { WorkerPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

declare global {
  namespace Express {
    interface Request {
      worker?: WorkerPayload;
    }
  }
}

export function generateWorkerToken(payload: WorkerPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? '30d' : '8h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function workerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Non autorisé' });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as WorkerPayload;
    req.worker = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}
