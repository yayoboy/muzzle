# YAY-83 Deploy & Installation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aggiungere un CLI `muzzle` installabile globalmente con script one-liner, con comandi `start/stop/status/logs` e gestione servizio autostart su macOS (launchd) e Linux (systemd).

**Architecture:** Due file sh POSIX: `bin/muzzle` (CLI) e `scripts/install.sh` (one-liner). Il CLI gestisce PID files in `~/.local/share/muzzle/run/` e log in `~/.local/share/muzzle/logs/`. Nessuna nuova dipendenza npm.

**Tech Stack:** sh POSIX, launchd (macOS), systemd user units (Linux), Next.js `next start`, Node.js `node dist/index.js`.

---

## Task 1: Creare `bin/muzzle` — comandi base (start/stop/status/logs)

**Files:**
- Create: `bin/muzzle`

**Contesto:**
- Server avviato con `node dist/index.js` dalla dir `apps/server/` (dotenv trova `.env` dal CWD)
- Web avviato con `node_modules/.bin/next start` dalla dir `apps/web/`
- PID files in `~/.local/share/muzzle/run/`
- Log files in `~/.local/share/muzzle/logs/`
- `MUZZLE_HOME` override-abile via env, default `~/.local/share/muzzle`

**Step 1: Creare `bin/muzzle` con il seguente contenuto**

```sh
#!/bin/sh
set -e

MUZZLE_HOME="${MUZZLE_HOME:-$HOME/.local/share/muzzle}"
RUN_DIR="$MUZZLE_HOME/run"
LOG_DIR="$MUZZLE_HOME/logs"
SERVER_PID="$RUN_DIR/server.pid"
WEB_PID="$RUN_DIR/web.pid"
SERVER_LOG="$LOG_DIR/server.log"
WEB_LOG="$LOG_DIR/web.log"

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

is_running() {
  [ -f "$1" ] || return 1
  kill -0 "$(cat "$1")" 2>/dev/null
}

cmd_start() {
  mkdir -p "$RUN_DIR" "$LOG_DIR"

  if is_running "$SERVER_PID" && is_running "$WEB_PID"; then
    echo "Muzzle is already running."
    return 0
  fi

  if ! is_running "$SERVER_PID"; then
    cd "$MUZZLE_HOME/apps/server"
    nohup node dist/index.js >> "$SERVER_LOG" 2>&1 &
    echo $! > "$SERVER_PID"
    cd "$MUZZLE_HOME"
    echo "Server started (PID $(cat "$SERVER_PID"), port 3001)"
  fi

  if ! is_running "$WEB_PID"; then
    cd "$MUZZLE_HOME/apps/web"
    nohup node_modules/.bin/next start >> "$WEB_LOG" 2>&1 &
    echo $! > "$WEB_PID"
    cd "$MUZZLE_HOME"
    echo "Web started (PID $(cat "$WEB_PID"), port 3000)"
  fi

  echo "Muzzle running → http://localhost:3000"
}

cmd_stop() {
  stopped=0

  if is_running "$SERVER_PID"; then
    kill "$(cat "$SERVER_PID")" && rm -f "$SERVER_PID"
    echo "Server stopped."
    stopped=1
  fi

  if is_running "$WEB_PID"; then
    kill "$(cat "$WEB_PID")" && rm -f "$WEB_PID"
    echo "Web stopped."
    stopped=1
  fi

  [ "$stopped" -eq 0 ] && echo "Muzzle is not running."
}

cmd_status() {
  if is_running "$SERVER_PID"; then
    printf 'Server: running (PID %s, port 3001)\n' "$(cat "$SERVER_PID")"
  else
    echo "Server: stopped"
  fi

  if is_running "$WEB_PID"; then
    printf 'Web:    running (PID %s, port 3000)\n' "$(cat "$WEB_PID")"
  else
    echo "Web:    stopped"
  fi
}

cmd_logs() {
  echo "=== Server logs ==="
  tail -n 50 "$SERVER_LOG" 2>/dev/null || echo "(no logs yet)"
  echo ""
  echo "=== Web logs ==="
  tail -n 50 "$WEB_LOG" 2>/dev/null || echo "(no logs yet)"
}

case "${1:-}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  logs)   cmd_logs ;;
  service)
    case "${2:-}" in
      install)   cmd_service_install ;;
      uninstall) cmd_service_uninstall ;;
      *) printf 'Usage: muzzle service install|uninstall\n' >&2; exit 1 ;;
    esac
    ;;
  *)
    printf 'Usage: muzzle <command>\n\nCommands:\n'
    printf '  start              Start server and web\n'
    printf '  stop               Stop all processes\n'
    printf '  status             Show running status\n'
    printf '  logs               Show recent logs\n'
    printf '  service install    Install as autostart service\n'
    printf '  service uninstall  Remove autostart service\n'
    exit 1
    ;;
esac
```

