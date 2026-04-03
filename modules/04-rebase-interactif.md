---
title: "Rebase interactif et réécriture d'historique"
description: "git rebase -i, squash, fixup, reword — nettoyer l'historique avant une PR"
duration: "50 min"
difficulty: "Avancé"
---

# Module 04 — Rebase interactif et réécriture d'historique

## Pourquoi réécrire l'historique ?

Pendant le développement, tu commettes souvent :
- `"WIP"`, `"fix typo"`, `"oops forgot file"`
- Des commits de debug, des revert, des essais

Avant de soumettre une PR, tu nettoies pour que le reviewer voie un historique **clair et logique**.

## git rebase -i (interactif)

```bash
# Réécrire les 5 derniers commits
git rebase -i HEAD~5

# Réécrire depuis un commit spécifique
git rebase -i abc1234
```

Git ouvre l'éditeur avec la liste des commits (du plus ancien au plus récent) :

```
pick a1b2c3d feat: add user model
pick e4f5g6h fix: typo in user model
pick i7j8k9l feat: add user service
pick m0n1o2p WIP debug
pick q3r4s5t feat: add user controller
```

### Les commandes disponibles

| Commande | Action |
|----------|--------|
| `pick` (p) | Garder le commit tel quel |
| `reword` (r) | Garder le commit, modifier le message |
| `edit` (e) | S'arrêter au commit pour le modifier |
| `squash` (s) | Fusionner avec le commit précédent (garder les 2 messages) |
| `fixup` (f) | Fusionner avec le commit précédent (jeter le message) |
| `drop` (d) | Supprimer le commit |

### Exemple : nettoyer avant une PR

```
# Avant (5 commits)
pick a1b2c3d feat: add user model
pick e4f5g6h fix: typo in user model      → fixup (fusionner dans le précédent)
pick i7j8k9l feat: add user service
pick m0n1o2p WIP debug                    → drop (supprimer)
pick q3r4s5t feat: add user controller

# Éditeur modifié
pick a1b2c3d feat: add user model
fixup e4f5g6h fix: typo in user model
pick i7j8k9l feat: add user service
drop m0n1o2p WIP debug
pick q3r4s5t feat: add user controller

# Résultat : 3 commits propres
# feat: add user model
# feat: add user service
# feat: add user controller
```

## Le workflow --fixup / --autosquash

Au lieu de noter mentalement quel commit corriger, marque-le directement :

```bash
# Tu remarques un bug dans le commit "feat: add user model" (hash a1b2c3d)
# Corrige le fichier, puis :
git add src/user.model.ts
git commit --fixup=a1b2c3d
# → Crée un commit "fixup! feat: add user model"

# Plus tard, avant la PR :
git rebase -i --autosquash HEAD~5
# Les fixup sont automatiquement placés sous leur cible !
```

> **Alias recommandé** : `git config --global alias.fixup "commit --fixup"`

## Réordonner les commits

Dans l'éditeur du rebase interactif, tu peux simplement réordonner les lignes :

```
# Avant : le fix est après le controller
pick a1b2c3d feat: add user model
pick q3r4s5t feat: add user controller
pick e4f5g6h fix: user model validation

# Après : le fix suit directement le model
pick a1b2c3d feat: add user model
pick e4f5g6h fix: user model validation
pick q3r4s5t feat: add user controller
```

## Modifier un commit ancien avec `edit`

```bash
git rebase -i HEAD~3
# Marque le commit cible avec "edit"

# Git s'arrête à ce commit. Tu peux :
git add -p           # ajouter des modifications
git commit --amend   # modifier le commit
git rebase --continue # reprendre le rebase
```

## Récupérer d'un rebase raté

Le reflog est ton filet de sécurité :

```bash
# Voir l'historique des mouvements de HEAD
git reflog
# abc1234 HEAD@{0}: rebase (finish): ...
# def5678 HEAD@{1}: rebase (start): ...
# ghi9012 HEAD@{2}: commit: feat: ...  ← état avant le rebase

# Revenir à l'état avant le rebase
git reset --hard HEAD@{2}
```

> **Important** : `git reflog` garde 90 jours d'historique par défaut. Tu ne perds presque jamais de données avec Git.

## Bonnes pratiques

1. **Rebase interactif AVANT le push** — pas après (sinon `--force` nécessaire)
2. **Un commit = un changement logique** — pas de "fix typo, add feature, update deps" dans le même commit
3. **`--fixup` pendant le dev**, `--autosquash` avant la PR
4. **Jamais sur des branches partagées** — réécrire l'historique de `main` = chaos

## Résumé

- `git rebase -i` permet de squash, fixup, reword, drop et réordonner les commits
- **fixup** = fusionner avec le commit précédent en jetant le message
- **--fixup / --autosquash** = workflow de correction automatisé
- Le **reflog** permet de récupérer de tout rebase raté
- Règle : nettoyer l'historique AVANT de push, pas après
