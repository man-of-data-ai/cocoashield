/**
 * Applique les migrations SQL de ./migrations dans l'ordre lexicographique,
 * en traçant les fichiers déjà appliqués dans la table schema_migrations.
 * Utilisé au démarrage du conteneur de production (synchronize=false) ;
 * en développement, synchronize reste la source du schéma.
 *
 * Usage : node scripts/apply-migrations.js
 * Connexion via DB_HOST / DB_PORT / DB_NAME / DB_USERNAME / DB_PASSWORD.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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

  console.log('Migrations up to date.');
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
