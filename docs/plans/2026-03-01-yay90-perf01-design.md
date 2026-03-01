# YAY-90 PERF-01 xterm.js Buffer — Design

## Problem

`Terminal.tsx` creates `new XTerm({})` without setting `scrollback`. xterm.js defaults to 1000 lines, which is too low for long-running sessions.

## Change

Add `scrollback: 50000` to the `XTerm` constructor options in `apps/web/src/components/Terminal.tsx`.

```ts
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
```

xterm.js manages the circular buffer internally — no additional code needed.

## Out of scope

- `requestAnimationFrame` write batching (not needed for current use cases)
- Any other xterm.js option changes

## Files modified

| File | Change |
|---|---|
| `apps/web/src/components/Terminal.tsx` | Add `scrollback: 50000` to XTerm constructor |
