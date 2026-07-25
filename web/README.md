# Cartographie des parcelles

Application web professionnelle de cartographie cadastrale : authentification,
upload d'une feuille cadastrale (image), identification automatique de la
parcelle correspondante, et visualisation sur une carte Leaflet (contour,
marqueur, popup, surface, périmètre, centre).

## Stack technique

- **Next.js** (App Router) + **TypeScript**
- **React 19**
- **Tailwind CSS v4**
- **Leaflet** / **React Leaflet**

## Architecture

```
app/                      Pages et API Routes (App Router)
  api/
    auth/login/            POST  — authentifie, pose un cookie httpOnly
    auth/logout/           POST  — invalide la session
    auth/me/                GET  — utilisateur courant (à partir du cookie)
    identify/               POST — identifie une parcelle à partir d'une image
    parcels/                 GET — liste toutes les parcelles connues
  login/                    Page de connexion
  map/                      Dashboard cartographique (protégé)
  layout.tsx / page.tsx     Layout racine + aiguillage /login <-> /map

components/
  auth/LoginForm.tsx        Formulaire de connexion (présentation pure)
  upload/UploadPanel.tsx    Colonne gauche : upload, aperçu, statut
  map/ParcelMap.tsx         Carte Leaflet (fitBounds, marqueur, GeoJSON, popup)
  map/ParcelInfoPanel.tsx   Surface / périmètre / centre de la parcelle
  ui/                       Spinner, Alert (composants réutilisables)

services/
  auth-service.ts           Appels réseau liés à l'authentification
  parcel-service.ts         Appels réseau liés aux parcelles

hooks/
  useParcelIdentification.ts  Workflow identification (loading/erreur/donnée)
  useParcelMetrics.ts         Calcul mémoïsé des métriques géométriques
  useImagePreview.ts          Aperçu d'image + nettoyage mémoire

context/
  AuthContext.tsx            État d'authentification global (Context React)

lib/
  api-client.ts              Client HTTP générique (erreurs normalisées)
  constants.ts                Constantes partagées
  geo.ts                      Surface / périmètre / centre d'un polygone
  mock-data.ts                Utilisateurs et parcelles de démonstration
  token.ts                    Signature / vérification du jeton de session

types/
  auth.ts, parcel.ts          Typage strict partagé front / API

proxy.ts                      Protection de route /map (anciennement middleware.ts)
```

## Authentification

L'API (Route Handlers Next.js, dans `app/api/**`) fait office de véritable
backend REST : `POST /api/auth/login` vérifie les identifiants et pose un
jeton de session signé (HMAC-SHA256) dans un **cookie httpOnly, Secure en
production, SameSite=Lax**. Le jeton n'est donc **jamais accessible en
JavaScript côté client** (protection contre le vol de session via XSS).

Le fichier `proxy.ts` (exécuté côté serveur avant le rendu) protège la route
`/map` : tout utilisateur non authentifié est redirigé vers `/login`.

**Compte de démonstration :**
- Email : `demo@cadastre.fr`
- Mot de passe : `demo1234`

## Flux d'identification de parcelle

1. L'utilisateur sélectionne une image dans le panneau d'upload (aperçu
   affiché immédiatement).
2. Au clic sur *Localiser la parcelle*, l'image est envoyée via `FormData`
   à `POST /api/identify`.
3. Le serveur répond avec :
   ```json
   {
     "id": 1,
     "name": "Parcelle 145",
     "lat": 33.5731,
     "long": -7.5898,
     "path": "parcelle145.jpg",
     "geometry": { "type": "Polygon", "coordinates": [[...]] }
   }
   ```
4. La carte se recentre automatiquement (`fitBounds`), affiche un marqueur,
   dessine le contour (`GeoJSON`) et ouvre un popup avec les informations de
   la parcelle. La surface, le périmètre et le centre sont calculés côté
   client (`lib/geo.ts`) et affichés sous la carte.

Dans cette démo, l'identification est simulée par une correspondance sur le
nom de fichier (voir `lib/mock-data.ts`) : essayez d'uploader une image
nommée `parcelle145.jpg`, `parcelle1.jpg`, `parcelle2.jpg`, `parcelle33.jpg`
ou `parcelle90.jpg` pour obtenir une correspondance exacte ; tout autre nom
retombe sur une correspondance déterministe, afin que la démo reste
utilisable avec n'importe quelle image.

## Brancher une vraie API REST externe

Le projet est conçu pour être connecté à un backend réel **sans changer
l'architecture** :

1. Dans `services/auth-service.ts` et `services/parcel-service.ts`,
   remplacez les appels à `/api/**` par l'URL de votre API externe.
2. Si cette API gère elle-même les sessions (JWT, cookies…), vous pouvez
   supprimer `lib/token.ts`, `lib/mock-data.ts`, `proxy.ts` et le dossier
   `app/api/**` : aucun composant, hook ou page ne dépend directement de ces
   fichiers, seuls les services le font.
3. Aucun changement n'est nécessaire dans `components/`, `hooks/` ou
   `context/`.

## Démarrage

```bash
npm install
cp .env.example .env.local   # définissez AUTH_TOKEN_SECRET en production
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

### Scripts disponibles

```bash
npm run dev      # serveur de développement
npm run build    # build de production
npm run start    # lance le build de production
npm run lint     # ESLint
```

## Qualité du code

- Typage TypeScript strict de bout en bout (API ↔ services ↔ hooks ↔ UI)
- Aucune logique métier dans les composants de présentation
- Services séparés, hooks personnalisés, gestion d'erreurs centralisée
- Responsive design (mobile / tablette / desktop)
- Composants réutilisables (`Spinner`, `Alert`)
