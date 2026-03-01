'use strict';
const http = require('http');
const net = require('net');
const next = require('next');

const EXPRESS_PORT = parseInt(process.env.API_PORT || '3001', 10);
const WEB_PORT = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));

  // Proxy WebSocket upgrades (/ws/:sessionId?token=...) to Express
  server.on('upgrade', (req, socket, head) => {
    if (!req.url || !req.url.startsWith('/ws/')) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const target = net.createConnection({ host: '127.0.0.1', port: EXPRESS_PORT }, () => {
      let upgradeReq = `GET ${req.url} HTTP/1.1\r\n`;
      upgradeReq += `Host: 127.0.0.1:${EXPRESS_PORT}\r\n`;
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

    target.on('error', () => { if (!socket.destroyed) socket.destroy(); });
    socket.on('error', () => { if (!target.destroyed) target.destroy(); });
    target.on('close', () => { if (!socket.destroyed) socket.destroy(); });
    socket.on('close', () => { if (!target.destroyed) target.destroy(); });
  });

  server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${WEB_PORT}`);
  });
});
