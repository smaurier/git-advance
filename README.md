# Git Avancé — Internals, Branching, Rebase, Bisect, Hooks, Monorepos

![VitePress](https://img.shields.io/badge/-VitePress-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![fullstack-autotraining](https://img.shields.io/badge/curriculum-fullstack--autotraining-4C1?style=flat-square)](https://github.com/smaurier/fullstack-autotraining)

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
