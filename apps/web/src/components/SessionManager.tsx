'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SessionResponse } from '@muzzle/shared';

interface Props {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
}

export function SessionManager({ onSelect, onDelete, activeId }: Props) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<SessionResponse[]>({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: (newSess) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onSelect(newSess.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onDelete(id);
    },
  });

  return (
    <div className="w-full bg-muzzle-surface border-b border-muzzle-border flex items-stretch overflow-x-auto scrollbar-hide min-h-[40px]">
      {/* Logo */}
      <div className="px-4 flex items-center border-r border-muzzle-border flex-shrink-0">
        <span className="text-muzzle-accent text-xs font-bold tracking-widest select-none">MUZZLE</span>
      </div>

      {/* Tabs */}
      <div className="flex items-stretch flex-1 overflow-x-auto scrollbar-hide">
        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center px-4 text-muzzle-muted text-xs animate-pulse">loading...</div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeId;
            return (
              <div key={s.id} className="relative flex items-stretch flex-shrink-0 group">
                <button
                  onClick={() => onSelect(s.id)}
                  className={`flex items-center gap-1.5 px-4 text-xs transition-colors ${
                    isActive
                      ? 'text-muzzle-accent border-b-2 border-muzzle-accent'
                      : 'text-muzzle-muted2 hover:text-muzzle-text border-b-2 border-transparent'
                  }`}
                >
                  <span className={`text-[8px] ${isActive ? 'text-muzzle-accent' : 'text-muzzle-muted'}`}>●</span>
                  <span>{s.name}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(s.id);
                  }}
                  className="hidden group-hover:flex items-center pr-2 text-muzzle-muted hover:text-red-400 text-xs transition-colors"
                  title="Close session"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* New session */}
      <div className="flex items-center px-2 border-l border-muzzle-border flex-shrink-0">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-3 py-1 text-muzzle-muted hover:text-muzzle-accent text-xs transition-colors disabled:opacity-30"
          title="New session"
        >
          {createMutation.isPending ? '...' : '[+]'}
        </button>
      </div>
    </div>
  );
}
