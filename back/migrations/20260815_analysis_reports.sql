ALTER TABLE analysis ADD COLUMN IF NOT EXISTS infection_percentage double precision;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS severity_level varchar;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS affected_zones jsonb;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS report_generated_at timestamptz;
