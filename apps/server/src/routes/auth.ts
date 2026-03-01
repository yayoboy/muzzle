import { Router } from 'express';
import { validatePassword, generateToken } from '../services/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/auth';
import { log } from '../logger';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), (req, res, next) => {
  try {
    const { password } = req.body;
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    if (!validatePassword(password)) {
      log.login(ip, false);
      return res.status(401).json({ error: 'Invalid password' });
    }

    const { token, expiresAt } = generateToken();
    log.login(ip, true);
    res.json({ token, expiresAt });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
