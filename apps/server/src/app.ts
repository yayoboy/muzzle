const express = require('express');
const cors = require('cors');
const { authRouter } = require('./routes/auth');

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  return app;
}