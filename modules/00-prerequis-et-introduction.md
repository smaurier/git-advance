---
titre: Prérequis et introduction au Git avancé
cours: 07-git-avance
notions: [au-delà de add/commit/push, modèle mental Git = DAG de snapshots, snapshots vs diffs, les trois zones working/staging/repository, HEAD et références, bases supposées acquises, carte du cours]
outcomes: [décrire Git comme un DAG de snapshots plutôt qu'une pile de diffs, situer un fichier dans les trois zones et localiser HEAD, auto-évaluer ses prérequis avant d'attaquer les modules avancés]
prerequis: []
next: 01-git-internals-objects
libs: []
tribuzen: le dépôt monorepo TribuZen lui-même comme terrain de versioning (historique, branches de features, PRs)
last-reviewed: 2026-07
---

# Prérequis et introduction au Git avancé

> **Outcomes — tu sauras FAIRE :** décrire Git comme un DAG de snapshots (pas une pile de diffs), situer n'importe quel fichier dans les trois zones et pointer où est HEAD, auto-évaluer tes prérequis avant d'attaquer les modules avancés.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu rejoins l'équipe qui développe TribuZen. Le dépôt est un monorepo git avec deux ans d'historique, une trentaine de branches de features ouvertes, et une CI qui refuse les merges dont l'historique est sale. Premier ticket : tu as commité trois fois sur `main` au lieu de ta branche, dont un commit qui contient un fichier `.env` avec un secret.

Avec les bases (`add` / `commit` / `push`), tu es bloqué. Tu ne sais pas :

- déplacer tes trois commits sur une nouvelle branche sans les perdre ;
- réécrire l'historique pour supprimer le `.env` de **tous** les commits ;
- comprendre pourquoi `main` local et `main` distant ont maintenant « divergé ».

```bash
# La situation, vue par Git
git log --oneline --graph
# * a1b2c3d (HEAD -> main) fix typo
# * d4e5f6a add .env avec secret   <-- à supprimer partout
# * 9a8b7c6 wip feature famille
# * 1122334 (origin/main) release 2.3.0
```

Ce cours commence exactement ici : là où `add`/`commit`/`push` ne suffisent plus. Mais avant de manipuler l'historique, il faut **le bon modèle mental**. Sans lui, chaque commande avancée (`rebase`, `reset`, `cherry-pick`) ressemble à de la magie dangereuse. Avec lui, elles deviennent des opérations prévisibles sur un graphe. C'est l'objet de ce module d'ouverture.

---

## 2. Théorie complète, concise

### 2.1 Au-delà de add / commit / push

Les tutoriels débutants s'arrêtent à un workflow linéaire : je modifie, `git add`, `git commit`, `git push`. Ça marche tant que tu es seul sur une branche unique. Dès qu'on est en équipe (ESN, squad produit), trois besoins apparaissent que les bases ne couvrent pas :

1. **Débloquer les situations** : commits sur la mauvaise branche, historique divergent, secret à purger, merge à défaire. Il faut savoir naviguer et réécrire.
2. **Historique propre** : les reviewers lisent tes commits. Un historique clair et atomique = review rapide et `git blame`/`git bisect` exploitables plus tard.
3. **Collaborer** : brancher, merger ou rebaser, gérer des PRs, partager du code sans écraser celui des autres.

Répondre à ces besoins exige de comprendre ce que Git fait *vraiment* sous le capot — pas juste la surface des commandes.

### 2.2 Le modèle mental : Git = DAG de snapshots

C'est **la** clé du cours. Deux idées.

**Idée 1 — Git stocke des snapshots, pas des diffs.** Beaucoup imaginent Git comme une pile de patchs (« le commit 2 = les lignes changées depuis le commit 1 »). C'est faux. À chaque commit, Git enregistre l'état complet de l'arborescence à cet instant — un **snapshot**. Pour les fichiers inchangés, il ne duplique pas : il réutilise le pointeur vers le contenu précédent (identifié par son hash). Les diffs que tu vois (`git diff`, `git show`) sont **calculés à la demande** en comparant deux snapshots, pas stockés.

**Idée 2 — Les commits forment un DAG (graphe orienté acyclique).** Chaque commit pointe vers son (ou ses) **parent(s)**. Un commit normal a un parent, un commit de merge en a deux ou plus, le tout premier commit n'en a aucun. En suivant les flèches parent, on remonte l'histoire.

