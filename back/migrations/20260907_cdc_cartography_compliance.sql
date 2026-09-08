-- CocoaShield - alignement du schéma avec le CDC Cartographie v1.1
-- A exécuter sur une base existante si synchronize=false.

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS severity_low double precision NOT NULL DEFAULT 0;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS minimum_confidence double precision NOT NULL DEFAULT 0.75;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dedup_distance_m double precision NOT NULL DEFAULT 2;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dedup_window_s integer NOT NULL DEFAULT 10;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS refresh_interval_connected_s integer NOT NULL DEFAULT 10;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS batch_recalc_max_delay_min integer NOT NULL DEFAULT 5;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS sync_retry_interval_min integer NOT NULL DEFAULT 15;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS offline_tile_cache_size_mb integer NOT NULL DEFAULT 250;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS history_retention_months integer NOT NULL DEFAULT 36;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS session_duration_minutes integer NOT NULL DEFAULT 60;

ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS vector_type varchar NOT NULL DEFAULT 'drone_aile_tournante';
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS supports_rtk boolean NOT NULL DEFAULT false;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS rtk_float_precision_cm double precision;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS no_correction_precision_m double precision NOT NULL DEFAULT 0.5;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS latitude_field varchar NOT NULL DEFAULT 'XMP-drone-dji:GpsLatitude';
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS longitude_field varchar NOT NULL DEFAULT 'XMP-drone-dji:GpsLongitude';
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS absolute_altitude_field varchar;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS relative_altitude_field varchar;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS orientation_fields varchar NOT NULL DEFAULT 'GimbalYawDegree,GimbalPitchDegree,GimbalRollDegree';
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS timestamp_field varchar NOT NULL DEFAULT 'EXIF:DateTimeOriginal';
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS rtk_status_field varchar;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS rtk_status_mapping text;
ALTER TABLE drone_profile ADD COLUMN IF NOT EXISTS native_mission_export varchar;

ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS altitude_m double precision;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS gimbal_yaw double precision;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS gimbal_pitch double precision;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS gimbal_roll double precision;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS capture_timestamp timestamptz;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS geolocation_precision_m double precision;

-- Les noms ci-dessous correspondent aux enums TypeORM générés par défaut.
-- Les blocs DO évitent d'échouer si une installation utilise un nom de type différent.
DO $$ BEGIN
  ALTER TYPE analysis_image_source_enum ADD VALUE IF NOT EXISTS 'drone';
  ALTER TYPE analysis_image_source_enum ADD VALUE IF NOT EXISTS 'robot';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE analysis_image_geolocation_quality_enum ADD VALUE IF NOT EXISTS 'rtk_fix';
  ALTER TYPE analysis_image_geolocation_quality_enum ADD VALUE IF NOT EXISTS 'rtk_float';
  ALTER TYPE analysis_image_geolocation_quality_enum ADD VALUE IF NOT EXISTS 'gnss_seul';
  ALTER TYPE analysis_image_geolocation_quality_enum ADD VALUE IF NOT EXISTS 'saisie_manuelle';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
