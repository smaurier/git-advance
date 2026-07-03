---
titre: Merge vs Rebase
cours: 07-git-avance
notions: [fast-forward vs merge commit, three-way merge base-ours-theirs, rebase réécrit les hashes, historique linéaire vs réel, résolution de conflits et marqueurs, mergetool et rerere, squash merge, règle d'or du rebase, ff-only et no-ff, pull rebase vs merge]
outcomes: [choisir merge ou rebase selon le contexte, résoudre un conflit en merge et en rebase, appliquer la règle d'or sans jamais réécrire des commits partagés]
prerequis: [02-strategies-branching]
next: 04-rebase-interactif
libs: []
tribuzen: intégration d'une branche de feature TribuZen — rebase pour linéariser avant PR, merge --no-ff pour tracer une release
last-reviewed: 2026-07
---

# Merge vs Rebase

> **Outcomes — tu sauras FAIRE :** choisir merge ou rebase selon le contexte, résoudre un conflit aussi bien en merge qu'en rebase, appliquer la règle d'or sans jamais réécrire un commit déjà partagé.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu bosses sur TribuZen. Il y a trois jours tu as créé `feature/rituels-hebdo` depuis `main`. Depuis, deux collègues ont mergé leurs PR sur `main` : la CI a bougé, un fichier `package.json` a changé. Ta branche a **divergé**.

```bash
git switch feature/rituels-hebdo
git log --oneline --graph --all
# * 9f2a1c3 (feature/rituels-hebdo) feat: écran rituel hebdo
# * 4b7d902 feat: store rituels
# | * e1c8a4f (origin/main, main) chore: bump deps
# | * a90f7e2 fix: timezone créneaux
# |/
# * 71c0de5 feat: base planning famille   <- base commune (ancêtre)
```

Tu veux ouvrir une PR propre. Deux chemins s'ouvrent :

- **Merger `main` dans ta branche** → un commit de merge apparaît, ton historique montre « j'ai récupéré main le 3 juillet ». Fidèle à la réalité, mais l'historique devient touffu.
- **Rebaser ta branche sur `main`** → tes deux commits sont **rejoués** au-dessus de `main`, l'historique redevient une ligne droite… mais tes commits changent de hash. Et si tu avais déjà poussé cette branche et qu'un collègue s'est basé dessus, tu viens de lui exploser son historique.

Ce module te donne les critères pour trancher, la mécanique exacte des deux opérations, et **la règle d'or** qui t'empêche de faire sauter le dépôt d'équipe.

---

## 2. Théorie complète, concise

### 2.1 Fast-forward vs merge commit

`git merge` combine une branche dans la branche courante. Deux issues possibles selon que la branche courante a bougé ou non depuis le point de départ.

**Fast-forward** — la branche cible n'a **pas** divergé. Git n'a rien à fusionner : il fait juste **avancer le pointeur**. Aucun commit créé.

```
Avant :  A ─ B ─ C  (main)
                  \
                   D ─ E  (feature)

git switch main && git merge feature

Après :  A ─ B ─ C ─ D ─ E  (main, feature)   ← pointeur avancé, 0 commit créé
```

**Merge commit (three-way)** — les deux branches ont divergé. Git crée un **commit de merge à deux parents** qui noue les deux historiques.

```
Avant :  A ─ B ─ C ─ F  (main)
                  \
                   D ─ E  (feature)

git switch main && git merge feature

Après :  A ─ B ─ C ─ F ─── M  (main)   ← M a DEUX parents : F et E
                  \       /
                   D ─ E (feature)
```

```bash
git merge feature            # fast-forward si possible, sinon merge commit
git merge --ff-only feature  # exige un fast-forward, ÉCHOUE si divergence (pas de commit surprise)
git merge --no-ff feature    # force un merge commit MÊME si un ff était possible
```

Le merge **préserve l'historique réel** : les commits `D` et `E` gardent leurs hash, et `M` documente le moment de l'intégration.

### 2.2 Three-way merge : base, ours, theirs

Quand il y a divergence, Git ne compare pas juste deux versions. Il en regarde **trois** :

| Nom | C'est quoi | Repère dans le graphe |
|-----|-----------|-----------------------|
| **base** (merge base) | Le dernier ancêtre commun aux deux branches | `C` dans le schéma ci-dessus |
| **ours** | La version de la branche courante (celle où tu es) | `F` (côté `main`) |
| **theirs** | La version de la branche fusionnée | `E` (côté `feature`) |

Git calcule `base → ours` et `base → theirs`. Si les deux côtés ont touché **des zones différentes**, il combine automatiquement. Si les deux ont touché **la même zone**, il ne peut pas décider seul → **conflit**.

> `ours`/`theirs` s'inversent en rebase (voir 2.9) : c'est la source classique d'erreur. Mnémo **valable uniquement en MERGE** : `ours` = la branche sur laquelle tu es assis. Formulation générale plus sûre : `ours` = la destination sur laquelle on rejoue/fusionne (en rebase, c'est la base, ex. `main`), pas forcément la branche checkoutée.

### 2.3 Rebase : réécrire les commits sur une nouvelle base

`git rebase main` prend tes commits, les **détache**, avance sur le sommet de `main`, puis **les rejoue un par un** au-dessus.

```
Avant :  A ─ B ─ C ─ F  (main)
                  \
                   D ─ E  (feature)

git switch feature && git rebase main

Après :  A ─ B ─ C ─ F  (main)
                      \
                       D'─ E'  (feature)   ← D' et E' sont de NOUVEAUX commits
```

> **D et E sont RÉÉCRITS.** `D'` et `E'` ont le même contenu (diff) mais un **hash différent** : le parent a changé, donc l'identité SHA change. Les anciens `D`/`E` deviennent orphelins (récupérables via `reflog` un temps, puis garbage-collectés).

```bash
git switch feature
git rebase main         # rejoue D,E au-dessus du sommet de main
# ... puis, pour intégrer :
git switch main
git merge feature       # désormais un simple FAST-FORWARD (historique linéaire)
```

Rebase produit un **historique linéaire** : pas de commit de merge, une seule ligne de commits. C'est propre à lire (`git log` devient une liste), mais **c'est une fiction** — ça ne raconte pas quand la feature a réellement divergé ni ré-intégré.

### 2.4 Historique linéaire vs historique réel

Ce n'est pas « lequel est mieux » dans l'absolu, c'est un arbitrage :

| | Merge (préserve) | Rebase (réécrit) |
|---|---|---|
| Historique | Réel, non-linéaire, merges visibles | Linéaire, propre, fictif |
| Hash des commits | **Préservés** | **Nouveaux** |
| Trace de l'intégration | Oui (le merge commit date l'intégration) | Aucune |
| `git bisect` / lecture | Plus bruité | Plus lisible |
| Sécurité si partagé | Toujours sûr | **Dangereux** (voir 2.7) |

