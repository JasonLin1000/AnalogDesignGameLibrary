#!/usr/bin/env bash
# Build ngspice (console binary) to WebAssembly with Emscripten.
# Usage (WSL):  bash build.sh [clean]
set -euo pipefail
source /opt/emsdk/emsdk_env.sh >/dev/null 2>&1

SRC=/opt/build/ngspice
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/dist"
BUILD="$SRC/build-wasm"

cd "$SRC"
[ -x configure ] || ./autogen.sh >/dev/null

# Patch: upstream non-XSPICE build references OPT_ENH_RSHUNT without defining it.
OPTDEFS=src/include/ngspice/optdefs.h
if ! grep -q "WASM_PATCH_RSHUNT" "$OPTDEFS"; then
  sed -i 's|^#define OPT_TOTALDEV 200|#ifndef XSPICE /* WASM_PATCH_RSHUNT */\nenum { OPT_ENH_RSHUNT = 100 };\n#endif\n\n#define OPT_TOTALDEV 200|' "$OPTDEFS"
fi

if [ "${1:-}" = "clean" ]; then rm -rf "$BUILD"; fi
mkdir -p "$BUILD" && cd "$BUILD"

if [ ! -f Makefile ]; then
  emconfigure ../configure \
    --host=wasm32-unknown-emscripten \
    --with-x=no --without-readline --disable-debug \
    --disable-openmp --disable-osdi --disable-xspice \
    CFLAGS="-O2" CXXFLAGS="-O2" > configure.log 2>&1 \
    || { tail -40 configure.log; exit 1; }
fi

# Link the final binary as an ES module with the runtime pieces we need.
# DEFAULT_TO_CXX: HICUM2 model is C++ and needs libc++/libc++abi.
EMFLAGS="-sDEFAULT_TO_CXX -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createNgspice \
 -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=64MB -sSTACK_SIZE=4MB \
 -sINVOKE_RUN=0 -sEXIT_RUNTIME=0 -sFORCE_FILESYSTEM=1 \
 -sENVIRONMENT=web,worker,node \
 -sEXPORTED_RUNTIME_METHODS=callMain,FS"
rm -f src/ngspice src/ngspice.wasm
emmake make -j"$(nproc)" LDFLAGS="$EMFLAGS" > make.log 2>&1 || { grep -n -i -m20 "error" make.log; tail -30 make.log; exit 1; }
cd src

mkdir -p "$OUT_DIR"
# libtool may put the real output under .libs
BIN=ngspice; [ -f .libs/ngspice ] && BIN=.libs/ngspice
cp "$BIN" "$OUT_DIR/ngspice.mjs"
WASM=ngspice.wasm; [ -f .libs/ngspice.wasm ] && WASM=.libs/ngspice.wasm
cp "$WASM" "$OUT_DIR/ngspice.wasm"
ls -la "$OUT_DIR"
echo BUILD_OK
