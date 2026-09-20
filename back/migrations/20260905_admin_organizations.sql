-- Organisations : table de référence, rattachement des profils, rôle terrain.
--
-- Ces trois éléments existent dans les entités TypeORM (organization.entity.ts,
-- user-profile.entity.ts) mais aucune migration ne les créait : `synchronize`
-- les fabrique en développement, ce qui a masqué le trou. En production
-- (synchronize=false) leur absence casse la connexion — users.service.current()
-- lit organization à chaque appel de /v1/users/me — et faisait échouer le
-- backfill ci-dessous sur `column p.organization_id does not exist`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Noms d'enum alignés sur ceux que TypeORM génère (`<table>_<colonne>_enum`) :
-- un nom différent ici et synchronize recréerait un type en double en dev.
DO $$ BEGIN
  CREATE TYPE organization_type_enum AS ENUM ('cooperative', 'company', 'direction', 'producer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE organization_offer_enum AS ENUM ('saas_ponctuel', 'saas_annuel', 'saas_byod', 'on_premise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organization (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  name varchar NOT NULL,
  type organization_type_enum NOT NULL,
  offer organization_offer_enum NOT NULL,
  email varchar,
  phone varchar,
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_name ON organization (name);

-- Rôle opérateur terrain (CDC Cartographie v1.1).
ALTER TYPE app_user_profile_role_enum ADD VALUE IF NOT EXISTS 'operateur_terrain';

ALTER TABLE app_user_profile
  ADD COLUMN IF NOT EXISTS organization_id varchar,
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_app_user_profile_organization_id ON app_user_profile (organization_id);

CREATE TABLE IF NOT EXISTS admin_organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  user_id varchar NOT NULL,
  organization_id varchar NOT NULL,
  deleted_at timestamptz,
  CONSTRAINT uq_admin_organization_user_org UNIQUE (user_id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_organization_user ON admin_organization(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_organization_org ON admin_organization(organization_id);

INSERT INTO admin_organization (user_id, organization_id)
SELECT p.user_id, p.organization_id
FROM app_user_profile p
WHERE p.role = 'administrateur' AND p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

UPDATE app_user_profile p
SET is_platform_admin = true
FROM "user" u
WHERE p.user_id = u.id
  AND u.email = 'admin@cocoashield.local';
