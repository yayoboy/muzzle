'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DiagnosticsResponse } from '@muzzle/shared';

interface Props {
  onClose: () => void;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return '<1m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ');
}

function formatRam(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function DiagnosticsDropdown({ onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<DiagnosticsResponse>({
    queryKey: ['diagnostics'],
    queryFn: () => api.getDiagnostics(),
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-muzzle-surface border border-muzzle-border text-xs text-muzzle-text min-w-[240px]"
    >
      {isLoading ? (
        <div className="px-4 py-3 text-muzzle-muted animate-pulse">loading...</div>
      ) : data ? (
        <table className="w-full">
          <tbody>
            {[
              ['hostname', data.hostname],
              ['ip', data.ip],
              ['ram', `${formatRam(data.ram.used)} / ${formatRam(data.ram.total)}`],
              ['uptime', formatUptime(data.uptime)],
              ['cpu', `${data.cpus.count}× ${data.cpus.model}`],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-muzzle-border last:border-0">
                <td className="px-4 py-1.5 text-muzzle-muted w-20 select-none">{label}</td>
                <td className="px-4 py-1.5 text-muzzle-text font-mono truncate max-w-[160px]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-4 py-3 text-red-400">failed to load</div>
      )}
    </div>
  );
}
