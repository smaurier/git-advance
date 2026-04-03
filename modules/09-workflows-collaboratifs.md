---
title: "Workflows collaboratifs avancés"
description: "Code review, PR templates, CODEOWNERS, conventional commits, semantic versioning, changelogs"
duration: "45 min"
difficulty: "Expert"
---

# Module 09 — Workflows collaboratifs avancés

## Code review — Les bonnes pratiques

### En tant que reviewer

```markdown
# Checklist mentale du reviewer
- [ ] Le code fait ce que la description dit ?
- [ ] Tests ajoutés/modifiés ?
- [ ] Pas de code mort ou commenté ?
- [ ] Nommage clair et cohérent ?
- [ ] Complexité raisonnable ?
- [ ] Sécurité (pas de secrets, pas d'injection) ?
```

**Ton de la review** — sois constructif, pas prescriptif :
- ❌ `"C'est faux"` → ✅ `"On pourrait simplifier avec un reduce ici, qu'en penses-tu ?"`
- ❌ `"Change ça"` → ✅ `"Nit: ce nom de variable pourrait être plus explicite (suggestion: userPermissions)"`

### Préfixes de commentaires

```
[blocking] — Doit être corrigé avant le merge
[nit] — Suggestion mineure, non bloquante
[question] — Demande de clarification
[praise] — Bon travail, pattern intéressant
[suggestion] — Alternative à considérer
```

## PR Templates

```markdown
<!-- .github/pull_request_template.md -->
## Description

<!-- Qu'est-ce que cette PR fait ? Contexte et motivation. -->

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Refactoring
- [ ] Documentation

## Tests

- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests d'intégration ajoutés/modifiés
- [ ] Testé manuellement

## Checklist

- [ ] Le code suit les conventions du projet
- [ ] Self-review effectuée
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de console.log ou de code de debug

## Screenshots (si applicable)
```

## Protected branches

```yaml
# Sur GitHub : Settings → Branches → Branch protection rules
# main :
#   ✅ Require pull request before merging
#   ✅ Require approvals: 1
#   ✅ Require status checks to pass (CI)
#   ✅ Require conversation resolution
#   ✅ Do not allow bypassing the above settings
```

## CODEOWNERS

```
# .github/CODEOWNERS

# Owners par défaut
* @team-core

# Owners par répertoire
/apps/web/           @team-frontend
/apps/api/           @team-backend
/packages/ui-kit/    @team-design-system
/infrastructure/     @team-devops

# Owners par type de fichier
*.sql                @team-dba
Dockerfile           @team-devops
*.test.ts            @team-quality
```

> Les CODEOWNERS sont **automatiquement ajoutés comme reviewers** sur les PRs qui touchent leurs fichiers.

## Semantic Versioning

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug fixes (rétro-compatible)
  │     └──────── Nouvelles fonctionnalités (rétro-compatible)
  └────────────── Breaking changes

Exemples :
1.0.0 → 1.0.1  (fix)
1.0.1 → 1.1.0  (feat)
1.1.0 → 2.0.0  (breaking change)
```

## Release automation

### standard-version / release-please

```bash
npm install -D standard-version
```

```json
// package.json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

```bash
# Basé sur les conventional commits depuis le dernier tag
npm run release
# → Analyse les commits (feat → minor, fix → patch)
# → Met à jour package.json version
# → Génère/met à jour CHANGELOG.md
# → Crée un commit "chore(release): 1.2.0"  
# → Crée un tag v1.2.0
```

### CHANGELOG automatique

```markdown
# Changelog

## [1.2.0] — 2024-12-15

### Features
- **auth**: add JWT refresh token rotation (#123)
- **api**: add rate limiting middleware (#125)

### Bug Fixes
- **users**: fix null pointer in profile update (#124)
```

## GitHub Actions pour les releases

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
```

## Stacked PRs (PRs empilées)

Pour les grosses features, découpe en plusieurs PRs séquentielles :

```
main ← PR 1 (model) ← PR 2 (service) ← PR 3 (controller)
```

```bash
# Branche 1
git switch -c feat/user-model
# ... code model ...
git push -u origin feat/user-model
# → PR 1 : base=main, head=feat/user-model

# Branche 2 (basée sur branche 1)
git switch -c feat/user-service
# ... code service ...
git push -u origin feat/user-service
# → PR 2 : base=feat/user-model, head=feat/user-service

# Branche 3 (basée sur branche 2)
git switch -c feat/user-controller
# → PR 3 : base=feat/user-service, head=feat/user-controller
```

## Résumé

- **Code review** : constructive, avec préfixes ([blocking], [nit], [suggestion])
- **PR templates** : standardiser les descriptions et checklists
- **CODEOWNERS** : reviewer automatique par zone de code
- **Protected branches** : empêcher les merges sans review ni CI
- **Conventional Commits + standard-version** : versionning et changelogs automatiques
- **Stacked PRs** : découper les grosses features en PRs séquentielles reviewables
