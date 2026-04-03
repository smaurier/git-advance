---
title: "Worktrees et submodules"
description: "Travailler sur plusieurs branches simultanément et gérer des dépôts imbriqués"
duration: "40 min"
difficulty: "Avancé"
---

# Module 07 — Worktrees et submodules

## Git worktrees

### Le problème

Tu travailles sur `feature/auth`. Un collègue te demande une review urgente sur `feature/payments`. Tes options habituelles :

1. **Stash** → switch → review → switch back → stash pop (fastidieux, risque de conflits)
2. **Cloner** le repo une 2e fois (gaspillage d'espace disque)

Alternative : **git worktree**.

### Un repo, plusieurs répertoires de travail

```bash
# Créer un worktree pour la branche à reviewer
git worktree add ../review-payments feature/payments

# Structure résultante :
# mon-projet/           ← worktree principal (feature/auth)
# review-payments/      ← worktree secondaire (feature/payments)
# Les deux partagent le même .git !
```

### Commandes essentielles

```bash
# Créer un worktree
git worktree add <path> <branch>
git worktree add ../hotfix main        # nouveau répertoire sur main
git worktree add ../fix-123 -b fix-123 # créer ET checkout une nouvelle branche

# Lister les worktrees
git worktree list
# /home/user/mon-projet      abc1234 [feature/auth]
# /home/user/review-payments def5678 [feature/payments]
# /home/user/hotfix          ghi9012 [main]

# Supprimer un worktree
git worktree remove ../review-payments
# ou supprimer le dossier puis :
git worktree prune
```

### Cas d'usage concrets

- **Code review** : checkout la branche du collègue sans toucher ton travail
- **Tests sur main** : lancer les tests sur main pendant que tu développes
- **Comparaison visuelle** : deux versions côte à côte dans VS Code
- **Build en parallèle** : compiler la version prod pendant que tu développes

## Git submodules

### Le concept

Un submodule = une **référence à un commit spécifique** d'un autre dépôt Git, inclus comme sous-répertoire.

```bash
# Ajouter un submodule
git submodule add https://github.com/org/shared-lib.git libs/shared

# Ce que Git fait :
# 1. Clone le repo dans libs/shared/
# 2. Crée un fichier .gitmodules avec l'URL et le path
# 3. Enregistre le commit exact dans l'index
```

### .gitmodules

```ini
[submodule "libs/shared"]
    path = libs/shared
    url = https://github.com/org/shared-lib.git
    branch = main
```

### Cloner un repo avec submodules

```bash
# Option 1 : tout d'un coup
git clone --recurse-submodules https://github.com/org/monrepo.git

# Option 2 : après le clone
git clone https://github.com/org/monrepo.git
cd monrepo
git submodule init
git submodule update
# ou en une commande :
git submodule update --init --recursive
```

### Mettre à jour un submodule

```bash
# Mettre à jour vers le dernier commit de la branche configurée
cd libs/shared
git pull origin main
cd ../..
git add libs/shared
git commit -m "chore: update shared-lib to latest"

# Ou depuis le repo parent :
git submodule update --remote libs/shared
```

### Pièges courants

1. **Detached HEAD** : les submodules sont toujours en detached HEAD. Pour modifier, il faut `cd` + `git switch` dans le submodule.
2. **Oublier de push le submodule** : tu commites une ref vers un commit qui n'existe pas encore sur le remote du submodule.
3. **Oublier `--recurse-submodules`** : tes collègues clonent sans les submodules → erreurs incompréhensibles.

## Subtree — L'alternative

```bash
# Ajouter un subtree (pas de .gitmodules, le code est intégré)
git subtree add --prefix=libs/shared https://github.com/org/shared-lib.git main --squash

# Mettre à jour
git subtree pull --prefix=libs/shared https://github.com/org/shared-lib.git main --squash
```

| Critère | Submodule | Subtree |
|---------|-----------|---------|
| Complexité | Moyenne | Basse |
| Code dans le repo | Non (référence) | Oui (copie) |
| Historique | Séparé | Fusionné |
| Clone | Nécessite `--recurse` | Transparent |
| Mise à jour | Commit ref | Subtree merge |

> **En pratique** : les submodules sont plus courants pour les cours, libs partagées, monorepos éducatifs. Les subtrees pour intégrer du code tiers.

## Résumé

- **Worktrees** : plusieurs répertoires de travail pour un seul repo — idéal pour review, comparaison, tests parallèles
- **Submodules** : référence à un commit d'un autre repo — pour les dépendances versionées
- **Subtree** : copie du code d'un autre repo — plus simple mais historique fusionné
- Worktrees et submodules sont des outils de productivité essentiels pour les projets d'équipe
