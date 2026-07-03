---
titre: Git bisect et debugging d'historique
cours: 07-git-avance
notions: [recherche binaire sur les commits, git bisect start/good/bad/reset, git bisect run automatisé, codes de sortie 0/1-124/125, git bisect skip et log/replay, complexité O(log n), git blame avec -L, ignorer les commits de reformatage, pickaxe git log -S et -G, git log --follow, git diff avancé]
outcomes: [trouver le commit fautif par recherche binaire manuelle, automatiser la recherche avec git bisect run, retrouver quand et pourquoi une ligne a été introduite avec blame et pickaxe]
prerequis: [04-rebase-interactif]
next: 06-git-hooks-automatisation
libs: []
tribuzen: debugging de régression sur le repo tribuzen — bisect run npm test, blame d'une ligne suspecte, pickaxe d'un feature flag
last-reviewed: 2026-07
---

# Git bisect et debugging d'historique

> **Outcomes — tu sauras FAIRE :** trouver le commit fautif par recherche binaire (manuelle puis automatisée avec `git bisect run`), retrouver quand et pourquoi une ligne a été introduite avec `git blame` et le pickaxe (`git log -S`/`-G`).
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

La suite de tests de TribuZen était verte à la release `v1.4.0`. Trois semaines plus tard, `main` a **214 commits** de plus et un test casse :

```bash
$ npm test
 FAIL  src/invite/inviteMember.test.ts
   ● invite un membre dans une famille › refuse un email déjà membre
   expected 409, received 201
```

Personne ne sait quel commit a introduit la régression. L'approche naïve — checkout chaque commit, relancer les tests — c'est **214 vérifications** dans le pire des cas. Une soirée entière.

`git bisect` fait une **recherche binaire** sur l'historique : il coupe l'intervalle en deux à chaque étape. 214 commits → `log2(214) ≈ 8` vérifications. Et si tu peux exprimer « le bug est présent » comme le code de sortie d'un script, `git bisect run` fait les 8 étapes **tout seul** pendant que tu prends un café.

Ce module te donne : la recherche binaire (manuelle et automatisée), puis les outils pour comprendre *pourquoi* — `git blame`, le pickaxe (`-S`/`-G`), `--follow`. Trouver **quand** un bug est apparu, puis **pourquoi**.

---

## 2. Théorie complète, concise

### 2.1 Le principe : recherche binaire sur les commits

L'historique linéaire entre un commit **bon connu** (le bug n'y est pas) et un commit **mauvais connu** (le bug y est) est une séquence triée : quelque part, ça bascule de « bon » à « mauvais ». `git bisect` trouve ce point de bascule par dichotomie.

À chaque étape, Git checkout le commit du milieu de l'intervalle restant. Tu réponds « bon » ou « mauvais ». Git élimine la moitié qui ne peut pas contenir le premier commit fautif, et recommence sur l'autre moitié.

```
good ───────────────●───────────────── bad   (HEAD)
                  milieu testé
```

**Complexité : O(log n).** Doubler la taille de l'historique n'ajoute qu'**une** étape.

| Commits dans l'intervalle | Étapes bisect (log2) |
|---|---|
| 10 | ~4 |
| 100 | ~7 |
| 1 000 | ~10 |
| 10 000 | ~14 |

Prérequis : le passage bon→mauvais doit être **monotone** (une fois cassé, ça reste cassé). Si le bug apparaît et disparaît, bisect trouvera *un* commit qui bascule, pas forcément *le* coupable — voir Pièges.

### 2.2 Bisect manuel : le cycle start / bad / good / reset

```bash
# 1. Ouvrir une session de bisect
git bisect start

# 2. Marquer HEAD comme mauvais (le bug est présent maintenant)
git bisect bad

# 3. Marquer un commit connu comme bon (tag, hash, HEAD~200…)
git bisect good v1.4.0
# Git répond :
#   Bisecting: 106 revisions left to test after this (roughly 7 steps)
#   [a1b2c3d] refactor: extract invite validation
#   → Git a DÉJÀ checkout le commit du milieu
```