### 2.5 Résolution de conflits : lire les marqueurs

Quand Git ne peut pas décider, il écrit **les trois zones dans le fichier** avec des marqueurs :

```text
<<<<<<< HEAD           ← début de OURS (ta branche courante)
const MAX = 5;
=======                ← séparateur ours / theirs
const MAX = 8;
>>>>>>> feature/rituels-hebdo   ← fin de THEIRS (branche entrante)
```

> Ci-dessus, c'est un **merge** : le marqueur `theirs` porte le **nom de branche**. En **rebase**, il porte à la place le **`<short-sha> (<sujet>)`** du commit rejoué, ex. `>>>>>>> 1111aaa (feat: rituels hebdo)` — et `ours`/`theirs` s'y inversent (voir 2.9).

Résoudre = **éditer le fichier** pour obtenir l'état final voulu (garder l'un, l'autre, ou combiner), **supprimer les trois marqueurs**, puis `git add`.

```bash
# option lisible : afficher aussi la base commune
git config merge.conflictStyle zdiff3
# le fichier montre alors une 3e zone ||||||| base = point de départ commun
```

```bash
git status            # liste les fichiers "both modified"
# ... on édite, on retire les marqueurs ...
git add src/rituels.ts
git merge --continue  # ou: git commit   (message de merge pré-rempli)
```

### 2.6 mergetool et rerere

**`git mergetool`** ouvre un outil 3-panneaux (VS Code, Meld, kdiff3…) montrant base / ours / theirs côte à côte, plus pratique que les marqueurs bruts sur les gros conflits.

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
git mergetool          # lance l'outil sur chaque fichier en conflit
```

**`rerere`** = *reuse recorded resolution*. Git **mémorise** comment tu as résolu un conflit donné et **rejoue automatiquement** la même résolution s'il le revoit — précieux quand un rebase te fait re-résoudre le même conflit à chaque commit rejoué.

```bash
git config --global rerere.enabled true
```

### 2.7 La règle d'or du rebase

> ## ⛔ NE REBASE JAMAIS DES COMMITS DÉJÀ POUSSÉS / PARTAGÉS.

Rebase **fabrique de nouveaux commits** et rend les anciens orphelins. Si quelqu'un (ou une PR, ou un autre poste à toi) s'appuie sur les anciens commits, tu viens de faire diverger l'histoire sous ses pieds : au prochain `pull` il récupère les **deux** versions (ancienne + réécrite), obtient des doublons, des conflits absurdes, et personne ne comprend rien.

```bash
# ✅ AUTORISÉ — ta branche est PRIVÉE (jamais poussée, ou personne dessus)
git switch feature/rituels-hebdo
git rebase main

