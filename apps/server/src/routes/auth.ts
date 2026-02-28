import { Router } from 'express';
import { validatePassword, generateToken } from '../services/auth';
export const authRouter = Router();
authRouter.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (!validatePassword(password)) return res.status(401).json({ error: 'Invalid password' });
  const { token, expiresAt } = generateToken();
  res.json({ token, expiresAt });
});