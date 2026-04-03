---
title: "Git internals — Objects et références"
description: "Comprendre le modèle objet de Git : blobs, trees, commits, tags, refs et le répertoire .git"
duration: "45 min"
difficulty: "Intermédiaire"
---

# Module 01 — Git internals — Objects et références

## Pourquoi comprendre les internals ?

Quand tu comprends comment Git stocke les données, les commandes mystérieuses deviennent logiques. `git reset --hard`, `git reflog`, `git cherry-pick` ne sont plus de la magie — ce sont des manipulations de pointeurs.

## Le répertoire .git

```bash
ls -la .git/
├── HEAD            # Pointe vers la branche active
├── config          # Configuration locale du repo
├── objects/        # TOUS les objets Git (blobs, trees, commits)
├── refs/           # Références (branches, tags, remotes)
│   ├── heads/      # Branches locales
│   ├── tags/       # Tags
│   └── remotes/    # Branches distantes
├── hooks/          # Scripts de hooks
├── index           # Le staging area (fichier binaire)
└── logs/           # Reflog (historique des mouvements de HEAD)
```

## Les 4 types d'objets

Git est une base de données adressable par contenu. Chaque objet est identifié par son hash SHA-1.

### 1. Blob — Le contenu d'un fichier

```bash
# Créer un blob manuellement
echo "Hello Git" | git hash-object --stdin -w
# → a5c19667710254f835085b99726e523457150e03

# Lire un blob
git cat-file -p a5c196
# → Hello Git

# Type de l'objet
git cat-file -t a5c196
# → blob
```

Un blob ne stocke **que le contenu**, pas le nom du fichier. Deux fichiers avec le même contenu = un seul blob.

### 2. Tree — Un répertoire

```bash
# Voir le tree du dernier commit
git cat-file -p HEAD^{tree}
# 100644 blob a5c196... README.md
# 100644 blob 3b18e5... package.json
# 040000 tree 7d1b31... src

# Les modes :
# 100644 = fichier normal
# 100755 = fichier exécutable
# 040000 = sous-répertoire (tree)
# 120000 = lien symbolique
```

### 3. Commit — Un snapshot avec métadonnées

```bash
git cat-file -p HEAD
# tree 7d1b31f...        ← Pointeur vers le tree racine
# parent 3e4a56b...      ← Commit parent (peut être multiple pour un merge)
# author Alice <a@b.com> 1700000000 +0100
# committer Alice <a@b.com> 1700000000 +0100
#
# feat: add user authentication
```

Un commit = un **pointeur vers un tree** (snapshot complet du projet) + parent(s) + métadonnées.

### 4. Tag annoté — Un commit nommé

```bash
git tag -a v1.0.0 -m "First release"
git cat-file -p v1.0.0
# object 3e4a56b...  ← Le commit tagué
# type commit
# tag v1.0.0
# tagger Alice <a@b.com> 1700000000 +0100
# First release
```

## Le graphe Git

Chaque commit pointe vers son parent. L'ensemble forme un DAG (Directed Acyclic Graph) :

```
    A ← B ← C ← D (main)
              ↖
               E ← F (feature)
```

Les branches sont juste des **pointeurs** vers des commits. Créer une branche = créer un fichier de 40 octets.

```bash
# Une branche est un fichier contenant un hash
cat .git/refs/heads/main
# → d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
```

## HEAD — Le pointeur des pointeurs

```bash
# HEAD pointe vers la branche active
cat .git/HEAD
# → ref: refs/heads/main

# En detached HEAD (après git checkout <hash>)
cat .git/HEAD
# → d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
```

## Packfiles et garbage collection

Git compresse les objets en packfiles pour économiser l'espace :

```bash
# Voir les objets loose
find .git/objects -type f | head -5

# Forcer le packing
git gc

# Voir les packfiles
ls .git/objects/pack/
# → pack-abc123.idx  pack-abc123.pack

# Statistiques
git count-objects -v
```

> **Astuce** : `git gc` s'exécute automatiquement après certaines opérations (push, merge). Tu n'as presque jamais besoin de le lancer manuellement.

## Commandes d'exploration utiles

```bash
# Montrer le type d'un objet
git cat-file -t <hash>

# Montrer le contenu d'un objet
git cat-file -p <hash>

# Lister les fichiers dans un tree
git ls-tree HEAD

# Lister tous les objets
git rev-list --objects --all | head -20

# Taille d'un objet
git cat-file -s <hash>
```

## Résumé

- Git = base de données adressable par contenu avec 4 types d'objets
- **Blob** = contenu fichier | **Tree** = répertoire | **Commit** = snapshot + parent | **Tag** = commit nommé
- Les branches sont des **pointeurs** vers des commits (fichiers de 40 octets)
- **HEAD** pointe vers la branche active (ou directement un commit en detached HEAD)
- Comprendre les internals rend toutes les commandes Git logiques
