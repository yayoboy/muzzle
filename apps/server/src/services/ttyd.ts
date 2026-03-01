import { spawn, ChildProcess } from 'child_process';

export function startTtyd(sessionName: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const ttyd = spawn('ttyd', ['--port', port.toString(), '--writable', 'tmux', 'attach', '-t', sessionName]);

    ttyd.on('error', reject);

    // Give ttyd a moment to bind the port or fail
    setTimeout(() => {
      resolve(ttyd);
    }, 200);
  });
}