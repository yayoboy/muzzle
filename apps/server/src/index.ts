import 'dotenv/config';
import * as http from 'http';
import * as net from 'net';
import { createApp } from './app';
import { log } from './logger';
import { SessionManager } from './services/sessions';

const required = ['JWT_SECRET', 'MUZZLE_PASSWORD'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Error: ${key} environment variable is required`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
const server = http.createServer(createApp());

// WebSocket proxy: /ws/:sessionId?token=TOKEN → 127.0.0.1:ttydPort
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url!, `http://localhost`);
  const match = url.pathname.match(/^\/ws\/([^/]+)$/);
  if (!match) {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const sessionId = match[1];
  const token = url.searchParams.get('token') ?? '';

  let ttydPort: number;
  try {
    ttydPort = SessionManager.getTtydPort(sessionId, token);
  } catch (err) {
    console.error(`[ws] 401 session=${sessionId} reason=${(err as Error).message}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  console.log(`[ws] proxying session=${sessionId} → ttyd:${ttydPort}`);

  const target = net.createConnection({ host: '127.0.0.1', port: ttydPort }, () => {
    // Forward the WebSocket upgrade request to ttyd
    let upgradeReq = `GET /ws HTTP/1.1\r\n`;
    upgradeReq += `Host: 127.0.0.1:${ttydPort}\r\n`;
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === 'host') continue;
      const v = Array.isArray(value) ? value.join(', ') : value;
      upgradeReq += `${key}: ${v}\r\n`;
    }
    upgradeReq += '\r\n';
    target.write(upgradeReq);
    if (head.length > 0) target.write(head);
    socket.pipe(target);
    target.pipe(socket);
  });

  target.on('error', (err) => {
    console.error(`[ws] 502 ttyd:${ttydPort} error: ${err.message}`);
    if (!socket.destroyed) {
      socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  });
  socket.on('error', () => target.destroy());
});

server.listen(PORT, () => log.startup(PORT, process.cwd()));