```
        C---D---E   (feature)
       /
  A---B---F---G     (main)
```

Ici `E` connaît son parent `D`, qui connaît `C`, qui connaît `B` : la branche `feature` « part » de `B`. Ce n'est pas une ligne, c'est un graphe. `rebase`, `merge`, `cherry-pick` sont toutes des manipulations de ce graphe. Une fois ce modèle acquis, ces commandes cessent d'être mystérieuses.

Une **branche** n'est qu'un pointeur mobile (léger, 41 octets) vers un commit. Créer une branche ne copie rien : ça pose une étiquette. C'est pourquoi brancher est instantané dans Git.

### 2.3 Les trois zones + HEAD

Un fichier suivi par Git vit dans l'une de trois zones. C'est le deuxième pilier mental.

| Zone | Autre nom | Ce que c'est | Commande qui y écrit |
|---|---|---|---|
| **Working directory** | working tree | Tes fichiers réels sur le disque, éditables | ton éditeur |
| **Staging area** | index | La photo *préparée* du prochain commit | `git add` |
| **Repository** | `.git/` | Les commits gravés, immuables | `git commit` |

Le flux : tu édites (working) → `git add` promeut vers l'index (staging) → `git commit` grave l'index dans le repository.

```bash
git status          # montre working vs staging vs dernier commit
git diff            # working  <->  staging   (pas encore add)
git diff --staged   # staging  <->  dernier commit (add fait, pas commit)
```

