---
titre: Worktrees et submodules
cours: 07-git-avance
notions: [git worktree add/list/remove/prune, plusieurs branches checkout en parallele sans stash ni clone, submodule add et le fichier .gitmodules, le pointeur submodule est un SHA fige dans le parent, submodule update --init --recursive, detached HEAD dans un submodule, workflow commit submodule puis maj pointeur parent, submodule vs subtree vs monorepo en survol]
outcomes: [creer un worktree pour traiter un hotfix sans perdre le travail en cours, ajouter et cloner un submodule proprement, mettre a jour le pointeur SHA d'un submodule via le workflow commit-submodule-puis-parent]
prerequis: [06-git-hooks-automatisation]
next: 08-monorepos
libs: []
tribuzen: le repo fullstack-autotraining est le parent, chaque cours est un submodule dont le parent fige le SHA
last-reviewed: 2026-07
---

# Worktrees et submodules

> **Outcomes — tu sauras FAIRE :** créer un worktree pour traiter un hotfix sans perdre ton travail en cours, ajouter et cloner un submodule proprement, mettre à jour le pointeur SHA d'un submodule via le workflow commit-submodule-puis-parent.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu bosses sur `fullstack-autotraining`. Ce repo n'est pas un repo « normal » : c'est un **repo parent à submodules**. Chaque cours (`04-react`, `07-git-avance`, `10-postgresql`…) est un dépôt Git indépendant, embarqué comme submodule. Le `git status` du début de session le montre déjà :

```console
$ git status
Sur la branche main
Modifications non indexées :
  modified:   01-js-runtime      (new commits)
  modified:   11-http-caching    (new commits)
  modified:   15-cicd-devops     (new commits)
```

Ce `(new commits)` est le cœur du module. Il ne dit **pas** « des fichiers ont changé ». Il dit : *le submodule pointe maintenant vers un commit différent de celui que le parent a figé*. Le parent ne stocke pas les fichiers du cours — il stocke **un seul SHA** par submodule.

Deux besoins concrets vont tomber cette semaine :

1. Tu réécris un long module dans `07-git-avance` (branche `refonte`). Un lien mort est signalé sur `main`. Tu dois corriger vite **sans** stasher ta refonte en cours. → **worktree**.
2. Tu as commité dans le submodule `07-git-avance`, mais `smaurier/tribuzen` (le parent) affiche toujours l'ancien contenu chez tes collègues. → tu as oublié de **mettre à jour le pointeur du parent**.

Ce module te donne les deux outils : `git worktree` pour travailler sur plusieurs branches à la fois, et les submodules pour comprendre pourquoi le parent ne « voit » ton travail que quand tu bumpes son pointeur.

---

## 2. Théorie complète, concise

### 2.1 Le problème que résout `git worktree`

Un clone Git classique = **un** répertoire de travail attaché à **un** `.git`. À un instant donné, une seule branche est checkout. Pour changer de branche sans perdre ton travail non commité, tes options historiques :

- `git stash` → switch → travail → switch → `stash pop` : fastidieux, source de conflits, on oublie des stashs.
- Re-cloner le repo ailleurs : gaspille disque et re-télécharge tout.

`git worktree` offre une 3e voie : **plusieurs répertoires de travail** rattachés au **même** `.git`. Chaque worktree a sa propre branche checkout, son propre index, ses propres fichiers.

```bash
# Depuis mon-projet/ (sur feature/auth, travail en cours non commité)
git worktree add ../hotfix-lien main
# -> crée le dossier ../hotfix-lien avec main checkout
#    ton feature/auth reste intact, rien à stasher
```

### 2.2 `git worktree` — les 4 commandes

```bash
# ADD — créer un worktree
git worktree add <path> <branche-existante>
git worktree add ../review feature/payments   # checkout une branche qui existe
git worktree add ../fix-123 -b fix-123 main    # créer ET checkout une NOUVELLE branche depuis main

# LIST — voir tous les worktrees rattachés au .git
git worktree list
# /home/sylvain/mon-projet    a1b2c3d [feature/auth]
# /home/sylvain/review        e4f5g6h [feature/payments]
# /home/sylvain/fix-123       i7j8k9l [fix-123]

# REMOVE — supprimer proprement (refuse s'il reste des changements non commités)
git worktree remove ../review

# PRUNE — nettoyer les worktrees dont le dossier a été supprimé à la main
git worktree prune
```

Règles à retenir :
- Une branche donnée ne peut être checkout que dans **un seul** worktree à la fois. Git refuse `add` sur une branche déjà utilisée ailleurs.
- Tous les worktrees partagent le **même historique, les mêmes remotes, les mêmes commits**. Un commit fait dans un worktree est immédiatement visible (via `git log`) depuis les autres.
- Supprimer le dossier d'un worktree à la main (rm) sans `remove` laisse une entrée fantôme → `git worktree prune` la nettoie.

### 2.3 Usages typiques du worktree

| Situation | Pourquoi worktree |
|---|---|
| Hotfix urgent pendant une feature | Traiter le fix sur `main` sans stasher la feature |
| Review de la PR d'un collègue | Checkout sa branche sans toucher ton travail |
| Build/tests en parallèle | Compiler la prod pendant que tu codes ailleurs |
| Comparaison côte à côte | Ouvrir deux versions dans deux fenêtres d'éditeur |

### 2.4 Le concept de submodule

Un submodule = **une référence à un commit précis d'un autre dépôt Git**, monté comme sous-répertoire du dépôt parent.

Point crucial, contre-intuitif : le parent ne stocke **pas** les fichiers du submodule. Il stocke **un seul SHA** — le commit exact vers lequel le submodule doit pointer. Dans l'arbre Git du parent, le submodule apparaît comme une entrée spéciale de type `commit` (gitlink), pas comme un dossier de fichiers.

```bash
git submodule add https://github.com/org/shared-lib.git libs/shared
# Git fait 3 choses :
# 1. clone shared-lib dans libs/shared/
# 2. crée (ou complète) le fichier .gitmodules  -> URL + path
# 3. enregistre dans l'index du parent le SHA courant de libs/shared (le gitlink)
```

### 2.5 `.gitmodules` — le fichier de config, versionné

`.gitmodules` est un fichier **versionné** (commité, poussé) qui décrit chaque submodule : son chemin, son URL, sa branche de suivi optionnelle.

```ini
[submodule "libs/shared"]
    path = libs/shared
    url = https://github.com/org/shared-lib.git
    branch = main
```

À distinguer : `.gitmodules` dit **où** trouver le submodule (URL/path). Le **SHA figé**, lui, n'est PAS dans `.gitmodules` — il est stocké dans l'index/l'arbre du parent (le gitlink). Deux informations séparées : la config (`.gitmodules`) et le pointeur (gitlink dans le commit parent).

### 2.6 Cloner et initialiser un repo à submodules

Un `git clone` normal d'un repo parent récupère les **dossiers vides** des submodules + `.gitmodules`, mais **pas** leur contenu. Il faut initialiser.

```bash
# Option A — tout d'un coup au clone
git clone --recurse-submodules https://github.com/smaurier/tribuzen.git

# Option B — après un clone classique
git clone https://github.com/smaurier/tribuzen.git
cd tribuzen
git submodule update --init --recursive
#   --init      : lit .gitmodules et enregistre les submodules localement
#   --recursive : gère les submodules imbriqués (submodule dans un submodule)
#   update      : checkout chaque submodule au SHA figé par le parent
```

Sans cette étape, les dossiers de submodules restent vides → erreurs « fichier introuvable » incompréhensibles pour qui ne connaît pas le mécanisme.

### 2.7 Le workflow qui compte : commit dans le submodule PUIS maj du pointeur parent

C'est LE point que tout le monde rate au début. Modifier un submodule est un processus en **deux commits, dans deux dépôts** :

```bash
# --- 1. Dans le SUBMODULE : c'est un dépôt Git à part entière ---
cd libs/shared
git switch main                 # sortir du detached HEAD (voir 2.8)
# ... modifications ...
git add .
git commit -m "feat: nouvelle fonction util"
git push origin main            # <-- push OBLIGATOIRE, sinon le SHA n'existe pas sur le remote

# --- 2. Dans le PARENT : le SHA a bougé, il faut figer le nouveau ---
cd ..
git status
#   modified:   libs/shared (new commits)   <-- le pointeur a changé
git add libs/shared             # on indexe le NOUVEAU SHA (gitlink)
git commit -m "chore: bump libs/shared vers dernière version"
git push
```

Tant que le second commit (parent) n'est pas fait, le parent continue de pointer vers l'**ancien** SHA. Tes collègues qui font `git submodule update` récupèrent l'ancien contenu. Le travail « existe » dans le submodule mais reste **invisible** via le parent.

Raccourci pour tirer le dernier commit distant d'un submodule sans `cd` :

```bash
git submodule update --remote libs/shared   # avance le submodule au dernier commit de sa branche
git add libs/shared && git commit -m "chore: bump libs/shared"
```

### 2.8 Detached HEAD : l'état normal d'un submodule

Après `submodule update`, le submodule est checkout **sur un SHA, pas sur une branche** → `HEAD` détaché. C'est normal : le parent fige un commit précis, pas « la dernière version d'une branche ».

```console
$ cd libs/shared && git status
HEAD détachée sur a1b2c3d
```

Conséquence pratique : si tu commites en detached HEAD, ton commit n'est rattaché à **aucune branche** et sera perdu au prochain `update`. **Avant de modifier un submodule, fais toujours `git switch main`** (ou la branche voulue) pour te rattacher à une branche.

### 2.9 Submodule vs subtree vs monorepo (survol)

Trois façons d'assembler plusieurs projets. Le **monorepo** est détaillé au module 08 — ici juste le positionnement.

| Critère | Submodule | Subtree | Monorepo |
|---|---|---|---|
| Code physiquement dans le parent | Non (référence SHA) | Oui (copie) | Oui (un seul repo) |
| Historiques | Séparés | Fusionné dans le parent | Unique |
| Versionnage figé par commit | Oui (le gitlink) | Non | N/A |
| Clone | `--recurse-submodules` requis | Transparent | Transparent |
| Mise à jour | 2 commits (sub + parent) | `subtree pull` | commit normal |
| Complexité | Moyenne (pièges HEAD/pointeur) | Basse à l'usage | Outillage requis (module 08) |

```bash
# subtree : le code est copié dans le parent, pas de .gitmodules
git subtree add --prefix=libs/shared https://github.com/org/shared-lib.git main --squash
git subtree pull --prefix=libs/shared https://github.com/org/shared-lib.git main --squash
```

En pratique : **submodules** quand on veut un versionnage figé et des dépôts vraiment indépendants (cas de ce curriculum). **Subtree** pour intégrer du code tiers sans imposer de commandes spéciales aux contributeurs. **Monorepo** (module 08) quand tout évolue ensemble et qu'on accepte l'outillage (workspaces, Nx, Turborepo).

---

## 3. Worked examples

### Exemple 1 — Hotfix pendant une refonte, avec worktree (TribuZen)

Contexte : tu réécris un module dans le submodule `07-git-avance`, sur la branche `refonte`, avec du travail non commité. Un lien mort est signalé sur `main`.

```bash
# État de départ : dans 07-git-avance/, sur refonte, travail non commité
$ git status
Sur la branche refonte
Modifications non indexées : modules/09-...md

# 1. Créer un worktree sur main SANS toucher à refonte
$ git worktree add ../07-hotfix main
Préparation du répertoire de travail (checkout de 'main')

# 2. Aller dans le worktree, corriger le lien, commiter
$ cd ../07-hotfix
$ git switch -c fix/lien-mort        # branche dédiée au fix
# ... correction du lien dans le fichier ...
$ git add . && git commit -m "fix(docs): lien mort module 04"
$ git push -u origin fix/lien-mort   # -> ouvrir la PR

# 3. Revenir à la refonte : elle est intacte, rien n'a été stashé
$ cd ../07-git-avance
$ git status
Sur la branche refonte
Modifications non indexées : modules/09-...md   # <-- toujours là

# 4. Une fois la PR mergée, nettoyer le worktree
$ git worktree remove ../07-hotfix
$ git worktree list
/home/sylvain/07-git-avance  9a8b7c6 [refonte]
```

Ce qu'on a gagné : zéro `stash`, zéro risque de conflit sur la reprise, le contexte mental de la refonte n'a jamais été cassé.

### Exemple 2 — Ajouter un submodule puis figer son pointeur (repo parent)

Contexte : on ajoute un cours `25-observabilite` comme nouveau submodule du parent `fullstack-autotraining`, puis on met à jour son pointeur après un commit.

```bash
# --- Ajout du submodule dans le parent ---
$ cd fullstack-autotraining
$ git submodule add https://github.com/smaurier/25-observabilite.git 25-observabilite
$ git status
Modifications qui seront validées :
  new file:   .gitmodules          # config créée/complétée
  new file:   25-observabilite     # le gitlink (SHA figé), PAS les fichiers

$ git commit -m "chore: ajoute submodule 25-observabilite"
$ git push

# --- Plus tard : on commite DANS le submodule ---
$ cd 25-observabilite
$ git switch main                  # sortir du detached HEAD
# ... ajout d'un module ...
$ git add . && git commit -m "feat: module 01 traces OpenTelemetry"
$ git push origin main             # le nouveau SHA existe désormais sur le remote

# --- Retour au parent : figer le NOUVEAU pointeur ---
$ cd ..
$ git status
  modified:   25-observabilite (new commits)   # pointeur désynchronisé
$ git add 25-observabilite         # indexe le nouveau gitlink
$ git commit -m "chore: bump 25-observabilite (module 01 traces)"
$ git push
```

Vérification que le parent pointe bien vers le bon SHA :

```bash
$ git ls-tree HEAD 25-observabilite
160000 commit d4e5f6a7...   25-observabilite
#      ^^^^^^ type "commit" = gitlink ; d4e5f6a7 = SHA figé par le parent
```

Le mode `160000` (au lieu de `100644` pour un fichier) confirme : c'est un gitlink, un pointeur de commit, pas du contenu.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que le parent stocke les fichiers du submodule

**Faux.** Le parent stocke **un seul SHA** (le gitlink). C'est pour ça que `git status` affiche `(new commits)` et non une liste de fichiers modifiés : ce n'est pas le contenu qui change aux yeux du parent, c'est **le commit pointé**.

```console
# Ce que voit le parent quand le submodule a avancé :
modified:   07-git-avance (new commits)
# PAS "modified: 07-git-avance/modules/07-...md"
```

Corollaire : cloner le parent sans `--recurse-submodules` donne des dossiers **vides**.

### PIÈGE #2 — Commiter dans le submodule et oublier le pointeur parent

Le piège le plus fréquent. Tu commites + push **dans** le submodule, puis tu oublies le second commit (dans le parent). Résultat : chez toi tout marche, mais le parent pointe toujours l'ancien SHA. Tes collègues font `git submodule update` → ancien contenu.

```bash
# ❌ Incomplet : le travail reste invisible via le parent
cd 07-git-avance && git commit -am "..." && git push && cd ..
# ... et on s'arrête là. Le parent n'a pas bougé son pointeur.

# ✅ Complet : les DEUX dépôts sont commités
cd 07-git-avance && git commit -am "..." && git push && cd ..
git add 07-git-avance && git commit -m "chore: bump 07-git-avance" && git push
```

### PIÈGE #3 — Commiter en detached HEAD dans le submodule

Après `submodule update`, le submodule est en HEAD détachée. Si tu commites sans `git switch main` d'abord, ton commit n'est sur **aucune branche** et sera **perdu** au prochain `update`.

```bash
# ❌ Commit orphelin, sera perdu
cd 07-git-avance   # HEAD détachée sur a1b2c3d
git commit -am "..."   # commit rattaché à rien

# ✅ Se rattacher à une branche d'abord
cd 07-git-avance
git switch main
git commit -am "..."
```

### PIÈGE #4 — Push du pointeur parent sans avoir push le submodule

Si tu bumpes le pointeur du parent vers un SHA qui n'existe **que localement** (submodule pas encore push), tes collègues récupèrent un pointeur vers un commit introuvable → `fatal: reference is not a tree`.

**Ordre obligatoire : push le SUBMODULE d'abord, le PARENT ensuite.** Git peut t'aider :

```bash
git push --recurse-submodules=check   # refuse le push parent si un submodule n'est pas poussé
git push --recurse-submodules=on-demand  # push automatiquement les submodules nécessaires
```

### PIÈGE #5 — Confondre worktree et clone

Un worktree **partage** le `.git` (commits, remotes, stash refs) du repo d'origine. Ce n'est pas une copie indépendante. Deux conséquences : (1) une même branche ne peut pas être checkout dans deux worktrees ; (2) supprimer le `.git` principal casse tous les worktrees. Pour de l'isolation totale, c'est un clone qu'il faut, pas un worktree.

---

## 5. Ancrage TribuZen

Le repo `fullstack-autotraining` (l'ossature de tout le curriculum TribuZen) **est** un repo parent à submodules. C'est l'exemple vivant du module — pas une métaphore.

- **Chaque cours est un submodule.** `04-react`, `07-git-avance`, `10-postgresql`… sont des dépôts Git indépendants. Le parent fige, pour chacun, **un SHA** dans son arbre (gitlink `160000`).
- **`PARCOURS-SYLVAIN` ne contient que des pointeurs**, jamais le contenu riche des cours — exactement le rôle du parent : il pointe, il ne duplique pas.
- **Les commits récents du repo sont des bumps de pointeurs :** `chore: maj pointeur 02-vue`, `chore: maj pointeur 10-postgresql`. Chacun applique le workflow 2.7 : on a commité dans le submodule du cours, puis on a fait `git add <cours> && git commit` dans le parent pour figer le nouveau SHA.
- **Worktree TribuZen concret :** réécrire un module dans le submodule `07-git-avance` sur `refonte` tout en corrigeant un lien mort sur `main`, sans stasher — c'est l'Exemple 1.

Workflow de référence pour ce repo, à graver :

```bash
# 1. bosser dans le cours (submodule)
cd 07-git-avance
git switch main
git add . && git commit -m "docs(module): réécriture 07 template v1"
git push

# 2. figer le pointeur dans le parent
cd ..
git add 07-git-avance
git commit -m "chore: maj pointeur 07-git-avance (module 07 v1)"
git push
```

C'est ce double mouvement (submodule → parent) qui explique pourquoi une session se termine toujours par un « bump de pointeur ».

> **Deux repos, deux rôles — à ne pas confondre.** `fullstack-autotraining` est le **repo pédagogique** : l'exemple vivant de submodules dont on parle ici. À partir des modules 08 à 10, le fil-rouge bascule sur `smaurier/tribuzen`, qui est **l'application** elle-même, montée en **monorepo** (workspaces pnpm, pas de submodules). L'un t'apprend les submodules sur un cas réel ; l'autre est l'app que tu construis en monorepo. Deux dépôts distincts, deux architectures volontairement opposées.

---

## 6. Points clés

1. `git worktree` rattache plusieurs répertoires de travail au **même** `.git` — plusieurs branches checkout en parallèle, sans `stash` ni re-clone.
2. Les 4 commandes worktree : `add <path> <branche>` (ou `-b` pour créer), `list`, `remove`, `prune`. Une branche = un seul worktree à la fois.
3. Un submodule = une **référence à un commit** d'un autre dépôt. Le parent stocke **un SHA figé** (gitlink `160000`), pas les fichiers.
4. `.gitmodules` (versionné) dit **où** est le submodule (URL/path) ; le **SHA figé** vit dans l'arbre du parent, séparément.
5. Cloner un repo à submodules : `--recurse-submodules`, ou `git submodule update --init --recursive` après coup, sinon les dossiers restent vides.
6. Modifier un submodule = **deux commits dans deux dépôts** : (1) commit + push dans le submodule, (2) `git add <sub> && git commit` dans le parent pour figer le nouveau pointeur.
7. Un submodule est en **detached HEAD** après `update` : `git switch main` avant de commiter, sinon le commit est orphelin et perdu.
8. Push toujours le **submodule d'abord**, le **parent ensuite** (`--recurse-submodules=check` le vérifie).
9. Submodule (référence figée) vs subtree (copie fusionnée) vs monorepo (un seul repo, détaillé module 08).

---

## 7. Seeds Anki

```
Que stocke le dépôt PARENT pour un submodule ?|Un seul SHA (le gitlink, mode 160000) qui fige le commit exact vers lequel le submodule doit pointer — PAS les fichiers du submodule.
Pourquoi git status affiche "(new commits)" sur un submodule ?|Parce que le submodule est checkout sur un commit différent du SHA figé par le parent. Ce n'est pas le contenu des fichiers qui a changé aux yeux du parent, c'est le commit pointé.
Quel est le workflow complet pour modifier un submodule ?|Deux commits dans deux dépôts : (1) dans le submodule, git switch main + commit + push ; (2) dans le parent, git add <submodule> + commit + push pour figer le nouveau pointeur SHA.
Que fait git worktree add ../hotfix main ?|Crée un second répertoire de travail (../hotfix) avec main checkout, rattaché au même .git. Le travail en cours de l'autre worktree reste intact, sans stash ni clone.
Pourquoi un submodule est-il en detached HEAD, et quel est le risque ?|Le parent fige un SHA précis, pas une branche, donc update checkout un commit détaché. Risque : un commit fait en detached HEAD n'est sur aucune branche et sera perdu au prochain update. Faire git switch main avant de commiter.
Comment cloner correctement un repo qui contient des submodules ?|git clone --recurse-submodules <url>, ou après un clone classique : git submodule update --init --recursive. Sinon les dossiers des submodules restent vides.
Dans quel ordre pousser submodule et parent, et pourquoi ?|Le submodule d'abord, le parent ensuite. Sinon le parent pointe vers un SHA qui n'existe pas sur le remote du submodule -> fatal: reference is not a tree chez les collègues. git push --recurse-submodules=check le vérifie.
Que contient .gitmodules et qu'est-ce qu'il ne contient PAS ?|Il contient (versionné) le path, l'URL et la branche optionnelle de chaque submodule. Il ne contient PAS le SHA figé — celui-ci vit dans l'arbre du parent (le gitlink).
Différence entre submodule et subtree ?|Submodule = référence à un commit (le code n'est pas copié dans le parent, historiques séparés, clone avec --recurse). Subtree = copie du code dans le parent (historique fusionné, clone transparent, pas de .gitmodules).
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-07-worktrees-submodules/README.md`. Créer un worktree pour traiter un hotfix pendant une feature, puis ajouter un submodule et mettre à jour son pointeur via le workflow commit-submodule-puis-parent — avec de vraies commandes Git.
