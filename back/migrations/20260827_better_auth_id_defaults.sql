-- Génération des identifiants des tables better-auth par la base.
--
-- `advanced.database.generateId: 'uuid'` (voir auth.provider.ts) délègue la
-- génération à PostgreSQL : better-auth insère NULL et attend un DEFAULT
-- gen_random_uuid() sur la colonne. Sans ce défaut, toute création de session
-- — donc toute connexion — échoue sur la contrainte NOT NULL de `id`.
--
-- Les colonnes sont en `text` et contiennent déjà des identifiants générés
-- côté application : le cast garde le type, et les lignes existantes ne sont
-- pas touchées. SET DEFAULT est idempotent.

ALTER TABLE "user"         ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "session"      ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "account"      ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
