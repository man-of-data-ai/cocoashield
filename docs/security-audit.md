# Audit de sécurité — Cocoashield

Périmètre : backend NestJS (`back/`), frontend Next.js (`web/`), conteneurisation.
Date : 22 août 2026. Branche : `pr1--review-fixes`.

Chaque constat a été **vérifié par requête réelle** contre la stack Docker de
développement, pas seulement par lecture du code. Les commandes de
vérification sont données pour être rejouables.

---

## 1. Synthèse

| Domaine | État | Détail |
|---|---|---|
| Contrôle d'accès (rôles) | **Corrigé** | Garde serveur fermé par défaut, §2 |
| Accès horizontal (IDOR / BOLA) | **Conforme** | Propriété dans la requête SQL, §3 |
| Authentification | **Renforcé** | UUID, cookie JWT + révocation, §4 |
| Validation des entrées | **Conforme** | DTO, `forbidNonWhitelisted`, §5 |
| Suppression de données | **Corrigé** | Soft delete généralisé, §6 |
| Secrets | **Corrigé** | Sortis du dépôt, §7 |
| Dépendances | **Corrigé** | 0 vulnérabilité, §8 |
| Conteneurs | **Renforcé** | Non-root, base non exposée, §9 |
| Points ouverts | **3** | §10 |

---

## 2. Contrôle d'accès — le défaut le plus grave, et le piège qu'il a tendu

### 2.1 État initial

Toute l'autorisation vivait dans `web/proxy.ts`. Le backend n'avait **aucun**
contrôle de rôle. Un cookie d'agronome donnait accès en `curl` au journal
d'audit complet, à la configuration et aux exports.

C'est OWASP **A01:2021 — Broken Access Control** et **API1:2023 — BOLA**. Le
middleware Next.js n'est structurellement pas une frontière de sécurité :
CVE-2025-29927 (CVSS 9.1) a montré qu'un en-tête `x-middleware-subrequest`
forgé le fait sauter intégralement.

### 2.2 Correction

`AppRolesGuard` enregistré en `APP_GUARD`, avec deux propriétés :

- **Fermé par défaut** — une route authentifiée sans `@AppRoles(...)` renvoie
  403. Oublier la déclaration ferme la route, ne l'ouvre pas.
- **Indépendant de l'ordre des gardes** — voir 2.3.

### 2.3 Le piège : un garde qui échouait ouvert

La première implémentation lisait `request.session`, renseigné par l'`AuthGuard`
de better-auth, et laissait passer quand il était absent (« route anonyme ») :

```ts
const userId = request.session?.user?.id;
if (!userId) return true;   // ← ouvre TOUT si ce garde s'exécute en premier
```

Nest exécutait ce garde **avant** celui de better-auth. `request.session` était
donc toujours vide, et **toutes les routes passaient**. La vérification par
requête l'a montré :

```
Agronome sur /v1/audit   -> 200   (attendu : 403)
Agronome sur /v1/users   -> 200   (attendu : 403)
```

Une revue de code seule n'aurait pas attrapé ça : le code se lit correctement.

Correction : le garde résout la session lui-même via un `SessionResolver`
injecté, et refuse si elle est absente. Il ne dépend plus d'un état posé par un
autre garde.

### 2.4 Vérification

```bash
for r in /v1/audit /v1/users /v1/exports /v1/configuration/settings; do
  curl -s -o /dev/null -w "$r -> %{http_code}\n" -b cookies.txt http://localhost:3000$r
done
```

| Route | Agronome | Admin | Sans session |
|---|---|---|---|
| `/v1/audit` | **403** | 200 | **401** |
| `/v1/audit/facets` | **403** | 200 | 401 |
| `/v1/users` | **403** | 200 | 401 |
| `/v1/exports` | **403** | 200 | 401 |
| `/v1/configuration/settings` | **403** | 200 | 401 |
| `/v1/parcels` | 200 | 200 | 401 |
| `/v1/users/me/profile` | 200 | 200 | 401 |

### 2.5 Fuite associée

`GET /v1/audit/facets` renvoyait la liste distincte de **tous les emails** de
la plateforme, sans authentification de rôle. Désormais réservé aux rôles
administrateur et direction.

---

## 3. Accès horizontal (IDOR / BOLA)

Le propriétaire est porté par la requête SQL (`WHERE owner_id = :caller`),
jamais filtré en mémoire après chargement.