À partir de là, à chaque étape tu testes le code checkouté puis tu classes le commit :

```bash
npm test                 # ou reproduis le bug à la main

git bisect good          # le bug n'est PAS là → il est plus récent
# ou
git bisect bad           # le bug EST là → il est plus ancien
```

Répète. Git rétrécit l'intervalle jusqu'au verdict :

```
a1b2c3d is the first bad commit
commit a1b2c3d...
Author: Bob <bob@tribuzen.app>
Date:   ...
    refactor: extract invite validation
```

**Toujours clore la session** pour revenir sur ta branche et son HEAD d'origine :

```bash
git bisect reset         # retour à la branche/commit de départ
```

Sans `reset`, tu restes en `HEAD` détaché sur un vieux commit.

### 2.3 Bisect automatisé : `git bisect run` (le cœur du module)

C'est **la** raison d'utiliser bisect en pratique. Au lieu de classer chaque commit à la main, tu fournis une commande qui rend un **code de sortie**, et Git pilote toute la recherche.

```bash
git bisect start
git bisect bad HEAD
git bisect good v1.4.0

# Git checkout chaque commit du milieu, lance la commande,
# lit le code de sortie, et continue — automatiquement.
git bisect run npm test
```

Convention des codes de sortie que `run` interprète :

| Code de sortie | Interprétation | Effet |
|---|---|---|
| `0` | commit **bon** | `git bisect good` |
| `1`–`124`, `126`, `127` | commit **mauvais** | `git bisect bad` |
| `125` | commit **non testable** | `git bisect skip` |
| `128`+ | abandon | stoppe le run |

`npm test`, `vitest run`, `pytest`, `go test`… tous rendent `0` si vert, non-zéro si rouge — donc ils marchent directement avec `bisect run`. À la fin, Git affiche `... is the first bad commit` ; il reste à faire `git bisect reset`.

Version en une ligne, la plus courante :

```bash
git bisect start HEAD v1.4.0        # bad=HEAD, good=v1.4.0 en un coup
git bisect run npm test -- src/invite/inviteMember.test.ts
git bisect reset
```

### 2.4 Le script de test : cibler et rendre le bon code

Un `npm test` complet peut être lent ou échouer pour une *autre* raison sur de vieux commits. On écrit alors un script dédié qui isole **le** bug et gère les commits non compilables.

```bash
#!/usr/bin/env bash
# scripts/check-invite-bug.sh — rend 0 si bon, 1 si mauvais, 125 si non testable

# Dépendances/compilation : si ça ne build pas, le commit n'est pas testable → skip
npm ci --silent   || exit 125
npm run build     || exit 125

# Cible UNIQUEMENT le test de la régression
npx vitest run src/invite/inviteMember.test.ts
# vitest rend 0 si vert, 1 si rouge → exactement la convention bisect
```

```bash
chmod +x scripts/check-invite-bug.sh
git bisect start HEAD v1.4.0
git bisect run ./scripts/check-invite-bug.sh
git bisect reset
```

Le `exit 125` est essentiel : sans lui, un vieux commit qui ne compile pas serait classé « mauvais » et fausserait la recherche. Avec `125`, Git le **skippe** et teste un commit voisin.

### 2.5 skip, log et replay

```bash
git bisect skip            # commit courant non testable → Git en propose un autre
git bisect skip v1.3.1..v1.3.4   # skip une plage entière

git bisect log  > bisect.log     # journal reproductible de la session
git bisect replay bisect.log     # rejoue les good/bad (partage avec un collègue)
```

`--term-old`/`--term-new` remplacent le vocabulaire good/bad quand « mauvais » n'a pas de sens (ex. chasse à une régression de perf : `old`/`new`, `fast`/`slow`) :

```bash
git bisect start --term-old fast --term-new slow
git bisect fast v1.4.0
git bisect slow HEAD
git bisect run ./benchmark-gate.sh   # rend non-zéro quand c'est "slow"
```

### 2.6 Comprendre POURQUOI : `git blame`

