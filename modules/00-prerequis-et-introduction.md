---
title: "Prérequis et introduction"
description: "Vue d'ensemble du cours Git avancé, prérequis, installation et configuration"
duration: "30 min"
difficulty: "Débutant"
---

# Module 00 — Prérequis et introduction

## Ce que tu sais déjà

Ce cours suppose que tu maîtrises les bases de Git :

- `git init`, `git clone`, `git add`, `git commit`
- `git push`, `git pull`, `git fetch`
- Créer et changer de branche (`git branch`, `git checkout`, `git switch`)
- Résoudre un conflit basique lors d'un merge

Si tu bloques sur ces commandes, revois les bases avant de continuer. Ce cours commence là où les tutoriels débutants s'arrêtent.

## Ce que tu vas apprendre

```
Phase 1 — Fondamentaux          Phase 2 — Productivité         Phase 3 — Équipe
├── Git internals (objects)     ├── Rebase interactif           ├── Monorepos
├── Stratégies de branching     ├── Git bisect / debugging      ├── Workflows collaboratifs
└── Merge vs Rebase             ├── Git hooks / automatisation  └── Projet final
                                └── Worktrees et submodules
```

## Pourquoi ce cours ?

En ESN, tu vas travailler sur des projets avec 5, 10, 50 développeurs. Les basics de Git ne suffisent plus :

- **Historique propre** : les reviewers lisent les commits. Un historique clair = review rapide.
- **Debugging** : `git bisect` trouve un bug en O(log n) commits au lieu de O(n).
- **Automatisation** : les hooks empêchent les commits qui cassent le build.
- **Monorepos** : de plus en plus de projets ESN utilisent Nx ou Turborepo.

## Setup

### Git >= 2.40

```bash
git --version
# Si < 2.40, mets à jour :
# Windows : winget install Git.Git
# macOS : brew install git
# Linux : sudo apt install git
```

### Configuration recommandée

```bash
# Identité
git config --global user.name "Ton Nom"
git config --global user.email "ton@email.com"

# Éditeur par défaut
git config --global core.editor "code --wait"

# Rebase par défaut lors du pull
git config --global pull.rebase true

# Merge tool
git config --global merge.conflictstyle diff3

# Alias utiles (tu les comprendras au fil du cours)
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.st "status --short --branch"
git config --global alias.co "checkout"
git config --global alias.br "branch"
git config --global alias.fixup "commit --fixup"
```

### Extensions VS Code recommandées

- **GitLens** — Visualisation avancée de l'historique, blame inline
- **Git Graph** — Graphe visuel des branches
- **Conventional Commits** — Templates de messages de commit

## Comment suivre ce cours

1. **Lis le module** théorique (~20-30 min)
2. **Fais le lab** correspondant — exercices pratiques avec auto-correction
3. **Réponds au quiz** — 5 questions pour valider ta compréhension
4. **Note** 1-3 phrases de ce que tu as appris

> **Règle d'or** : tape les commandes toi-même. Ne copie-colle pas. La mémoire musculaire est essentielle avec Git.

## Résumé

- Ce cours couvre Git de l'intermédiaire à l'expert en 11 modules
- Prérequis : les bases Git (add, commit, push, pull, branches)
- Setup : Git >= 2.40, VS Code avec GitLens
- Objectif : devenir autonome sur Git dans un contexte d'équipe professionnelle
