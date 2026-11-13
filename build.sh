#!/usr/bin/env bash
# ==============================================================================
# StudyWallah Full-Stack Single-Binary Build Script
#
# Builds the production React/Expo web frontend, embeds all assets into the Go
# backend via Go's embed.FS, and compiles a single standalone, statically-linked
# binary that requires NO Node.js, npm, or frontend runtime dependencies.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
EMBED_DIST_DIR="$BACKEND_DIR/internal/web/dist"
OUTPUT_BIN="${OUTPUT_BIN:-$SCRIPT_DIR/studywallah-server}"

echo "======================================================================"
echo " Starting StudyWallah Single-Binary Build Process"
echo "======================================================================"

# 0. Check prerequisites
for cmd in node npm go; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[-] Error: required build tool '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
done

echo "[+] Node version: $(node --version)"
echo "[+] NPM version:  $(npm --version)"
echo "[+] Go version:   $(go version)"

# 1. Install frontend dependencies
echo ""
echo "[1/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --no-audit --no-fund

# 2. Build production web frontend using Expo
echo ""
echo "[2/4] Building frontend production web assets with Expo..."
# Ensure API base URL is relative for same-origin single-binary serving
export EXPO_PUBLIC_API_URL=""
npx expo export --platform web

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  echo "[-] Error: frontend build failed: $FRONTEND_DIR/dist/index.html not found." >&2
  exit 1
fi

# 3. Synchronize built frontend assets into Go embed package
echo ""
echo "[3/4] Copying production assets into Go embed package..."
mkdir -p "$EMBED_DIST_DIR"
rm -rf "${EMBED_DIST_DIR:?}"/*
cp -r "$FRONTEND_DIR/dist"/* "$EMBED_DIST_DIR/"

echo "[+] Assets copied to $EMBED_DIST_DIR:"
ls -lh "$EMBED_DIST_DIR"

# 4. Compile standalone Go binary with embedded frontend
echo ""
echo "[4/4] Compiling standalone Go application with embedded assets..."
cd "$BACKEND_DIR"
CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o "$OUTPUT_BIN" ./cmd/api

chmod +x "$OUTPUT_BIN"

echo ""
echo "======================================================================"
echo " BUILD COMPLETE!"
echo " Single binary generated at: $OUTPUT_BIN"
echo " Size: $(du -h "$OUTPUT_BIN" | cut -f1)"
echo " Binary type: $(file "$OUTPUT_BIN" | cut -d: -f2)"
echo "======================================================================"
echo ""
echo "To run StudyWallah standalone in production:"
echo "  1. Ensure MongoDB is running."
echo "  2. Configure environment variables (or supply a .env file):"
echo "       export PORT=8080"
echo "       export MONGO_URI=\"mongodb://user:pass@127.0.0.1:27017/studywallah?authSource=admin\""
echo "       export JWT_SECRET=\"$(openssl rand -hex 32)\""
echo "  3. Start the single server binary:"
echo "       $OUTPUT_BIN"
echo ""
echo "The single binary serves:"
echo "  - StudyWallah NEET Web App at http://localhost:8080/"
echo "  - Direct refresh SPA routes (/freedom/login, /freedom/dashboard)"
echo "  - Backend REST APIs (/api/v1/...)"
echo "  - System health probes (/health, /ready)"
echo "======================================================================"
