# Lab 03 — Merge vs Rebase : provoquer et résoudre un conflit des deux façons

> **Outcome :** à la fin, tu sais provoquer un conflit, le résoudre en **merge** ET en **rebase**, comparer les deux historiques obtenus, et énoncer la règle d'or sans hésiter.
> **Vrai outil :** Git réel (aucun harnais simulé). Tu tapes de vraies commandes dans un vrai dépôt jetable.
> **Feedback :** le coach valide en session en lisant tes `git log --graph`. Pas de test-runner auto-correcteur.

## Énoncé

Tu vas créer un dépôt jetable qui simule le cas TribuZen du module : une branche `main` et une branche `feature/rituels-hebdo` qui **modifient la même ligne** d'un fichier → conflit garanti.

Tu résoudras ce conflit **deux fois** :
1. une fois par **merge** (observe le merge commit à deux parents),
2. une fois par **rebase** (observe l'historique linéaire et les hash réécrits).

Puis tu compareras les deux historiques et tu appliqueras la règle d'or.

### Setup (à taper tel quel)

```bash
# Dépôt jetable — RIEN à voir avec tes vrais repos
mkdir lab-merge-rebase && cd lab-merge-rebase
git init
git config user.email "toi@example.com"
git config user.name "Toi"

# Base commune : un fichier de config TribuZen
printf 'export const MAX_RITUELS = 5;\n' > rituels.ts
git add rituels.ts
git commit -m "feat: base rituels (MAX = 5)"

# Branche feature qui monte la limite à 8
git switch -c feature/rituels-hebdo
printf 'export const MAX_RITUELS = 8;\n' > rituels.ts
git commit -am "feat: rituels hebdo (MAX = 8)"

# Pendant ce temps, main monte la limite à 10 (divergence sur la MÊME ligne)
git switch main
printf 'export const MAX_RITUELS = 10;\n' > rituels.ts
git commit -am "fix: quota rituels (MAX = 10)"

# État de départ : main et feature ont divergé
git log --oneline --graph --all
```

## Étapes (en friction)

Tu produis toi-même chaque commande et chaque résolution — ne copie pas le corrigé avant d'avoir essayé.

### Partie A — Résoudre par MERGE

1. Depuis `main`, lance `git merge feature/rituels-hebdo`. Observe le message de conflit.
2. Ouvre `rituels.ts` : repère les marqueurs `<<<<<<<`, `=======`, `>>>>>>>`. Identifie quelle zone est **ours** et laquelle est **theirs**.
3. Résous en gardant `MAX_RITUELS = 10` (décision produit), retire **les trois marqueurs**.
4. `git add rituels.ts` puis `git commit` (garde le message de merge pré-rempli).
5. `git log --oneline --graph` : **combien de parents** a le dernier commit ? Note la forme du graphe.

### Partie B — Rejouer le MÊME conflit par REBASE

6. Reviens à l'état de départ sur une nouvelle branche pour ne pas casser la partie A :
   ```bash
   git switch feature/rituels-hebdo
   git switch -c feature/rituels-rebase   # copie de la feature
   ```
7. Rebase cette copie sur `main` : `git rebase main`. Observe que le conflit **revient** (même ligne).
8. Résous à nouveau (`MAX = 10`), retire les marqueurs, `git add rituels.ts`, puis `git rebase --continue`.
9. `git log --oneline --graph` : le graphe est-il linéaire ? Compare le **hash** du commit « rituels hebdo » avant/après rebase (il a changé → commit réécrit).

### Partie C — Comparer et appliquer la règle d'or

10. Mets côte à côte les deux historiques (`git log --graph` sur la branche mergée vs la branche rebasée). Décris en une phrase ce que chacun raconte.
11. Réponds à voix haute au coach : *pourquoi n'aurais-tu jamais dû faire l'étape 7 si `feature/rituels-hebdo` avait déjà été poussée et utilisée par un collègue ?*

## Corrigé complet commenté

```bash
# ═══ PARTIE A — MERGE ════════════════════════════════════════════
git switch main
git merge feature/rituels-hebdo
# Auto-merging rituels.ts
# CONFLICT (content): Merge conflict in rituels.ts
# Automatic merge failed; fix conflicts and then commit the result.

# rituels.ts contient maintenant :
# <<<<<<< HEAD                       ← OURS = main (MAX = 10), la branche courante
# export const MAX_RITUELS = 10;
# =======
# export const MAX_RITUELS = 8;
# >>>>>>> feature/rituels-hebdo      ← THEIRS = feature (MAX = 8), branche entrante

# On édite le fichier pour ne garder QUE la ligne voulue, marqueurs retirés :
printf 'export const MAX_RITUELS = 10;\n' > rituels.ts

git add rituels.ts
git commit --no-edit          # accepte le message "Merge branch 'feature/...'"

git log --oneline --graph
# *   c0ffee1 (main) Merge branch 'feature/rituels-hebdo'   ← MERGE COMMIT à 2 parents
# |\
# | * 1111aaa (feature/rituels-hebdo) feat: rituels hebdo (MAX = 8)
# * | 2222bbb fix: quota rituels (MAX = 10)
# |/
# * 3333ccc feat: base rituels (MAX = 5)
# → Historique NON linéaire : le merge commit documente l'intégration,
#   les deux commits d'origine gardent leurs hash (1111aaa, 2222bbb).

# ═══ PARTIE B — REBASE (même conflit) ════════════════════════════
git switch feature/rituels-hebdo
git switch -c feature/rituels-rebase    # copie pour ne pas toucher la partie A

git rebase main
# CONFLICT (content): Merge conflict in rituels.ts
# ATTENTION à l'inversion ours/theirs en rebase :
# <<<<<<< HEAD                    ← OURS = main (la BASE sur laquelle on rejoue), MAX = 10
# export const MAX_RITUELS = 10;
# =======
# export const MAX_RITUELS = 8;
# >>>>>>> feature: rituels hebdo  ← THEIRS = TON commit en cours de rejeu, MAX = 8

printf 'export const MAX_RITUELS = 10;\n' > rituels.ts
git add rituels.ts
git rebase --continue           # rejoue le commit résolu ; s'il y en avait d'autres, la boucle continue
# (si tout part en vrille : git rebase --abort → retour exact à l'avant-rebase)

git log --oneline --graph
# * 4444ddd (feature/rituels-rebase) feat: rituels hebdo (MAX = 10)  ← HASH DIFFÉRENT de 1111aaa !
# * 2222bbb (main) fix: quota rituels (MAX = 10)
# * 3333ccc feat: base rituels (MAX = 5)
# → Historique LINÉAIRE, aucun merge commit. Mais le commit "rituels hebdo"
#   a été RÉÉCRIT : son hash (4444ddd) diffère de l'original (1111aaa).

# ═══ PARTIE C — comparaison ══════════════════════════════════════
# MERGE  : graphe en losange, 2 parents, raconte QUAND la feature a été intégrée,
#          hash d'origine préservés → toujours sûr, même sur branche partagée.
# REBASE : ligne droite, lisible pour la review, mais hash réécrits → l'histoire
#          d'origine est perdue. Sûr UNIQUEMENT si la branche est privée.
```

### Règle d'or — la réponse à l'étape 11

Si `feature/rituels-hebdo` avait été **poussée** et qu'un collègue s'était basé dessus, le rebase de l'étape 7 aurait **réécrit les hash** (`1111aaa` → `4444ddd`). Le collègue, lui, aurait toujours `1111aaa`. Au prochain `pull` il récupérerait **les deux** versions → commits en double, conflits absurdes, historique cassé pour toute l'équipe.

> **RÈGLE D'OR : ne rebase JAMAIS des commits déjà poussés / partagés. Rebase ce qui est à toi seul, merge tout le reste.**

## Variante J+30 (fading)

Refais le lab **sans regarder le corrigé**, avec **deux commits** sur la feature au lieu d'un (donc le conflit peut revenir deux fois pendant le rebase). Contraintes ajoutées :
- active `git config rerere.enabled true` **avant** de commencer et observe qu'à la 2ᵉ occurrence du même conflit, Git rejoue ta résolution.
- termine en intégrant la feature sur `main` avec `git merge --no-ff` + un tag `v1.0.0`, et vérifie que le merge commit à deux parents apparaît bien.
- objectif temps : 15 min, marqueurs retirés proprement du premier coup.

## Application TribuZen

Porte le geste dans le vrai produit (repo `smaurier/tribuzen`) :

1. Sur ta branche `feature/rituels-hebdo` réelle, avant d'ouvrir la PR : `git fetch origin` puis `git rebase origin/main` pour **linéariser** ton historique (branche privée → rebase autorisé). Résous les conflits typiques (`package.json`, `i18n/fr.json`), puis `git push --force-with-lease`.
2. Une fois la PR validée, intègre la **release** sur `main` avec `git merge --no-ff -m "release: rituels hebdo v1.2"` pour **tracer** l'intégration, puis `git tag -a v1.2.0`.
3. Ne rebase **jamais** `main` : elle est partagée par l'équipe. Commit final sur `smaurier/tribuzen`, PR liée à ce lab.
