# Lab 04 — Rebase interactif : 5 commits brouillon → 2 commits propres

> **Outcome :** à la fin, tu sais transformer un historique de 5 commits brouillon (`wip`, `oops`) en 2 commits propres et atomiques via `git rebase -i` (squash/fixup, reword, réordonnancement), et récupérer via `reflog` si ça tourne mal.
> **Vrai outil :** Git en ligne de commande dans un vrai dépôt local (pas de simulateur, pas de test-runner auto-correcteur).
> **Feedback :** le coach valide en session en lisant ton `git log --oneline` final.

---

## Énoncé

Tu vas créer un petit dépôt jetable, y fabriquer un historique brouillon typique d'une feature TribuZen, puis le nettoyer.

**Cible d'arrivée** — exactement 2 commits sur la branche de feature :

```text
<sha> test(family): cover invite happy path and 429
<sha> feat(family): add invite endpoint with rate limit
```

**Contraintes :**
- Le diff final (`git diff main..HEAD`) doit être **identique** avant et après nettoyage — on réécrit l'histoire, pas le code.
- Le commit `feat` doit absorber tous les `wip` et le `fix` (via `fixup`).
- Le commit `test` reste séparé et son message est réécrit (via `reword`).
- **Pas de gap-fill** : tu tapes chaque commande Git toi-même.

### Setup — fabriquer l'historique brouillon

Copie-colle ce bloc tel quel (bash / Git Bash / WSL). Il crée le dépôt et 5 commits désordonnés :

```bash
mkdir tribuzen-rebase-lab && cd tribuzen-rebase-lab
git init -b main
echo "# TribuZen invite" > README.md
git add README.md && git commit -m "chore: init repo"

git switch -c feat/family-invite

# commit 1 — le vrai feat
echo "export function invite(email) { return { ok: true, email }; }" > invite.js
git add invite.js && git commit -m "feat: add family invite endpoint"

# commit 2 — un wip de debug
echo "console.log('DEBUG invite', email);" >> invite.js
git add invite.js && git commit -m "wip debug console.log"

# commit 3 — un wip
echo "// TODO rate limit" >> invite.js
git add invite.js && git commit -m "wip"

# commit 4 — le test, mal nommé
echo "test('invite ok', () => {});" > invite.test.js
git add invite.test.js && git commit -m "oops forgot the test"

# commit 5 — un fix qui appartient au feat
sed -i "s|// TODO rate limit|const RATE_LIMIT = 5;|" invite.js
git add invite.js && git commit -m "fix review comment"
```

Vérifie le point de départ :

```bash
git log --oneline main..HEAD
# 5 lignes : fix review comment / oops... / wip / wip debug... / feat...
```

> Note Windows : `sed -i` marche sous Git Bash / WSL. En PowerShell pur, remplace la ligne `sed` par une édition manuelle du fichier `invite.js` (remplace `// TODO rate limit` par `const RATE_LIMIT = 5;`).

---

## Étapes (en friction)

1. **Audit d'abord.** Note l'état de référence du diff pour pouvoir le comparer à la fin :
   ```bash
   git status
   git diff main..HEAD > /tmp/before.diff   # (Windows : $env:TEMP\before.diff)
   ```
2. **Lance le rebase interactif** sur les 5 commits : `git rebase -i HEAD~5`.
3. **Édite le todo.** Rappelle-toi : le plus ancien est en haut. Objectif : `fixup` les trois commits parasites dans le `feat`, `reword` le test. Tu dois obtenir un todo ressemblant à la solution ci-dessous **sans la regarder d'abord**.
4. **Sauve et ferme l'éditeur.** Git s'arrête sur le `reword` : écris `test(family): cover invite happy path and 429`.
5. **Reword le feat** si son message n'est pas encore conventionnel : `git rebase -i HEAD~2`, mets `reword` sur le feat, écris `feat(family): add invite endpoint with rate limit`.
6. **Vérifie l'arrivée :**
   ```bash
   git log --oneline main..HEAD          # doit afficher exactement 2 lignes
   git diff main..HEAD > /tmp/after.diff
   diff /tmp/before.diff /tmp/after.diff # aucune différence = code intact
   ```
7. **Exercice reflog (obligatoire).** Casse volontairement puis récupère :
   ```bash
   git reset --hard HEAD~2   # "oups" : tu perds tes 2 commits
   git log --oneline main..HEAD   # vide !
   git reflog                # retrouve le SHA du dernier bon état
   git reset --hard <sha-du-test-commit>   # récupération
   git log --oneline main..HEAD   # les 2 commits sont revenus
   ```

---

## Corrigé complet commenté

### Le fichier todo à produire à l'étape 3

Quand `git rebase -i HEAD~5` ouvre l'éditeur, tu remplaces les `pick` par :

