---
title: "Merge vs Rebase — Comprendre les fusions"
description: "Fast-forward, 3-way merge, rebase — quand utiliser quoi et pourquoi"
duration: "45 min"
difficulty: "Intermédiaire"
---

# Module 03 — Merge vs Rebase

## Les 3 façons de combiner des branches

### 1. Fast-forward merge

Quand la branche cible n'a pas divergé — Git avance simplement le pointeur.

```
Avant :  A ← B ← C (main)
                   ↖
                    D ← E (feature)

git switch main
git merge feature

Après :  A ← B ← C ← D ← E (main, feature)
```

Pas de commit de merge. L'historique reste linéaire.

```bash
git merge feature          # fast-forward si possible
git merge --ff-only feature  # refuse si fast-forward impossible
```

### 2. Three-way merge

Quand les deux branches ont divergé — Git crée un **commit de merge** avec deux parents.

```
Avant :  A ← B ← C ← F (main)
                   ↖
                    D ← E (feature)

git switch main
git merge feature

Après :  A ← B ← C ← F ← M (main)  ← commit de merge
                   ↖      ↗
                    D ← E (feature)
```

```bash
git merge feature          # merge classique
git merge --no-ff feature  # force un commit de merge même si ff possible
```

### 3. Rebase

Rejoue les commits de la branche sur une nouvelle base — historique linéaire, pas de commit de merge.

```
Avant :  A ← B ← C ← F (main)
                   ↖
                    D ← E (feature)

git switch feature
git rebase main

Après :  A ← B ← C ← F (main) ← D' ← E' (feature)
```

> ⚠️ **D et E sont RÉÉCRITS.** D' et E' ont des hash différents de D et E. Ce sont de nouveaux commits.

```bash
git switch feature
git rebase main            # rebase feature sur main
git switch main
git merge feature          # fast-forward (linéaire!)
```

## Merge vs Rebase — Comparaison

| Critère | Merge | Rebase |
|---------|-------|--------|
| Historique | Non-linéaire (merges visibles) | Linéaire (propre) |
| Commits originaux | Préservés | Réécrits (nouveaux hash) |
| Conflits | Résolus une fois dans le merge commit | Résolus commit par commit |
| Traçabilité | Merge commit montre quand la feature a été intégrée | Pas de trace de l'intégration |
| Sécurité | Ne réécrit jamais | Réécrit les commits (**dangereux si partagé**) |

## La règle d'or du rebase

> **Ne rebase JAMAIS une branche partagée.** Si d'autres développeurs ont basé leur travail sur tes commits, le rebase va réécrire les hash → conflits et confusion garantis.

```bash
# ✅ OK — rebase ta branche privée sur main
git switch ma-feature-perso
git rebase main

# ❌ INTERDIT — rebase la branche partagée
git switch main
git rebase feature  # JAMAIS !
```

## `git pull --rebase` — Le pull propre

```bash
# Au lieu de créer un merge commit à chaque pull
git pull               # = fetch + merge (commit de merge si divergé)

# Rejoue tes commits locaux sur le remote
git pull --rebase      # = fetch + rebase (historique linéaire)

# Configurer par défaut
git config --global pull.rebase true
```

## Résoudre les conflits

### Pendant un merge

```bash
git merge feature
# CONFLICT in src/auth.ts
# Résoudre le conflit dans le fichier
git add src/auth.ts
git commit  # le message de merge est pré-rempli
```

### Pendant un rebase

```bash
git rebase main
# CONFLICT applying commit D
# Résoudre le conflit
git add src/auth.ts
git rebase --continue  # passe au commit suivant

# Si ça tourne mal :
git rebase --abort     # annule tout le rebase, retour à l'état initial
```

## Stratégie recommandée en équipe

```bash
# 1. Développe sur ta branche
git switch -c feature/auth
# ... commits ...

# 2. Avant la PR, rebase sur main pour un historique propre
git fetch origin
git rebase origin/main

# 3. Push (force si déjà pushé, car les commits sont réécrits)
git push --force-with-lease  # sécurisé : refuse si le remote a changé

# 4. PR → review → merge (squash merge ou fast-forward)
```

> **`--force-with-lease`** est plus sûr que `--force` : il refuse le push si quelqu'un d'autre a pushé entre-temps.

## Résumé

- **Fast-forward** = branche non divergée, avance le pointeur
- **3-way merge** = branches divergées, commit de merge avec deux parents
- **Rebase** = rejoue les commits sur une nouvelle base, historique linéaire
- **Règle d'or** : ne rebase jamais les branches partagées
- `git pull --rebase` + `--force-with-lease` = workflow propre et sûr
