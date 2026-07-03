# Lab 01 — Explorer le modèle objet de Git

> **Outcome :** à la fin, tu sais explorer les objets d'un vrai repo avec `cat-file`/`hash-object`/`ls-tree`, reconstituer un commit à la main (commit → tree → blob), et retrouver un objet perdu via le reflog.
> **Vrai outil :** Git réel (les vraies commandes de plomberie sur un vrai `.git/`) — aucun harnais simulé.
> **Feedback :** le coach valide en session en te faisant expliquer chaque hash — pas de test-runner auto-correcteur.

---

## Énoncé

Tu crées un petit repo Git et tu descends **à la main** de la branche jusqu'au contenu d'un fichier, en ne suivant que des hashes. Puis tu simules la perte du cas concret du module (`reset --hard`) et tu récupères le travail via le reflog.

Trois objectifs, dans l'ordre :

1. **Explorer** — lister et lire les objets d'un repo réel avec `git cat-file`, `git hash-object`, `git ls-tree`.
2. **Reconstituer** — partir de `HEAD` et prouver la chaîne `commit → tree → blob` sans jamais ouvrir un fichier du working tree.
3. **Récupérer** — faire un `reset --hard` destructeur, puis retrouver le commit orphelin via `git reflog`.

**Contraintes :**
- Aucune interface graphique, aucun alias : uniquement les commandes de plomberie ci-dessous.
- Tu **notes les hashes** que tu obtiens (ils diffèrent des exemples — l'auteur/la date changent le hash du commit, mais **pas celui du blob** à contenu identique).
- Pas de gap-fill : tu tapes chaque commande et tu expliques ce que révèle chaque hash.

### Starter minimal

Un simple terminal avec Git ≥ 2.40. Aucune dépendance npm. Crée le repo de travail :

```bash
mkdir lab-git-objects && cd lab-git-objects
git init -q
git config user.name "Sylvain"
git config user.email "s@x.fr"
```

---

## Étapes (en friction)

1. **Crée un premier snapshot.**
   ```bash
   echo "# TribuZen" > README.md
   git add README.md
   git commit -q -m "chore: init readme"
   ```
   Avant de continuer : **prédis** combien d'objets Git vient de créer. (Réponse dans le corrigé.)

2. **Descends le graphe à la main.** Pars de `HEAD`, lis le commit, puis son tree, puis le blob. À chaque étape, relève le hash et vérifie le `type` avec `git cat-file -t`. **Ne lis jamais `README.md` directement** — passe par les objets.

3. **Prouve la déduplication par contenu.** Calcule le hash du contenu `"# TribuZen"` avec `git hash-object --stdin` et compare-le au hash du blob obtenu à l'étape 2. Explique pourquoi ils sont identiques.

4. **Ajoute un sous-répertoire et navigue avec `ls-tree`.**
   ```bash
   mkdir -p src/features/invite
   echo "export const InviteForm = () => null;" > src/features/invite/InviteForm.tsx
   git add . && git commit -q -m "feat(invite): InviteForm"
   ```
   Utilise `git ls-tree -r HEAD --name-only` puis lis le fichier via son chemin d'objet (`git cat-file -p HEAD:src/features/invite/InviteForm.tsx`).

5. **Inspecte les refs.** Affiche le contenu de `.git/refs/heads/main` et de `.git/HEAD`. Confirme que la branche = un fichier de hash, et que HEAD pointe la branche.

6. **Détruis, puis récupère.** Fais un `reset --hard` vers le premier commit (perte apparente de `InviteForm`), constate la disparition, puis retrouve le commit orphelin via `git reflog` et récupère le fichier. **Ne recommite pas à la main** — utilise le reflog.

---

## Corrigé complet commenté

```bash
# ════════════════════════════════════════════════════════════════
# ÉTAPE 1 — Premier snapshot
# ════════════════════════════════════════════════════════════════
echo "# TribuZen" > README.md
git add README.md
git commit -q -m "chore: init readme"

# Prédiction : Git a créé 3 objets pour ce seul commit :
#   1 blob   (le contenu "# TribuZen\n")
#   1 tree   (le répertoire racine : README.md → hash du blob)
#   1 commit (pointe le tree + métadonnées, pas de parent)

# ════════════════════════════════════════════════════════════════
# ÉTAPE 2 — Descendre le graphe : commit → tree → blob
# ════════════════════════════════════════════════════════════════
git cat-file -t HEAD          # commit   ← type de l'objet HEAD
git cat-file -p HEAD          # affiche : tree <hash>, author, committer, message
# tree 2b297e6...             ← note ce hash de tree
#   (pas de ligne "parent" : premier commit du repo)

git cat-file -t HEAD^{tree}   # tree     ← HEAD^{tree} = le tree racine du commit
git cat-file -p HEAD^{tree}
# 100644 blob 3fa0d4b8...  README.md     ← une entrée : nom → hash de blob

git cat-file -t 3fa0d4b8      # blob
git cat-file -p 3fa0d4b8      # # TribuZen        ← le contenu réel, enfin
git cat-file -s 3fa0d4b8      # 11                ← taille en octets ("# TribuZen\n")

# CE QU'ON A PROUVÉ : le commit ne contient AUCUN texte de fichier.
# Il pointe un tree, qui pointe un blob, qui porte le contenu.
# Trois objets immuables reliés par hash = un snapshot.

# ════════════════════════════════════════════════════════════════
# ÉTAPE 3 — Déduplication par contenu
# ════════════════════════════════════════════════════════════════
echo "# TribuZen" | git hash-object --stdin
# 3fa0d4b8...   ← IDENTIQUE au hash du blob de l'étape 2

# POURQUOI : le hash est une fonction déterministe du contenu.
# Même contenu "# TribuZen\n" ⇒ même hash ⇒ Git ne stocke qu'UN blob,
# même si ce contenu apparaît dans 100 fichiers ou 100 commits.
# (Ton hash de COMMIT, lui, différera des exemples : il dépend de
#  l'auteur et de la date. Mais le hash du BLOB est universel.)

# ════════════════════════════════════════════════════════════════
# ÉTAPE 4 — Sous-répertoire + navigation ls-tree
# ════════════════════════════════════════════════════════════════
mkdir -p src/features/invite
echo "export const InviteForm = () => null;" > src/features/invite/InviteForm.tsx
git add . && git commit -q -m "feat(invite): InviteForm"

git ls-tree HEAD
# 100644 blob 3fa0d4b8...  README.md
# 040000 tree 9a1c...      src          ← src est un TREE, pas un blob

git ls-tree -r HEAD --name-only         # -r descend récursivement, ne montre que les blobs
# README.md
# src/features/invite/InviteForm.tsx

# Lire le fichier via son CHEMIN D'OBJET, sans ouvrir le working tree :
git cat-file -p HEAD:src/features/invite/InviteForm.tsx
# export const InviteForm = () => null;
#   Git a résolu : HEAD → tree racine → tree src → tree features
#                  → tree invite → blob InviteForm.tsx, en suivant les hashes.

# ════════════════════════════════════════════════════════════════
# ÉTAPE 5 — Les refs sont de simples pointeurs
# ════════════════════════════════════════════════════════════════
cat .git/refs/heads/main
# 7c2f9a1b...   ← la branche main N'EST QU'un fichier contenant le hash du sommet

cat .git/HEAD
# ref: refs/heads/main   ← HEAD pointe la branche (cas normal, "attached")

# ════════════════════════════════════════════════════════════════
# ÉTAPE 6 — Détruire puis récupérer via reflog
# ════════════════════════════════════════════════════════════════
# On note d'abord le hash du sommet actuel (le commit InviteForm) :
git rev-parse HEAD
# 7c2f9a1b...

# Reset destructeur vers le PREMIER commit : InviteForm disparaît de l'historique
git reset --hard HEAD~1
ls src/features/invite/InviteForm.tsx 2>/dev/null || echo "disparu du working tree"
# disparu du working tree

git log --oneline
# a1b2c3d chore: init readme     ← plus aucune trace de InviteForm dans le log

# MAIS l'objet commit existe toujours dans .git/objects — le reflog le prouve :
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~1
# 7c2f9a1b HEAD@{1}: commit: feat(invite): InviteForm   ← le commit "perdu"

# Option A — replanter une branche sur le commit orphelin (récupère TOUT l'état) :
git branch recup-invite 7c2f9a1b
git ls-tree -r recup-invite --name-only | grep invite
# src/features/invite/InviteForm.tsx     ← récupéré

# Option B — ne récupérer QUE le fichier dans la branche courante :
git checkout 7c2f9a1b -- src/features/invite/InviteForm.tsx
cat src/features/invite/InviteForm.tsx
# export const InviteForm = () => null;   ← le blob n'a jamais été détruit

# LEÇON : reset --hard a déplacé un POINTEUR, pas supprimé d'objets.
# Le commit, son tree et son blob vivaient toujours dans objects/,
# atteignables via le reflog. Rien n'est perdu tant que gc n'a pas
# expiré l'objet (par défaut ~90 jours).
```

**Pourquoi ce corrigé est correct :**
- Chaque étape ne suit que des **hashes** : à aucun moment on n'ouvre un fichier du working tree pour lire son contenu — on prouve que Git est bien une base d'objets adressée par contenu.
- Le hash de **blob** obtenu par `hash-object` est identique à celui du commit : preuve que l'adressage dépend du contenu, pas du contexte (déduplication).
- La récupération n'invente rien : le commit orphelin **existait déjà** dans `objects/`, le reflog n'a fait que fournir son hash. C'est la démonstration directe que `reset --hard` manipule des refs, pas des objets.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 20 minutes, sans rouvrir ce corrigé ni le module :**

1. Crée un repo avec **deux commits** et **deux fichiers de contenu identique** placés à deux chemins différents (`a/note.md` et `b/note.md`, même texte). Prouve avec `git ls-tree` qu'ils partagent **le même hash de blob** — un seul objet pour deux fichiers.
2. Crée un **tag annoté** `v0.1` et inspecte-le avec `git cat-file -p v0.1` : identifie l'objet pointé, son type, le taggeur. Compare avec un **tag léger** (`git tag v0.1-light`) — lequel crée un objet, lequel n'est qu'une ref ?
3. Passe en **detached HEAD** (`git checkout <hash-du-1er-commit>`), vérifie `cat .git/HEAD`, fais un commit « en l'air », puis retrouve-le après être revenu sur `main` — uniquement via `git reflog`.

**Critère de réussite :** tu expliques à voix haute, sans notes, pourquoi les deux `note.md` ne coûtent qu'un blob, et tu récupères le commit detached sans connaître son hash au préalable.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces réflexes servent en vrai :

**Inspecter une PR sans checkout.** Pour lire l'état exact d'un fichier au commit d'une PR de review :

```bash
git fetch origin pull/42/head
git cat-file -p FETCH_HEAD:src/features/invite/InviteForm.tsx
git ls-tree -r FETCH_HEAD --name-only | grep invite
```

**Récupérer un blob perdu après une bourde locale.** Le scénario exact du cas concret du module (`reset --hard` malheureux) :

```bash
git reflog                                          # localiser le commit orphelin
git checkout <hash> -- src/features/invite/InviteForm.tsx   # récupérer le fichier
# ou : git branch recup-invite <hash>               # récupérer tout l'état
```

**Auditer la taille du dépôt.** Comprendre le poids du `.git/` (assets, historique) :

```bash
git count-objects -vH
git gc                      # compacter en packfile si nécessaire
```

**Commit cible :**
```
docs(git): notes lab-01 — exploration objets + récupération reflog
```
(Aucune modif de code produit ici : le lab est de la pratique d'outil sur le vrai `.git`. Le livrable est ta capacité à expliquer chaque hash en session.)
