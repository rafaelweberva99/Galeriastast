#!/bin/sh
# Arranque en producción: la primera vez (o con REINGEST=1) descarga y carga los partidos,
# luego levanta Next.js. Los datos de hinchas quedan en DATABASE_PATH (volumen persistente).
set -e

DB="${DATABASE_PATH:-data/galeriastats.db}"
mkdir -p "$(dirname "$DB")"
MARKER="$DB.ingested"

if [ ! -f "$MARKER" ] || [ "${REINGEST:-0}" = "1" ]; then
  echo "Cargando partidos en $DB ..."
  npm run data:fetch
  npm run data:ingest
  touch "$MARKER"
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
