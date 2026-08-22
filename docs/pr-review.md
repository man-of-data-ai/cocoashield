# Revue de Pull Request — règles

Grille de référence pour toute PR du monorepo. Une PR qui viole une règle
**bloquante** n'est pas mergée, quelle que soit l'urgence.

---

## 1. Forme de la PR

| Règle | Niveau |
|---|---|
| Une PR = un objectif. Pas de mélange feature + refacto + fix + config | bloquant |
| ≤ 400 lignes modifiées (hors lockfiles, migrations générées, assets) — seuil issu de l'étude SmartBear/Cisco | bloquant au-delà de ~800 |
| Titre au format `type(scope): description` (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`) | bloquant |
| Description : **pourquoi** (contexte, ticket), **quoi** (résumé du changement), **comment tester** | bloquant |
| Branche nommée `{ticket}--{description-courte}` | bloquant |
| CI verte (build + lint + types + tests) avant demande de review | bloquant |
| Screenshots / vidéo pour tout changement d'UI | requis |
| Auto-review faite par l'auteur avant d'assigner un reviewer | requis |

Si la PR dépasse la taille cible, elle se découpe : socle technique → domaine →
UI. Une PR de 8 000 lignes n'est pas revue, elle est approuvée par fatigue.

## 2. Ce que le reviewer vérifie, dans cet ordre

L'ordre compte : inutile de commenter le nommage d'une fonction qui ne devrait
pas exister.

1. **Périmètre** — le diff correspond-il à la description ? Tout fichier hors
   sujet est un motif de renvoi.
2. **Sécurité** — authn/authz, ownership, validation des entrées, secrets,
   injection, exposition de données d'autres utilisateurs.
3. **Correction** — la logique fait-elle ce qu'elle prétend ? Cas limites :
   liste vide, `null`, concurrence, doublons, échec partiel.
4. **Données** — migrations réversibles, compatibilité ascendante,
   index sur les colonnes filtrées, pas de requête N+1.
5. **Architecture** — la responsabilité est-elle au bon endroit (contrôleur /
   service / repository / UI) ? Le code réutilise-t-il l'existant ?
6. **Simplicité** — peut-on supprimer du code ? Une dépendance déjà installée
   ou la stdlib font-elles le travail ?
7. **Tests** — le comportement non trivial ajouté est-il couvert ?
8. **Lisibilité** — nommage, taille des fonctions, commentaires qui expliquent
   le *pourquoi*.
9. **Style** — formatage, imports. Dernier, et idéalement automatisé.

## 3. Règles de sécurité non négociables

- L'autorisation est appliquée **côté serveur**. Une garde côté client
  (middleware Next.js, masquage de bouton) est un confort d'UX, jamais un
  contrôle d'accès.
- Toute ressource appartenant à un utilisateur est filtrée par le propriétaire
  dans la requête, pas après coup en mémoire.
- Toute entrée externe (body, query, param, header, fichier) est validée par un
  DTO typé avant d'atteindre la couche métier.
- Aucun secret, mot de passe, jeton ou URL privée dans le dépôt — même « de
  démo », même en README.
- Aucun message d'erreur ne divulgue de structure interne ou de données d'un
  autre utilisateur.

## 4. Classification des commentaires

Le reviewer préfixe chaque commentaire :

- **`bloquant:`** — doit être corrigé avant merge (sécurité, bug, perte de
  données, violation d'architecture).
- **`question:`** — je n'ai pas compris ; la réponse peut lever le point ou le
  transformer en bloquant.
- **`suggestion:`** — améliorerait le code, l'auteur décide.
- **`nit:`** — cosmétique, non bloquant, à ignorer sans justification.

Un commentaire sans préfixe est lu comme bloquant. Un reviewer qui n'a que des
`nit:` n'a pas revu la PR.

## 5. Règles pour le reviewer

- Critiquer le code, jamais l'auteur. « cette fonction fait deux choses », pas
  « tu as mal découpé ».
- Toute critique s'accompagne d'une alternative concrète ou d'une question.
- Ne pas exiger un changement de goût personnel comme s'il s'agissait d'une
  norme. Si la norme existe, la citer ; sinon c'est une `suggestion:`.
- Approuver dès qu'il ne reste que des `nit:` — l'auteur les traite ou non.
- Délai cible : première passe sous 24 h ouvrées.

## 6. Règles pour l'auteur

- Répondre à **chaque** commentaire (corrigé / répondu / refusé avec raison).
- Ne jamais force-push après le début de la review : pousser des commits
  additionnels pour que le reviewer voie l'incrément, squash au merge.
- Un désaccord non résolu en deux allers-retours passe en discussion synchrone,
  pas en fil de 15 commentaires.
- Ne pas merger sa propre PR sans approbation.

## 7. Critères de merge

- [ ] Au moins une approbation d'un mainteneur du domaine touché.
- [ ] Zéro commentaire `bloquant:` ouvert.
- [ ] CI verte sur le dernier commit.
- [ ] Migrations testées sur une base représentative, plan de rollback connu.
- [ ] Pas de `TODO` non tracké, pas de code commenté, pas de fichier de debug.

## 8. Le standard d'approbation

Repris de la référence publique de Google (`eng-practices`) :

> Un reviewer doit approuver une PR dès lors qu'elle **améliore l'état de santé
> global du code**, même si elle n'est pas parfaite.

Conséquences pratiques :

- Le code parfait n'existe pas, seulement du code meilleur. On n'exige pas le
  polissage de chaque détail avant d'approuver.
- Un reviewer **n'impose jamais son style personnel**. Si l'auteur montre que
  plusieurs approches se valent, la préférence de l'auteur l'emporte.
- Le reviewer peut toujours bloquer sur : sécurité, correction, perte de
  données, dette structurelle introduite. Jamais sur le goût.
- La latence de review dégrade la productivité de toute l'équipe de façon non
  linéaire. Cible Google : première réponse **sous un jour ouvré**.

Axes de lecture recommandés par Google, dans l'ordre : *design, fonctionnalité,
complexité, tests, nommage, commentaires, style, documentation*.

## 9. Ce que dit la recherche sur la taille et le rythme

L'étude SmartBear menée chez Cisco donne des seuils chiffrés qui justifient les
règles du §1 :

| Mesure | Valeur | Effet si dépassé |
|---|---|---|
| Taille d'une revue | **200 à 400 LOC** | au-delà de 400 LOC, la capacité à trouver des défauts s'effondre |
| Rythme d'inspection | **< 300 LOC/h** idéal, < 500 LOC/h acceptable | au-delà de 500 LOC/h, la densité de défauts détectés chute nettement |
| Durée d'une session | **60 min**, 90 min maximum | au-delà de 90 min, le taux de détection s'écroule |
| Rendement attendu | **70 à 90 %** des défauts sur 200–400 LOC en 60–90 min | — |

Lecture : une PR de plusieurs milliers de lignes n'est pas « longue à revoir »,
elle est **non revisable**. L'approbation obtenue est alors un artefact social,
pas un contrôle qualité. Le découpage n'est pas une politesse envers le
reviewer, c'est la condition pour que la review détecte quelque chose.

Corollaires opérationnels :
- Plusieurs sessions courtes plutôt qu'une longue.
- L'auteur qui annote lui-même son diff (commentaires guidés sur les passages
  délicats) augmente le taux de détection.
- Une checklist explicite (celle du §2) vaut mieux que la vigilance libre.

## 10. Convention de commit

Format `Conventional Commits v1.0.0` :

```
<type>[scope optionnel][!]: <description>

[corps optionnel]

[footer optionnel, ex. BREAKING CHANGE: ...]
```

- Types normalisés par la spécification : `feat` (MINOR) et `fix` (PATCH).
  Également admis ici : `build`, `chore`, `ci`, `docs`, `style`, `refactor`,
  `perf`, `test`.
- Un changement cassant se signale par `!` avant les deux-points
  (`feat!: ...`) et/ou un footer `BREAKING CHANGE: ...`.
- Description à l'impératif, en minuscule, sans point final.
- Le commit décrit l'intention, pas le fichier touché.

## 11. Références

- [Google — The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [google/eng-practices (dépôt)](https://github.com/google/eng-practices/blob/master/review/reviewer/standard.md)
- [SmartBear — Best Practices for Peer Code Review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [SmartBear/Cisco — 11 Best Practices for Peer Code Review (PDF)](https://static1.smartbear.co/support/media/resources/cc/11_best_practices_for_peer_code_review_redirected.pdf)
- [Les PR de 1 000 lignes produisent plus de bugs](https://tekin.co.uk/2020/05/proof-your-thousand-line-pull-requests-create-more-bugs)
- [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [OWASP Top 10:2021 — A01 Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/)
