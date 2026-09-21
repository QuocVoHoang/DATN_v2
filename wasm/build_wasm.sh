#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EMSDK_DIR="${EMSDK_DIR:-$DATN_DIR/tools/emsdk}"
EM_CACHE_DIR="${EM_CACHE:-$SCRIPT_DIR/.em_cache}"
mkdir -p "$EM_CACHE_DIR"

if ! command -v em++ >/dev/null 2>&1 && [[ -f "$EMSDK_DIR/emsdk_env.sh" ]]; then
  EMSDK_QUIET=1 source "$EMSDK_DIR/emsdk_env.sh" >/dev/null
fi

if command -v em++ >/dev/null 2>&1; then
  EMXX_BIN="$(command -v em++)"
elif [[ -x "$EMSDK_DIR/upstream/emscripten/em++" ]]; then
  EMXX_BIN="$EMSDK_DIR/upstream/emscripten/em++"
else
  echo "em++ not found. Run: npm run setup:emsdk" >&2
  exit 1
fi

export EM_CACHE="$EM_CACHE_DIR"
mkdir -p "$DATN_DIR/public/wasm"

"$EMXX_BIN" "$SCRIPT_DIR/cpp/motion_detection.cpp" \
  -O3 -msimd128 -pthread -s PTHREAD_POOL_SIZE=4 -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_processMotion","_resetMotionDetector","_getChangedPixelCount","_getLastMotionError","_setThreadCount","_getThreadCount"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAPU8"]' \
  -o "$DATN_DIR/public/wasm/motion_wasm.js"

echo "Build done: public/wasm/motion_wasm.js and public/wasm/motion_wasm.wasm"

# Worker fallback: no pthread runtime is required inside the analysis worker.
"$EMXX_BIN" "$SCRIPT_DIR/cpp/motion_detection.cpp" \
  -O3 -msimd128 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_processMotion","_resetMotionDetector","_getChangedPixelCount","_getLastMotionError","_setThreadCount","_getThreadCount"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAPU8"]' \
  -s MODULARIZE=1 -s EXPORT_ES6=1 \
  -o "$DATN_DIR/public/wasm/motion_wasm_worker.mjs"
