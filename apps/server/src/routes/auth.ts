import { Router } from 'express';
import { validatePassword, generateToken } from '../services/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/auth';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), (req, res, next) => {
  try {
    const { password } = req.body;
    
    if (!validatePassword(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const { token, expiresAt } = generateToken();
    res.json({ token, expiresAt });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
