'use client';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
  url: string;
}

export function Terminal({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

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

    // ttyd protocol (subprotocol 'tty'):
    // Server → Blob: byte 48('0')=output, 49('1')=title, 50('2')=prefs
    // Client → string: '0'+input, '1'+resizeJSON; first msg = auth token JSON
    const wsUrl = url.replace(/^http/, 'ws') + '/ws';
    const socket = new WebSocket(wsUrl, ['tty']);

    socket.onopen = () => {
      if (!mounted) { socket.close(); return; }
      socket.send(JSON.stringify({ AuthToken: '' }));
      xterm.focus();
    };

    socket.onmessage = async (event: MessageEvent) => {
      if (!mounted) return;
      const data = event.data;
      let typeCode: number;
      let payload: string;
      if (data instanceof Blob) {
        const ab = await data.arrayBuffer();
        const bytes = new Uint8Array(ab);
        typeCode = bytes[0];
        payload = new TextDecoder().decode(bytes.slice(1));
      } else if (typeof data === 'string') {
        typeCode = data.charCodeAt(0);
        payload = data.slice(1);
      } else return;
      if (typeCode === 48) xterm.write(payload); // '0' = terminal output
      // 49='1' title, 50='2' prefs — ignore
    };

    socket.onclose = () => {
      if (mounted) xterm.writeln('\r\n\x1B[31mConnessione chiusa\x1B[0m');
    };

    socket.onerror = () => {
      if (mounted) xterm.writeln('\r\n\x1B[31mErrore di connessione\x1B[0m');
    };

    xterm.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send('0' + data);
    });

    xterm.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('1' + JSON.stringify({ columns: cols, rows }));
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
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
