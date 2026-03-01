'use client';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { AttachAddon } from '@xterm/addon-attach';
import '@xterm/xterm/css/xterm.css';

interface Props {
  url: string;
}

export function Terminal({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#e0e0e0',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();

    // Converti http://host:port → ws://host:port/ws
    const wsUrl = url.replace(/^http/, 'ws') + '/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      const attachAddon = new AttachAddon(socket, { bidirectional: true });
      xterm.loadAddon(attachAddon);
      xterm.focus();
    };

    socket.onclose = () => {
      xterm.writeln('\r\n\x1B[31mConnessione chiusa\x1B[0m');
    };

    socket.onerror = () => {
      xterm.writeln('\r\n\x1B[31mErrore di connessione\x1B[0m');
    };

    xterm.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.close();
      xterm.dispose();
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0a0a0a]"
      style={{ padding: '4px' }}
    />
  );
}
