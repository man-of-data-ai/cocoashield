CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  owner_id text NOT NULL UNIQUE,
  severity_moderate double precision NOT NULL DEFAULT 0.10,
  severity_high double precision NOT NULL DEFAULT 0.25,
  severity_critical double precision NOT NULL DEFAULT 0.40,
  clustering_radius_m double precision NOT NULL DEFAULT 20,
  min_images_per_zone integer NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS drone_profile (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  owner_id text NOT NULL,
  profile_id text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  rtk_precision_cm double precision,
  metadata_format text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_drone_profile_owner_profile UNIQUE (owner_id, profile_id)
);

ALTER TABLE analysis ADD COLUMN IF NOT EXISTS profile_id text;
CREATE INDEX IF NOT EXISTS idx_analysis_profile_id ON analysis(profile_id);
