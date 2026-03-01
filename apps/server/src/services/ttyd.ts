import { spawn, ChildProcess } from 'child_process';

export function startTtyd(sessionName: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const ttyd = spawn('ttyd', [
      '--port', port.toString(),
      '--writable',
      '--interface', '127.0.0.1',
      'tmux', 'attach', '-t', sessionName,
    ]);

    ttyd.on('error', reject);

    setTimeout(() => {
      resolve(ttyd);
    }, 200);
  });
}
