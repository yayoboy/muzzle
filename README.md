# muzzle

Browser UI for terminal sessions — runs tmux sessions in your browser via ttyd.

## Prerequisites

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **tmux** — `brew install tmux` (macOS) or `apt install tmux` (Linux)
- **ttyd** — `brew install ttyd` (macOS) or see [ttyd installation](https://github.com/tsl0922/ttyd/wiki/Installation)

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/yayoboy/muzzle/v0.1.1/scripts/install.sh | sh
```

Then set your password:

```sh
# Edit the generated config file:
nano ~/.local/share/muzzle/apps/server/.env

# Change MUZZLE_PASSWORD to something secure
```

## Usage

```sh
muzzle start      # Start server (port 3001) and web UI (port 3000)
muzzle stop       # Stop all processes
muzzle status     # Show running status and PIDs
muzzle logs       # Tail recent logs
muzzle help       # Show all commands
muzzle uninstall  # Remove muzzle completely
```

Open [http://localhost:3000](http://localhost:3000) and log in with your password.

## Autostart at login

```sh
muzzle service install    # Install as launchd (macOS) or systemd user (Linux)
muzzle service uninstall  # Remove autostart
```

## Configuration

`~/.local/share/muzzle/apps/server/.env`:

| Variable          | Description                               | Default              |
|-------------------|-------------------------------------------|----------------------|
| `MUZZLE_PASSWORD` | Login password for the web UI             | `change-me`          |
| `JWT_SECRET`      | Secret for signing JWTs (auto-generated)  | —                    |
| `PORT`            | API server port                           | `3001`               |
| `CORS_ORIGIN`     | Allowed origins (comma-separated)         | `http://localhost:3000` |
| `NODE_ENV`        | `development` shows stack traces          | `development`        |

## Update

Re-run the installer for the version you want:

```sh
curl -fsSL https://raw.githubusercontent.com/yayoboy/muzzle/v0.1.1/scripts/install.sh | sh
```
