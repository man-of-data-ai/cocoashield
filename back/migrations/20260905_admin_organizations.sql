CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE app_user_profile
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS admin_organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  user_id varchar NOT NULL,
  organization_id varchar NOT NULL,
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
