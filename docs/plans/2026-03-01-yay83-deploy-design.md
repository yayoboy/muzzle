# YAY-83 Deploy & Installation — Design

## Problema

Muzzle non ha un meccanismo di installazione su nuove macchine. L'utente deve clonare manualmente il repo, installare dipendenze di sistema, buildare, configurare l'env e avviare i processi a mano.

## Approccio scelto: Bash CLI + install script (sh POSIX)

Script scritti in `#!/bin/sh` POSIX per compatibilità macOS + Linux indipendentemente dal default shell (zsh/bash/fish).

---

## Struttura file

```
muzzle/
├── bin/
│   └── muzzle              # CLI wrapper (sh POSIX, chmod +x)
└── scripts/
    └── install.sh          # one-liner install script (sh POSIX)
```

---

## `scripts/install.sh`

Invocato come:
```sh
curl -fsSL https://raw.githubusercontent.com/yayoboy/muzzle/master/scripts/install.sh | sh
```

Sequenza operazioni:
1. Rilevare OS (`uname -s`: Darwin = macOS, Linux = Linux)
2. Controllare dipendenze: `node`, `tmux`, `ttyd`
   - macOS: installa mancanti via `brew install`
   - Linux: stampa istruzioni manuali (package manager variabile per distro)
3. Clonare repo in `~/.local/share/muzzle` oppure `git pull` se già esistente
4. `npm install` + build sequenziale: `packages/shared` → `apps/server` → `apps/web`
5. Creare `apps/server/.env` da `.env.example` se non esiste, con `JWT_SECRET` auto-generato via `node -e "..."`
6. Creare `~/.local/bin/` se non esiste, aggiungere symlink `muzzle → ~/.local/share/muzzle/bin/muzzle`
7. Stampare istruzioni finali (aggiungere `~/.local/bin` al PATH se necessario)

---

## `bin/muzzle` — CLI

Comandi:
```
muzzle start              # avvia server + web in background
muzzle stop               # ferma i processi via PID file
muzzle status             # mostra stato running + porte
muzzle service install    # installa servizio autostart
muzzle service uninstall  # rimuove servizio autostart
muzzle logs               # tail log server + web
```

Gestione processi:
- PID files: `~/.local/share/muzzle/run/server.pid`, `run/web.pid`
- Log files: `~/.local/share/muzzle/logs/server.log`, `logs/web.log`
- `start`: avvia con `nohup ... >> logfile 2>&1 &`, scrive PID
- `stop`: legge PID, `kill $pid`, rimuove file

---

## Gestione servizi

**macOS** — launchd user agent (no sudo):
- File: `~/Library/LaunchAgents/com.muzzle.plist`
- `service install`: scrive plist + `launchctl load`
- `service uninstall`: `launchctl unload` + rimuove plist

**Linux** — systemd user unit (no sudo):
- File: `~/.config/systemd/user/muzzle.service`
- `service install`: scrive unit + `systemctl --user enable --now muzzle`
- `service uninstall`: `systemctl --user disable --now muzzle` + rimuove file

---

## Fuori scope

- Pubblicazione su npm registry pubblico
- Docker
- Windows
- Auto-update
