import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { commandsRouter } from './routes/commands';
import { errorHandler } from './middleware/error';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

export function createApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/commands', commandsRouter);
  
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);
  
  return app;
}