```text
pick   <sha1> feat: add family invite endpoint   # base : on garde ce commit
fixup  <sha2> wip debug console.log               # fusionne dans le feat, jette le message
fixup  <sha3> wip                                 # idem
fixup  <sha5> fix review comment                  # ce fix appartient au feat → fixup
reword <sha4> oops forgot the test                # garde le commit, réécrit son message
```

Points clés de ce todo :
- **On réordonne** : le `fix review comment` (à l'origine en dernier) remonte juste sous le `feat` pour être fusionné dedans. Le test (`oops...`) descend en dernière ligne.
- **`fixup` et non `squash`** : les messages `wip`/`fix review comment` sont sans valeur, on les jette.
- **La 1re ligne reste `pick`** : un `fixup` fusionne vers le haut, il faut une cible au-dessus.

### Le message au `reword`

Git ouvre l'éditeur avec `oops forgot the test`. Tu remplaces par :

```text
test(family): cover invite happy path and 429
```

### Reword du feat (étape 5)

```bash
git rebase -i HEAD~2
```

```text
reword <sha> feat: add family invite endpoint    # → feat(family): add invite endpoint with rate limit
pick   <sha> test(family): cover invite happy path and 429
```

### Résultat attendu

```bash
$ git log --oneline main..HEAD
b1122ff (HEAD -> feat/family-invite) test(family): cover invite happy path and 429
c3d4e5f feat(family): add invite endpoint with rate limit
```

**Pourquoi ce corrigé est correct :**
- Le todo va du plus ancien (haut) au plus récent (bas) ; chaque `fixup` fusionne dans la ligne au-dessus, d'où le `feat` en tête comme réceptacle des trois parasites.
- `fixup` (et pas `squash`) élimine les messages `wip`/`fix` sans les concaténer dans le message final.
- Le `diff /tmp/before.diff /tmp/after.diff` vide prouve que **le code final est identique** — on n'a réécrit que l'histoire, pas le contenu.
- L'étape reflog démontre le filet de sécurité : même un `reset --hard` destructeur est réversible tant que le commit est dans le reflog (90 jours).

### Variante `--fixup` (recommandée, plus proche du vrai flux)

Au lieu de mémoriser quel commit fusionner dans le todo, tu peux estampiller les corrections dès leur création. Refais le setup, puis :

```bash
# après le commit feat (récupère son sha via git log)
FEAT=$(git rev-parse HEAD)          # sha du feat
echo "console.log('DEBUG');" >> invite.js
git add invite.js
git commit --fixup "$FEAT"          # crée "fixup! feat: add family invite endpoint"
# ... plus tard :
git rebase -i --autosquash HEAD~3   # le fixup se range tout seul sous le feat
```

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — à reproduire de mémoire en 20 minutes, sans relire le corrigé ni le module :**

1. Refais le setup, mais ajoute un **6e commit** entre deux autres : un `refactor: extract validateEmail` qui touche `invite.js`.
2. Nettoie en **3 commits finaux** : `feat(family): ...`, `refactor(family): extract validateEmail`, `test(family): ...` — donc cette fois tu **gardes** le refacto comme commit séparé (pas de fixup dessus) et tu le réordonnes pour qu'il vienne **après** le feat mais **avant** le test.
3. Contrainte : au moins un commit doit être **splitté** avec `edit` + `git reset HEAD^` (par ex. si tu avais mélangé feat + refacto dans un même commit au départ).
4. Termine par un `git diff main..HEAD` comparé à la référence : le code doit être intact.

**Critère de réussite :** `git log --oneline main..HEAD` affiche exactement 3 commits conventionnels dans le bon ordre, diff final identique à la référence, et tu as su récupérer au moins une fois via `git rebase --abort` ou `reflog`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce flux est le rituel de **finition avant chaque PR** sur une branche `feat/*`.

**Scénario réel :**
1. Tu développes `feat/family-invite` avec des commits `wip` au fil de l'eau.
2. Un reviewer (ou toi-même) demande un ajustement → `git commit --fixup <sha-cible>`.
3. Avant d'ouvrir/mettre à jour la PR : `git rebase -i --autosquash origin/develop` pour refondre les `wip` et `fixup!` dans des commits atomiques au format Conventional Commits.
4. Si un commit mélange trop de choses, tu le splittes avec `edit` pour que `git bisect` (module 05) reste utile plus tard.
5. `git push --force-with-lease` (branche perso non partagée uniquement).

**Ne jamais** faire ce rebase sur `develop` ou `main` — règle d'or. Si un rebase de branche perso rate, `git reflog` + `git reset --hard HEAD@{n}` restaure l'état d'avant.

**Commits cibles attendus dans la PR :**
```text
feat(family): add invite endpoint with rate limit
test(family): cover invite happy path and 429
```
