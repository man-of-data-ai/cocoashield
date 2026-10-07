-- Verdict du téléphone conservé à côté de celui du serveur : les captures
-- mobiles sont désormais toujours ré-analysées côté serveur.
-- Nom d'enum aligné sur celui que TypeORM génère (`<table>_<colonne>_enum`).
DO $$ BEGIN
  CREATE TYPE analysis_image_mobile_result_enum AS ENUM ('healthy', 'infected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS mobile_result analysis_image_mobile_result_enum;
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS mobile_confidence double precision;
