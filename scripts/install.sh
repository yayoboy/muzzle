#!/bin/sh
set -e

REPO_URL="https://github.com/yayoboy/muzzle.git"
VERSION="v0.1.1"
INSTALL_DIR="${MUZZLE_HOME:-$HOME/.local/share/muzzle}"
BIN_DIR="$HOME/.local/bin"

info() { printf '\033[0;32m[muzzle]\033[0m %s\n' "$1"; }
warn() { printf '\033[0;33m[muzzle]\033[0m WARNING: %s\n' "$1"; }
die()  { printf '\033[0;31m[muzzle]\033[0m Error: %s\n' "$1" >&2; exit 1; }

OS=$(uname -s)
info "Detected OS: $OS"

# ---- dependency checks ----

need() { command -v "$1" >/dev/null 2>&1; }

check_git() {
  need git || die "git is required. Install from https://git-scm.com"
  info "git: $(git --version)"
}

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
    need brew || die "Homebrew is required to auto-install tmux. Install from https://brew.sh, then re-run."
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
    need brew || die "Homebrew is required to auto-install ttyd. Install from https://brew.sh, then re-run."
    info "Installing ttyd via Homebrew..."
    brew install ttyd
  else
    die "ttyd is required. See: https://github.com/tsl0922/ttyd/wiki/Installation"
  fi
}

check_git
check_node
check_tmux
check_ttyd

# ---- clone or update ----

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" fetch --tags
  git -C "$INSTALL_DIR" checkout "$VERSION"
else
  info "Cloning Muzzle $VERSION to $INSTALL_DIR..."
  git clone --branch "$VERSION" "$REPO_URL" "$INSTALL_DIR"
fi

# ---- install deps ----

info "Installing dependencies..."
(cd "$INSTALL_DIR" && npm install --silent) \
  || die "npm install failed. Re-run the installer."

# ---- build ----

info "Building packages/shared..."
(cd "$INSTALL_DIR/packages/shared" && npm run build) \
  || die "Build failed at packages/shared. Re-run the installer."

info "Building apps/server..."
(cd "$INSTALL_DIR/apps/server" && npm run build) \
  || die "Build failed at apps/server. Re-run the installer."

info "Building apps/web..."
(cd "$INSTALL_DIR/apps/web" && npm run build) \
  || die "Build failed at apps/web. Re-run the installer."

# ---- env setup ----

ENV_FILE="$INSTALL_DIR/apps/server/.env"
if [ ! -f "$ENV_FILE" ]; then
  info "Creating .env from template..."
  cp "$INSTALL_DIR/apps/server/.env.example" "$ENV_FILE"
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  # POSIX-compatible in-place substitution via temp file
  sed "s|replace-with-random-hex-string|$JWT_SECRET|" "$ENV_FILE" > "${ENV_FILE}.tmp"
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
    SHELL_RC=""
    case "$SHELL" in
      */zsh)  SHELL_RC="$HOME/.zshrc" ;;
      */bash) SHELL_RC="$HOME/.bashrc" ;;
    esac
    if [ -n "$SHELL_RC" ]; then
      LINE="export PATH=\"\$HOME/.local/bin:\$PATH\""
      if ! grep -qF "$LINE" "$SHELL_RC" 2>/dev/null; then
        printf '\n# Added by muzzle installer\n%s\n' "$LINE" >> "$SHELL_RC"
        info "Added ~/.local/bin to PATH in $SHELL_RC"
        info "Run: source $SHELL_RC  (or open a new terminal)"
      fi
    else
      warn "Add to your shell profile: export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
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
