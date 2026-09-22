# Lab 01 — Stratégie de branches de zéro, sur un vrai dépôt

> **Outcome :** à la fin, tu as appliqué GitHub Flow (module 02) à un scénario réaliste —
> deux features en cours, un hotfix qui tombe au milieu — sur un VRAI dépôt git scratch, pas
> une simulation. Tu sais pourquoi un hotfix doit TOUJOURS partir de `main`, jamais d'une
> branche de feature en cours, même si c'est là que tu es physiquement positionné.
> **Vrai outil :** `git` (le vrai binaire), un dépôt jetable créé dans un dossier temporaire
> à chaque run. La preuve n'est pas "le log a l'air bon" — c'est de la vraie plomberie git
> (`merge-base --is-ancestor`, `rev-parse`, `cat-file`) qui vérifie la topologie exacte.
> **Feedback :** `npm run lab` — RED tant que `src/plan.mjs` ne satisfait pas l'oracle.
> `npm run solution` prouve l'oracle.

## Prérequis technique

`git` doit être installé et accessible (`git --version`). Aucune dépendance npm.

## Lire avant (une lecture bornée)

- Module [`02-strategies-branching.md`](../../modules/02-strategies-branching.md) — GitHub
  Flow, `main` déployable, branches de feature courtes, où le hotfix se branche.

## Énoncé

Lis les commentaires en tête de `src/plan.mjs` : le scénario exact (deux features, un
hotfix, l'ordre des opérations) et le contrat de `run`/`commitFile` y sont décrits.

**Le piège à éviter — vécu, pas juste raconté.** En construisant ce lab, la version buggée
la plus réaliste (brancher le hotfix depuis `feature/f2` au lieu de `main`, parce qu'on y
était positionné au moment où le bug tombe) a été testée contre l'oracle : elle échoue
précisément sur le check "hotfix branché depuis main" — et la conséquence concrète se voit
dans les fichiers : le travail non terminé de `feature/f2` se retrouve mergé dans `main` en
même temps que le hotfix, sans jamais être passé par une revue de PR sur cette feature.

## Étapes (en friction)

1. `npm run lab` : RED — `applyPlan` n'est pas encore implémenté.
2. Écris la séquence pour `feature/f1` et `feature/f2`, toutes deux depuis `main`.
3. AVANT de brancher `hotfix/urgent` : reviens explicitement sur `main`
   (`run("checkout main")`), même si tu "sais" que tu devrais déjà y être.
4. Merge le hotfix dans `main`, puis branche `feature/f3` (elle héritera automatiquement du
   hotfix, sans rien faire de spécial).
5. Merge les trois features dans `main`.
6. Relance : les 10 checks doivent passer.

## Vérifier

```bash
cd 07-git-avance/labs/lab-01-strategie-de-branches
npm run lab
npm run solution
```

**Ce que l'oracle vérifie**

`applyPlan` s'exécute sans erreur ; la branche `hotfix/urgent` existe et son premier commit
a pour PARENT le commit initial de `main` (pas un commit de feature — preuve qu'elle a été
branchée au bon endroit) ; `feature/f3` a été créée APRÈS le hotfix (elle en est
descendante, vérifié par `merge-base --is-ancestor`) ; `main`, à la fin, contient bien les
cinq fichiers (`README.md`, `f1.txt`, `f2.txt`, `f3.txt`, `hotfix.txt`) — la preuve que tout
le travail a fini par converger.

## Variante J+30 (fading)

Le produit décide d'ajouter une branche `release/2.0` (Git Flow, pas GitHub Flow) parce que
plusieurs versions doivent cohabiter en prod. Le hotfix doit-il maintenant aussi être
cherry-ické vers `release/2.0` ? Dans quel ordre par rapport à `main` ?

## Application TribuZen

Même stratégie sur le vrai dépôt `tribuzen-api`, avec de vraies Pull Requests GitHub (la
revue humaine remplace la vérification automatisée de ce lab, mais la topologie attendue
est identique). Commit :
`docs(git): stratégie de branches GitHub Flow appliquée et vérifiée sur un scénario réel`.
