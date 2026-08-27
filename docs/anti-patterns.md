# À ne pas faire — anti-patterns

Liste des pratiques refusées en revue. Chaque entrée : le symptôme, pourquoi
c'est un problème, quoi faire à la place.

---

## Sécurité

**Contrôle d'accès côté client uniquement.**
Un middleware front, un `if (role === 'admin')` dans un composant, un bouton
masqué. Contourné par un simple appel `curl`. → L'autorisation est un guard
serveur sur l'endpoint ; le front ne fait que refléter la décision.

**Filtrer par propriétaire après la requête.**
Charger toutes les lignes puis `filter()` en mémoire. Fuite si le filtre est
oublié, et lecture inutile. → Le propriétaire est dans le `WHERE`.

**Faire confiance à une entrée non validée.**
`@Query('x') x: string` utilisé tel quel, body sans DTO, `JSON.parse` d'un champ
brut. → DTO + validation à la frontière.

**Secrets dans le dépôt.**
Mot de passe de démo dans un README ou un script de seed, clé d'API, URL de base
privée. Un secret commité est un secret compromis. → Variables d'environnement,
gestionnaire de secrets, `.env.example` sans valeur.

**Endpoint sans contrôle qui expose les données de tous les utilisateurs.**
Typiquement un journal d'audit, une liste d'utilisateurs, une facette
« distinct emails ». → Vérifier explicitement le rôle *et* le périmètre.

**Message d'erreur bavard.**
Chemin de fichier, requête SQL, identifiant interne, données d'un tiers
renvoyés au client. → Message générique côté client, détail dans les logs.

## Architecture

**Logique métier dans le contrôleur.** → Service.

**SQL brut dans un service** alors qu'un repository typé existe, surtout avec
des noms de colonnes écrits à la main : ça casse silencieusement au premier
renommage. → Repository et API typée de l'ORM.

**Préoccupation transverse enfilée dans les signatures.**
`method(id, ownerId, dto, actor?, ip?, logger?)`. → Guard / interceptor /
decorator.

**Paramètre optionnel qui active un comportement.**
`actor?: Actor` où l'audit ne se produit que si l'appelant y pense : le
comportement dépend du site d'appel, donc il sera oublié quelque part. → Rendre
le comportement systématique et non contournable.

**Abstraction spéculative.**
Interface à une seule implémentation, factory pour un seul produit, couche de
configuration pour une valeur qui ne change jamais, hook générique utilisé une
fois. → Écrire le cas concret ; abstraire au deuxième usage réel.

**Réécrire à la main un format binaire ou un protocole standard.**
ZIP, PDF, Shapefile, CSV, JWT, chiffrement. Des centaines de lignes non testées
qui échoueront sur l'encodage, la taille, ou un lecteur strict. → Bibliothèque
éprouvée. Si la dépendance est refusée, la décision est documentée et le code
est testé contre des fichiers de référence.

**Copier-coller d'une logique métier.**
Le même seuil, le même calcul, la même règle dans le back, le front et un
script. Ils divergeront. → Une seule définition, partagée ou exposée par l'API.

**Construire une configuration puis l'ignorer.**
Des seuils paramétrables stockés en base pendant que le calcul utilise des
constantes en dur. → Soit on lit la configuration, soit on ne la crée pas.

## Données

**Requête N+1.** Une requête par élément dans une boucle. → Jointure,
`relations`, ou chargement groupé.

**Liste non bornée.** `findAll()` sans pagination ni limite. → Pagination, ou
limite explicite et documentée.

**Écriture dans une lecture.** Un `GET` qui crée une ligne « si elle n'existe
pas » : effet de bord invisible, et course entre deux requêtes concurrentes qui
viole la contrainte d'unicité. → Créer à l'inscription, ou `upsert` atomique.

**Modification de schéma sans migration**, ou migration non idempotente, ou qui
ne peut pas être rejouée. → Migration versionnée, idempotente, avec rollback.

**Script destructif dans le dépôt sans garde-fou.**
Un seed qui `DELETE` avant d'insérer, exécutable par erreur sur un
environnement partagé. → Garde explicite sur l'environnement, et refus si la
base n'est pas locale.

**Suppression en cascade implicite** non voulue, ou suppression sans
transaction laissant des données orphelines. → Cascade explicite, transaction.

## Performance et robustesse

**Travail long dans le cycle HTTP.** Export, génération de PDF, traitement
d'images en synchrone : timeout de la passerelle, requête impossible à
reprendre. → File d'attente + téléchargement du résultat.

**Tout charger en mémoire.** Lire N fichiers, concaténer des buffers,
construire une archive complète en RAM. → Flux.

