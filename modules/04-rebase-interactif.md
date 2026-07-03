---
titre: Rebase interactif et réécriture d'historique
cours: 07-git-avance
notions: [git rebase -i, verbes du todo (pick reword edit squash fixup drop exec break), squash de commits WIP, reword de messages, réordonner des commits, splitter un commit avec edit, commit --fixup et --squash, rebase --autosquash, rebase --onto, gestion des conflits pendant un rebase (continue skip abort), récupération via reflog et reset --hard, règle d'or (historique local uniquement)]
outcomes: [nettoyer un historique local brouillon en commits propres avant une PR, automatiser les corrections avec commit --fixup + rebase --autosquash, récupérer une branche après un rebase raté via reflog]
prerequis: [03-merge-vs-rebase]
next: 05-git-bisect-debugging
libs: []
tribuzen: nettoyer l'historique d'une branche de feature TribuZen avant PR (squash des WIP, reword conventionnel, split, récupération reflog)
last-reviewed: 2026-07
---

# Rebase interactif et réécriture d'historique

> **Outcomes — tu sauras FAIRE :** nettoyer un historique local brouillon en une poignée de commits propres avant une PR, automatiser les corrections avec `commit --fixup` + `rebase --autosquash`, récupérer une branche après un rebase raté.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu termines une feature sur la branche `feat/family-invite` de TribuZen. Tu ouvres la PR et tu vois ceci dans l'onglet « Commits » :

```text
$ git log --oneline main..feat/family-invite
9f3a1c2 (HEAD) fix review comment
7b2d004 oops forgot the test
c81e5aa wip
a4f9b13 wip debug console.log
2e6c7d1 feat: add family invite endpoint
```

Le reviewer va devoir lire **cinq** commits dont trois `wip` et un `oops`. Impossible de savoir ce qui appartient à quoi. Si un bug apparaît dans six mois, `git bisect` (module suivant) tombera sur un commit `wip debug console.log` qui ne compile même pas.

Ce que tu **veux** proposer, c'est un historique lisible :

```text
$ git log --oneline main..feat/family-invite
b1122ff (HEAD) feat(family): add invite endpoint with rate limit
a4f9b13 test(family): cover invite happy path and 429
```

Deux commits, chacun = un changement logique atomique, message au format conventionnel. Le diff total est **exactement le même** — seule l'histoire racontée change. Ce module te donne l'outil qui fait cette transformation : `git rebase -i`.

**Audit d'abord.** Avant de réécrire, on inspecte toujours l'état réel :

```bash
git log --oneline --graph main..HEAD   # ce que la PR contient vraiment
git status                             # aucun changement non commité en attente
git branch --show-current              # on est bien sur la branche de feature, pas main
```

---

## 2. Théorie complète, concise

### 2.1 La règle d'or (à lire avant tout le reste)

`git rebase -i` **réécrit l'historique** : il crée de nouveaux commits avec de nouveaux SHA. Toute personne ayant l'ancienne version verra un historique divergent.

> **Règle d'or : on ne réécrit QUE de l'historique local, pas encore poussé (ou poussé sur ta seule branche de feature).** Jamais `main`, `develop`, ni une branche sur laquelle un collègue travaille. Réécrire une branche partagée force les autres à des `reset` douloureux et peut détruire leur travail.

Corollaire pratique : nettoie **avant** le premier push. Si tu as déjà poussé ta branche de feature perso, un `git push --force-with-lease` reste acceptable (personne d'autre ne travaille dessus), mais jamais sur une branche d'équipe.

### 2.2 `git rebase -i` : le fichier todo

```bash
git rebase -i HEAD~5      # réécrire les 5 derniers commits
git rebase -i 2e6c7d1     # réécrire tout ce qui vient APRÈS ce commit (exclus)
git rebase -i --root      # réécrire depuis le tout premier commit
```

Git ouvre un éditeur avec un **fichier todo**. Point de confusion classique : les commits y sont listés **du plus ancien (en haut) au plus récent (en bas)** — l'inverse de `git log`.

```text
pick 2e6c7d1 feat: add family invite endpoint
pick a4f9b13 wip debug console.log
pick c81e5aa wip
pick 7b2d004 oops forgot the test
pick 9f3a1c2 fix review comment

# Rebase 5d8e... onto 5d8e... (5 commands)
# p, pick <commit>   = use commit
# r, reword <commit> = use commit, but edit the commit message
# ...
```

Tu édites ce fichier : tu changes les verbes, tu réordonnes les lignes, tu en supprimes. À la sauvegarde, Git rejoue les commits selon tes instructions.

### 2.3 Les verbes du todo

| Verbe | Raccourci | Action |
|-------|-----------|--------|
| `pick` | `p` | Garder le commit tel quel |
| `reword` | `r` | Garder le commit, ouvrir l'éditeur pour changer **le message** |
| `edit` | `e` | S'arrêter **sur** le commit pour le modifier (contenu et/ou le splitter) |
| `squash` | `s` | Fusionner dans le commit précédent, **combiner les deux messages** |
| `fixup` | `f` | Fusionner dans le commit précédent, **jeter** le message de celui-ci |
| `drop` | `d` | Supprimer le commit (équivaut à effacer la ligne) |
| `exec` | `x` | Lancer une commande shell après ce commit (ex. `x npm test`) |
| `break` | `b` | Mettre en pause le rebase à cet endroit (reprise via `--continue`) |

Points de discrimination importants :
- `squash` **vs** `fixup` : les deux fusionnent vers le haut. `squash` garde les deux messages (tu les édites), `fixup` jette silencieusement le message du commit fusionné. Un `wip` se `fixup`, pas se `squash`.
- Une ligne `squash`/`fixup` fusionne toujours dans la ligne **au-dessus d'elle**. La première ligne ne peut donc jamais être un `squash`/`fixup` (rien au-dessus).
- Supprimer une ligne = `drop`. Les deux sont équivalents.

### 2.4 Squash de WIP + reword avant PR

Le cas le plus fréquent. On part du todo brut, on transforme :

```text
pick 2e6c7d1 feat: add family invite endpoint
fixup a4f9b13 wip debug console.log     # fusionné dans le feat, message jeté
fixup c81e5aa wip                       # idem
squash 7b2d004 oops forgot the test     # on veut recombiner le message
reword 9f3a1c2 fix review comment       # on réécrit ce message
```

À la sauvegarde, Git s'arrête pour te faire éditer les messages (pour le `squash` puis le `reword`), et produit un historique propre.

### 2.5 Réordonner des commits

Il suffit de **changer l'ordre des lignes** dans le todo. Utile quand un fix logiquement lié à un commit se retrouve loin derrière.

```text
# Avant : le fix de validation est coincé après le controller
pick 2e6c7d1 feat: add invite endpoint
pick 9f3a1c2 feat: add invite controller
pick a4f9b13 fix: validate invite email

# Après : le fix suit directement l'endpoint qu'il corrige
pick 2e6c7d1 feat: add invite endpoint
pick a4f9b13 fix: validate invite email
pick 9f3a1c2 feat: add invite controller
```

Attention : réordonner peut créer des conflits si deux commits touchent les mêmes lignes (voir 2.9).

### 2.6 Splitter un commit avec `edit`

Un commit trop gros (« feat + refacto + fix » d'un coup) se découpe avec le verbe `edit`.

```bash
git rebase -i HEAD~3
# → marquer le gros commit avec: edit
```

Git rejoue jusqu'à ce commit puis s'arrête, le commit **déjà appliqué**. On le défait tout en gardant les fichiers, puis on recommite par morceaux :

```bash
git reset HEAD^          # annule le commit, garde les modifs en working tree (unstaged)
git add src/invite.ts    # on stage un premier lot cohérent
git commit -m "feat(family): add invite endpoint"
git add src/invite.test.ts
git commit -m "test(family): cover invite endpoint"
git rebase --continue    # reprend le rebase avec le reste des commits
```

`git reset HEAD^` (= `reset --mixed`, le défaut) déplace HEAD d'un cran en arrière sans toucher aux fichiers : le contenu du commit redevient des modifications à re-committer comme tu veux.

### 2.7 Le workflow `commit --fixup` + `--autosquash`

Marquer mentalement « ce commit corrige celui-là » est fragile. Git automatise via des commits estampillés :

```bash
# Tu repères un bug dans le commit 2e6c7d1 pendant le dev.
# Tu corriges le fichier, puis :
git add src/invite.ts
git commit --fixup 2e6c7d1     # crée un commit "fixup! feat: add family invite endpoint"

# Variante qui laissera éditer le message combiné :
git commit --squash 2e6c7d1    # crée un commit "squash! ..."
```

Plus tard, avant la PR, `--autosquash` réordonne et pré-remplit les verbes tout seul :

```bash
git rebase -i --autosquash HEAD~6
```

Git place chaque `fixup!` / `squash!` juste **sous sa cible**, avec le bon verbe déjà écrit. Tu n'as qu'à vérifier et sauver.

> **Astuce durable :** `git config --global rebase.autosquash true` active `--autosquash` par défaut sur tout `rebase -i`. Et `git config --global alias.fx "commit --fixup"` raccourcit la commande.

### 2.8 `--onto` : déplacer une plage sur une nouvelle base

`git rebase --onto <nouvelle-base> <ancienne-base> <branche>` transplante une plage de commits ailleurs. Cas typique : tu as branché `feat/B` par erreur sur `feat/A` alors qu'elle ne dépend que de `main`.

```text
Avant :  main ── A1 ── A2 (feat/A)
                        \
                         B1 ── B2 (feat/B)

But :    on veut B1, B2 rebasés directement sur main, sans A1/A2
```

```bash
git rebase --onto main feat/A feat/B
# "prends les commits de feat/B qui viennent APRÈS feat/A (soit B1, B2)
#  et rejoue-les à partir de main"
```

Lecture du triplet : `--onto main` = la nouvelle base ; `feat/A` = l'ancienne base (borne exclue) ; `feat/B` = jusqu'où aller. Résultat : `main ── B1' ── B2' (feat/B)`.

### 2.9 Gérer les conflits pendant un rebase

Rejouer des commits peut faire tomber sur des conflits, commit par commit. Git s'arrête et attend :

```bash
# Un conflit apparaît. Tu édites les fichiers pour résoudre, puis :
git add src/invite.ts
git rebase --continue     # reprend au commit suivant

git rebase --skip         # abandonne LE commit courant (ex. devenu vide/redondant)

git rebase --abort        # tout annuler, revenir à l'état AVANT le rebase — filet immédiat
```

`--abort` est ton bouton panique : il remet la branche exactement comme avant le `rebase -i`. En cas de doute pendant un rebase qui part mal, `--abort` d'abord, on réfléchit ensuite.

### 2.10 Récupérer après une bêtise : `reflog` + `reset --hard`

Même après un rebase **terminé** et raté, rien n'est perdu : `git reflog` journalise chaque position de HEAD (90 jours par défaut).

```bash
git reflog
# b1122ff HEAD@{0}: rebase (finish): returning to refs/heads/feat/family-invite
# ...
# 9f3a1c2 HEAD@{5}: commit: fix review comment   ← état AVANT le rebase

git reset --hard 9f3a1c2      # ou: git reset --hard HEAD@{5}
```

`reset --hard <ref>` replace la branche sur ce commit **et** aligne le working tree dessus — d'où le retour à l'identique. C'est destructif pour les modifs non commitées en cours, donc on vérifie `git status` avant.

### 2.11 Pas de `-i` en CI / contexte non interactif

`rebase -i` **ouvre un éditeur** : il exige un terminal interactif. Dans un pipeline CI/CD ou un script non interactif, il **bloque ou échoue**. En automatisation, on utilise des équivalents non interactifs : `git rebase --autosquash` piloté par `GIT_SEQUENCE_EDITOR=:` (accepte le todo tel quel), ou plutôt `git merge --squash` / `git rebase <base>` sans `-i`. Le nettoyage d'historique reste une opération **humaine, locale, avant push** — pas une étape de CI.

---

## 3. Worked examples

### Exemple 1 — 5 commits brouillon → 2 commits propres (TribuZen)

État de départ sur `feat/family-invite` (le cas concret) :

```text
$ git log --oneline main..HEAD
9f3a1c2 (HEAD) fix review comment
7b2d004 oops forgot the test
c81e5aa wip
a4f9b13 wip debug console.log
2e6c7d1 feat: add family invite endpoint
```

Objectif : un commit `feat` (endpoint + fixes) et un commit `test`.

**Étape 1 — audit :**

```bash
git status                         # working tree clean
git log --oneline --graph main..HEAD
```

**Étape 2 — lancer le rebase interactif sur les 5 commits :**

```bash
git rebase -i HEAD~5
```

**Étape 3 — éditer le todo** (rappel : du plus ancien en haut). On veut fusionner tous les `wip` et le `fix review` dans le `feat`, et garder le test comme commit séparé en le remontant :

```text
pick 2e6c7d1 feat: add family invite endpoint
fixup a4f9b13 wip debug console.log     # fusionne dans le feat, jette le message
fixup c81e5aa wip                       # idem
fixup 9f3a1c2 fix review comment        # ce fix appartient au feat → fixup
reword 7b2d004 oops forgot the test     # on garde ce commit mais on réécrit son message
```

**Étape 4 — au reword**, Git ouvre l'éditeur sur le dernier ; on écrit :

```text
test(family): cover invite happy path and 429
```

**Étape 5 — résultat :**

```bash
git log --oneline main..HEAD
# b1122ff (HEAD) test(family): cover invite happy path and 429
# c3d4e5f feat: add family invite endpoint
```

Un dernier `reword` sur le feat (via un nouveau `git rebase -i HEAD~2`) donne `feat(family): add invite endpoint with rate limit`. Le diff `git diff main..HEAD` est **identique** à celui d'avant nettoyage — seule l'histoire change, pas le code final.

### Exemple 2 — `--fixup` + `--autosquash` en cours de dev

Tu développes, le commit `2e6c7d1 feat: add family invite endpoint` est déjà fait. En continuant tu remarques un oubli de validation dans ce fichier.

```bash
# 1. Corriger et estampiller le fix sur sa cible
git add src/family/invite.ts
git commit --fixup 2e6c7d1
# → crée: "fixup! feat: add family invite endpoint"

# 2. Continuer à travailler, faire d'autres commits normaux...
git commit -am "test(family): cover invite"

# 3. Avant la PR : laisser Git ranger les fixups automatiquement
git rebase -i --autosquash HEAD~4
```

Le todo s'ouvre **déjà organisé** :

```text
pick 2e6c7d1 feat: add family invite endpoint
fixup 8a1b2c3 fixup! feat: add family invite endpoint   # placé + verbe auto
pick 4d5e6f7 test(family): cover invite
```

Tu sauves sans rien changer. Le `fixup!` disparaît dans son commit cible, l'historique est propre sans effort de mémoire.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Réécrire une branche partagée

```bash
# ❌ La branche a été poussée et un collègue a pull dessus
git checkout develop
git rebase -i HEAD~10        # réécrit des commits que d'autres possèdent
git push --force             # détruit leur base commune → historique divergent chez eux
```

**Pourquoi c'est faux :** les nouveaux SHA n'existent pas chez les collègues. Leur prochain `pull` créera des doublons ou des merges monstrueux, et un `--force` peut écraser leur travail. **Correct :** ne réécrire QUE sa propre branche de feature non partagée, avant le premier push (ou avec `--force-with-lease` si seul dessus).

### PIÈGE #2 — Confondre `squash` et `fixup`

```text
# ❌ On squash trois "wip" → Git ouvre un message concaténant les 3 "wip"
pick 2e6c7d1 feat: add invite endpoint
squash a4f9b13 wip
squash c81e5aa wip
# Résultat : message final pollué par "wip\n\nwip"
```

**Pourquoi c'est faux :** `squash` **conserve et combine** les messages. Pour des commits jetables (`wip`, `oops`), leur message n'a aucune valeur. **Correct :** utiliser `fixup`, qui jette le message et garde uniquement celui du commit cible.

### PIÈGE #3 — Mauvais sens de lecture du todo

```text
# ❌ On croit lire comme git log (récent en haut) et on met squash en 1re ligne
squash 9f3a1c2 fix review comment    # ERREUR : rien au-dessus à fusionner
pick 2e6c7d1 feat: add invite endpoint
```

**Pourquoi c'est faux :** le todo va du **plus ancien (haut)** au plus récent (bas), l'inverse de `git log`. Un `squash`/`fixup` fusionne vers la ligne **du dessus** ; en première ligne il n'a pas de cible et Git refuse. **Correct :** le premier commit reste toujours `pick` ; on fusionne les suivants vers lui.

### PIÈGE #4 — Paniquer et perdre le travail

```bash
# ❌ Rebase qui part en vrille, on ferme le terminal / on bricole au hasard
```

**Pourquoi c'est faux :** on croit avoir tout cassé alors que Git a tout journalisé. **Correct :** pendant un rebase, `git rebase --abort` restaure l'état d'avant. Après un rebase terminé, `git reflog` retrouve le SHA d'origine et `git reset --hard <ce-SHA>` y revient. On ne perd quasi jamais de commits avec Git.

### PIÈGE #5 — Lancer `rebase -i` en CI

```yaml
# ❌ Dans un job CI
- run: git rebase -i --autosquash origin/main
```

**Pourquoi c'est faux :** `-i` exige un éditeur interactif ; en CI il n'y en a pas → le job bloque (timeout) ou échoue. **Correct :** le nettoyage d'historique est une action locale humaine avant push. Si un script doit vraiment appliquer un todo sans intervention, on force un éditeur no-op (`GIT_SEQUENCE_EDITOR=:`), mais on préfère `git rebase origin/main` ou `git merge --squash` non interactifs.

---

## 5. Ancrage TribuZen

Dans TribuZen, chaque feature part d'une branche `feat/*` et arrive en PR sur `develop`. Le rebase interactif est l'étape **de finition juste avant d'ouvrir la PR**.

- **Branche `feat/family-invite`** — le cas concret et l'Exemple 1 de ce module. Cinq commits brouillon (`wip`, `oops`, `fix review`) → deux commits propres (`feat(family): …`, `test(family): …`) via `fixup` + `reword` + réordonnancement. C'est exactement le flux appliqué avant chaque PR TribuZen.
- **Convention de message** — TribuZen impose les Conventional Commits (`feat(scope):`, `fix(scope):`, `test(scope):`). Le `reword` sert à mettre au propre les messages écrits vite pendant le dev.
- **Split d'un gros commit** — quand un commit `feat(events): full events module` mélange endpoint + validation + tests, on le découpe avec `edit` + `reset HEAD^` (section 2.6) en trois commits atomiques, pour que `git bisect` (module 05) puisse isoler un bug commit par commit.
- **`--fixup` en cours de review** — quand un reviewer demande un changement, on corrige avec `git commit --fixup <sha-cible>` puis, à la fin, `git rebase -i --autosquash` refond les corrections dans les bons commits au lieu d'empiler des `fix review comment`.
- **Récupération reflog** — si un rebase avant PR se passe mal sur `feat/*`, `git reflog` + `git reset --hard HEAD@{n}` restaure la branche. On ne réécrit jamais `develop` ni `main` (règle d'or).

Le lab de ce module reproduit ce flux end-to-end avec de vraies commandes Git.

---

## 6. Points clés

1. `git rebase -i <base>` ouvre un fichier todo (du plus ancien en haut) pour réécrire l'historique local.
2. Verbes : `pick` (garder), `reword` (message), `edit` (s'arrêter/splitter), `squash` (fusionner + combiner messages), `fixup` (fusionner + jeter message), `drop` (supprimer), `exec`/`break` (script/pause).
3. `squash` garde les messages, `fixup` les jette : un `wip` se `fixup`.
4. Réordonner = déplacer les lignes ; splitter un commit = `edit` puis `git reset HEAD^` + re-commits + `--continue`.
5. `git commit --fixup <sha>` pendant le dev + `git rebase -i --autosquash` avant la PR range les corrections automatiquement.
6. `git rebase --onto <nouvelle-base> <ancienne-base> <branche>` transplante une plage de commits sur une autre base.
7. Conflits pendant un rebase : résoudre + `git add` + `--continue`, ou `--skip`, ou `--abort` (annule tout).
8. Filet de sécurité : `git reflog` + `git reset --hard <sha>` récupèrent après un rebase raté.
9. Règle d'or : réécrire uniquement l'historique local non partagé, jamais `main`/`develop`/branche d'équipe.
10. `-i` est interactif : jamais en CI/non-interactif — le nettoyage est une opération humaine locale avant push.

---

## 7. Seeds Anki

```
Dans quel sens sont listés les commits dans le todo de git rebase -i ?|Du plus ancien (en haut) au plus récent (en bas) — l'inverse de git log. Un squash/fixup fusionne toujours vers la ligne au-dessus, donc la première ligne ne peut jamais être squash/fixup.
Différence entre squash et fixup dans un rebase interactif ?|Les deux fusionnent le commit dans le précédent. squash conserve et combine les deux messages (édition), fixup jette le message du commit fusionné. Un commit "wip" se fixup ; un commit dont le message compte se squash.
Comment splitter un commit trop gros pendant un rebase interactif ?|Marquer le commit avec edit ; Git s'arrête dessus. Puis git reset HEAD^ (défait le commit, garde les fichiers unstaged), git add par lots + git commit pour chaque morceau, enfin git rebase --continue.
À quoi sert git commit --fixup <sha> combiné à git rebase -i --autosquash ?|--fixup crée un commit "fixup! <msg cible>" estampillé sur un commit existant. --autosquash le replace automatiquement sous sa cible avec le bon verbe dans le todo. On corrige pendant le dev, on refond proprement avant la PR sans mémoriser quel commit corriger.
Que fait git rebase --onto main feat/A feat/B ?|Prend les commits de feat/B situés après feat/A (borne exclue) et les rejoue à partir de main. Transplante une plage de commits sur une nouvelle base — utile quand une branche a été créée sur la mauvaise base.
Comment récupérer après un rebase interactif raté déjà terminé ?|git reflog pour retrouver le SHA de HEAD avant le rebase, puis git reset --hard <ce-sha> (ou HEAD@{n}). Le reflog journalise les positions de HEAD 90 jours ; on ne perd quasi jamais de commits. Pendant un rebase en cours, git rebase --abort suffit.
Quelle est la règle d'or de la réécriture d'historique ?|On ne réécrit QUE de l'historique local non partagé (ou sa seule branche de feature avant push). Jamais main, develop, ni une branche partagée : les nouveaux SHA divergent de ceux des collègues et un push --force peut détruire leur travail.
Pourquoi ne pas utiliser git rebase -i en CI ?|Le flag -i ouvre un éditeur et exige un terminal interactif ; en CI il n'y en a pas, donc le job bloque ou échoue. Le nettoyage d'historique est une opération humaine locale avant push, pas une étape de pipeline.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-04-rebase-interactif/README.md`. Nettoyer un vrai dépôt de 5 commits brouillon en 2 commits propres via `rebase -i` (fixup, reword, reorder), avec de vraies commandes Git — corrigé inline, variante J+30 et application TribuZen.
