#!/usr/bin/env bash
# Gera o pacote portable (one-folder) para o SO atual e um zip em portable/dist/.
# Uso: simulador-escalas/portable/build.sh   (requer Python 3.12+ e Node 22 só para BUILDAR)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
PY="${PYTHON:-python3}"
( cd "$ROOT/frontend" && { [ -d node_modules ] || npm ci; } && npm run build )
VENV="$HERE/.venv-build"
[ -d "$VENV" ] || "$PY" -m venv "$VENV"
BIN="$VENV/bin"; [ -d "$BIN" ] || BIN="$VENV/Scripts"
"$BIN/python" -m pip install -q --upgrade pip
"$BIN/python" -m pip install -q "$ROOT/backend" "pyinstaller==6.11.1"
cd "$HERE"
"$BIN/pyinstaller" --noconfirm --distpath dist --workpath build simulador-escalas.spec
case "$(uname -s)" in
  Linux*) OS=linux ;; Darwin*) OS=macos ;; *) OS=windows ;;
esac
ARCH="$(uname -m)"
ZIP="simulador-escalas-${OS}-${ARCH}.zip"
( cd dist && rm -f "$ZIP" && "$BIN/python" -m zipfile -c "$ZIP" simulador-escalas )
echo "ok: $HERE/dist/$ZIP"
