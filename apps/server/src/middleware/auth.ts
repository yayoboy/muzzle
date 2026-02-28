import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = header.slice(7);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Invalid token' });
  next();
}