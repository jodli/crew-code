#!/bin/sh
set -e

REPO="jodli/crew-code"
INSTALL_DIR="${CREW_INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)  os="linux" ;;
  Darwin) os="macos" ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  arch="x64" ;;
  aarch64|arm64)  arch="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

BINARY="crew-${os}-${arch}"
URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"

echo "Installing crew (${os}-${arch})..."

mkdir -p "$INSTALL_DIR"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "${INSTALL_DIR}/crew"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "${INSTALL_DIR}/crew" "$URL"
else
  echo "Error: curl or wget is required" >&2
  exit 1
fi

chmod +x "${INSTALL_DIR}/crew"

echo "Installed crew to ${INSTALL_DIR}/crew"

# Check if install dir is in PATH
case ":$PATH:" in
  *":${INSTALL_DIR}:"*) ;;
  *) echo "Add ${INSTALL_DIR} to your PATH: export PATH=\"${INSTALL_DIR}:\$PATH\"" ;;
esac