Bisect dit *quel commit*. `git blame` dit *quel commit a écrit chaque ligne* d'un fichier — le point de départ pour comprendre l'intention.

```bash
git blame src/invite/inviteMember.ts
# chaque ligne préfixée par : <hash> (<auteur> <date> <n° ligne>) <code>
```

Sur un gros fichier, on cible une plage avec `-L` :

```bash
git blame -L 40,60 src/invite/inviteMember.ts      # lignes 40 à 60
git blame -L '/function invite/,+20' src/invite/inviteMember.ts  # 20 lignes après un motif
```

**Le piège du blame : les commits de reformatage.** Un « `chore: prettier` » qui a retouché tout le fichier fait que blame attribue *toutes* les lignes à ce commit cosmétique, masquant le vrai auteur logique. Solution :

```bash
# Ignorer un commit précis pour cette invocation
git blame --ignore-rev <hash-du-commit-prettier> src/invite/inviteMember.ts

# Mieux : un fichier versionné listant les commits à ignorer partout
echo "<hash-du-commit-prettier>" >> .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Une fois `blame.ignoreRevsFile` configuré, `git blame` (et GitHub/GitLab) sautent ces commits et attribuent les lignes à l'auteur *logique*.

### 2.7 Comprendre QUAND : le pickaxe `git log -S` / `-G`

`git blame` montre l'état *actuel* d'une ligne. Le **pickaxe** répond à une autre question : « à quel commit cette chaîne / ce motif est-il **apparu ou a disparu** dans l'histoire ? »

```bash
# -S<chaîne> : commits où le NOMBRE d'occurrences de la chaîne a changé
#              → typiquement l'introduction ou la suppression d'un identifiant
git log -S 'ALLOW_DUPLICATE_INVITE' --oneline

# ajoute le diff pour voir le changement exact
git log -S 'ALLOW_DUPLICATE_INVITE' -p

# -G<regex> : commits dont le diff CONTIENT une ligne matchant la regex
#             (plus large : capte aussi les modifications d'une ligne existante)
git log -G 'status\s*=\s*201' -p -- src/invite/
```

| Outil | Question à laquelle il répond |
|---|---|
| `git bisect` | Quel commit fait basculer un test bon→mauvais ? |
| `git blame` | Qui a écrit *cette ligne telle qu'elle est aujourd'hui* ? |
| `git log -S` | Quand cette *chaîne/identifiant* est-il apparu/disparu ? |
| `git log -G` | Quand une ligne matchant *cette regex* a-t-elle été touchée ? |

`-S` compte les occurrences (apparition/disparition d'un symbole) ; `-G` matche n'importe quel diff touchant la regex (y compris une modif sur place). Pour « quand ce flag a-t-il été introduit », `-S` est le bon choix.

### 2.8 Suivre à travers les renommages : `--follow` et `git diff`

```bash
# Historique d'un fichier À TRAVERS ses renommages (log s'arrête au rename sans --follow)
git log --follow -p -- src/invite/inviteMember.ts

# diff avancés utiles au debug d'historique
git diff v1.4.0..HEAD -- src/invite/        # tout ce qui a changé dans un dossier depuis la release
git diff --stat v1.4.0..HEAD                # résumé par fichier (± lignes)
git diff a1b2c3d~1 a1b2c3d -- src/invite/inviteMember.ts   # le diff exact du commit fautif
```

`a1b2c3d~1 a1b2c3d` = « juste avant » vs « juste après » le commit coupable : c'est le diff minimal qui a introduit le bug, isolé.

---

## 3. Worked examples

### Exemple 1 — Bisect run de bout en bout (régression TribuZen)

Reprise du cas concret : le test `inviteMember.test.ts` casse, `v1.4.0` était vert.

```bash
# 1. Session bisect en une ligne : bad = HEAD, good = v1.4.0
git bisect start HEAD v1.4.0
#   Bisecting: 106 revisions left to test after this (roughly 7 steps)

# 2. Automatiser : cibler UNIQUEMENT le test cassé
#    vitest rend 0 (vert) / 1 (rouge) → convention bisect respectée
git bisect run npx vitest run src/invite/inviteMember.test.ts

