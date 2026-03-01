import { Router } from 'express';
import os from 'os';
import { authMiddleware } from '../middleware/auth';
import type { DiagnosticsResponse } from '@muzzle/shared';

export const diagnosticsRouter = Router();

diagnosticsRouter.use(authMiddleware);

diagnosticsRouter.get('/', (_req, res) => {
  const ifaces = os.networkInterfaces();
  let ip = 'unknown';
  outer: for (const iface of Object.values(ifaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address;
        break outer;
      }
    }
  }

  const totalMb = os.totalmem() / 1024 / 1024;
  const freeMb = os.freemem() / 1024 / 1024;
  const cpus = os.cpus();

  const body: DiagnosticsResponse = {
    hostname: os.hostname(),
    ip,
    ram: { used: Math.round(totalMb - freeMb), total: Math.round(totalMb) },
    uptime: Math.floor(os.uptime()),
    cpus: { count: cpus.length, model: cpus[0]?.model ?? 'unknown' },
  };

  res.json(body);
});
