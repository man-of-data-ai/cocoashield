# Configuration dynamique

En développement, `synchronize` crée automatiquement les tables/colonnes.
En production, appliquer `20260812_platform_configuration.sql` avant le démarrage de la version qui utilise cette fonctionnalité.

Les seuils de sévérité et paramètres de clustering sont lus à l'exécution via `/v1/configuration/settings`.
Les profils drone actifs sont lus via `/v1/configuration/drone-profiles?activeOnly=true` et `profile_id` est validé côté serveur lors de la création d'une analyse.