# Git déroule les 7 étapes seul :
#   running 'npx vitest run ...'   → exit 0 → good, moitié haute éliminée
#   running 'npx vitest run ...'   → exit 1 → bad,  moitié basse éliminée
#   ... (5 étapes de plus) ...
#
#   a1b2c3d is the first bad commit
#   Author: Bob <bob@tribuzen.app>
#       refactor: extract invite validation
#   bisect run success

# 3. Voir EXACTEMENT ce que ce commit a changé sur le fichier fautif
git show a1b2c3d -- src/invite/inviteMember.ts
# → on découvre que le check "email déjà membre" a été déplacé APRÈS l'insert
#   au lieu d'AVANT → 201 renvoyé au lieu de 409.

# 4. Clore la session, revenir sur main
git bisect reset
```

En ~7 exécutions automatiques, on est passé de « quelque part dans 214 commits » à « cette ligne de ce commit ». Aucune décision manuelle par étape.

**Variante avec script robuste** — quand certains commits de l'intervalle ne compilent pas :

```bash
git bisect start HEAD v1.4.0
git bisect run ./scripts/check-invite-bug.sh   # exit 125 skippe les commits non buildables
git bisect reset
```

### Exemple 2 — blame + pickaxe pour trouver l'origine d'un flag suspect

Le diff du commit fautif mentionne une constante `ALLOW_DUPLICATE_INVITE`. D'où sort-elle, et depuis quand ?

```bash
# a) Qui a écrit la ligne suspecte, aujourd'hui, dans le fichier ?
git blame -L '/ALLOW_DUPLICATE_INVITE/,+1' src/invite/config.ts
#   f00dcafe (Alice 2026-05-02) export const ALLOW_DUPLICATE_INVITE = true;

# b) Mais blame pointe peut-être vers un "chore: prettier". On l'ignore :
git blame --ignore-rev 9c0sm3tic -L '/ALLOW_DUPLICATE_INVITE/,+1' src/invite/config.ts
#   → maintenant blame attribue la ligne au vrai commit logique

# c) QUAND ce flag est-il APPARU dans tout l'historique ? (pickaxe -S)
git log -S 'ALLOW_DUPLICATE_INVITE' --oneline
#   f00dcafe feat(invite): flag temporaire pour la migration de mai
#   (un seul commit → c'est là que la chaîne est née)

# d) Voir le diff exact de cette introduction
git log -S 'ALLOW_DUPLICATE_INVITE' -p -- src/invite/config.ts

# e) Le flag a-t-il été retouché ailleurs ? (regex plus large -G)
git log -G 'ALLOW_DUPLICATE_INVITE' --oneline
#   liste TOUS les commits dont le diff touche une ligne contenant le flag
```

Conclusion de l'enquête : le flag `ALLOW_DUPLICATE_INVITE`, censé être temporaire (`f00dcafe`), n'a jamais été retiré ; le refactor `a1b2c3d` a réordonné la validation en s'appuyant dessus. On tient le **quand** (bisect + pickaxe) et le **pourquoi** (blame + show).

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Inverser good et bad

`good` = le bug **n'est pas** là ; `bad` = le bug **est** là. Intuitivement on veut dire « ce commit est bon » en pensant à sa qualité, mais bisect parle **du bug**, pas du commit.

```bash
# ❌ On marque good le commit où le test échoue → bisect cherche à l'envers, verdict faux
# ✅ good = commit SANS le symptôme ; bad = commit AVEC le symptôme
git bisect good v1.4.0   # v1.4.0 n'avait pas le bug
git bisect bad  HEAD     # HEAD a le bug
```

Si tu confonds, Git peut désigner un commit absurde. Le doute ? `git bisect reset` et recommence.

### PIÈGE #2 — Oublier `git bisect reset`

À la fin (ou en cas d'abandon), tu es en **HEAD détaché** sur un commit du milieu. Commiter là crée un commit orphelin ; se croire sur `main` mène à des erreurs.

```bash
# ✅ TOUJOURS clore, même après un abandon
git bisect reset          # revient à la branche + HEAD d'origine
```

### PIÈGE #3 — Un mauvais code de sortie dans le script `run`

`git bisect run` interprète **le code de sortie**, pas la sortie texte. Deux erreurs classiques :

```bash
# ❌ Le script rend TOUJOURS 0 (un `echo` final masque le code de test)
run_tests; echo "fini"      # exit = celui du echo = 0 → tout classé "good"

