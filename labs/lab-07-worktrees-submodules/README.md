# Lab 07 — Worktrees et submodules

> **Outcome :** à la fin, tu sais créer un worktree pour traiter un hotfix pendant une feature (sans stasher), puis ajouter un submodule et **mettre à jour son pointeur SHA** dans le parent via le workflow commit-submodule-puis-parent.
> **Vrai outil :** Git en ligne de commande, sur de **vrais dépôts locaux** que tu crées. Aucun harnais simulé.
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. Tu vérifies toi-même avec `git worktree list`, `git status` et `git ls-tree`.

---

## Énoncé

Deux parties, deux compétences.

**Partie A — Worktree pour un hotfix.** Tu crées un repo `mon-app` avec une feature en cours (travail non commité). Un « lien mort » (un fichier à corriger) est signalé sur `main`. Tu traites le fix dans un **worktree** dédié, sans stasher ni casser ta feature, puis tu nettoies.

**Partie B — Submodule et pointeur.** Tu crées un repo `shared-lib` (le futur submodule) et un repo `parent`. Tu ajoutes `shared-lib` comme submodule du parent, tu observes le gitlink (SHA figé), puis tu commites **dans** le submodule et tu **mets à jour le pointeur du parent**.

Tout se passe en local (pas besoin de GitHub) : les « remotes » seront des dossiers `--bare` locaux, pour que `push` fonctionne réellement.

### Starter — préparer l'aire de jeu

```bash
# Un dossier de travail propre
mkdir lab07 && cd lab07
```

Aucun fichier fourni : tu construis tout avec de vraies commandes. Pas de gap-fill.

---

## Étapes (en friction)

### Partie A — Worktree

1. Crée `mon-app` avec un commit initial sur `main`, puis une branche `feature/auth` avec du **travail non commité** :
   ```bash
   git init mon-app && cd mon-app
   printf "v1\n" > README.md
   git add . && git commit -m "chore: init"
   git switch -c feature/auth
   printf "travail en cours...\n" > auth.js   # NON commité volontairement
   git status                                 # auth.js non suivi
   ```
2. **Sans stasher `auth.js`**, crée un worktree sur `main` pour le hotfix, dans une nouvelle branche `fix/lien`.
3. Va dans le worktree, corrige le « lien mort » (édite `README.md`), commite.
4. Reviens dans `mon-app` et **prouve** que `auth.js` est toujours là, intact.
5. Liste tes worktrees, puis supprime le worktree du hotfix et vérifie la liste.

### Partie B — Submodule et pointeur

