/**
 * Applique les migrations SQL de ./migrations dans l'ordre lexicographique,
 * en traçant les fichiers déjà appliqués dans la table schema_migrations.
 * Utilisé au démarrage du conteneur de production (synchronize=false) ;
 * en développement, synchronize reste la source du schéma.
 *
 * Usage : node scripts/apply-migrations.js
 * Connexion via DATABASE_HOST / DATABASE_PORT / DATABASE_NAME /
 * DATABASE_USERNAME / DATABASE_PASSWORD — mêmes noms que ceux validés par le
 * CONFIG_SCHEMA de l'application, pour qu'il n'existe qu'un seul contrat.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  // `pg` retombe silencieusement sur 127.0.0.1 quand host est undefined :
  // échouer explicitement plutôt que boucler sur ECONNREFUSED.
  const host = process.env.DATABASE_HOST;
  if (!host) {
    throw new Error(
      'DATABASE_HOST est obligatoire pour appliquer les migrations',
    );
  }

  const client = new Client({
    host,
    port: +(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name varchar PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await client.query('SELECT name FROM schema_migrations')).rows.map(
      (row) => row.name,
    ),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`Applying migration ${file}...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
        file,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration ${file} failed: ${error.message}`);
      await client.end();
      process.exit(1);
    }
  }

  await assertAuthIdDefaults(client);

  console.log('Migrations up to date.');
  await client.end();
}

/**
 * Les tables better-auth ne passent pas par TypeORM : rien ne valide leur
 * schéma au démarrage. `advanced.database.generateId: 'uuid'` délègue la
 * génération de l'id à PostgreSQL, et l'absence du DEFAULT correspondant ne se
 * voit qu'à la première connexion, sous la forme d'un 500. Échouer ici, au
 * démarrage du conteneur, plutôt que devant le premier utilisateur.
 */
async function assertAuthIdDefaults(client) {
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'id'
        AND table_name = ANY($1::text[])
        AND column_default IS NULL
      ORDER BY table_name`,
    [['user', 'session', 'account', 'verification']],
  );
  if (rows.length > 0) {
    const tables = rows.map((row) => row.table_name).join(', ');
    throw new Error(
      `Schema incomplet : ${tables} n'ont pas de DEFAULT sur "id". ` +
        "better-auth est configure avec generateId: 'uuid', qui attend que la " +
        'base genere l identifiant. Appliquer la migration ' +
        '20260827_better_auth_id_defaults.sql.',
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
