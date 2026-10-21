#!/usr/bin/env bash
cd -- "$(dirname -- "${BASH_SOURCE[0]}")" || exit 1
if ! command -v node >/dev/null; then
  echo 'Instala Node.js 22 o posterior antes de usar el juego local.'
  exit 1
fi
node local/server.cjs --open
