-- Une capture mobile prise hors de toute parcelle est enregistrée quand même :
-- l'analyse n'a alors pas de parcelle, et c'est son auteur qui porte l'accès.
ALTER TABLE analysis ALTER COLUMN parcel_id DROP NOT NULL;
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS owner_id varchar;
