# CocoaShield — Guide de démo On-Premise

## Objectif

La démonstration commence **après l'installation technique**. Le poste Docker utilisé pour la présentation représente le serveur local du client. Aucun écran « Installation » n'est nécessaire dans l'application.

Le parcours de référence est :

1. Admin local On-Premise
2. Création/gestion des utilisateurs
3. Parcelles
4. Profils drones et paramètres locaux
5. Création d'une mission
6. Agronome : mission, upload, analyse, vérification et notes
7. Carte / heatmaps / fiche zone
8. Deuxième analyse de la même parcelle
9. Comparaison temporelle par parcelle
10. Exports et rapports
11. Direction : synthèse agrégée uniquement
12. Audit local

## Démarrage 100 % Docker

Depuis la racine du projet :

```bash
docker compose -f docker-compose.onpremise.yml up -d --build
```

Vérifier :

```bash
docker compose -f docker-compose.onpremise.yml ps
```

Puis charger le jeu de démonstration :

```bash
docker compose -f docker-compose.onpremise.yml exec back npm run seed:demo
```

Application : http://localhost:3002
API : http://localhost:3000

## Comptes de démonstration

Mot de passe commun : `CocoaDemo2026!`

- `admin.onpremise@ccc.ci` — Administrateur local On-Premise
- `agronome@ccc.ci` — Agronome terrain
- `direction@ccc.ci` — Direction, vue agrégée uniquement
- `admin@cocoashield.local` — Super-admin CocoaShield (utile uniquement pour montrer la séparation plateforme/client)

## Règles de démonstration

### Admin local

Il peut gérer les utilisateurs de son organisation, les parcelles, les missions, les profils drones, les seuils, la rétention, les exports/rapports et l'audit. La configuration affichée est propre à l'organisation On-Premise.

### Agronome

Il ne crée pas de mission. Il consulte les missions, ajoute ses notes, lance/téléverse une analyse sur les parcelles prévues, vérifie les zones et utilise Carte/Comparaison.

### Direction

Elle ne reçoit aucune liste de parcelles nominatives ni géométrie précise. Elle arrive sur un Dashboard agrégé et peut exporter une synthèse PDF institutionnelle.

## Mode IA de démonstration

Le compose On-Premise active `DEMO_INFERENCE_MODE=true`. Ce mode sert uniquement à valider le parcours fonctionnel Upload → Redis → Analyse → Carte lorsqu'aucun modèle IA de production n'est connecté. Le résultat est déterministe à partir du fichier et ne doit pas être présenté comme une prédiction médicale/agronomique réelle.

En production, laisser `DEMO_INFERENCE_MODE` désactivé et connecter le Worker IA réel.

## Arrêt

```bash
docker compose -f docker-compose.onpremise.yml down
```

Pour supprimer également toutes les données de démonstration :

```bash
docker compose -f docker-compose.onpremise.yml down -v
```