# ❌ INTERDIT — réécrire une branche que d'autres utilisent
git switch main
git rebase feature          # JAMAIS. main est partagée.

# ❌ INTERDIT — rebaser une branche déjà poussée sur laquelle un collègue bosse
```

Le seul cas où tu réécris une branche **déjà poussée** : c'est **ta** branche de feature, personne d'autre ne travaille dessus, et tu pousses avec un garde-fou :

```bash
git push --force-with-lease   # refuse le push si le remote a bougé depuis ton dernier fetch
                              # → bien plus sûr que --force (qui écrase aveuglément)
```

Formulation mnémotechnique : **« rebase ce qui est à toi et à toi seul ; merge tout le reste ».**

### 2.8 Squash merge

Le **squash merge** condense **tous les commits d'une branche en un seul** sur la cible. C'est l'option « Squash and merge » de GitHub/GitLab : la PR entière devient un commit unique sur `main`.

```bash
git switch main
git merge --squash feature   # applique les changements dans l'index, SANS committer
git commit -m "feat: rituels hebdomadaires"   # un seul commit récapitulatif
```

Utile pour une `main` où chaque commit = une feature livrée. Contrepartie : on **perd le détail** des commits intermédiaires (WIP, « fix typo »…), qui est justement ce qu'on veut cacher.

### 2.9 pull --rebase vs pull par défaut

`git pull` = `git fetch` + intégration. L'intégration est un **merge** par défaut → chaque pull sur une branche divergée crée un petit merge commit « Merge branch main » qui pollue l'historique.

```bash
git pull                       # fetch + MERGE  → merge commit si divergence
git pull --rebase              # fetch + REBASE  → rejoue TES commits locaux au-dessus, linéaire
git config --global pull.rebase true   # --rebase par défaut partout
```

`pull --rebase` reste dans le cadre de la règle d'or : il ne réécrit que **tes commits locaux non poussés**, jamais ceux des autres. C'est le pull « propre » recommandé au quotidien.

**Note `ours`/`theirs` en rebase :** pendant un rebase, `ours` = la branche **de base** (là où tu rejoues, ex. `main`) et `theirs` = **tes** commits en cours de rejeu. C'est l'inverse d'un merge classique — d'où les erreurs sur `checkout --ours`/`--theirs`.

---

## 3. Worked examples

### Exemple 1 — Rebaser une feature TribuZen avant la PR (avec conflit)

Situation : `feature/rituels-hebdo` a divergé de `main`. On veut une PR linéaire.

```bash
# 1. On récupère l'état du remote SANS toucher à sa branche
git fetch origin

# 2. On se place sur sa branche et on rebase sur main à jour
git switch feature/rituels-hebdo
git rebase origin/main
# → Git rejoue le 1er commit... CONFLICT sur package.json
#   (les deux branches ont bumpé une dépendance)

# 3. On regarde ce qui est en conflit
git status
#   both modified:   package.json

# 4. On édite package.json, on retire <<<<<<< ======= >>>>>>>,
#    on garde LES DEUX bumps de version fusionnés à la main.
#    Rappel : ici "ours" = origin/main (la base), "theirs" = ton commit rejoué.

git add package.json
git rebase --continue          # Git passe au commit suivant à rejouer

# 5. Si un 2e conflit surgit, même boucle. Si tout part en vrille :
# git rebase --abort           # annule TOUT, retour exact à l'état d'avant rebase

# 6. Historique désormais linéaire ; on pousse SA branche privée
git push --force-with-lease    # OK : personne d'autre ne bosse sur cette branche
```

Résultat : sur GitHub, la PR affiche une pile de commits propres au-dessus de `main`, review facile, et un merge côté serveur qui sera un simple fast-forward.

### Exemple 2 — Merger une release avec `--no-ff` pour laisser une trace

Situation : la feature est validée, on veut que `main` **garde une trace explicite** de la mise en production de la release.

```bash
# 1. On se place sur main à jour
git switch main
git pull --rebase origin main   # met main à jour proprement

# 2. Merge SANS fast-forward → force un merge commit qui date la release
git merge --no-ff feature/rituels-hebdo -m "release: rituels hebdomadaires v1.2"

