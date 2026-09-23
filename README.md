# Git Avancé — Internals, Branching, Rebase, Bisect, Hooks, Monorepos

![VitePress](https://img.shields.io/badge/-VitePress-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![fullstack-autotraining](https://img.shields.io/badge/curriculum-fullstack--autotraining-4C1?style=flat-square)](https://github.com/smaurier/fullstack-autotraining)

<!-- labs-gestes:start -->
## Labs — refonte du 22/09/2026 : un lab = un geste métier complet

> Règle qualité 5 du parcours : chaque lab est **un geste métier complet**, sous deux formes — **Zéro** (construire de zéro un artefact réel et entier) ou **Intervention** (modifier de l'existant avec consommateurs, findings avant code, non-régression). Un lab n'entre en file qu'avec un **oracle exécutable** (`src/` starter · `test/` · `solution/` séparée). Les labs historiques de ce cours (un concept par lab, sans oracle) restent dans `labs/` jusqu'à remplacement et **ne sont plus la file**. Cible détaillée : [`docs/gestes-complets.md`](../docs/gestes-complets.md). État : **3/4 avec oracle**.

| # | Lab | Forme | Geste | Oracle |
|---|-----|-------|-------|--------|
| 01 | [`lab-01-strategie-de-branches`](labs/lab-01-strategie-de-branches/README.md) | Zéro | sur un vrai repo | ✅ vérifié |
| 02 | [`lab-02-bisect-une-regression`](labs/lab-02-bisect-une-regression/README.md) | Intervention | réelle | ✅ vérifié |
| 03 | [`lab-03-rebase-une-branche-sale`](labs/lab-03-rebase-une-branche-sale/README.md) | Intervention | historique propre | ✅ vérifié |
| 04 | `lab-04-conflit-sans-perte` | Intervention | résoudre sans perdre de travail | · à écrire |

<!-- labs-gestes:end -->

## Lancer le cours

```bash
npm install          # une seule fois
npm run docs:dev     # ouvre http://localhost:5173
```

Le site s'ouvre avec une sidebar navigable. Commence par le module 00 (prérequis).

## Structure

```
17-git-avance/
├── modules/          ← Cours théoriques (00 à 10)
├── labs/             ← Exercices pratiques (exercise.ts → solution.ts)
├── quizzes/          ← Quiz interactifs (.html)
├── glossaire.md      ← Termes clés Git
└── index.md          ← Page d'accueil VitePress
```

## Parcours

Le cours est organisé en 3 phases :

1. **Fondamentaux Git** (modules 00-03) : internals, objects, branches, merge vs rebase
2. **Productivité Git** (modules 04-07) : rebase interactif, bisect, hooks, worktrees & submodules
3. **Git en équipe** (modules 08-10) : monorepos, workflows collaboratifs, projet final

## Lancer un lab

```bash
npm run lab:01       # lance l'exercice du lab 01
npm run solution:01  # lance la solution du lab 01
```

## Prérequis

- Node.js >= 20
- Git >= 2.40 installé
- Connaissance de base de Git (add, commit, push, pull, branches)
