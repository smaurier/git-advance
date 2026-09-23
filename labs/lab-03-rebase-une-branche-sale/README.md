# Lab 03 — Intervention : nettoyer un historique sale avec `git rebase -i`

> **Outcome :** à la fin, tu as transformé, par un VRAI rebase interactif AUTOMATISÉ (pas un
> nouveau commit qui écrase le contenu à la main — un vrai `git rebase -i` piloté sans
> éditeur), une branche `feature/messy` à 4 commits WIP en une branche à UN SEUL commit,
> message clair, sans perdre une ligne de travail.
> **Vrai outil :** `git rebase -i <base>` piloté via `GIT_SEQUENCE_EDITOR` (réécrit le TODO :
> `pick`/`squash`) et `GIT_EDITOR` (accepte le message combiné), puis `git commit --amend`
> pour le message final.
> **Feedback :** `npm run lab` — RED tant que `src/cleanHistory.mjs` ne satisfait pas
> l'oracle. `npm run solution` prouve l'oracle.

## Prérequis technique

`git` doit être installé, avec `sed` disponible dans le PATH (Git Bash sur Windows —
`GIT_SEQUENCE_EDITOR` invoque un shell). Aucune dépendance npm.

## Lire avant (une lecture bornée)

- Module [`04-rebase-interactif.md`](../../modules/04-rebase-interactif.md) —
  `rebase -i`, squash, réécriture de messages, pourquoi une PR ne montre jamais un
  historique de brouillon.

## Énoncé

L'oracle prépare un historique RÉEL : `main` a 1 commit, `feature/messy` en part avec 4
commits WIP sur `invite-form.mjs` — `"wip"`, `"wip 2"`, `"fix"`, `"actually done"` — chacun
modifiant le fichier un peu plus.

Lis les commentaires en tête de `src/cleanHistory.mjs`. Utilise un VRAI `git rebase -i`
pour compacter ces 4 commits en un seul, avec un message clair, SANS perdre le contenu
final du fichier.

**Le piège à éviter.** Faire `git reset --soft <base>` puis un nouveau `commit` obtiendrait
un historique propre en apparence — mais ce n'est pas la même opération que `rebase -i`
(le sujet du module), et ça ne generalise pas à un cas où tu voudrais squasher SEULEMENT
certains commits au milieu d'un historique plus long. Le geste du lab est de piloter le
VRAI `rebase -i` sans jamais ouvrir un éditeur interactif.

## Étapes (en friction)

1. `npm run lab` : RED.
2. `git rebase -i <base>` ouvre normalement un éditeur pour choisir les verbes
   (`pick`/`squash`/...), PUIS un second éditeur pour fusionner les messages. Pilote les
   deux sans jamais ouvrir d'éditeur réel :
   - `GIT_SEQUENCE_EDITOR` : un script qui réécrit le fichier TODO reçu en argument — garde
     `pick` sur la première ligne, passe toutes les suivantes en `squash`.
   - `GIT_EDITOR=true` : accepte tel quel le message combiné généré par défaut (volontairement
     pas propre à ce stade).
3. `git commit --amend -m "..."` pour remplacer le message combiné par un message clair,
   sans toucher au contenu déjà squashé.

## Vérifier

```bash
cd 07-git-avance/labs/lab-03-rebase-une-branche-sale
npm run lab
npm run solution
```

**Ce que l'oracle vérifie**

`cleanHistory` s'exécute sans erreur ; `feature/messy` a EXACTEMENT un commit au-dessus de
`main` (contre 4 avant nettoyage) ; le message final ne contient plus "wip", "fix" ni
"actually" (peu importe la casse) ; le contenu final de `invite-form.mjs` est IDENTIQUE à
ce qu'il était avant le nettoyage — aucun travail perdu dans le squash.

## Variante J+30 (fading)

Cette fois, garde le PREMIER commit ("wip") séparé des trois autres (squash uniquement les
commits 2 à 4) — le TODO doit distinguer plus finement que "tout sauf le premier".

## Application TribuZen

Même geste sur une VRAIE branche de travail `tribuzen-api` avant ouverture de PR : squash
d'un historique de brouillon en un commit unique, message au format conventionnel. Commit :
`docs(git): historique de feature nettoyé par rebase interactif avant revue`.