# 3. Le graphe montre explicitement l'intégration
git log --oneline --graph -3
# *   3d9f0a1 (main) release: rituels hebdomadaires v1.2   ← merge commit à 2 parents
# |\
# | * a1b2c3d feat: écran rituel hebdo
# | * e4f5a6b feat: store rituels
# |/
# * 71c0de5 feat: base planning famille

# 4. Tag de release posé sur le merge commit
git tag -a v1.2.0 -m "Rituels hebdomadaires"
git push origin main --tags
```

**Pourquoi `--no-ff` ici et rebase à l'exemple 1 ?** À l'exemple 1 on **nettoie une branche privée** avant review (linéaire = lisible). Ici on **intègre une release partagée** : le merge commit sert de repère historique (« telle release est entrée le 3 juillet ») et ne réécrit rien — conforme à la règle d'or.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Rebaser une branche partagée « pour faire propre »

```bash
# ❌ La branche est déjà poussée, un collègue a pull dessus
git switch feature/rituels-hebdo
git rebase main
git push --force            # écrase le remote → le collègue est perdu
```

Le collègue avait les commits `D`/`E`. Toi tu as maintenant `D'`/`E'`. Son prochain `pull` récupère les deux jeux → doublons, conflits fantômes, historique cassé. **Correct :** si la branche est partagée, tu **merges** `main` dedans (`git merge main`), tu ne rebases pas. Le rebase est réservé à ce qui n'appartient qu'à toi.

### PIÈGE #2 — Confondre `--force` et `--force-with-lease`

```bash
git push --force              # ❌ écrase le remote AVEUGLÉMENT, même si un collègue a poussé entre-temps
git push --force-with-lease   # ✅ refuse si le remote a bougé depuis ton dernier fetch
```

`--force` peut effacer le travail que quelqu'un a poussé pendant que tu rebasais. `--force-with-lease` vérifie d'abord que le remote est bien à l'état que tu crois. Toujours préférer `--force-with-lease`.

### PIÈGE #3 — Croire que le rebase « supprime » les conflits

Rebase ne fait pas disparaître les conflits — il les **déplace et les multiplie**. Un merge résout le conflit **une seule fois** (dans le merge commit). Un rebase peut te faire re-résoudre le **même** conflit à **chaque commit rejoué**. C'est exactement le cas où `rerere.enabled true` (2.6) sauve la journée en rejouant ta résolution.

### PIÈGE #4 — Inverser `ours` et `theirs` en rebase

```bash
# En MERGE (sur main, on merge feature) :   ours = main,   theirs = feature
# En REBASE (sur feature, on rebase main) : ours = main,   theirs = feature (tes commits rejoués)
```

Intuition trompeuse : « je suis sur ma feature, donc `ours` = ma feature ». **Faux en rebase.** Comme Git rejoue tes commits *par-dessus* la base, c'est la base qui est `ours` et tes commits qui sont `theirs`. Un `git checkout --ours` mal orienté te fait garder la mauvaise version. En cas de doute, n'utilise pas `--ours/--theirs` : édite le fichier à la main.

### PIÈGE #5 — `--ff-only` vs `--no-ff` mal choisis

```bash
git merge --ff-only feature   # ÉCHOUE si divergence — garantit "aucun merge commit surprise"
git merge --no-ff feature     # crée TOUJOURS un merge commit — garantit une trace
```

Ce sont des opposés. `--ff-only` = « je veux du linéaire, refuse sinon » (idéal après un rebase). `--no-ff` = « je veux toujours une trace d'intégration » (idéal pour les releases). Les confondre donne l'inverse du résultat voulu.

---

## 5. Ancrage TribuZen

Le workflow Git de TribuZen combine les deux stratégies selon le périmètre :

- **Branches de feature (`feature/rituels-hebdo`, `feature/invitations`)** — développées en privé, **rebasées sur `origin/main`** juste avant d'ouvrir la PR pour une review linéaire et lisible. Push en `--force-with-lease` car personne d'autre n'y touche. C'est l'Exemple 1.
- **Intégration d'une release sur `main`** — **`git merge --no-ff`** pour poser un merge commit daté et taggué (`v1.2.0`), qui documente « telle release est entrée en prod tel jour ». C'est l'Exemple 2. On ne rebase **jamais** `main` : elle est partagée par toute l'équipe → règle d'or.
- **Conflits réels** — le plus fréquent sur TribuZen est `package.json`/`package-lock.json` (deux features bumpent des deps) et les fichiers de traduction `i18n/fr.json` (deux features ajoutent des clés). Résolution : garder **les deux** apports, retirer les marqueurs, `rerere` activé pour ne pas re-résoudre le lock à chaque commit rejoué.
- **Quotidien** — `git config --global pull.rebase true` sur tous les postes, pour que la synchro de `main` reste linéaire sans merge commits « Merge branch main » parasites.

Config d'équipe posée une fois par poste :

```bash
git config --global pull.rebase true
git config --global rerere.enabled true
git config --global merge.conflictStyle zdiff3
```

---

## 6. Points clés

1. **Fast-forward** = pas de divergence, Git avance juste le pointeur (0 commit créé) ; **merge commit** = divergence, un commit à deux parents noue les historiques.
2. Le **three-way merge** compare **base** (ancêtre commun), **ours** (branche courante) et **theirs** (branche entrante) ; conflit si les deux touchent la même zone.
3. **Rebase réécrit les commits** : même diff, **nouveau hash**, historique linéaire mais fictif — les anciens commits deviennent orphelins.
4. **Merge préserve l'historique réel** (hash conservés + trace de l'intégration) ; rebase le linéarise au prix de la fidélité.
5. Résoudre un conflit = éditer le fichier, **retirer `<<<<<<< ======= >>>>>>>`**, `git add`, puis `--continue` ; `mergetool` et `rerere` industrialisent l'opération.
6. **Règle d'or : jamais de rebase sur des commits déjà poussés/partagés.** Rebase ce qui est à toi seul, merge tout le reste. Force-push uniquement en `--force-with-lease` sur ta branche privée.
7. **`--ff-only`** refuse tout merge commit (post-rebase) ; **`--no-ff`** en force toujours un (releases) ; **squash merge** condense une branche en un commit unique.
8. **`git pull --rebase`** rejoue tes commits locaux non poussés au-dessus du remote → synchro linéaire, sans violer la règle d'or.

---

## 7. Seeds Anki

```
Quelle est la différence entre un fast-forward et un merge commit ?|Fast-forward : la branche cible n'a pas divergé, Git avance juste le pointeur, aucun commit créé. Merge commit : les branches ont divergé, Git crée un commit à DEUX parents qui noue les deux historiques.
Que compare un three-way merge ?|Trois versions : base (dernier ancêtre commun), ours (branche courante), theirs (branche entrante). Conflit si ours et theirs modifient la même zone à partir de la base.
Pourquoi dit-on que rebase "réécrit" les commits ?|Rebase rejoue les commits sur une nouvelle base : le contenu (diff) est identique mais le parent change, donc le hash SHA change. Ce sont de NOUVEAUX commits ; les anciens deviennent orphelins.
Quelle est la RÈGLE D'OR du rebase ?|Ne JAMAIS rebaser des commits déjà poussés ou partagés. Rebaser réécrit les hash ; si un collègue s'appuie dessus, son historique diverge (doublons, conflits). Rebase ce qui est à toi seul, merge tout le reste.
Comment résout-on un conflit de merge ?|Éditer le fichier pour obtenir l'état final voulu, supprimer les trois marqueurs (<<<<<<< ======= >>>>>>>), puis git add, puis git commit (merge) ou git rebase --continue (rebase).
Différence entre --force et --force-with-lease ?|--force écrase le remote aveuglément (peut effacer le travail d'un collègue). --force-with-lease refuse le push si le remote a bougé depuis ton dernier fetch. Toujours préférer --force-with-lease.
Quand utiliser merge --no-ff vs --ff-only ?|--no-ff force toujours un merge commit (trace d'intégration, idéal releases). --ff-only refuse le merge s'il n'est pas un fast-forward (garantit un historique linéaire, idéal après un rebase). Ce sont des opposés.
Que fait git pull --rebase et pourquoi est-il "propre" ?|fetch + rebase : rejoue TES commits locaux non poussés au-dessus du remote, historique linéaire sans merge commit "Merge branch main". Il ne réécrit que tes commits privés → ne viole pas la règle d'or.
À quoi sert rerere ?|reuse recorded resolution : Git mémorise ta résolution d'un conflit et la rejoue automatiquement s'il le revoit — utile en rebase où le même conflit peut revenir à chaque commit rejoué.
Que fait un squash merge et quelle est sa contrepartie ?|Il condense tous les commits d'une branche en un seul commit sur la cible (merge --squash puis commit). Contrepartie : on perd le détail des commits intermédiaires (WIP, fix typo).
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-03-merge-rebase/README.md`. Tu vas provoquer puis résoudre le **même** conflit d'abord en merge, ensuite en rebase, comparer les deux historiques obtenus, et appliquer la règle d'or sur une branche de feature TribuZen.
