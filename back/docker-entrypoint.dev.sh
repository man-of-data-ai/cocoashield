#!/bin/sh
set -e

# Le code source est monté en volume : si le package-lock.json du dépôt a
# changé depuis la construction de l'image (dépendance ajoutée, mise à jour,
# changement de branche), on réinstalle avant de démarrer. Sans cela, le
# conteneur redémarre sur un node_modules périmé et échoue à l'import.
LOCK_STAMP="/app/node_modules/.package-lock-stamp"

if [ -f package-lock.json ]; then
  CURRENT="$(md5sum package-lock.json | cut -d' ' -f1)"
  PREVIOUS="$(cat "$LOCK_STAMP" 2>/dev/null || echo '')"

  if [ "$CURRENT" != "$PREVIOUS" ]; then
    echo "[entrypoint] package-lock.json modifié — installation des dépendances..."
    npm install
    echo "$CURRENT" > "$LOCK_STAMP"
  fi
fi

exec "$@"
