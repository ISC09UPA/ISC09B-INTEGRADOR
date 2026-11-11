#!/usr/bin/env bash
# Compila y corre las pruebas de test/ con g++ sin PlatformIO.
# Equivale a `pio test -e native` cuando no se pueden descargar las herramientas de PlatformIO.
#
# Uso: scripts/pruebas_nativas.sh [filtro]
#   ARDUINOJSON_DIR y UNITY_DIR permiten usar copias locales; si no, se clonan en .deps/.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DEPS="$RAIZ/.deps"
ARDUINOJSON_DIR="${ARDUINOJSON_DIR:-$DEPS/ArduinoJson}"
UNITY_DIR="${UNITY_DIR:-$DEPS/Unity}"
SALIDA="$RAIZ/.pio/pruebas_nativas"
CXX="${CXX:-g++}"
CC="${CC:-gcc}"

if [ ! -f "$ARDUINOJSON_DIR/src/ArduinoJson.h" ]; then
  git clone -q --depth 1 --branch v7.4.2 https://github.com/bblanchon/ArduinoJson.git "$ARDUINOJSON_DIR"
fi
if [ ! -f "$UNITY_DIR/src/unity.c" ]; then
  git clone -q --depth 1 --branch v2.6.0 https://github.com/ThrowTheSwitch/Unity.git "$UNITY_DIR"
fi

mkdir -p "$SALIDA"
"$CC" -c -O1 -DUNITY_INCLUDE_DOUBLE -I"$UNITY_DIR/src" "$UNITY_DIR/src/unity.c" -o "$SALIDA/unity.o"

BANDERAS=(-std=gnu++17 -O1 -g -Wall -Wextra -Werror -Wno-maybe-uninitialized -DUNITY_INCLUDE_DOUBLE
  -DARDUINOJSON_ENABLE_STD_STRING=1 -DARDUINOJSON_USE_LONG_LONG=1
  -fsanitize=address,undefined -fno-omit-frame-pointer
  -I"$RAIZ/include" -isystem "$ARDUINOJSON_DIR/src" -isystem "$UNITY_DIR/src")

fallas=0
for dir in "$RAIZ"/test/test_*/; do
  nombre="$(basename "$dir")"
  if [ -n "${1:-}" ] && [[ "$nombre" != *"$1"* ]]; then continue; fi
  echo "== $nombre"
  "$CXX" "${BANDERAS[@]}" "$dir"*.cpp "$RAIZ"/src/logica/*.cpp "$SALIDA/unity.o" -o "$SALIDA/$nombre"
  if ! "$SALIDA/$nombre"; then
    fallas=$((fallas + 1))
  fi
done

if [ "$fallas" -ne 0 ]; then
  echo "Fallaron $fallas grupos de pruebas"
  exit 1
fi
echo "Todas las pruebas pasaron"
