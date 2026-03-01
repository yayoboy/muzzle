'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { CLIProfile } from '@muzzle/shared';

interface Props {
  onSelect: (cmd: string) => void;
  onClose: () => void;
}

export function SlashCommandsPopup({ onSelect, onClose }: Props) {
  const [profiles, setProfiles] = useState<CLIProfile[]>([]);
  const [filter, setFilter] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getCommands().then(setProfiles).catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const allCommands = profiles.flatMap(p =>
    p.commands.map(c => ({ cli: p.name, cmd: c }))
  );
  const filtered = allCommands.filter(c =>
    c.cmd.toLowerCase().includes(filter.toLowerCase()) ||
    c.cli.toLowerCase().includes(filter.toLowerCase())
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlighted]) {
      onSelect(filtered[highlighted].cmd);
      onClose();
    }
  };

  useEffect(() => { setHighlighted(0); }, [filter]);

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-muzzle-surface border border-muzzle-border rounded shadow-2xl flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-muzzle-border">
          <span className="text-muzzle-accent text-sm select-none">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onKeyDown={handleKey}
            placeholder="search commands..."
            className="flex-1 bg-transparent text-muzzle-text text-sm placeholder-muzzle-muted focus:outline-none caret-muzzle-accent"
          />
          <span className="text-muzzle-muted text-xs">esc to close</span>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-muzzle-muted text-xs">no commands found</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={`${item.cli}-${item.cmd}-${i}`}
                onClick={() => { onSelect(item.cmd); onClose(); }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full px-4 py-2.5 text-left flex items-center justify-between text-sm transition-colors ${
                  i === highlighted
                    ? 'bg-muzzle-surface2 text-muzzle-accent'
                    : 'text-muzzle-text hover:bg-muzzle-surface2'
                }`}
              >
                <span className="font-mono">/{item.cmd}</span>
                <span className="text-muzzle-muted text-xs">[{item.cli}]</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-muzzle-border flex items-center gap-3 text-[10px] text-muzzle-muted">
          <span>↑↓ navigate</span>
          <span>⏎ select</span>
          <span>esc close</span>
          <div className="flex-1" />
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}