Note: i comandi `cmd_service_install` e `cmd_service_uninstall` vengono aggiunti nel Task 2.

**Step 2: Rendere eseguibile**

```bash
chmod +x /Users/yayoboy/Desktop/GitHub/muzzle/bin/muzzle
```

**Step 3: Verificare sintassi sh**

```bash
sh -n /Users/yayoboy/Desktop/GitHub/muzzle/bin/muzzle
```

Expected: nessun output (= sintassi ok).

**Step 4: Test rapido help**

```bash
MUZZLE_HOME=/tmp/muzzle-test /Users/yayoboy/Desktop/GitHub/muzzle/bin/muzzle || true
```

Expected: stampa usage senza errori di sintassi.

**Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add bin/muzzle
git commit -m "feat(yay-83): add muzzle CLI with start/stop/status/logs commands"
```

---

## Task 2: Aggiungere `service install/uninstall` a `bin/muzzle`

**Files:**
- Modify: `bin/muzzle`

**Contesto:**
- macOS: launchd plist in `~/Library/LaunchAgents/com.muzzle.plist`, no sudo
- Linux: systemd user unit in `~/.config/systemd/user/muzzle.service`, no sudo
- `command -v muzzle` trova il path del CLI installato (usato nel plist/unit)

**Step 1: Inserire le funzioni service PRIMA del blocco `case "${1:-}"` in `bin/muzzle`**

Aggiungere dopo `cmd_logs()`:

```sh
_service_install_macos() {
  plist="$HOME/Library/LaunchAgents/com.muzzle.plist"
  muzzle_bin="$(command -v muzzle 2>/dev/null || echo "$HOME/.local/bin/muzzle")"
  mkdir -p "$HOME/Library/LaunchAgents"

  cat > "$plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.muzzle</string>
  <key>ProgramArguments</key>
  <array>
    <string>$muzzle_bin</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launchd.log</string>
</dict>
</plist>
PLIST

  launchctl load "$plist"
  echo "Service installed (macOS launchd). Muzzle will auto-start at login."
}

_service_uninstall_macos() {
  plist="$HOME/Library/LaunchAgents/com.muzzle.plist"
  [ -f "$plist" ] || die "Service not installed."
  launchctl unload "$plist"
  rm -f "$plist"
  echo "Service removed."
}

_service_install_linux() {
  unit_dir="$HOME/.config/systemd/user"
  unit_file="$unit_dir/muzzle.service"
  muzzle_bin="$(command -v muzzle 2>/dev/null || echo "$HOME/.local/bin/muzzle")"
  mkdir -p "$unit_dir"

  cat > "$unit_file" << UNIT
[Unit]
Description=Muzzle terminal session manager
After=network.target

[Service]
Type=forking
ExecStart=$muzzle_bin start
ExecStop=$muzzle_bin stop
Restart=no

[Install]
WantedBy=default.target
UNIT

  systemctl --user daemon-reload
  systemctl --user enable --now muzzle
  echo "Service installed (systemd user). Muzzle will auto-start at login."
}

_service_uninstall_linux() {
  unit_file="$HOME/.config/systemd/user/muzzle.service"
  [ -f "$unit_file" ] || die "Service not installed."
  systemctl --user disable --now muzzle 2>/dev/null || true
  rm -f "$unit_file"
  systemctl --user daemon-reload
  echo "Service removed."
}

cmd_service_install() {
  os=$(uname -s)
  case "$os" in
    Darwin) _service_install_macos ;;
    Linux)  _service_install_linux ;;
    *) die "Unsupported OS: $os" ;;
  esac
}

cmd_service_uninstall() {
  os=$(uname -s)
  case "$os" in
    Darwin) _service_uninstall_macos ;;
    Linux)  _service_uninstall_linux ;;
    *) die "Unsupported OS: $os" ;;
  esac
}
```

**Step 2: Verificare sintassi sh**

```bash
sh -n /Users/yayoboy/Desktop/GitHub/muzzle/bin/muzzle
```

Expected: nessun output.

**Step 3: Test help**

```bash
/Users/yayoboy/Desktop/GitHub/muzzle/bin/muzzle service 2>&1 || true
```

Expected: `Usage: muzzle service install|uninstall`

**Step 4: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add bin/muzzle
git commit -m "feat(yay-83): add service install/uninstall (launchd + systemd)"
```

---

## Task 3: Creare `scripts/install.sh`

**Files:**
- Create: `scripts/install.sh`

