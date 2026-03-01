import { Router } from 'express';
import os from 'os';
import { authMiddleware } from '../middleware/auth';
import type { DiagnosticsResponse } from '@muzzle/shared';

export const diagnosticsRouter = Router();

diagnosticsRouter.use(authMiddleware);

diagnosticsRouter.get('/', (_req, res) => {
  const ifaces = os.networkInterfaces();
  let ip = 'unknown';
  let ipv6Fallback = 'unknown';
  for (const iface of Object.values(ifaces)) {
    for (const addr of iface ?? []) {
      if (!addr.internal) {
        if (addr.family === 'IPv4' && ip === 'unknown') ip = addr.address;
        if (addr.family === 'IPv6' && ipv6Fallback === 'unknown') ipv6Fallback = addr.address;
      }
    }
  }
  if (ip === 'unknown') ip = ipv6Fallback;

  const totalMb = os.totalmem() / 1024 / 1024;
  const freeMb = os.freemem() / 1024 / 1024;
  const cpus = os.cpus();

  const body: DiagnosticsResponse = {
    hostname: os.hostname(),
    ip,
    ram: { used: Math.min(Math.round(totalMb - freeMb), Math.round(totalMb)), total: Math.round(totalMb) },
    uptime: Math.floor(os.uptime()),
    cpus: { count: cpus.length, model: cpus[0]?.model ?? 'unknown' },
  };

  res.json(body);
});
