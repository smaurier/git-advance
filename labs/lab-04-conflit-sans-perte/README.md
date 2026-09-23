# Lab 04 — Intervention : résoudre un conflit sans perdre de travail

> **Outcome :** à la fin, tu as fusionné deux branches qui ont chacune ajouté une
> information légitime et DIFFÉRENTE au même endroit d'un fichier — un VRAI conflit de
> merge, pas simulé — en gardant les DEUX intentions, sans en sacrifier une.
> **Vrai outil :** `git merge`, un conflit RÉEL avec ses marqueurs `<<<<<<<`/`=======`/
> `>>>>>>>`, résolu en éditant le contenu du fichier puis `git add` + `git commit --no-edit`
> pour terminer le merge sans ouvrir d'éditeur.
> **Feedback :** `npm run lab` — RED tant que `src/resolveConflict.mjs` ne satisfait pas
> l'oracle. `npm run solution` prouve l'oracle.

## Prérequis technique

`git` doit être installé. Aucune dépendance npm.

## Lire avant (une lecture bornée)

- Module [`09-workflows-collaboratifs.md`](../../modules/09-workflows-collaboratifs.md) —
  résoudre un conflit de fusion en pratique, ce que git peut et ne peut pas décider à ta
  place.
- Module [`03-merge-vs-rebase.md`](../../modules/03-merge-vs-rebase.md) — pourquoi un
  conflit apparaît (contexte qui se chevauche), pas seulement "deux lignes identiques
  changées".

## Énoncé

L'oracle prépare un historique RÉEL : `main` et `feature/notifications` partent du même
`family-settings.mjs` (`familyName`, `locale`). Chaque branche ajoute ensuite, **au même
endroit du fichier**, une clé différente et tout aussi légitime — `timezone` sur `main`,
`notificationChannel` sur `feature/notifications`.

Lis les commentaires en tête de `src/resolveConflict.mjs`. Fusionne `feature/notifications`
dans `main`. Le merge VA échouer avec un conflit réel : résous-le en gardant les DEUX
clés, sans rien perdre ni écraser l'une par l'autre.

**Le piège à éviter.** Choisir un camp (`git checkout --ours` ou `--theirs` sans réflexion)
résout le conflit techniquement mais PERD une des deux fonctionnalités — c'est exactement
le geste que ce lab interdit. Les deux ajouts sont corrects ; la résolution correcte les
garde tous les deux.

## Étapes (en friction)

1. `npm run lab` : RED.
2. `git merge feature/notifications` échoue (conflit réel).
3. Le fichier contient les marqueurs des deux côtés — lis-le (`readFileSync`), écris la
   version qui garde les deux clés (`writeFileSync`).
4. `git add family-settings.mjs`, puis `git commit --no-edit` (git a déjà préparé le
   message de fusion, pas besoin d'éditeur).

## Vérifier

```bash
cd 07-git-avance/labs/lab-04-conflit-sans-perte
npm run lab
npm run solution
```

**Ce que l'oracle vérifie**

`resolveConflict` s'exécute sans erreur ; le dépôt est propre après résolution (pas de
merge résiduel, rien à committer) ; `feature/notifications` est bien un ancêtre de `main`
(vrai merge, pas un contournement type cherry-pick) ; aucun marqueur de conflit ne subsiste
dans le fichier final ; `timezone` ET `notificationChannel` sont tous les deux présents ;
`familyName` et `locale`, jamais touchés par le conflit, n'ont pas non plus disparu.

## Variante J+30 (fading)

Cette fois, le conflit porte sur TROIS branches à fusionner successivement dans `main`,
chacune ajoutant sa propre clé au même endroit — la résolution doit accumuler les trois
sans qu'aucune n'écrase les précédentes déjà mergées.

## Application TribuZen

Même geste sur une VRAIE PR `tribuzen-api` en conflit avec `main` après qu'un collègue a
mergé entre-temps : conflit résolu en préservant les deux features, jamais par un
`--ours`/`--theirs` réflexe. Commit :
`docs(git): conflit de fusion résolu, les deux fonctionnalités préservées`.