# ❌ exit 255 (souvent "commande introuvable") → ≥128 → bisect ABANDONNE
# ✅ Rendre explicitement 0 / 1 / 125, et laisser le testeur porter le code
npx vitest run src/x.test.ts   # dernière commande = code propre 0/1
# et pour les commits non buildables :
npm run build || exit 125
```

Règle : la **dernière** commande du script doit être le test, ou termine par un `exit` explicite. `125` = non testable (skip), jamais un autre code pour ça.

### PIÈGE #4 — `blame` accuse un commit de reformatage

Après un `prettier`/`eslint --fix` global, `git blame` attribue des lignes entières à ce commit cosmétique — l'auteur *logique* est masqué.

```bash
# ❌ git blame file.ts → tout pointe vers "chore: format", inutile
# ✅ Ignorer les commits cosmétiques
git blame --ignore-rev <hash> file.ts
# ✅ De façon permanente et partagée par l'équipe
echo "<hash>" >> .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

### PIÈGE #5 — Confondre `-S` et `-G` (pickaxe)

```bash
# -S<str> : commits où le NOMBRE d'occurrences de la chaîne CHANGE
#           → parfait pour "quand ce symbole est-il apparu / a disparu"
git log -S 'ALLOW_DUPLICATE_INVITE'

# -G<regex> : commits dont le diff CONTIENT une ligne matchant la regex
#             → capte AUSSI les modifs d'une ligne existante (bruit possible)
git log -G 'ALLOW_DUPLICATE_INVITE'
```

Pour « à quel commit ce flag est-il né », `-S` (compte les occurrences) est précis ; `-G` renvoie tous les diffs qui *touchent* une ligne matchante, y compris des déplacements sans changement de compte.

### PIÈGE #6 — Bisect sur une régression non monotone