**Contesto:**
- Invocato come: `curl -fsSL https://raw.githubusercontent.com/yayoboy/muzzle/master/scripts/install.sh | sh`
- Clona in `~/.local/share/muzzle` (override-abile via `MUZZLE_HOME`)
- Su macOS: installa tmux/ttyd via brew se mancanti
- Su Linux: stampa istruzioni manuali per dipendenze mancanti (package manager varia per distro)
- Build order: `packages/shared` → `apps/server` → `apps/web`
- Auto-genera `JWT_SECRET` in `.env` se non esiste
- Crea symlink `~/.local/bin/muzzle`

**Step 1: Creare `scripts/install.sh`**

```sh
#!/bin/sh
set -e

REPO_URL="https://github.com/yayoboy/muzzle.git"
INSTALL_DIR="${MUZZLE_HOME:-$HOME/.local/share/muzzle}"
BIN_DIR="$HOME/.local/bin"

info() { printf '\033[0;32m[muzzle]\033[0m %s\n' "$1"; }
warn() { printf '\033[0;33m[muzzle]\033[0m WARNING: %s\n' "$1"; }
die()  { printf '\033[0;31m[muzzle]\033[0m Error: %s\n' "$1" >&2; exit 1; }

OS=$(uname -s)
info "Detected OS: $OS"

# ---- dependency checks ----

need() { command -v "$1" >/dev/null 2>&1; }

check_node() {
  need node || die "Node.js is required. Install from https://nodejs.org"
  info "node: $(node --version)"
}

check_tmux() {
  if need tmux; then
    info "tmux: $(tmux -V)"
    return 0
  fi
  if [ "$OS" = "Darwin" ]; then
    info "Installing tmux via Homebrew..."
    brew install tmux
  else
    die "tmux is required. Install with: sudo apt install tmux  (or your distro equivalent)"
  fi
}

check_ttyd() {
  if need ttyd; then
    info "ttyd: found"
    return 0
  fi
  if [ "$OS" = "Darwin" ]; then
    info "Installing ttyd via Homebrew..."
    brew install ttyd
  else
    die "ttyd is required. See: https://github.com/tsl0922/ttyd/wiki/Installation"
  fi
}

check_node
check_tmux
check_ttyd

# ---- clone or update ----

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning Muzzle to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# ---- build ----

info "Building packages/shared..."
cd "$INSTALL_DIR/packages/shared" && npm install --silent && npm run build

info "Building apps/server..."
cd "$INSTALL_DIR/apps/server" && npm install --silent && npm run build

info "Building apps/web..."
cd "$INSTALL_DIR/apps/web" && npm install --silent && npm run build

# ---- env setup ----

ENV_FILE="$INSTALL_DIR/apps/server/.env"
if [ ! -f "$ENV_FILE" ]; then
  info "Creating .env from template..."
  cp "$INSTALL_DIR/apps/server/.env.example" "$ENV_FILE"
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  # POSIX-compatible in-place substitution via temp file
  sed "s/replace-with-random-hex-string/$JWT_SECRET/" "$ENV_FILE" > "${ENV_FILE}.tmp"
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
  warn "Set MUZZLE_PASSWORD in $ENV_FILE before first use!"
fi

# ---- install CLI ----

mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/bin/muzzle"
ln -sf "$INSTALL_DIR/bin/muzzle" "$BIN_DIR/muzzle"
info "muzzle command installed at $BIN_DIR/muzzle"

# ---- PATH check ----

case ":${PATH}:" in
  *":$BIN_DIR:"*) ;;
  *)
    warn "~/.local/bin is not in your PATH."
    warn "Add to your shell profile: export PATH=\"\$HOME/.local/bin:\$PATH\""
    ;;
esac

# ---- done ----

info ""
info "Installation complete!"
info ""
info "Next steps:"
info "  1. Edit $ENV_FILE and set MUZZLE_PASSWORD"
info "  2. Run: muzzle start"
info "  3. Open: http://localhost:3000"
info ""
info "Optional — autostart at login:"
info "  muzzle service install"
```

**Step 2: Rendere eseguibile e verificare sintassi**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
chmod +x scripts/install.sh
sh -n scripts/install.sh
```

Expected: nessun output da `sh -n` (sintassi ok).

**Step 3: Smoke test locale (senza curl, eseguendo direttamente)**

```bash
# Testa solo la parte di detection OS e check dipendenze su macchina locale
# (non esegue il clone reale, usa INSTALL_DIR esistente)
MUZZLE_HOME=/Users/yayoboy/Desktop/GitHub/muzzle sh -c '
  . /Users/yayoboy/Desktop/GitHub/muzzle/scripts/install.sh
' 2>&1 | head -20 || true
```

Expected: stampa info su OS e dipendenze trovate (tmux, ttyd, node), poi probabilmente fallisce sul git pull (ok per il test).

**Step 4: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add scripts/install.sh
git commit -m "feat(yay-83): add one-liner install script"
```

---

## Task 4: Aggiornare Linear YAY-83 a Done

Marcare https://linear.app/yayoboy/issue/YAY-83 come Done su Linear.
