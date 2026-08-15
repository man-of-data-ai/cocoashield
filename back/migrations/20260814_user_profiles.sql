-- Profils applicatifs Cocoashield (rôles métier distincts de Better Auth).
DO $$ BEGIN
  CREATE TYPE app_user_profile_role_enum AS ENUM ('administrateur', 'direction_ccc', 'agronome_terrain');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE app_user_profile_status_enum AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS app_user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id varchar NOT NULL UNIQUE,
  role app_user_profile_role_enum NOT NULL DEFAULT 'agronome_terrain',
  cooperative varchar,
  status app_user_profile_status_enum NOT NULL DEFAULT 'active'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_profile_user_id ON app_user_profile(user_id);
