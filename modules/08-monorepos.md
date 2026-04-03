---
title: "Monorepos — Outils et stratégies"
description: "Nx, Turborepo, pnpm workspaces — gérer plusieurs packages dans un seul repo"
duration: "50 min"
difficulty: "Expert"
---

# Module 08 — Monorepos — Outils et stratégies

## Monorepo vs multirepo

### Monorepo

Un seul dépôt Git contient plusieurs projets/packages.

```
my-monorepo/
├── apps/
│   ├── web/           ← App React
│   ├── api/           ← API NestJS
│   └── mobile/        ← App React Native
├── packages/
│   ├── shared-types/  ← Types TypeScript partagés
│   ├── ui-kit/        ← Composants UI réutilisables
│   └── utils/         ← Fonctions utilitaires
├── package.json
└── pnpm-workspace.yaml
```

### Multirepo

Chaque projet dans son propre dépôt.

```
org/web         ← git repo
org/api         ← git repo
org/mobile      ← git repo
org/shared-types ← git repo (npm package)
```

### Comparaison

| Critère | Monorepo | Multirepo |
|---------|----------|-----------|
| Partage de code | Trivial (import direct) | npm packages, versionning |
| Refactoring cross-projet | Un commit, une PR | N PRs synchronisées |
| CI/CD | Complexe (change detection) | Simple par repo |
| Onboarding | Un seul clone | N clones |
| Autonomie des équipes | Centralisée | Forte |

## pnpm workspaces — La fondation

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// packages/shared-types/package.json
{ "name": "@myorg/shared-types", "version": "1.0.0" }

// apps/web/package.json
{
  "dependencies": {
    "@myorg/shared-types": "workspace:*"
  }
}
```

```bash
# Installer toutes les dépendances
pnpm install

# Lancer un script dans un package spécifique
pnpm --filter @myorg/web dev

# Lancer dans tous les packages
pnpm -r run build
```

## Nx — Framework monorepo complet

```bash
# Créer un workspace Nx
npx create-nx-workspace@latest myorg

# Structure
myorg/
├── apps/
├── libs/
├── nx.json          ← Configuration Nx
└── project.json     ← par projet
```

### Task graph et cache

```bash
# Nx comprend les dépendances entre projets
npx nx build web
# → Build d'abord shared-types et ui-kit (dépendances)
# → Puis build web

# Cache intelligent : si rien n'a changé, résultat instantané
npx nx build web  # ← "Nx read the output from the cache"

# Affected : ne tester que ce qui a changé
npx nx affected --target=test
```

### Configuration `nx.json`

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  }
}
```

## Turborepo — L'alternative Vercel

```bash
# Créer un workspace Turborepo
npx create-turbo@latest

# turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

```bash
turbo run build      # build tous les packages en parallèle
turbo run test --filter=web  # tester uniquement web
```

## CI optimisée avec change detection

Le défi principal : ne pas tout rebuilder à chaque commit.

```yaml
# GitHub Actions — détection des changements
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/shared-types/**'
            api:
              - 'apps/api/**'
              - 'packages/shared-types/**'

  build-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    # ...
```

Avec Nx :

```bash
# En CI, ne tester que ce qui a changé vs main
npx nx affected --target=test --base=origin/main --head=HEAD
```

## Nx vs Turborepo

| Critère | Nx | Turborepo |
|---------|----| ----------|
| Écosystème | Riche (generators, plugins) | Minimaliste |
| Cache | Local + Nx Cloud | Local + Vercel Remote Cache |
| Generators | Oui (scaffolding de projets) | Non |
| Analyse de dépendances | Graph visuel intégré | Basique |
| Complexité | Plus élevée | Plus simple |
| Recommandé pour | Grands monorepos, entreprises | Petits-moyens monorepos |

## Résumé

- **Monorepo** = un repo pour multiple projets — partage de code facile, refactoring atomique
- **pnpm workspaces** = la fondation (dépendances locales entre packages)
- **Nx** = framework complet (cache, affected, generators, graph)
- **Turborepo** = alternative simple (cache, parallélisation, filtre)
- **CI** : change detection obligatoire pour ne pas tout rebuilder à chaque commit
