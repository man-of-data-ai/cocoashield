-- Traçabilité de la version du modèle sur chaque image analysée côté serveur.
-- En développement, TypeORM synchronize ajoute la colonne automatiquement.
ALTER TABLE analysis_image ADD COLUMN IF NOT EXISTS model_version varchar;
