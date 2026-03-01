'use client';
import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
  sessionId: string;
  token: string;
}

export function Terminal({ sessionId, token }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState('');

  const sendInput = (text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send('0' + text);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendInput(inputValue + '\r');
    setInputValue('');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const xterm = new XTerm({
      cursorBlink: true,
      scrollback: 50000,
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

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Delay WebSocket creation by one tick so React Strict Mode's synchronous
    // cleanup can cancel this timer before a connection is ever made.
    // Only the second (real) mount actually reaches the connect logic.
    let socket: WebSocket | null = null;
    const connectTimer = setTimeout(() => {
      if (!mounted) return;

      // WebSocket proxy: Express /ws/:sessionId?token=TOKEN → ttyd (127.0.0.1)
      // ttyd subprotocol 'tty': Blob byte 48=output, 49=title, 50=prefs
      const serverPort = process.env.NEXT_PUBLIC_API_PORT || '3001';
      const wsUrl = `ws://${window.location.hostname}:${serverPort}/ws/${sessionId}?token=${encodeURIComponent(token)}`;
      socket = new WebSocket(wsUrl, ['tty']);
      socketRef.current = socket;

      socket.onopen = () => {
        socket!.send(JSON.stringify({ AuthToken: '' }));
        xterm.focus();
      };

      socket.onmessage = async (event: MessageEvent) => {
        if (!mounted) return;
        const data = event.data;
        let typeCode: number;
        let payload: string;
        if (data instanceof Blob) {
          const ab = await data.arrayBuffer();
          if (!mounted) return;
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
        if (socket?.readyState === WebSocket.OPEN) socket.send('0' + data);
      });

      xterm.onResize(({ cols, rows }) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send('1' + JSON.stringify({ columns: cols, rows }));
        }
      });
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(connectTimer);
      socketRef.current = null;
      window.removeEventListener('resize', handleResize);
      socket?.close();
      xterm.dispose();
    };
  }, [sessionId, token]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
      <div ref={containerRef} className="flex-1 min-h-0" style={{ padding: '4px' }} />
      <form
        onSubmit={handleInputSubmit}
        className="flex items-center gap-2 border-t border-muzzle-border bg-muzzle-surface px-3 py-1.5 flex-shrink-0"
      >
        <span className="text-muzzle-accent text-sm select-none">{'>'}</span>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); sendInput('\t'); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); sendInput('\x1b[A'); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); sendInput('\x1b[B'); }
          }}
          placeholder="type here and press Enter..."
          className="flex-1 bg-transparent text-muzzle-text text-sm placeholder-muzzle-muted focus:outline-none caret-muzzle-accent"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!inputValue}
          className="text-muzzle-accent text-xs opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity select-none"
        >
          ⏎
        </button>
      </form>
    </div>
  );
}
