---
title: "Projet final — Git mastery"
description: "Projet intégrateur combinant toutes les techniques Git avancées du cours"
duration: "90 min"
difficulty: "Expert"
---

# Module 10 — Projet final — Git mastery

## Objectif

Assembler toutes les techniques vues dans ce cours en un seul projet cohérent. Tu vas :

1. Initialiser un monorepo avec pnpm workspaces
2. Configurer les hooks (Husky + lint-staged + commitlint)
3. Documenter une stratégie de branching
4. Pratiquer le rebase interactif et le bisect
5. Configurer les workflows collaboratifs

## Étape 1 — Créer le monorepo

```bash
mkdir git-mastery && cd git-mastery
git init
pnpm init

# Créer la structure
mkdir -p apps/web apps/api packages/shared-types
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Crée un `package.json` dans chaque sous-projet avec un nom scopé (`@mastery/web`, `@mastery/api`, `@mastery/shared-types`).

## Étape 2 — Configurer les hooks

```bash
# Installer les outils
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional

# Initialiser Husky
npx husky init

# Configurer les hooks
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

Configure `lint-staged` dans le `package.json` racine et crée `commitlint.config.js`.

## Étape 3 — Documenter la stratégie

Crée un fichier `CONTRIBUTING.md` à la racine qui documente :

- La stratégie de branching choisie (GitHub Flow recommandé)
- Le format des messages de commit (Conventional Commits)
- Le processus de code review
- Le workflow de release

## Étape 4 — Simuler un workflow d'équipe

```bash
# Créer plusieurs branches feature avec des commits
git switch -c feat/user-model
# 5-6 commits dont des WIP et des fixes

git switch -c feat/auth
# 4-5 commits

# Pratiquer le rebase interactif pour nettoyer
git rebase -i main
# Squash, fixup, reword

# Merger proprement
git switch main
git merge --no-ff feat/user-model
```

## Étape 5 — Simuler un bisect

Introduis délibérément un "bug" dans un commit ancien, puis utilise `git bisect` pour le retrouver :

```bash
git bisect start
git bisect bad HEAD
git bisect good <tag-initial>
git bisect run node -e "/* test du bug */"
```

## Étape 6 — Configurer les protections

Crée les fichiers :
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`
- `.github/workflows/ci.yml` (GitHub Actions basique)

## Critères d'évaluation

| Critère | Points |
|---------|--------|
| Monorepo pnpm workspaces correctement configuré | 15 |
| Hooks Husky + lint-staged + commitlint fonctionnels | 20 |
| CONTRIBUTING.md complet et cohérent | 15 |
| Historique propre (rebase interactif utilisé) | 20 |
| Bisect documenté (log sauvegardé) | 15 |
| Fichiers GitHub (.github/) configurés | 15 |

## Résumé du cours

Tu maîtrises maintenant :
- Les **internals Git** (objects, refs, DAG)
- Les **stratégies de branching** (Git Flow, GitHub Flow, TBD)
- **Merge vs rebase** et la règle d'or
- Le **rebase interactif** pour un historique propre
- **Git bisect** pour le debugging efficace
- Les **hooks** pour automatiser la qualité
- Les **worktrees** et **submodules** pour la productivité
- Les **monorepos** avec Nx/Turborepo
- Les **workflows collaboratifs** professionnels

**Prochaine étape** : applique ces techniques sur ton projet fil rouge. Configure les hooks, nettoie l'historique, documente ta stratégie de branching.
