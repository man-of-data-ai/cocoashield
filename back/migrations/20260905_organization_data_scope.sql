ALTER TABLE parcel ADD COLUMN IF NOT EXISTS organization_id varchar NULL;
ALTER TABLE mission ADD COLUMN IF NOT EXISTS organization_id varchar NULL;

UPDATE parcel p
SET organization_id = up.organization_id
FROM app_user_profile up
WHERE p.owner_id = up.user_id
  AND p.organization_id IS NULL
  AND up.organization_id IS NOT NULL;

UPDATE mission m
SET organization_id = up.organization_id
FROM app_user_profile up
WHERE m.owner_id = up.user_id
  AND m.organization_id IS NULL
  AND up.organization_id IS NOT NULL;

UPDATE parcel p
SET organization_id = ao.organization_id
FROM admin_organization ao
WHERE p.owner_id = ao.user_id
  AND p.organization_id IS NULL
  AND (SELECT COUNT(*) FROM admin_organization x WHERE x.user_id = ao.user_id) = 1;

UPDATE mission m
SET organization_id = ao.organization_id
FROM admin_organization ao
WHERE m.owner_id = ao.user_id
  AND m.organization_id IS NULL
  AND (SELECT COUNT(*) FROM admin_organization x WHERE x.user_id = ao.user_id) = 1;

CREATE INDEX IF NOT EXISTS idx_parcel_organization_id ON parcel (organization_id);
CREATE INDEX IF NOT EXISTS idx_mission_organization_id ON mission (organization_id);
