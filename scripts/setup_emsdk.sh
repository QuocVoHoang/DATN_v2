#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EMSDK_DIR="${EMSDK_DIR:-$DATN_DIR/tools/emsdk}"
command -v git >/dev/null 2>&1 || { echo "git is required." >&2; exit 1; }
mkdir -p "$(dirname "$EMSDK_DIR")"
if [[ ! -d "$EMSDK_DIR/.git" ]]; then
  git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
fi
cd "$EMSDK_DIR"
./emsdk install latest
./emsdk activate latest
echo "Emscripten installed in $EMSDK_DIR"