**HEAD** est un pointeur spécial : il désigne « où tu es » — normalement la branche courante, donc le commit sur lequel repose ton working directory. Après `git commit`, HEAD (et la branche qu'il suit) avance vers le nouveau commit. `HEAD~1` désigne le parent, `HEAD~2` le grand-parent, etc. Comprendre où pointe HEAD, c'est comprendre ce que `reset`, `checkout` et `switch` déplacent.

### 2.4 Bases supposées acquises

Ce cours **suppose** que ces gestes te sont familiers. Ils ne seront pas ré-enseignés.

```bash
git init  /  git clone <url>              # démarrer ou cloner
git add <fichier>  /  git commit -m "..." # enregistrer
git push  /  git pull  /  git fetch       # synchroniser avec le distant
git branch  /  git switch -c <nom>        # créer / changer de branche
# résoudre un conflit de merge simple à la main
```

Si l'une de ces commandes te fait hésiter, révise-la avant le module 01. Le § 2.6 te donne un auto-test.

### 2.5 Carte du cours

Les modules suivent une progression novice → expert. Chaque brique s'appuie sur la précédente :

```
01 git-internals-objects   -> ce qu'est un objet (blob/tree/commit), le SHA-1
02 branching               -> stratégies de branches, pointeurs
03 merge-vs-rebase         -> les deux façons d'intégrer, réécriture d'historique
04 bisect                  -> trouver un bug en O(log n) commits
05 hooks                   -> automatiser (pre-commit, CI locale)
06 worktrees-submodules    -> plusieurs branches en parallèle, dépendances git
07 monorepos               -> gérer un gros dépôt multi-paquets (TribuZen)
08 workflows               -> conventions d'équipe (trunk-based, git-flow, PRs)
```

Le fil rouge : à chaque module, on manipule le dépôt TribuZen. Ce module 00 pose seulement le vocabulaire et le modèle mental. Pas de lab ici — la pratique commence au module 01.

### 2.6 Auto-test de prérequis

Réponds mentalement. Si tu bloques sur plus d'une question, révise les bases d'abord.

1. Quelle est la différence entre `git fetch` et `git pull` ?
2. Que fait `git add` exactement — sur quelle zone agit-il ?
3. Comment créer une branche `feature/x` et t'y placer en une commande ?
4. Que se passe-t-il si deux commits modifient la même ligne et qu'on les merge ?

Réponses en fin de § 3 (worked example 2).

---

## 3. Worked examples

### Exemple 1 — Situer un fichier dans les trois zones

Tu modifies deux fichiers de TribuZen et n'en stages qu'un. Objectif : lire l'état sans confusion.

```bash
# État de départ : rien de modifié, HEAD sur main
$ git status
On branch main
nothing to commit, working tree clean

# Tu édites deux fichiers
$ echo "// TODO auth" >> src/auth.ts
$ echo "// TODO log"  >> src/logger.ts

# Tu ne stages QUE auth.ts
$ git add src/auth.ts

$ git status
On branch main
Changes to be committed:      # <-- ZONE STAGING (index)
  modified:   src/auth.ts
Changes not staged for commit: # <-- ZONE WORKING DIRECTORY
  modified:   src/logger.ts
```

Lecture :

- `src/auth.ts` est passé de **working** à **staging** grâce au `git add`. Il fait partie de la photo du prochain commit.
- `src/logger.ts` est resté en **working**. Il ne sera PAS dans le prochain commit.
- Le **repository** contient toujours l'ancienne version des deux fichiers (le dernier commit).

Vérification par les diffs :

```bash
$ git diff              # compare working <-> staging
# montre logger.ts uniquement (auth.ts est déjà stagé)

$ git diff --staged     # compare staging <-> dernier commit
# montre auth.ts uniquement
```

Si tu commites maintenant, seul `auth.ts` est gravé ; `logger.ts` reste en attente dans le working directory. C'est le contrôle fin que donnent les trois zones.

### Exemple 2 — Lire un DAG et répondre à l'auto-test

Voici l'historique d'une feature TribuZen visualisé en graphe.

```bash
$ git log --oneline --graph --all
* 7f3a1c2 (HEAD -> feature/invites) envoi email invitation
* c9d2e10 modèle Invitation
| * 5b6f8a1 (origin/main, main) release 2.4.0
|/
* 2a1b3c4 setup mailer
```

Ce que le graphe dit :

- `feature/invites` et `main` partagent l'ancêtre commun `2a1b3c4`, puis ont divergé.
- `HEAD` pointe sur `feature/invites`, dernier commit `7f3a1c2`.
- `main` local et `origin/main` sont au même endroit (`5b6f8a1`) : synchronisés.
- Pour intégrer la feature, on choisira **merge** (crée un commit de fusion, garde la divergence visible) ou **rebase** (rejoue `c9d2e10` et `7f3a1c2` par-dessus `5b6f8a1`, historique linéaire). C'est le module 03.

**Réponses à l'auto-test du § 2.6 :**

1. `git fetch` télécharge les commits distants dans `origin/*` **sans** toucher ta branche. `git pull` = `fetch` **puis** `merge` (ou `rebase`) dans ta branche courante.
2. `git add` copie l'état actuel d'un fichier du **working directory** vers la **staging area** (l'index). Il fige une photo ; rééditer le fichier après un `add` exige un nouvel `add`.
3. `git switch -c feature/x` (ou l'ancien `git checkout -b feature/x`).
4. Git détecte un **conflit** sur cette ligne : il insère des marqueurs `<<<<<<<` / `=======` / `>>>>>>>` dans le fichier, met le merge en pause, et attend que tu choisisses la version finale puis `git add` + commit.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — « Git stocke les différences entre versions »

Faux. Git stocke des **snapshots complets** de l'arborescence à chaque commit (avec déduplication par hash pour les fichiers inchangés). Les diffs sont *calculés* à l'affichage. Conséquence pratique : un commit n'est pas « attaché » au précédent par un patch — il pointe vers son parent et référence un état complet. C'est pourquoi `cherry-pick` peut rejouer un commit ailleurs et pourquoi `reset` peut sauter d'un état à un autre instantanément.

### PIÈGE #2 — « Une branche est une copie de fichiers »

Faux. Une branche est un simple **pointeur de 41 octets** vers un commit. Créer une branche ne duplique aucun fichier ; c'est pour ça que c'est instantané. Ce qui « change » quand tu switches de branche, c'est le contenu du working directory que Git reconstitue depuis le snapshot pointé — pas la branche elle-même.

### PIÈGE #3 — Confondre `git add` déjà fait avec « c'est commité »

`git add` place le fichier en **staging**, pas dans le repository. Tant que tu n'as pas `commit`, rien n'est gravé. Piège courant : tu `add`, tu ré-édites le fichier, tu `commit` — la ré-édition n'est **pas** dans le commit car elle est restée en working. Il fallait re-`add`.

### PIÈGE #4 — Confondre `git fetch` et `git pull`

`fetch` est **sûr** : il met à jour tes références distantes (`origin/main`) sans modifier ton travail. `pull` **modifie ta branche courante** (merge ou rebase automatique). En cas de doute sur l'état du distant, `fetch` puis inspecter, jamais `pull` aveugle.

### PIÈGE #5 — Croire que HEAD = la branche

HEAD pointe *normalement* sur une branche (qui pointe sur un commit). Mais après un `git checkout <sha>`, HEAD pointe **directement** sur un commit : c'est l'état « detached HEAD ». Les commits créés là ne sont rattachés à aucune branche et risquent d'être perdus (garbage-collectés) si tu ne crées pas de branche. Savoir où pointe HEAD évite la panique.

---

## 5. Ancrage TribuZen

Le terrain de tout le cours est le **dépôt TribuZen lui-même** : un monorepo git réel avec un historique vivant, des branches de features et des Pull Requests. Ce module 00 ne modifie rien — il installe le vocabulaire pour gérer proprement le versioning du produit dans les modules suivants.

Concrètement, ce que le modèle mental de ce module te permettra de faire sur TribuZen plus loin dans le cours :

- **Historique** : chaque release TribuZen (`2.3.0`, `2.4.0`) est un commit taggé dans le DAG ; on apprendra à naviguer et bisecter dedans (module 04).
- **Branches de features** : `feature/invites`, `feature/famille`, `fix/auth-token` sont des pointeurs qui partent de `main` et le rejoignent via merge/rebase (modules 02-03).
- **PRs** : chaque PR = une branche proposée à l'intégration, dont on veut un historique propre et atomique pour la review (module 08).
- **Monorepo** : TribuZen regroupe front, API et paquets partagés dans un seul dépôt — la gestion à l'échelle est le module 07.

Autrement dit : ce cours sert à tenir le versioning de TribuZen comme un pro, et tout part du modèle « DAG de snapshots + trois zones + HEAD » posé ici.

---

## 6. Points clés

1. Git avancé commence là où `add`/`commit`/`push` s'arrêtent : débloquer, historique propre, collaborer en équipe.
2. Git stocke des **snapshots** complets, pas des diffs ; les diffs sont calculés à la demande.
3. Les commits forment un **DAG** : chaque commit pointe vers son/ses parent(s) ; toutes les commandes avancées manipulent ce graphe.
4. Une **branche** est juste un pointeur léger vers un commit — créer une branche ne copie rien.
5. Trois zones : **working directory** (disque) → `git add` → **staging/index** → `git commit` → **repository** (`.git/`).
6. **HEAD** désigne où tu es ; `HEAD~1` = le parent. Un HEAD « detached » pointe un commit sans branche (commits à risque).
7. La carte du cours va des internals aux workflows d'équipe, appliquée au monorepo TribuZen à chaque étape.

---

## 7. Seeds Anki

```
Git stocke-t-il des diffs ou des snapshots à chaque commit ?|Des snapshots : l'état complet de l'arborescence, avec déduplication par hash pour les fichiers inchangés. Les diffs sont calculés à la demande, jamais stockés.
Qu'est-ce qu'un DAG dans le contexte Git ?|Un graphe orienté acyclique de commits : chaque commit pointe vers son ou ses parents (1 pour un commit normal, 2+ pour un merge, 0 pour le premier). Rebase/merge/cherry-pick manipulent ce graphe.
Qu'est-ce qu'une branche Git, physiquement ?|Un simple pointeur mobile de 41 octets vers un commit. Créer une branche ne copie aucun fichier — d'où l'instantanéité.
Nomme les trois zones de Git et la commande qui écrit dans chacune.|Working directory (édition par l'éditeur), staging area/index (git add), repository/.git (git commit).
À quoi sert HEAD et que désigne HEAD~1 ?|HEAD désigne « où tu es » — normalement la branche courante et donc le commit courant. HEAD~1 est son parent, HEAD~2 le grand-parent, etc.
Quelle est la différence entre git fetch et git pull ?|fetch télécharge les commits distants dans origin/* sans toucher ta branche (sûr). pull = fetch puis merge/rebase dans ta branche courante (modifie ton travail).
Qu'est-ce qu'un état "detached HEAD" et pourquoi est-il risqué ?|HEAD pointe directement sur un commit au lieu d'une branche (après git checkout <sha>). Les commits créés là ne sont sur aucune branche et peuvent être garbage-collectés si on ne crée pas de branche.
Si je fais git add sur un fichier puis je le ré-édite avant de committer, que contient le commit ?|La version figée au moment du git add, PAS la ré-édition. La ré-édition est restée en working directory ; il faut re-git add pour l'inclure.
```
