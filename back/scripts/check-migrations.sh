#!/usr/bin/env bash
# Vérifie la chaîne de migrations sur une base jetable : elle doit s'appliquer
# entièrement sur une base vierge, puis être un no-op au second passage.
#
#   ./scripts/check-migrations.sh
#
# Le seul prérequis est Docker. Rien n'est écrit hors du conteneur, qui est
# supprimé en sortie même en cas d'échec.
set -euo pipefail

CONTAINER=cocoashield-migration-check
PORT=${PORT:-55433}

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER=cocoashield -e POSTGRES_PASSWORD=cocoashield -e POSTGRES_DB=cocoashield \
  -p "$PORT:5432" postgis/postgis:16-3.4 >/dev/null

# L'image postgis démarre un serveur temporaire pour son initdb avant le vrai :
# `pg_isready` répond oui pendant cette phase, puis la connexion est coupée.
# On attend donc la deuxième annonce de disponibilité, celle du serveur final.
for _ in $(seq 1 60); do
  [ "$(docker logs "$CONTAINER" 2>&1 | grep -c 'database system is ready to accept connections')" -ge 2 ] && break
  sleep 1
done

export DATABASE_HOST=127.0.0.1 DATABASE_PORT="$PORT" DATABASE_NAME=cocoashield \
       DATABASE_USERNAME=cocoashield DATABASE_PASSWORD=cocoashield

echo "--- base vierge ---"
node scripts/apply-migrations.js

echo "--- second passage (doit être un no-op) ---"
second=$(node scripts/apply-migrations.js)
echo "$second"
if echo "$second" | grep -q '^Applying migration'; then
  echo "ECHEC : des migrations ont été rejouées, le suivi n'est pas idempotent." >&2
  exit 1
fi

count=$(ls migrations/*.sql | wc -l | tr -d ' ')
applied=$(docker exec "$CONTAINER" psql -U cocoashield -d cocoashield -tAc 'SELECT count(*) FROM schema_migrations')
if [ "$count" != "$applied" ]; then
  echo "ECHEC : $count fichiers de migration, $applied enregistrés." >&2
  exit 1
fi

echo "OK : $applied migrations appliquées, chaîne idempotente."
