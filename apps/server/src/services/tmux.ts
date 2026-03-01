import { spawn } from 'child_process';

export function createTmuxSession(sessionName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionName]);
    tmux.on('error', reject);
    tmux.on('close', (code: number) => {
      if (code === 0) resolve(sessionName);
      else reject(new Error('Failed to create tmux session'));
    });
  });
}

export function killTmuxSession(sessionName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmux = spawn('tmux', ['kill-session', '-t', sessionName]);
    tmux.on('error', reject);
    tmux.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error('Failed to kill tmux session'));
    });
  });
}

export function listTmuxSessions(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tmux = spawn('tmux', ['list-sessions', '-F', '#S']);
    let output = '';
    tmux.stdout.on('data', (data: any) => { output += data.toString(); });
    tmux.on('error', reject);
    tmux.on('close', (code: number) => {
      if (code === 0) resolve(output.trim().split('\n').filter(Boolean));
      else reject(new Error('Failed to list tmux sessions'));
    });
  });
}

export function sendTmuxKeys(sessionName: string, keys: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // We append 'C-m' to simulate pressing Enter
    const tmux = spawn('tmux', ['send-keys', '-t', sessionName, keys, 'C-m']);
    tmux.on('error', reject);
    tmux.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error('Failed to send keys to tmux session'));
    });
  });
}