```
Compte B sur la parcelle du compte A :
  GET    /v1/parcels/{id-de-A}  -> 404
  DELETE /v1/parcels/{id-de-A}  -> 404
```

**404 et non 403** : ne pas confirmer l'existence d'une ressource qui ne vous
appartient pas évite l'énumération.

Les identifiants sont des **UUID v4** partout, y compris désormais sur les
tables better-auth (§4.1) : aucun identifiant séquentiel énumérable.

---

## 4. Authentification

### 4.1 Identifiants UUID

Les entités applicatives utilisaient déjà `@PrimaryGeneratedColumn('uuid')`.
Les tables gérées par better-auth (`user`, `session`, `account`,
`verification`) étaient en `text` avec des identifiants non-UUID.

Cause : la CLI better-auth cherche un fichier `auth.ts` à des emplacements
conventionnels ; aucun n'existait, elle générait donc le schéma depuis une
**configuration par défaut** ignorant plugins et options. `back/src/auth.ts` a
été ajouté pour qu'elle charge la vraie configuration.

```
 table   | colonne | type
---------+---------+------
 user    | id      | uuid
 session | id      | uuid
 session | userId  | uuid
 account | id      | uuid
 account | userId  | uuid
```

### 4.2 Cookie de session JWT + révocation

`session.cookieCache` activé : le cookie porte un JWT signé contenant
l'utilisateur et sa session, la majorité des requêtes est authentifiée sans
aller en base.

**La table `session` reste la source de vérité.** C'est délibéré : un JWT pur,
sans état serveur, ne se révoque pas — un compte supprimé resterait utilisable
jusqu'à expiration de son jeton, et le soft delete (§6) n'aurait aucun effet.
Le cache est borné à **5 minutes** pour limiter cette fenêtre.

### 4.3 Attributs de cookie

```
better-auth.session_token   httpOnly=oui
better-auth.session_data    httpOnly=oui   (cache JWT)
```

`sameSite=lax`, `path=/`, et `secure` activé automatiquement en production
(`useSecureCookies`).

### 4.4 Politique de mot de passe

`minPasswordLength: 12` (défaut better-auth : 8).

---

## 5. Validation des entrées

`ValidationPipe` global avec `whitelist`, **`forbidNonWhitelisted`** et
`transform`. Les champs non déclarés sont refusés explicitement plutôt
qu'ignorés en silence — protection contre la sur-affectation :

```bash
curl -X POST /v1/missions -d '{"name":"M","ownerId":"autrui","isAdmin":true}'
→ 400 {"message":["property ownerId should not exist",
                  "property isAdmin should not exist"]}
```

`ParseUUIDPipe` sur les paramètres d'identifiant :

```
GET /v1/parcels/pas-un-uuid -> 400
```

Toutes les entrées passent par un DTO validé, y compris les filtres d'audit et
les champs texte des requêtes multipart.

---

## 6. Suppression de données — soft delete généralisé

`@DeleteDateColumn` sur `RestEntity` : les **9 tables applicatives** portent
`deleted_at`, et TypeORM exclut automatiquement les lignes supprimées de tous
les `find*`. Voir les lignes rouges à connaître en 10.2.

Ressources concernées : parcelles, analyses, missions, profils drone,
utilisateurs — chacune avec `DELETE` et `POST /:id/restore`.

**Exception assumée** : le journal d'audit porte la colonne mais aucun code ne
le supprime. Un registre d'audit effaçable ne prouve rien.

### 6.1 Cas particulier des comptes

Un compte supprimé doit rester identifiable dans l'audit mais ne plus pouvoir
agir. Trois mesures combinées :

1. Profil soft-deleted, statut `inactive`.
2. **Sessions révoquées physiquement** — un jeton est un droit d'accès vivant,
   pas une donnée d'historique.
3. Hook `databaseHooks.session.create.before` : refus de créer une session pour
   un profil supprimé, quelle que soit la voie d'authentification.

Vérification du cycle complet :

```
suppression         -> 200, ligne conservée, status=inactive, deleted_at renseigné
sessions en base    -> 0
ancienne session    -> GET /v1/parcels  403
reconnexion         -> 403 {"message":"Ce compte a été supprimé."}
liste par défaut    -> 1 compte ; ?includeDeleted=true -> 2
restauration        -> 201
reconnexion         -> 200
```

