# Design de code — bonnes pratiques

Ce que l'on attend d'un code jugé « bien conçu » dans ce dépôt. Les exemples
sont en TypeScript (NestJS côté back, Next.js côté web) mais les principes sont
indépendants du langage.

---

## 1. Principe directeur : écrire le moins de code possible

Avant d'écrire quoi que ce soit, dans l'ordre :

1. Ce besoin existe-t-il vraiment aujourd'hui ? Sinon, ne pas l'écrire.
2. Existe-t-il déjà dans la base de code ? Le réutiliser.
3. La bibliothèque standard le fait-elle ? L'utiliser.
4. Une capacité native de la plateforme le fait-elle (contrainte SQL, `<input
   type="date">`, CSS) ? L'utiliser.
5. Une dépendance déjà installée le fait-elle ? L'utiliser.
6. Sinon, écrire le minimum qui fonctionne.

Le code le plus fiable est celui qui n'existe pas. La suppression est un
livrable au même titre que l'ajout.

## 2. Responsabilité unique et bonne altitude

Chaque unité a une raison de changer, et une seule.

**Back (NestJS)** — la répartition est stricte :

| Couche | Responsabilité | Ne fait jamais |
|---|---|---|
| Controller | HTTP : route, DTO, extraction de session, code de retour | logique métier, accès base |
| Service | Règles métier, orchestration, transactions | parsing HTTP, SQL brut |
| Repository | Accès aux données, requêtes typées | décision métier |
| Entity | Forme persistée | logique applicative |
| DTO | Contrat d'entrée validé | logique |

Un contrôleur qui calcule, un service qui lit `request.ip`, un repository qui
lève une `ForbiddenException` : trois signes que l'altitude est mauvaise.

**Web (Next.js)** — un composant est soit de présentation, soit de données.
Un fichier de page qui dépasse ~200 lignes contient presque toujours plusieurs
composants et un hook qui demandent à être extraits.

## 3. Les préoccupations transverses passent par l'infrastructure

Authentification, autorisation, audit, journalisation, métriques, transactions,
traduction d'erreur : ce sont des **guards, interceptors, decorators,
middlewares**. Jamais des paramètres supplémentaires enfilés dans chaque
signature de service.

Test : si l'ajout d'une fonctionnalité transverse fait grossir la signature de
dix méthodes métier, c'est qu'elle est au mauvais endroit.

## 4. Rendre les états impossibles impossibles

- Types unions et enums plutôt que `string` libre pour un ensemble fermé de
  valeurs.
- Pas de `any`. `unknown` + validation à la frontière.
- Un objet doit être valide dès sa construction ; pas de champ « rempli plus
  tard ».
- Le typage vient de la source de vérité (entité, schéma) et se propage ;
  on ne redéclare pas la même forme dans trois fichiers.

## 5. Frontières et validation