Bisect suppose que le passage bon→mauvais est **monotone** (une fois cassé, ça reste cassé). Si le bug clignote (dépend d'une date, d'un test flaky, d'un état externe), bisect trouvera *un* point de bascule, pas forcément *le* coupable. Stabilise d'abord la repro (fige l'horloge, isole le test) avant de bisect.

---

## 5. Ancrage TribuZen

Le debugging d'historique est la couche « forensics » du repo `smaurier/tribuzen`. Trois usages concrets et récurrents :

**1. Trouver la régression via `bisect run npm test`.** Quand la CI passe au rouge sur `main` sans qu'on sache quel merge est fautif, on lance sur le repo TribuZen :

```bash
git bisect start HEAD <dernier-tag-vert>
git bisect run npx vitest run src/invite/inviteMember.test.ts
git bisect reset
```

La CI TribuZen tague chaque release (`v1.4.0`, `v1.5.0`…) précisément pour disposer d'un `good` fiable comme borne de bisect.

**2. Blamer une ligne suspecte.** Sur `src/invite/inviteMember.ts`, comprendre pourquoi la validation d'email dupliqué a bougé :

```bash
git blame -L '/duplicate/,+5' src/invite/inviteMember.ts
```

Le repo TribuZen versionne `.git-blame-ignore-revs` (avec `blame.ignoreRevsFile` configuré) pour que les commits `chore: format` récurrents ne polluent pas le blame.

**3. Pickaxe pour retrouver l'introduction d'un feature flag.** Les flags temporaires de migration (`ALLOW_DUPLICATE_INVITE`, `NEW_ONBOARDING`…) doivent être traçables :

```bash
git log -S 'ALLOW_DUPLICATE_INVITE' -p -- src/invite/config.ts
```

Fichiers cibles typiques d'une session forensics TribuZen :
```
tribuzen/
  src/invite/
    inviteMember.ts        ← blame -L sur la validation
    inviteMember.test.ts   ← cible de git bisect run
    config.ts              ← pickaxe -S sur les feature flags
  scripts/
    check-invite-bug.sh    ← script bisect run (exit 0/1/125)
  .git-blame-ignore-revs   ← commits de reformatage ignorés
```

---

## 6. Points clés

1. `git bisect` fait une recherche binaire sur l'historique : O(log n) vérifications au lieu de O(n) — doubler l'historique n'ajoute qu'une étape.
2. Cycle manuel : `git bisect start` → `git bisect bad` (bug présent) → `git bisect good <ref>` (bug absent) → répéter → `git bisect reset`.
3. `git bisect run <cmd>` automatise tout : Git lit le **code de sortie** (0 = good, 1-124 = bad, 125 = skip) et déroule seul les ~log2(n) étapes.
4. Un test qui rend 0/non-zéro (`npm test`, `vitest run`, `pytest`) marche directement avec `bisect run` ; un script dédié ajoute `exit 125` pour les commits non buildables.
5. Toujours finir par `git bisect reset` pour sortir du HEAD détaché.
6. `git blame [-L a,b]` dit qui a écrit chaque ligne aujourd'hui ; `--ignore-rev`/`.git-blame-ignore-revs` évitent que les commits de reformatage masquent l'auteur logique.
7. Pickaxe : `git log -S<chaîne>` trouve quand un symbole est apparu/disparu (compte d'occurrences) ; `git log -G<regex>` capte tout diff touchant une ligne matchante ; `git log --follow` suit un fichier à travers ses renommages.

---

## 7. Seeds Anki

```
Quelle est la complexité de git bisect et pourquoi ?|O(log n) : recherche binaire sur les commits. À chaque étape Git coupe l'intervalle bon/mauvais en deux. 214 commits ≈ 8 vérifications ; doubler l'historique n'ajoute qu'une étape.
Dans git bisect, que signifient good et bad ?|good = le bug N'EST PAS présent sur ce commit ; bad = le bug EST présent. On parle du symptôme, pas de la qualité du commit. Inverser les deux donne un verdict faux.
Comment automatiser entièrement un bisect ?|git bisect run <commande> : Git checkout chaque commit du milieu, lance la commande et lit son code de sortie pour classer good/bad/skip, jusqu'au premier commit fautif — sans intervention manuelle.
Quels codes de sortie git bisect run interprète-t-il ?|0 = bon (good) ; 1 à 124 (et 126,127) = mauvais (bad) ; 125 = non testable (skip, ex. ne compile pas) ; ≥128 = abandon du run.
Pourquoi finir un bisect par git bisect reset ?|Pendant le bisect on est en HEAD détaché sur des commits du milieu. reset ramène sur la branche et le HEAD d'origine ; sans lui, commiter crée un commit orphelin.
Comment empêcher un commit de reformatage de fausser git blame ?|git blame --ignore-rev <hash> pour une invocation, ou lister les hashes dans .git-blame-ignore-revs + git config blame.ignoreRevsFile .git-blame-ignore-revs pour l'ignorer partout et attribuer la ligne à l'auteur logique.
Quelle différence entre git log -S et git log -G ?|-S<chaîne> liste les commits où le NOMBRE d'occurrences de la chaîne change (apparition/disparition d'un symbole). -G<regex> liste les commits dont le diff contient une ligne matchant la regex (capte aussi les modifs sur place). Pour "quand ce flag est né", -S.
À quoi sert git log --follow ?|Suivre l'historique d'un fichier À TRAVERS ses renommages. Sans --follow, git log s'arrête au commit de rename et masque l'histoire antérieure sous l'ancien nom.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-05-bisect/README.md`. Créer un vrai dépôt, y injecter un commit qui casse un test, le retrouver en bisect **manuel** puis avec **`git bisect run`**, et enquêter à coups de `blame` et de pickaxe. Vraies commandes git, corrigé inline.