**Requêtes en série évitables** (deux `await` indépendants l'un après
l'autre). → `Promise.all`.

**`catch` vide.** L'échec disparaît. → Traiter, ou remonter, ou commenter
explicitement pourquoi l'ignorer est correct.

**Promesse non attendue** (`floating promise`) : l'erreur devient un rejet non
géré. → `await` ou `void` explicite avec gestion.

## Lisibilité et hygiène

**Supprimer les commentaires et la documentation existants** en passant. C'est
une perte d'information nette, invisible en review si le diff est gros. →
Mettre à jour, ne pas effacer.

**Fichier généré, temporaire ou personnel commité.** `.DS_Store`, `.idea/`,
`dist/`, `*.log`, dumps, captures. → `.gitignore`.

**Script jetable laissé à la racine**, en JavaScript dans un projet
TypeScript, avec des URL en dur. → `scripts/`, typé, paramétré, ou pas commité.

**Code mort.** Fonction non appelée, export inutilisé, fichier de
ré-export vide, code commenté « au cas où ». Git est l'historique. → Supprimer.

**Nombres magiques** et chaînes littérales dupliquées. → Constantes nommées.

**Mélange de langues** dans les identifiants, les messages ou les commentaires
d'un même fichier. → Une convention, appliquée partout.

**Formatage non appliqué.** Lignes de 200 caractères, doubles lignes vides,
imports désordonnés, fichier sans saut de ligne final. Ça pollue tous les diffs
suivants. → Lancer le formateur ; le linter est bloquant en CI.

**`TODO` sans ticket.** Il ne sera jamais fait. → Ticket, ou suppression.

**Renommage massif mélangé à un changement fonctionnel.** Le diff devient
illisible et le vrai changement passe inaperçu. → Deux PR.

## Tests

**Aucun test sur une logique de calcul, de sécurité ou de parsing.** → Au
minimum un test qui échoue si la règle casse.

**Test qui teste le mock.** → Tester le comportement observable.

**Test dépendant de l'horloge, de l'ordre, ou du réseau.** → Injecter le temps,
isoler.

## Processus

**PR fourre-tout.** Frontend + backend + migrations + suppression de
fonctionnalité + dépendances, des milliers de lignes. Personne ne peut la
revoir sérieusement. → Découper.

**Supprimer une fonctionnalité au passage** sans que ce soit dans la
description, sans migration de nettoyage, sans vérifier les consommateurs
(mobile, scripts). → Changement explicite, annoncé, vérifié.

**Modifier le code d'autrui pour aligner le style** dans une PR fonctionnelle.
→ PR dédiée.

---

## Annexe A — Les trois anti-patterns qui coûtent le plus cher

### A.1 Autorisation portée par le middleware / le client

C'est **API1:2023 — Broken Object Level Authorization (BOLA)**, en tête du
classement OWASP API depuis 2019 et impliqué dans environ **40 % des attaques
d'API**. Même famille côté web : **A01:2021 — Broken Access Control**, risque
n°1 du Top 10 OWASP.

Le cas Next.js est documenté par une CVE : **CVE-2025-29927** (CVSS 9.1,
mars 2025). Le framework faisait aveuglément confiance à l'en-tête
`x-middleware-subrequest` ; un attaquant qui le forge fait **sauter
intégralement l'exécution du middleware** — donc toute vérification de session
ou de rôle qui y était logée. Versions corrigées : 12.3.5, 13.5.9, 14.2.25,
15.2.3.

Ce qu'il faut en retenir, indépendamment de la CVE : *le middleware est une
optimisation d'UX (rediriger tôt), jamais une frontière de sécurité.* La
protection vit au plus près de la donnée : guard serveur sur l'endpoint +
filtre de propriété dans la requête.

Symptômes à chercher en review :
- une table de permissions rôle → pages définie côté front, et aucun
  équivalent côté API ;
- un endpoint qui prend un identifiant et ne vérifie que l'authentification ;
- un `GET /admin/...` accessible en `curl` avec un cookie d'utilisateur
  standard.

### A.2 La PR non revisable

Au-delà de ~400 lignes, la capacité de détection de défauts s'effondre
(SmartBear/Cisco) ; au-delà de 500 LOC/h ou 90 minutes de session, elle
s'écroule. Une PR de plusieurs milliers de lignes mélangeant back, front,
migrations et suppression de fonctionnalité ne produit pas une review : elle
produit une signature.

Ce n'est pas un problème de process, c'est un problème de risque : les défauts
non détectés partent en production.

### A.3 La réimplémentation d'un standard

Format binaire (ZIP, PDF, Shapefile, DBF), protocole (JWT, OAuth), primitive de
sécurité (hachage, chiffrement), parseur (CSV, XML). Le code « marche » sur le
fichier de test de l'auteur et casse sur : l'encodage non-ASCII, la taille au
delà de 4 Go, un lecteur strict, un caractère d'échappement, une locale.

Coût réel : la maintenance d'une implémentation partielle d'une spécification
que personne dans l'équipe ne connaît, sans corpus de test.

À la place : bibliothèque éprouvée. Si elle est écartée, la décision est
écrite, la portée supportée est documentée, et des tests contre des fichiers de
référence existent.

## Annexe B — Checklist de refus rapide

Une PR touchée par l'un de ces points repart sans review détaillée :

- [ ] Contrôle d'accès uniquement côté client / middleware
- [ ] Endpoint qui expose des données d'autres utilisateurs sans vérification
- [ ] Secret, mot de passe ou jeton commité
- [ ] Entrée externe non validée atteignant la couche métier
- [ ] Migration absente pour un changement de schéma
- [ ] Script destructif sans garde d'environnement
- [ ] CI rouge
- [ ] Diff sans rapport avec la description
- [ ] Documentation ou commentaires existants supprimés sans raison
- [ ] Fichiers générés / personnels commités (`.DS_Store`, `.idea/`, `dist/`)

## Références

- [OWASP API Security Top 10:2023 — API1 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API Security Top 10:2023 — sommaire](https://owasp.org/API-Security/editions/2023/en/0x00-toc/)
- [OWASP Top 10:2021 — A01 Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/)
- [CVE-2025-29927 — Next.js middleware authorization bypass (JFrog)](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/)
- [CVE-2025-29927 — analyse technique (ProjectDiscovery)](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [CVE-2025-29927 — Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [SmartBear — Best Practices for Peer Code Review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [Martin Fowler — Code Smell](https://martinfowler.com/bliki/CodeSmell.html)
