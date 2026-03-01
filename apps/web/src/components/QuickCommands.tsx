'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CLIProfile } from '@muzzle/shared';

interface Props {
  sessionId: string;
  onOpenSlashCommands: () => void;
}

const CONTROL_KEYS = [
  { label: '^C', cmd: '\x03' },
  { label: '^D', cmd: '\x04' },
  { label: 'clr', cmd: 'clear\r' },
  { label: 'tab', cmd: '\t' },
];

export function QuickCommands({ sessionId, onOpenSlashCommands }: Props) {
  const { data: profiles = [] } = useQuery<CLIProfile[]>({
    queryKey: ['commands'],
    queryFn: () => api.getCommands(),
  });

  const sendCommand = async (cmd: string) => {
    try { await api.sendCommand(sessionId, cmd); }
    catch { /* silently ignore */ }
  };

  // Show commands from all profiles, up to 8 total
  const profileCmds = profiles.flatMap(p =>
    p.commands.slice(0, 3).map(c => ({ label: `/${c}`, cmd: c, profile: p.name }))
  ).slice(0, 8);

  return (
    <div className="bg-muzzle-surface border-t border-muzzle-border px-2 py-1 flex items-center gap-1 overflow-x-auto scrollbar-hide min-h-[36px]">
      {/* Control keys */}
      {CONTROL_KEYS.map(k => (
        <button
          key={k.label}
          onClick={() => sendCommand(k.cmd)}
          className="px-2 py-0.5 rounded text-[11px] text-muzzle-muted2 bg-muzzle-bg border border-muzzle-border hover:border-muzzle-accent hover:text-muzzle-accent transition-colors flex-shrink-0"
        >
          {k.label}
        </button>
      ))}

      {/* Separator */}
      <div className="w-px h-4 bg-muzzle-border2 mx-1 flex-shrink-0" />

      {/* Profile commands */}
      {profileCmds.map((c, i) => (
        <button
          key={i}
          onClick={() => sendCommand(c.cmd)}
          title={`[${c.profile}] ${c.cmd}`}
          className="px-2 py-0.5 rounded text-[11px] text-muzzle-muted2 bg-muzzle-bg border border-muzzle-border hover:border-muzzle-accent hover:text-muzzle-accent transition-colors flex-shrink-0"
        >
          {c.label}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Slash commands trigger */}
      <button
        onClick={onOpenSlashCommands}
        className="px-3 py-0.5 rounded text-[11px] text-muzzle-accent border border-muzzle-accent hover:bg-muzzle-accent hover:text-muzzle-bg transition-colors flex-shrink-0 font-bold"
      >
        [/]
      </button>
    </div>
  );
}
