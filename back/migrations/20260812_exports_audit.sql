-- Migration PostgreSQL de déploiement pour la fonctionnalité Exports/Audit.
-- En développement, TypeORM synchronize crée automatiquement ces éléments.
-- En production (synchronize=false), appliquer cette migration avant déploiement.

DO $$ BEGIN
  CREATE TYPE parcel_terrain_verification_status_enum AS ENUM ('pending', 'verified', 'false_positive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE parcel
  ADD COLUMN IF NOT EXISTS terrain_verification_status parcel_terrain_verification_status_enum NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS terrain_verification_comment text,
  ADD COLUMN IF NOT EXISTS terrain_verified_at timestamptz;

DO $$ BEGIN
  CREATE TYPE exports_scope_enum AS ENUM ('zone', 'mission', 'period');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exports_format_enum AS ENUM ('geojson', 'shapefile', 'kml-kmz', 'csv', 'pdf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS exports (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id varchar NOT NULL,
  user_email varchar,
  scope exports_scope_enum NOT NULL,
  scope_label varchar NOT NULL,
  format exports_format_enum NOT NULL,
  include_source_images boolean NOT NULL DEFAULT false,
  verified_only boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id varchar NOT NULL,
  user_email varchar,
  action varchar NOT NULL,
  details jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Enrichissement du journal d'audit (onglet Audit).
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS target_type varchar,
  ADD COLUMN IF NOT EXISTS target_id varchar,
  ADD COLUMN IF NOT EXISTS target_label varchar,
  ADD COLUMN IF NOT EXISTS ip_address varchar;
CREATE INDEX IF NOT EXISTS idx_audit_log_user_email ON audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type ON audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id ON audit_log(target_id);
