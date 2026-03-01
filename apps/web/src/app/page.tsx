'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoginForm } from '@/components/LoginForm';
import { SessionManager } from '@/components/SessionManager';
import { QuickCommands } from '@/components/QuickCommands';
import { SlashCommandsPopup } from '@/components/SlashCommandsPopup';
import dynamic from 'next/dynamic';

const Terminal = dynamic(() => import('@/components/Terminal').then(m => m.Terminal), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-[#606060]">Loading Terminal...</div>
});

export default function Home() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ttydUrl, setTtydUrl] = useState<string | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginForm onLogin={login} />
    );
  }

  const handleSelectSession = async (id: string) => {
    setActiveId(id);
    try {
      const { url } = await api.getSessionAttachUrl(id);
      setTtydUrl(url);
    } catch (error) {
      console.error('Failed to attach to session', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <SessionManager onSelect={handleSelectSession} activeId={activeId} />
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {ttydUrl ? (
          <>
            <div className="flex-1">
              <Terminal url={ttydUrl} />
            </div>
            {activeId && (
              <QuickCommands 
                sessionId={activeId} 
                onOpenSlashCommands={() => setShowSlashCommands(true)}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#e0e0e0] space-y-4">
            <div className="text-xl font-bold">No active session</div>
            <p className="text-[#606060]">Create or select a session to get started.</p>
          </div>
        )}
      </div>

      {showSlashCommands && activeId && (
        <SlashCommandsPopup 
          onSelect={(cmd) => api.sendCommand(activeId, cmd)}
          onClose={() => setShowSlashCommands(false)}
        />
      )}
    </div>
  );
}