- Toute donnée qui franchit une frontière (HTTP, fichier, file d'attente,
  variable d'environnement) est validée à l'entrée, une fois, puis circule
  typée.
- Les erreurs remontent avec leur sens métier (`NotFoundException`,
  `BadRequestException`), pas en `500` générique ni en `null` silencieux.
- Ne jamais avaler une erreur. Si un `catch` est vide, il porte un commentaire
  qui explique pourquoi l'échec est acceptable.

## 6. Nommage

- Le nom dit **ce que ça fait**, pas comment. `findParcelsForOwner`, pas
  `getData2`.
- Booléens préfixés (`is`, `has`, `should`).
- Pas d'abréviation non standard du domaine.
- Cohérence de langue : une seule langue pour le code et les identifiants
  (anglais), une seule pour les messages utilisateur (français ici). Pas de
  mélange à l'intérieur d'une même catégorie.
- Une valeur littérale répétée ou porteuse de sens métier (seuil, délai,
  limite) est une constante nommée, définie une seule fois.

## 7. Fonctions

- Une fonction tient à l'écran. Au-delà, elle enchaîne des étapes qui méritent
  des noms.
- Sortie anticipée (`guard clauses`) plutôt qu'imbrication.
- Pas plus de trois paramètres positionnels ; au-delà, un objet nommé.
- Pas de paramètre booléen qui change le comportement : deux fonctions.
- Pure quand c'est possible : entrée → sortie, sans effet de bord caché. Les
  effets (I/O, écriture) sont regroupés et visibles.

## 8. Données et persistance

- Le filtrage, le tri et la pagination se font en base, pas en mémoire.
- Toute liste exposée par une API est paginée ou explicitement bornée.
- Une colonne utilisée dans un `WHERE` ou un `ORDER BY` fréquent est indexée.
- Une migration est fournie avec toute modification de schéma, elle est
  idempotente et réversible.
- Une lecture ne modifie pas l'état. Un `GET` qui écrit est un bug de design.
- Les écritures liées sont dans une transaction.

## 9. Travail long et volumineux

- Toute opération dont la durée croît avec les données (export, import,
  génération de rapport, inférence) sort du cycle requête/réponse : file
  d'attente, job, streaming.
- Ne jamais charger l'intégralité d'un jeu de données ou d'un fichier en
  mémoire quand un flux est possible.
- Les limites (taille, nombre, durée) sont explicites et testées.

## 10. Tests

- Toute logique non triviale (branche, boucle, parsing, calcul, argent,
  sécurité) laisse **au moins un test** qui échoue si elle casse.
- On teste le comportement observable, pas l'implémentation.
- Un bug corrigé arrive avec le test qui le reproduisait.
- Pas de test qui dépend de l'horloge, du réseau ou de l'ordre d'exécution.

## 11. Commentaires et documentation

- Le commentaire explique le **pourquoi** : contrainte, arbitrage, piège.
- Le *quoi* est porté par le nom ; si un commentaire est nécessaire pour
  comprendre ce que fait la ligne, renommer.
- La documentation existante ne se supprime pas au passage d'une modification :
  elle se met à jour.
- Un raccourci assumé porte un commentaire qui nomme la limite et la voie de
  sortie (`// limite : chargement intégral en mémoire, passer en flux au-delà
  de ~10k lignes`).

## 12. Cohérence

Le code nouveau ressemble au code voisin : mêmes conventions de nommage, même
structure de dossiers, même densité de commentaires, mêmes utilitaires. Une
divergence de style se discute dans une PR dédiée, pas au détour d'une feature.

## 13. Le pipeline NestJS : mettre chaque chose à sa place

NestJS impose un ordre d'exécution qu'il faut connaître pour placer
correctement une préoccupation :

```
Middleware → Guards → Interceptors (avant) → Pipes → Handler
          → Interceptors (après) → Exception Filters
```

| Besoin | Mécanisme | Pas dans |
|---|---|---|
| « cet appelant a-t-il le droit ? » | **Guard** | le service, le contrôleur |
| valider / transformer l'entrée | **Pipe** + DTO | le service |
| journaliser, auditer, mesurer, mettre en cache, formater la réponse | **Interceptor** | chaque méthode métier |
| traduire une exception en réponse HTTP | **Exception Filter** | des `try/catch` dispersés |
| lire un attribut de la requête (IP, user-agent, session) | **Decorator de paramètre** | un `@Req()` propagé dans les services |

Configuration attendue du `ValidationPipe` global :

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // retire les champs non déclarés dans le DTO
    forbidNonWhitelisted: true, // et refuse la requête qui en contient
    transform: true,            // instancie le DTO et convertit les types
  }),
);
```

`whitelist` seul protège contre la sur-affectation (*mass assignment*) ;
`forbidNonWhitelisted` rend l'erreur explicite au lieu de la silencier.

Règle d'or : **un contrôleur mince, un service ignorant du HTTP.** Si un
service a besoin de l'IP, de l'en-tête ou de l'objet `Request`, la
préoccupation est mal placée.

## 14. Autorisation : le modèle attendu

Aligné sur OWASP A01:2021 et API1:2023 (BOLA) :

1. **Deny by default.** Sauf ressource explicitement publique, tout est refusé
   par défaut. Un endpoint sans garde déclarée doit être rejeté par la
   configuration, pas ouvert.
2. **Vérification au niveau de l'objet, pas seulement de la route.** Être
   authentifié et avoir le rôle « lecteur » ne donne pas accès à *cet*
   enregistrement. Chaque endpoint qui reçoit un identifiant vérifie que
   l'appelant a le droit sur *cet objet précis*.
3. **Propriété portée par la requête.** `WHERE owner_id = :caller` ; jamais un
   filtrage post-chargement.
4. **Mécanisme unique et réutilisé.** Une implémentation d'autorisation,
   appliquée partout, plutôt qu'une règle réécrite par endpoint.
5. **Moindre privilège.** Le rôle par défaut est le moins capable.
6. **Côté serveur, toujours.** Le front reflète la décision, il ne la prend
   pas (voir `anti-patterns.md`, CVE-2025-29927).

## 15. Détecter les problèmes de design : la taxonomie des *code smells*

Vocabulaire commun issu du catalogue de Fowler & Beck (*Refactoring*, 2ᵉ éd.).
Un *smell* n'est pas une faute en soi, c'est un indice de surface qui signale
souvent un problème plus profond — il justifie de regarder, pas de refuser.

| Famille | Ce que ça sent | Exemples |
|---|---|---|
| **Bloaters** | le code a grossi sans qu'on le redécoupe | Long Method, Large Class, Long Parameter List, Primitive Obsession, Data Clumps |
| **Object-Orientation Abusers** | la structure objet est détournée | Switch Statements, Refused Bequest, Temporary Field, Alternative Classes with Different Interfaces |
| **Change Preventers** | un changement en impose dix autres | Divergent Change, Shotgun Surgery, Parallel Inheritance Hierarchies |
| **Dispensables** | ça n'apporte rien | Duplicated Code, Dead Code, Speculative Generality, Lazy Class, Comments (qui compensent un mauvais nom) |
| **Couplers** | les modules se connaissent trop | Feature Envy, Inappropriate Intimacy, Message Chains, Middle Man |

Les deux à traquer en priorité ici :

- **Shotgun Surgery** — ajouter une préoccupation oblige à modifier dix
  fichiers. Signe qu'elle doit devenir transverse (§3, §13).
- **Speculative Generality** — abstraction construite pour un besoin
  hypothétique. À supprimer (§1).

## 16. Références

- [NestJS — Guards](https://docs.nestjs.com/guards) · [Pipes](https://docs.nestjs.com/pipes) · [Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS — Validation (`ValidationPipe`, `whitelist`, `forbidNonWhitelisted`)](https://docs.nestjs.com/techniques/validation)
- [OWASP Top 10:2021 — A01 Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/)
- [OWASP API Security Top 10:2023 — API1 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [Martin Fowler — Code Smell](https://martinfowler.com/bliki/CodeSmell.html)
- [Catalogue de code smells](https://luzkan.github.io/smells/)
- [Google — What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