### 6.2 Piège évité : le repli implicite

`resolveProfile` doit lire **`withDeleted: true`**. Sans cela, le profil
supprimé est introuvable, la fonction retombe sur le profil implicite
(`agronome_terrain`, `active`) et **un compte supprimé récupère un rôle
actif**. Le garde refuse désormais explicitement sur `deletedAt !== null`, et
un test couvre ce cas.

### 6.3 Unicité et lignes mortes

Les index uniques sont **partiels** (`WHERE deleted_at IS NULL`) : un profil
drone supprimé n'empêche pas de recréer le même `profile_id`.

```
"IDX_a923f46f08d921731464cee9e9" UNIQUE, btree (user_id) WHERE deleted_at IS NULL
```

---

## 7. Secrets

| Constat | État |
|---|---|
| `CocoaDemo2026!` en clair dans `back/README.md`, `TESTING.md`, `scripts/seed-demo.ts` | **Retiré** — variable `SEED_DEMO_PASSWORD` |
| Seed destructif exécutable sur n'importe quelle base | **Corrigé** — refus si `NODE_ENV != development` ou base non locale |
| `.env` versionnable | **Corrigé** — `.gitignore` + `.env.example` sans valeurs |
| `BETTER_AUTH_SECRET` sans garde-fou | **Corrigé** — compose échoue si absent |

> Un secret commité est un secret compromis. `CocoaDemo2026!` reste dans
> l'historique Git : le retirer du HEAD ne suffit pas si ce mot de passe est
> réutilisé ailleurs.

---

## 8. Dépendances

```
back : found 0 vulnerabilities
web  : found 0 vulnerabilities
```

État initial côté web : **4 vulnérabilités hautes**.

| Paquet | Faille | Résolution |
|---|---|---|
| `next` 16.2.11 | chaîne `postcss` + `sharp` | → 16.3.2 |
| `postcss` | XSS via `</style>` non échappé ; lecture de fichier arbitraire via `sourceMappingURL` | transitif |
| `sharp` <0.35 | CVE-2026-33327/33328/35590/35591 (libvips) | transitif |
| `nanoid` <3.3.18 | boucle infinie si `size = 0` | transitif |

Les formats binaires écrits à la main (ZIP, PDF, Shapefile, DBF) ont été
remplacés par `archiver`, `pdfkit` et `@mapbox/shp-write` : une implémentation
maison d'une spécification n'a ni corpus de test ni suivi de sécurité.

---

## 9. Conteneurisation

| Mesure | Dev | Prod |
|---|---|---|
| Processus non-root (`USER node`) | — | **oui** |
| Base et Redis exposés sur l'hôte | oui | **non** (`expose` seul) |
| Dépendances de développement dans l'image | oui | **non** (`npm ci --omit=dev`) |
| Code source monté | oui | **non** |
| `HEALTHCHECK` | — | oui |
| Secrets injectés par l'environnement | oui | oui |

Les images téléversées vivent sur un volume, jamais dans la couche image.

---

## 10. Points ouverts

### 10.1 Trois manques identifiés, non corrigés

1. **Pas de limitation de débit.** `/v1/auth/sign-in/email` accepte un nombre
   illimité de tentatives : le bourrage d'identifiants est possible. Un
   `ThrottlerGuard` sur les routes d'authentification est le correctif minimal.
2. **Pas d'en-têtes de sécurité HTTP.** Ni CSP, ni `X-Frame-Options`, ni HSTS.
   `helmet` couvre l'essentiel en une ligne.
3. **Type MIME et taille des téléversements non contraints.** `FilesInterceptor`
   accepte n'importe quel fichier, de n'importe quelle taille, et le nom est
   repris tel quel côté stockage.

### 10.2 Lignes rouges du soft delete

Le soft delete crée un mode d'échec silencieux : `withDeleted: true` **ouvre**
l'accès à des lignes censées être invisibles. Toute nouvelle requête qui
l'utilise doit filtrer `deletedAt` explicitement ensuite. À vérifier en revue
sur chaque occurrence.

De même, une ressource soft-deletée n'est pas effacée : pour une demande
d'effacement au titre du RGPD, il faut une purge distincte, qui n'existe pas.

### 10.3 Non testé

La stack a tourné en développement (`synchronize: true`). Les migrations SQL
de production (`back/migrations/`) n'ont **pas** été rejouées sur une base
représentative.
