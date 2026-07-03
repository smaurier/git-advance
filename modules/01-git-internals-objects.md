---
titre: Git internals et modèle objet
cours: 07-git-avance
notions: [contenu du dossier .git, blob, tree, commit, tag annoté, adressage par contenu (SHA-1, migration SHA-256), graphe de commits (DAG), refs et branches comme pointeurs, HEAD, tags, git cat-file, git hash-object, git ls-tree, index/staging comme arbre, packfiles et garbage collection, reflog]
outcomes: [explorer les objets d'un vrai repo avec cat-file/hash-object/ls-tree, reconstituer un commit à la main depuis ses objets, retrouver un objet perdu via le reflog]
prerequis: [00-prerequis-et-introduction]
next: 02-strategies-branching
libs: []
tribuzen: exploration du modèle objet du repo TribuZen — comprendre un commit comme snapshot et récupérer un blob perdu via reflog
last-reviewed: 2026-07
---

# Git internals et modèle objet

> **Outcomes — tu sauras FAIRE :** explorer les objets d'un vrai repo avec `cat-file`/`hash-object`/`ls-tree`, reconstituer un commit à la main depuis ses objets, retrouver un objet perdu via le reflog.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Sur le repo TribuZen, tu fais un `git reset --hard HEAD~3` en pensant nettoyer des commits de test. Trois heures de travail sur le module « invitations famille » disparaissent de l'historique. Ton chef passe la tête : « tu peux récupérer le composant `InviteForm` que tu avais fini hier soir ? »

Ta réaction dépend entièrement de **ce que tu crois que Git a fait** :

- Si tu crois que Git stocke des **diffs** appliqués les uns sur les autres, tu penses que `reset --hard` a « effacé » les lignes. Panique.
- Si tu sais que Git stocke des **snapshots complets adressés par leur contenu**, tu sais que ton travail existe encore : un `commit` orphelin pointe vers un `tree`, qui pointe vers le `blob` de `InviteForm.tsx`. Rien n'a été supprimé — seul un **pointeur de branche** a bougé.

```bash
# Le commit "perdu" est encore là — le reflog garde la trace de HEAD
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~3
# 9f8e7d6 HEAD@{1}: commit: feat(invite): InviteForm complet   ← le voilà

git branch recup-invite 9f8e7d6   # on replante un pointeur dessus
```

Ce module démystifie **tout le reste du cours**. Une fois que tu vois `.git/` comme une petite base de données d'objets adressés par hash, `reset`, `rebase`, `cherry-pick`, `bisect` cessent d'être de la magie : ce sont des déplacements de pointeurs sur un graphe.

**Le mantra à graver :** *tout est un snapshot, adressé par son hash. Git ne stocke pas de diffs, il stocke des objets immuables et déduplique par contenu.*

---

## 2. Théorie complète, concise

### 2.1 Le dossier `.git/` est la base de données

Tout l'état de ton repo tient dans `.git/`. Supprime-le et tu as un simple dossier de fichiers ; garde-le seul (sans working tree) et tu peux tout reconstruire.

```bash
ls -a .git/
# HEAD          → pointeur vers la branche courante (fichier texte)
# config        → configuration locale du repo
# objects/      → TOUS les objets (blobs, trees, commits, tags)
# refs/         → les références nommées
#   heads/      →   branches locales (1 fichier = 1 branche = 1 hash)
#   tags/       →   tags
#   remotes/    →   branches distantes suivies
# index         → le staging area (fichier binaire)
# logs/         → le reflog (historique des mouvements des refs)
# hooks/        → scripts déclenchés par des événements Git
```

Deux mondes à distinguer :
- **La base d'objets** (`objects/`) : immuable, adressée par contenu. On n'y écrase jamais rien.
- **Les refs** (`refs/`, `HEAD`) : mutables, ce sont de simples étiquettes qui pointent vers des objets. C'est *elles* qui bougent quand tu commit, reset, rebase.

### 2.2 Adressage par contenu (content-addressable)

Chaque objet est identifié par le **hash de son contenu**. Le hash n'est pas un numéro attribué ni un timestamp : c'est une fonction déterministe du contenu lui-même.

```bash
echo "Salut TribuZen" | git hash-object --stdin
# 8b2e...  ← ce hash dépend UNIQUEMENT du contenu "Salut TribuZen\n"
```

Conséquences directes, fondatrices de tout Git :
1. **Même contenu ⇒ même hash.** Deux fichiers identiques (ou le même fichier dans 100 commits) = **un seul blob** stocké. C'est la déduplication automatique.
2. **Contenu modifié ⇒ hash différent.** Impossible de modifier un objet sans changer son adresse. Les objets sont donc **immuables** : « éditer » un commit crée en réalité un nouvel objet avec un nouveau hash.
3. **Intégrité vérifiable.** Si un octet du `.git/objects` se corrompt, le contenu ne correspond plus à son hash — Git le détecte.

> **SHA-1 → SHA-256 (note d'actualité).** Historiquement Git utilise SHA-1 (hash de 40 caractères hexa). Une migration vers **SHA-256** (64 caractères) existe : `git init --object-format=sha256`. Elle reste peu répandue en 2026 (interop limitée avec les forges), mais le principe est identique — seule la longueur du hash change. Retiens le concept « adressage par contenu », pas l'algorithme précis.

### 2.3 Les 4 types d'objets

Git ne connaît que **quatre** types d'objets. Tout l'historique en est fait.

**Blob — le contenu d'un fichier.** Un blob stocke des octets, rien d'autre : ni nom, ni chemin, ni date. Le nom du fichier vit dans le tree parent, pas dans le blob.

```bash
git cat-file -t 8b2e     # -t = type
# blob
git cat-file -p 8b2e     # -p = pretty print (contenu)
# Salut TribuZen
```

**Tree — un répertoire.** Un tree est une liste d'entrées `mode | type | hash | nom`. Il fait le lien entre un **nom de fichier** et le **blob** (ou sous-tree) qui porte son contenu.

```bash
git cat-file -p HEAD^{tree}
# 100644 blob 3b18e5...    README.md
# 100644 blob a5c196...    package.json
# 040000 tree 7d1b31...    src
#
# Modes :
# 100644 = fichier normal      100755 = fichier exécutable
# 040000 = sous-répertoire     120000 = lien symbolique
```

**Commit — un snapshot avec métadonnées.** Un commit pointe vers **un seul tree** (l'état complet du projet à cet instant) + un ou plusieurs **parents** + auteur, committer, message. Un commit ne contient **aucun diff** : il référence le snapshot entier via le tree racine.

```bash
git cat-file -p HEAD
# tree 7d1b31f...              ← le snapshot complet
# parent 3e4a56b...            ← commit précédent (0 pour le 1er, 2+ pour un merge)
# author Sylvain <s@x.fr> 1719830400 +0200
# committer Sylvain <s@x.fr> 1719830400 +0200
#
# feat(invite): InviteForm complet
```

**Tag annoté — un objet nommé avec métadonnées.** Il enveloppe un commit (ou n'importe quel objet) avec un nom, un taggeur et un message. À ne pas confondre avec un *tag léger* qui est une simple ref (fichier dans `refs/tags/`) sans objet dédié.

```bash
git tag -a v1.0.0 -m "Première release"
git cat-file -p v1.0.0
# object 3e4a56b...    ← le commit taggé
# type commit
# tag v1.0.0
# tagger Sylvain <s@x.fr> 1719830400 +0200
#
# Première release
```

### 2.4 Le graphe : comment les objets s'enchaînent

Les objets se référencent par hash et forment une chaîne unidirectionnelle :

```
commit ──tree──▶ tree ──▶ blob (README.md)
   │               ├─────▶ blob (package.json)
   │               └─tree─▶ tree (src) ──▶ blob (App.tsx)
   │
   └─parent─▶ commit ──tree──▶ ...
```

Chaque commit pointe vers son (ses) parent(s). L'ensemble forme un **DAG** — *Directed Acyclic Graph* : dirigé (les flèches vont de l'enfant vers le parent), acyclique (on ne peut pas revenir à un commit déjà visité).

```
    A ◀─ B ◀─ C ◀─ D   (main)
                   ▲
                    ╲
                     E ◀─ F   (feature)
```

Un **merge** crée un commit à **deux parents** ; c'est la seule façon d'avoir plusieurs flèches sortantes. Tout le reste du cours (rebase, cherry-pick, bisect) consiste à parcourir ou réécrire ce graphe.

### 2.5 Les refs : branches, HEAD, tags

Un objet commit n'a pas de nom lisible — juste son hash. Les **refs** sont les étiquettes humaines posées dessus.

**Une branche est un fichier de 41 octets (40 hex + retour ligne)** contenant le hash du dernier commit :

```bash
cat .git/refs/heads/main
# d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
```

Créer une branche = écrire un fichier de 41 octets (40 hex + retour ligne). C'est pour ça que brancher dans Git est instantané et gratuit. Committer sur une branche = **avancer ce pointeur** vers le nouveau commit.

**HEAD est le pointeur des pointeurs.** Il dit « sur quelle branche je suis » :

```bash
cat .git/HEAD
# ref: refs/heads/main        ← HEAD suit la branche main (cas normal)

# Après git checkout <hash> → "detached HEAD" : HEAD pointe un commit direct
cat .git/HEAD
# d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
```

**Tags** : `refs/tags/*`. Un tag léger pointe directement un commit ; un tag annoté pointe l'objet tag (voir 2.3). Contrairement aux branches, un tag ne bouge pas quand tu commit.

### 2.6 L'index (staging area) est un arbre

Le staging n'est pas une « liste de fichiers cochés » : c'est un **arbre en attente**, stocké dans `.git/index` (binaire). `git add` calcule le blob d'un fichier, l'écrit dans `objects/`, et enregistre l'entrée (chemin + hash + métadonnées) dans l'index.

```bash
git ls-files --stage        # lire l'index : ce qui sera dans le prochain tree
# 100644 a5c196... 0  package.json
# 100644 3b18e5... 0  README.md
```

Au moment du `git commit`, Git **transforme l'index en objets tree**, crée le commit qui pointe ce tree, et avance la branche. L'index est donc le brouillon du prochain snapshot.

### 2.7 Packfiles et garbage collection (survol)

Au début, chaque objet est un fichier « loose » dans `.git/objects/xx/yyyy…`. Pour économiser l'espace, Git regroupe périodiquement les objets dans des **packfiles** compressés (avec delta-compression *interne au pack* — c'est là, et seulement là, que des diffs apparaissent, comme optimisation de stockage, jamais comme modèle logique).

```bash
git count-objects -v         # combien d'objets loose / packés
git gc                       # compacte en packfile (souvent lancé auto)
ls .git/objects/pack/        # pack-*.pack (données) + pack-*.idx (index)
```

`gc` supprime aussi les objets **inaccessibles** depuis toute ref *et* expirés du reflog. C'est le seul moment où un objet peut réellement disparaître.

### 2.8 Le reflog : ton filet de sécurité

Le reflog enregistre **chaque mouvement des refs locales** (HEAD et branches) : commit, reset, rebase, checkout, merge. Même quand un commit n'est plus atteignable par aucune branche, le reflog le garde accessible (par défaut ~90 jours).

```bash
git reflog                       # historique des positions de HEAD
# 9f8e7d6 HEAD@{1}: commit: feat(invite): InviteForm complet
git reflog show main             # historique d'une branche précise
```

C'est ce qui rend Git presque impossible à « casser » en local : tant que `gc` n'a pas expiré l'objet, un `reset --hard`, un rebase raté ou une branche supprimée sont **récupérables**.

---

## 3. Worked examples

### Exemple 1 — Reconstituer un commit à la main

On part d'un repo neuf et on descend du commit jusqu'au contenu, uniquement avec les commandes de plomberie.

```bash
# Setup — un repo minimal avec un seul fichier
mkdir demo-objets && cd demo-objets && git init -q
echo "# TribuZen" > README.md
git add README.md
git commit -q -m "chore: init readme"

# 1) Le commit — quel tree, quel parent, quelles métadonnées ?
git cat-file -p HEAD
# tree 2b297e643c551e76cfa1b93813fdf4f9a92f8f2e
# author  Sylvain <s@x.fr> 1719830400 +0200
# committer Sylvain <s@x.fr> 1719830400 +0200
#
# chore: init readme
#   → pas de ligne "parent" : c'est le tout premier commit

# 2) Le tree racine — quelles entrées ?
git cat-file -p HEAD^{tree}
# 100644 blob 9eb85ff0d9... README.md
#   → une entrée : le fichier README.md pointe vers ce blob

# 3) Le blob — le contenu réel
git cat-file -p 9eb85ff0d9
# # TribuZen

# 4) Vérifier le type + la taille de chaque objet
git cat-file -t HEAD          # commit
git cat-file -t HEAD^{tree}   # tree
git cat-file -t 9eb85ff0d9    # blob
git cat-file -s 9eb85ff0d9    # 11  (octets : "# TribuZen\n")
```

**Ce qu'on vient de prouver :** `commit → tree → blob`. Le commit ne contient pas le texte du README ; il contient le hash d'un tree, qui contient le hash d'un blob, qui contient le texte. Trois objets immuables reliés par hash.

**Vérifier la déduplication par contenu :**

```bash
# Le hash d'un contenu est calculable SANS commit, avec hash-object
echo "# TribuZen" | git hash-object --stdin
# 9eb85ff0d9...   ← EXACTEMENT le même hash que le blob du commit

# Donc : recréer le même fichier ailleurs ne crée PAS un nouveau blob.
# Même contenu = même hash = même objet, stocké une seule fois.
```

### Exemple 2 — Parcourir un sous-répertoire avec `ls-tree`

`git ls-tree` lit un tree sans dérouler tout `cat-file`. Utile pour naviguer une arborescence à un commit donné.

```bash
mkdir -p src/components
echo "export const App = () => null;" > src/components/App.tsx
git add . && git commit -q -m "feat: squelette src"

# Le tree racine — src apparaît comme une entrée de type tree
git ls-tree HEAD
# 100644 blob 9eb85ff0...  README.md
# 040000 tree 8c4f21a9...  src

# Descendre récursivement, en ne montrant que les fichiers (blobs)
git ls-tree -r HEAD --name-only
# README.md
# src/components/App.tsx

# Lire directement le contenu d'un fichier à ce commit, via son chemin
git cat-file -p HEAD:src/components/App.tsx
# export const App = () => null;
```

**À retenir :** `HEAD:chemin/fichier` est un raccourci d'adressage — Git résout `HEAD` → tree racine → sous-tree `src` → sous-tree `components` → blob `App.tsx`, en suivant les hashes. Tu viens de faire à la main ce que fait chaque `git show`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — « Git stocke des diffs entre versions »

**Faux.** Git stocke des **snapshots complets** : chaque commit référence un tree qui représente l'intégralité du projet à cet instant. Les diffs que tu vois (`git diff`, `git log -p`) sont **calculés à la volée** en comparant deux snapshots, pas stockés.

```bash
# Ce que git log -p AFFICHE (un diff) n'est pas ce que Git STOCKE (deux trees)
git log -p       # diff reconstruit en comparant commit et parent
```

La seule exception est la delta-compression **à l'intérieur des packfiles** — une optimisation de disque invisible au modèle logique. Conceptuellement : snapshots, jamais diffs.

### PIÈGE #2 — « Un blob connaît son nom de fichier »

**Faux.** Le blob ne contient que le contenu. Le **nom** vit dans le tree parent. Corollaire : renommer un fichier sans en changer le contenu **ne crée pas de nouveau blob** — seul le tree change (nouvelle entrée `nom → même hash`). C'est pourquoi Git « détecte » les renommages : même blob, chemin différent.

### PIÈGE #3 — « reset --hard / rebase détruit mes commits »

**Faux en local.** Ces commandes déplacent des **refs** ; elles ne suppriment pas d'objets. Le commit « perdu » reste dans `objects/` et reste atteignable via `git reflog` (jusqu'à expiration + `gc`). Réflexe : `git reflog`, retrouve le hash, `git branch recup <hash>`. Ce qui détruit vraiment, c'est `git gc` sur un objet devenu inaccessible **et** expiré du reflog.

### PIÈGE #4 — « Une branche contient les commits »

**Faux.** Une branche est un **pointeur** vers *un seul* commit (le sommet). Les commits « de la branche » sont juste ceux atteignables en remontant les parents depuis ce sommet. Supprimer une branche (`git branch -d`) efface l'étiquette, **pas** les commits — qui restent tant qu'une autre ref (ou le reflog) les atteint.

### PIÈGE #5 — « Le staging area est une liste de fichiers »

**Imprécis.** L'index est un **arbre complet** (`.git/index`) décrivant l'état du prochain snapshot, avec le hash de blob de chaque fichier stagé. `git add` écrit déjà le blob dans `objects/` — bien avant le commit. Le commit ne fait que figer l'index en objets tree.

---

## 5. Ancrage TribuZen

Sur le repo `smaurier/tribuzen`, ces notions servent au quotidien :

**Comprendre un commit comme snapshot.** Quand tu review une PR « feat(invite): InviteForm », tu peux inspecter l'état exact du fichier à ce commit sans checkout :

```bash
git cat-file -p <hash-commit>:src/features/invite/InviteForm.tsx
git ls-tree -r <hash-commit> --name-only | grep invite
```

**Retrouver un blob perdu via reflog.** Scénario réel du cas concret : un `reset --hard` a fait disparaître `InviteForm`. La récupération repose entièrement sur le modèle objet :

```bash
git reflog                                   # localiser le commit orphelin
git branch recup-invite <hash>               # replanter un pointeur
# ou, pour ne récupérer QUE le fichier :
git checkout <hash> -- src/features/invite/InviteForm.tsx
```

**Explorer les objets du repo.** Pour comprendre pourquoi le `.git` de TribuZen pèse lourd (assets, historique) :

```bash
git count-objects -vH        # taille des objets loose + packés
git rev-list --objects --all | head -20   # lister les objets atteignables
```

Ces réflexes reviennent dans **tout le cours** : `02-strategies-branching` manipule les pointeurs de branches, `03-merge-vs-rebase` réécrit le DAG, `05-git-bisect` parcourt le graphe. Ce module est la fondation.

---

## 6. Points clés

1. `.git/` est une base de données : `objects/` (immuable, adressé par contenu) + refs (mutables, de simples pointeurs).
2. Adressage par contenu : le hash = fonction du contenu ⇒ même contenu = même objet (déduplication), objet modifié = nouvelle adresse (immuabilité).
3. Quatre types d'objets seulement : **blob** (contenu), **tree** (répertoire nom→hash), **commit** (snapshot + parents + méta), **tag annoté** (objet nommé).
4. Tout est **snapshot, jamais diff** : un commit pointe un tree entier ; les diffs sont calculés à la volée.
5. Le graphe est un DAG : chaque commit pointe ses parents ; un merge a deux parents.
6. Une branche = un fichier de 41 octets (40 hex + retour ligne) pointant un commit ; HEAD pointe la branche courante (ou un commit en detached HEAD).
7. L'index (`.git/index`) est l'arbre du prochain snapshot ; `git add` écrit déjà les blobs.
8. `cat-file -t/-p/-s`, `hash-object`, `ls-tree` sont les outils de plomberie pour explorer les objets.
9. Le reflog garde les mouvements de refs ⇒ `reset --hard`/rebase sont récupérables tant que `gc` n'a pas expiré l'objet.
10. SHA-1 aujourd'hui, SHA-256 en migration : le concept d'adressage par contenu est identique.

---

## 7. Seeds Anki

```
Git stocke-t-il des diffs ou des snapshots entre versions ?|Des snapshots complets. Chaque commit pointe un tree représentant tout le projet à cet instant. Les diffs affichés (git diff, log -p) sont calculés à la volée. La seule delta-compression est interne aux packfiles (optimisation disque).
Quels sont les 4 types d'objets Git et que contient chacun ?|blob = contenu d'un fichier (octets seuls) ; tree = répertoire (liste nom→hash) ; commit = snapshot (un tree) + parent(s) + métadonnées ; tag annoté = objet nommé enveloppant un commit avec taggeur+message.
Que signifie "content-addressable" pour Git ?|L'adresse (hash) d'un objet est calculée à partir de son contenu. Conséquences : même contenu = même hash = objet stocké une seule fois (déduplication) ; contenu modifié = hash différent (objets immuables).
Un blob contient-il le nom du fichier ?|Non. Le blob ne contient que le contenu. Le nom vit dans le tree parent (entrée nom→hash). Renommer sans changer le contenu ne crée pas de nouveau blob, seulement un nouveau tree.
Qu'est-ce qu'une branche Git, concrètement ?|Un fichier de 41 octets (40 hex + retour ligne) dans .git/refs/heads/ contenant le hash du commit de sommet. Créer/déplacer une branche = écrire ce fichier. Les commits "de la branche" sont ceux atteignables en remontant les parents.
Que fait git reset --hard au niveau des objets ? Est-ce récupérable ?|Il déplace le pointeur de branche (et HEAD), sans supprimer d'objets. Le commit reste dans objects/ et atteignable via git reflog. Récupérable tant que gc ne l'a pas expiré : git reflog puis git branch recup <hash>.
À quoi sert le reflog ?|Il enregistre chaque mouvement des refs locales (HEAD, branches) : commit, reset, rebase, checkout, merge. Il rend récupérables des commits devenus inaccessibles par toute branche (par défaut ~90 jours).
Le staging area (index) est-il une liste de fichiers ?|Non, c'est l'arbre complet du prochain snapshot (.git/index, binaire), avec le hash de blob de chaque fichier. git add écrit déjà le blob dans objects/ ; le commit ne fait que figer l'index en objets tree.
Quelle commande lit le contenu et le type d'un objet par son hash ?|git cat-file -p <hash> (pretty print du contenu), git cat-file -t <hash> (type), git cat-file -s <hash> (taille en octets). git hash-object calcule le hash d'un contenu ; git ls-tree liste un tree.
Où est le cœur mutable vs immuable de Git ?|Immuable : la base d'objets (.git/objects), adressée par contenu, jamais écrasée. Mutable : les refs (.git/refs, HEAD), simples étiquettes qui pointent des objets et bougent aux commit/reset/rebase.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-01-git-objects/README.md`. Explorer les objets d'un vrai repo avec `cat-file`/`hash-object`/`ls-tree`, reconstituer un commit à la main du commit jusqu'au blob, puis retrouver un objet perdu via le reflog.
