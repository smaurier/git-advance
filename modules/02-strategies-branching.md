---
title: "Stratégies de branching"
description: "Git Flow, GitHub Flow, Trunk-Based Development — quand utiliser quelle stratégie"
duration: "40 min"
difficulty: "Intermédiaire"
---

# Module 02 — Stratégies de branching

## Pourquoi une stratégie ?

Sans stratégie de branching, un projet à 10 développeurs devient un chaos de branches orphelines, de merges conflictuels et de code cassé en production. La stratégie définit :
- Comment créer des branches
- Quand merger et où
- Comment livrer en production

## Git Flow

La stratégie historique de Vincent Driessen (2010). Adaptée aux **releases planifiées**.

```
main ────●────────────────●──────────────── (releases)
          \              /
develop ───●──●──●──●──●──●──●──●──●─────── (intégration)
            \  /    \    /
feature ─────●       ●──●                   (features)
                        \
release ─────────────────●                   (stabilisation)
```

### Branches permanentes
- `main` — Code en production. Chaque commit = une release
- `develop` — Branche d'intégration. Prochaine release

### Branches temporaires
- `feature/*` — Une fonctionnalité. Part de `develop`, merge dans `develop`
- `release/*` — Stabilisation avant release. Part de `develop`, merge dans `main` ET `develop`
- `hotfix/*` — Fix urgent en prod. Part de `main`, merge dans `main` ET `develop`

### Quand Git Flow ?

✅ Releases planifiées (v1.0, v1.1, v2.0)
✅ Plusieurs versions en production simultanément
✅ Équipe grande (> 10 devs)
❌ Déploiement continu
❌ Petites équipes agiles

## GitHub Flow

Stratégie minimaliste portée par GitHub. Adaptée au **déploiement continu**.

```
main ──●──●──●──●──●──●──●──●── (toujours deployable)
        \  /    \    /
feature ──●      ●──●
```

### Règles
1. `main` est **toujours déployable**
2. Crée une branche pour chaque changement
3. Ouvre une Pull Request pour la review
4. Merge dans `main` après approbation
5. Déploie immédiatement après le merge

```bash
# Workflow typique
git switch -c feature/add-auth
# ... code, commit, push
git push -u origin feature/add-auth
# → Ouvre une PR sur GitHub
# → Review, approbation, merge
# → CI/CD déploie automatiquement
```

### Quand GitHub Flow ?

✅ Déploiement continu (SaaS, web apps)
✅ Petites à moyennes équipes
✅ Itérations rapides
❌ Plusieurs versions en production
❌ Releases planifiées strictes

## Trunk-Based Development (TBD)

La stratégie la plus simple et la plus exigeante. **Tout le monde committe sur trunk (main).**

```
main ──●──●──●──●──●──●──●──●── (commits directs ou branches < 24h)
        \  /
short ───●  (branch de vie < 1 jour)
```

### Règles
1. Tout le monde travaille sur `main` (ou branches très courtes < 24h)
2. Les features non prêtes sont cachées derrière des **feature flags**
3. CI/CD obligatoire — chaque commit doit passer les tests
4. On release depuis `main` (tags ou release branches éphémères)

### Quand TBD ?

✅ Equipes senior avec forte discipline
✅ CI/CD mature avec bonne couverture de tests
✅ Google, Meta, Netflix l'utilisent
❌ Equipes juniors sans culture CI
❌ Pas de feature flags

## Comparaison

| Critère | Git Flow | GitHub Flow | Trunk-Based |
|---------|----------|-------------|-------------|
| Complexité | Haute | Basse | Basse (mais discipline haute) |
| Branches longues | Oui (develop) | Non | Non |
| Feature flags | Optionnel | Optionnel | Obligatoire |
| Fréquence de deploy | Hebdo/mensuel | Quotidien | Continu |
| Risque de conflits | Élevé | Modéré | Faible |
| Taille d'équipe | Grande | Petite-moyenne | Toute taille (si senior) |
| Mission ESN typique | Banque, grande entreprise | Startup, SaaS | Scale-up mature |

## Quelle stratégie choisir ?

```
Tu déploies en continu ?
├── Oui → L'équipe est senior et disciplinée ?
│         ├── Oui → Trunk-Based Development
│         └── Non → GitHub Flow
└── Non → Tu gères plusieurs versions en prod ?
          ├── Oui → Git Flow
          └── Non → GitHub Flow
```

> **En ESN** : tu ne choisis pas toujours. Le client a souvent déjà une stratégie. L'important est de **les connaître toutes** pour s'adapter rapidement.

## Résumé

- **Git Flow** = releases planifiées, branches longues, grande équipe
- **GitHub Flow** = déploiement continu, simple, PR-based
- **Trunk-Based** = tout sur main, feature flags, haute discipline
- Pas de stratégie universelle — le contexte détermine le choix
