'use client';
import { useState } from 'react';

interface Props { onLogin: (pw: string) => Promise<void>; }

export function LoginForm({ onLogin }: Props) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoad(true);
    try {
      await onLogin(pw);
    } catch {
      setErr('access denied');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="min-h-screen bg-muzzle-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <pre className="text-muzzle-accent text-[8px] leading-tight select-none inline-block text-left">{
`███╗   ███╗██╗   ██╗███████╗███████╗██╗     ███████╗
████╗ ████║██║   ██║╚══███╔╝╚══███╔╝██║     ██╔════╝
██╔████╔██║██║   ██║  ███╔╝   ███╔╝ ██║     █████╗
██║╚██╔╝██║██║   ██║ ███╔╝   ███╔╝  ██║     ██╔══╝
██║ ╚═╝ ██║╚██████╔╝███████╗███████╗███████╗███████╗
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝╚══════╝`
          }</pre>
          <p className="text-muzzle-muted2 text-xs tracking-widest">terminal session manager</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-3 border border-muzzle-border bg-muzzle-surface p-6 rounded">
          <div className="flex items-center gap-2 text-muzzle-muted2 text-xs mb-4">
            <span className="text-muzzle-accent">●</span>
            <span>authenticate to continue</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muzzle-accent text-sm select-none">{'>'}</span>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="password"
              disabled={load}
              autoFocus
              className="flex-1 bg-transparent text-muzzle-text text-sm placeholder-muzzle-muted focus:outline-none caret-muzzle-accent"
            />
            {load && <span className="text-muzzle-accent text-xs animate-pulse">...</span>}
          </div>

          <div className="border-t border-muzzle-border pt-3">
            {err && (
              <p className="text-red-400 text-xs mb-2">
                <span className="text-red-500">✗</span> {err}
              </p>
            )}
            <button
              type="submit"
              disabled={load || !pw}
              className="w-full py-2 bg-muzzle-accent text-muzzle-bg text-sm font-bold rounded hover:bg-muzzle-accent-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {load ? 'connecting...' : '[ CONNECT ]'}
            </button>
          </div>
        </form>

        <p className="text-center text-muzzle-muted text-xs">v0.1.0</p>
      </div>
    </div>
  );
}
