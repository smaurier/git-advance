---
title: "Git bisect et debugging"
description: "Recherche binaire automatisée pour trouver le commit qui a introduit un bug"
duration: "35 min"
difficulty: "Avancé"
---

# Module 05 — Git bisect et debugging

## Le problème

Tu as 200 commits depuis la dernière release. Un bug est apparu. Lequel de ces 200 commits l'a introduit ?

- **Approche naïve** : checkout chaque commit un par un → O(n) = 200 vérifications
- **Git bisect** : recherche binaire → O(log n) = ~8 vérifications

## Bisect manuel

```bash
# 1. Démarrer le bisect
git bisect start

# 2. Marquer le commit actuel comme BAD (le bug est présent)
git bisect bad

# 3. Marquer un ancien commit comme GOOD (le bug n'existait pas)
git bisect good v1.0.0  # ou un hash

# Git checkout le commit du milieu
# Bisecting: 99 revisions left to test after this (roughly 7 steps)

# 4. Tester : le bug est-il présent ?
npm test  # ou vérification manuelle

# 5. Marquer le résultat
git bisect good   # pas de bug → Git teste la moitié supérieure
# ou
git bisect bad    # bug présent → Git teste la moitié inférieure

# 6. Répéter jusqu'à trouver le commit fautif
# abc1234 is the first bad commit
# Author: Alice
# Date: 2024-03-15
# Message: refactor: change auth middleware

# 7. Terminer et revenir à HEAD
git bisect reset
```

## Bisect automatisé

La vraie puissance : un script qui teste automatiquement chaque commit.

```bash
# Démarrer
git bisect start HEAD v1.0.0

# Lancer automatiquement avec un script de test
git bisect run npm test

# Le script doit retourner :
# exit 0 → le commit est GOOD
# exit 1-124, 126-127 → le commit est BAD
# exit 125 → le commit est SKIP (ne peut pas être testé)
```

### Avec un test spécifique

```bash
# Tester uniquement le fichier pertinent
git bisect run npx vitest run src/auth.test.ts

# Avec un script personnalisé
git bisect run ./scripts/test-bug.sh
```

### Script de test personnalisé

```bash
#!/bin/bash
# scripts/test-bug.sh

# Compiler le projet
npm run build 2>/dev/null || exit 125  # skip si ça ne compile pas

# Vérifier si le bug est présent
if grep -q "buggy-pattern" src/auth.ts; then
  exit 1  # BAD
else
  exit 0  # GOOD
fi
```

## Bisect skip

Certains commits ne sont pas testables (merge cassé, refactor intermédiaire) :

```bash
git bisect skip  # skip le commit actuel
```

## Bisect log et replay

```bash
# Sauvegarder les étapes du bisect
git bisect log > bisect.log

# Rejouer un bisect (utile pour partager avec un collègue)
git bisect replay bisect.log
```

## Bisect avec des termes personnalisés

```bash
# Au lieu de good/bad, utiliser des termes custom
git bisect start --term-old=fast --term-new=slow

git bisect fast v1.0.0  # la version rapide
git bisect slow HEAD     # la version lente

git bisect run ./benchmark.sh
```

## Bonnes pratiques

1. **Automatise autant que possible** — `git bisect run` est beaucoup plus rapide que le bisect manuel
2. **Écris des tests reproductibles** — le script doit fonctionner sur chaque commit
3. **Utilise `exit 125`** pour les commits non-testables (ne compile pas, dépendances manquantes)
4. **Combine avec `git stash`** — si tu as des modifications en cours, stash-les avant de bisect
5. **Garde le log** — `git bisect log` pour documenter la recherche

## Résumé

- `git bisect` = recherche binaire dans l'historique (O(log n))
- **Manuel** : `start` → `good`/`bad` → répéter → `reset`
- **Automatisé** : `git bisect run <script>` teste chaque commit automatiquement
- **Skip** (`exit 125`) pour les commits non-testables
- Combine avec `npm test` ou des scripts custom pour trouver le bug en minutes
