-- Soft delete généralisé.
--
-- `deleted_at` est ajouté à toutes les tables applicatives. TypeORM exclut
-- automatiquement les lignes non nulles de tous les `find*` ; l'index partiel
-- garde ce filtre implicite peu coûteux sur les grandes tables.
--
-- En développement, `synchronize` crée ces colonnes automatiquement.
-- En production (synchronize=false), appliquer cette migration avant le
-- déploiement de la version qui les utilise.

ALTER TABLE parcel            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE analysis          ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE analysis_image    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE mission           ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE exports           ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE audit_log         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE app_user_profile  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE drone_profile     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_parcel_alive   ON parcel(owner_id)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_alive ON analysis(parcel_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mission_alive  ON mission(owner_id)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profile_alive  ON app_user_profile(user_id) WHERE deleted_at IS NULL;

-- L'unicité ne doit contraindre que les lignes vivantes : sans cela, un profil
-- drone supprimé bloquerait la recréation du même `profile_id`.
DROP INDEX IF EXISTS uq_drone_profile_owner_profile;
ALTER TABLE drone_profile DROP CONSTRAINT IF EXISTS uq_drone_profile_owner_profile;
CREATE UNIQUE INDEX IF NOT EXISTS uq_drone_profile_owner_profile_alive
  ON drone_profile(owner_id, profile_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_profile_user_id_alive
  ON app_user_profile(user_id) WHERE deleted_at IS NULL;