6. Crée un repo `shared-lib` avec un commit, puis transforme-le en « remote » local (`--bare`) pour pouvoir push dessus. Idem pour un repo `parent`.
7. Dans `parent`, **ajoute** `shared-lib` comme submodule. Observe `git status` : repère `.gitmodules` + le gitlink. Commite + push.
8. **Prouve** que le parent stocke un SHA (gitlink), pas des fichiers, avec `git ls-tree`.
9. Commite quelque chose **dans** le submodule (attention au detached HEAD : `git switch main` d'abord) et push.
10. Reviens dans le parent : observe `(new commits)`, puis **mets à jour le pointeur** (`git add <submodule> && git commit`). Re-prouve avec `git ls-tree` que le SHA a changé.

---

## Corrigé complet commenté

```bash
# ═══════════════════════════════════════════════════════════════
# PARTIE A — WORKTREE POUR UN HOTFIX
# ═══════════════════════════════════════════════════════════════

# --- Étape 1 : repo avec feature en cours, travail non commité ---
git init mon-app && cd mon-app
printf "v1\n" > README.md
git add . && git commit -m "chore: init"

git switch -c feature/auth
printf "travail en cours...\n" > auth.js   # NON commité : le point du test
git status
#   Sur la branche feature/auth
#   Fichiers non suivis : auth.js

# --- Étape 2 : worktree sur main SANS stasher ---
# -b fix/lien : crée une nouvelle branche fix/lien depuis main dans le worktree
git worktree add -b fix/lien ../mon-app-hotfix main
#   Préparation du répertoire de travail (nouvelle branche 'fix/lien')
# -> ../mon-app-hotfix contient main checkout ; auth.js n'a pas bougé ici

# --- Étape 3 : corriger le "lien mort" dans le worktree, commiter ---
cd ../mon-app-hotfix
printf "v1 — lien corrigé\n" > README.md
git add README.md && git commit -m "fix(docs): lien mort README"

# --- Étape 4 : preuve que la feature est intacte ---
cd ../mon-app
git status
#   Sur la branche feature/auth
#   Fichiers non suivis : auth.js      <-- toujours là, jamais stashé
cat auth.js
#   travail en cours...

# --- Étape 5 : lister puis nettoyer ---
git worktree list
#   .../mon-app          <sha> [feature/auth]
#   .../mon-app-hotfix   <sha> [fix/lien]
git worktree remove ../mon-app-hotfix    # supprime proprement le worktree
git worktree list
#   .../mon-app          <sha> [feature/auth]   <-- seul restant


# ═══════════════════════════════════════════════════════════════
# PARTIE B — SUBMODULE ET POINTEUR SHA
# ═══════════════════════════════════════════════════════════════
cd ..   # retour dans lab07/

# --- Étape 6 : créer shared-lib + son "remote" bare local ---
git init shared-lib && cd shared-lib
printf "export const add = (a,b) => a+b;\n" > index.js
git add . && git commit -m "feat: add()"
git branch -M main
cd ..
# remote bare = un dépôt sans working tree, sur lequel on peut push (simule GitHub)
git clone --bare shared-lib shared-lib-remote.git
# on rebranche shared-lib sur ce remote
cd shared-lib && git remote add origin ../shared-lib-remote.git && git push -u origin main
cd ..

# le parent + son remote bare
git init parent && cd parent
printf "# Parent\n" > README.md
git add . && git commit -m "chore: init parent"
git branch -M main
cd ..
git clone --bare parent parent-remote.git
cd parent && git remote add origin ../parent-remote.git && git push -u origin main

# --- Étape 7 : ajouter le submodule (URL = le remote bare) ---
# (toujours dans parent/)
git submodule add ../shared-lib-remote.git libs/shared
git status
#   Modifications qui seront validées :
#     new file:   .gitmodules       <-- config (path + url)
#     new file:   libs/shared       <-- le gitlink (SHA), PAS les fichiers
cat .gitmodules
#   [submodule "libs/shared"]
#       path = libs/shared
#       url = ../shared-lib-remote.git
git commit -m "chore: ajoute submodule libs/shared"
git push

# --- Étape 8 : PREUVE que le parent stocke un SHA, pas des fichiers ---
git ls-tree HEAD libs/shared
#   160000 commit <SHA_A>    libs/shared
#          ^^^^^^ mode 160000 = gitlink ; <SHA_A> = commit figé de shared-lib
# Compare : un fichier normal serait "100644 blob ..."

# --- Étape 9 : commiter DANS le submodule (gare au detached HEAD) ---
cd libs/shared
git status
#   HEAD détachée sur <SHA_A>          <-- NORMAL pour un submodule
git switch main                        # se rattacher à une branche AVANT de commiter
printf "export const sub = (a,b) => a-b;\n" >> index.js
git add . && git commit -m "feat: sub()"
git push origin main                   # <SHA_B> existe maintenant sur le remote
cd ../..

# --- Étape 10 : METTRE À JOUR LE POINTEUR DU PARENT ---
git status
#   modified:   libs/shared (new commits)   <-- pointeur désynchronisé (SHA_A vs SHA_B)
git add libs/shared                    # on indexe le NOUVEAU gitlink (SHA_B)
git commit -m "chore: bump libs/shared (feat sub)"
git push

# Preuve que le pointeur a bien changé :
git ls-tree HEAD libs/shared
#   160000 commit <SHA_B>    libs/shared   <-- SHA_B, différent de SHA_A
```

**Pourquoi ce corrigé est correct :**
- **Partie A** : `git worktree add -b fix/lien ../mon-app-hotfix main` crée un répertoire de travail parallèle sur `main` sans jamais toucher `feature/auth`. `auth.js` non commité reste intact → objectif « hotfix sans stash » atteint. `worktree remove` nettoie sans laisser d'entrée fantôme.
- **Partie B, étape 8** : `git ls-tree` montre `160000 commit <SHA>` — la preuve tangible que le parent fige **un SHA** (gitlink), pas les fichiers. C'est le cœur conceptuel du module.
- **Étape 9** : `git switch main` avant de commiter évite le commit orphelin en detached HEAD. Le `push origin main` du submodule est indispensable **avant** de bumper le parent (sinon `<SHA_B>` n'existe pas sur le remote).
- **Étape 10** : `git add libs/shared && git commit` dans le parent fige le nouveau pointeur. Le second `git ls-tree` prouve que le SHA est passé de `SHA_A` à `SHA_B`. Sans ce commit parent, le travail du submodule serait invisible pour quiconque clone le parent.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 20 minutes, sans rouvrir ce corrigé ni le module :**

1. Refais la Partie B, mais cette fois **provoque volontairement le PIÈGE #4** : commite dans le submodule **sans** le push, bumpe quand même le pointeur du parent et push le parent. Puis clone le parent-remote ailleurs avec `git clone --recurse-submodules parent-remote.git parent-clone` et **observe l'erreur** (`fatal: reference is not a tree` ou submodule non checkouté).
2. Corrige la situation : push le submodule, puis refais fonctionner le clone.
3. Bonus : dans le parent, utilise `git submodule update --remote libs/shared` pour avancer le pointeur au dernier commit distant **sans** `cd` dans le submodule, puis commite le bump.

**Critère de réussite :** tu sais expliquer, sans notes, pourquoi le clone échoue quand on push le parent avant le submodule, et l'ordre correct (submodule d'abord).

---

## Application TribuZen

Le repo `fullstack-autotraining` **est** ton parent à submodules — pas une simulation. Chaque cours (`07-git-avance`, `10-postgresql`…) est un submodule dont le parent fige le SHA.

**Le workflow réel de fin de session** (celui qu'on répète après chaque module réécrit) :

```bash
# 1. commit DANS le submodule du cours
cd 07-git-avance
git switch main
git add modules/07-worktrees-submodules.md labs/lab-07-worktrees-submodules/README.md
git commit -m "docs(module): 07 worktrees-submodules — template v1 + lab"
git push

# 2. figer le pointeur DANS le parent
cd ..
git status                       # modified: 07-git-avance (new commits)
git add 07-git-avance
git commit -m "chore: maj pointeur 07-git-avance (module 07 v1)"
git push
```

**Worktree réel utile ici :** pendant que tu réécris `07-git-avance` sur une branche `refonte`, un lien mort est signalé sur `main` (le curriculum fait un contrôle liens-morts récurrent — cf. commit `6b74396`). Tu ouvres un worktree `../07-hotfix` sur `main`, tu corriges, tu commites, sans jamais casser ta refonte.

**Commit cible (parent) :**
```
chore: maj pointeur 07-git-avance (module 07 worktrees-submodules v1)
```
