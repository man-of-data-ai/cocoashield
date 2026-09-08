# Modifications v7 — Démo On-Premise

## Alignement offre On-Premise

- Dashboard opérationnel pour l'administrateur local.
- Configuration locale isolée par organisation On-Premise.
- L'admin On-Premise peut gérer seuils, clustering, déduplication, rétention et profils drones.
- Les profils drones locaux sont amorcés depuis les profils CocoaShield uniquement lorsqu'une instance locale n'en possède encore aucun ; les modifications suivantes restent locales.
- Le super-admin CocoaShield conserve son espace plateforme sans onglets terrain.

## Rôles

### Administrateur local
Dashboard, Parcelles, Carte, Comparaison, Missions, Exports, Rapports, Configuration, Utilisateurs, Audit.

### Agronome
Parcelles, Carte, Comparaison, Missions et Analyses. La création de mission reste interdite côté backend. Les notes de mission restent disponibles.

### Direction
Dashboard agrégé uniquement. L'API refuse la liste/détail de parcelles nominatives pour ce rôle. Un PDF de synthèse institutionnelle agrégée est disponible depuis le Dashboard.

## Démonstration IA

Ajout de `DEMO_INFERENCE_MODE=true`, uniquement pour la démonstration fonctionnelle lorsqu'aucun Worker IA réel n'est connecté. Ce mode produit un résultat déterministe à partir du fichier afin de permettre Upload -> Redis -> Analyse -> Carte. Il est désactivé par défaut hors du compose de démo.

## Docker On-Premise

Ajout de `docker-compose.onpremise.yml` et de Dockerfiles pour lancer :

- PostgreSQL/PostGIS
- Redis
- Backend NestJS
- Frontend Next.js

Le volume des uploads et les données PostgreSQL/Redis sont persistants.

## Jeu de démonstration

`npm run seed:demo` prépare désormais une organisation On-Premise et les comptes :

- admin.onpremise@ccc.ci
- agronome@ccc.ci
- direction@ccc.ci
- admin@cocoashield.local

Mot de passe : `CocoaDemo2026!`

## Correctif démarrage TypeORM

Les champs nullable `string | null` du profil drone ont désormais explicitement `type: 'varchar'`, ce qui évite l'erreur `DataTypeNotSupported` observée au démarrage PostgreSQL.

## Limite encore assumée

Le mode totalement hors connexion des fonds cartographiques n'est pas simulé dans cette démo : les tuiles satellite/OSM restent dépendantes du fournisseur de tuiles sauf si un serveur de tuiles local est ajouté au déploiement client. Le reste de la stack applicative est exécutable localement.
