---
titre: Projet final — le setup Git complet d'un vrai projet
cours: 07-git-avance
notions: [structuration du repo monorepo ou submodules, husky lint-staged commitlint, branching et protection de main, CODEOWNERS et PR template, workflow de PR de bout en bout, nettoyage d'historique avant PR, bisect de régression, git firefighting, reflog, revert vs reset, récupération de commit perdu, annulation d'un mauvais push, sauvetage d'un rebase parti en vrille, runbook Git d'équipe]
outcomes: [mettre en place le setup Git complet d'un projet de zéro qui mobilise tout le cours, écrire un runbook Git d'équipe exploitable, sortir d'une situation d'urgence Git avec reflog revert et reset]
prerequis: [09-workflows-collaboratifs]
next: fin-du-parcours
libs: []
tribuzen: le livrable final — CONTRIBUTING.md, hooks, branching, PR, CI et runbook de récupération d'urgence du repo tribuzen
last-reviewed: 2026-07
---

# Projet final — le setup Git complet d'un vrai projet

> **Outcomes — tu sauras FAIRE :** mettre en place de zéro le setup Git complet d'un projet qui mobilise tout le cours (structure, hooks, branching, PR, CI), écrire un runbook Git d'équipe, et te sortir d'une urgence Git (commit perdu, mauvais push, rebase parti en vrille) avec `reflog`, `revert` et `reset`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu rejoins TribuZen. Le repo `smaurier/tribuzen` a été démarré à la va-vite : pas de hooks, `main` non protégée, des commits `wip`, `fix`, `oops` en pagaille, aucun `CONTRIBUTING.md`. Personne ne sait quelle branche part de quoi. La première semaine, trois incidents arrivent coup sur coup :

```text
Lundi    — un dev force-push sur main et écrase 2 commits des collègues.
Mardi    — une PR de 40 commits sales arrive : impossible à relire.
Mercredi — la CI passe au rouge sans qu'on sache quel merge l'a cassée.
```

Aucun de ces incidents n'est une fatalité : ce sont exactement les situations que ce cours a couvertes, module par module. Ta mission finale n'est pas d'apprendre une notion de plus — c'est d'**assembler tout le cours en un seul livrable** : le setup Git d'un vrai projet + le runbook qui permet à l'équipe de se sortir des trois incidents ci-dessus sans paniquer.

Ce module est le **récap actif** du parcours. Chaque section rappelle *quel module* fournit *quelle brique*, puis les met bout à bout.

---

## 2. Théorie complète, concise

Le setup Git d'un projet professionnel est une **chaîne** : structure du repo → hooks locaux → règles de branches → workflow de PR → CI. Chaque maillon vient d'un module du cours. On y ajoute un maillon qui n'existe qu'en situation réelle : le **firefighting** (récupération d'urgence).

### 2.1 Structurer le repo — monorepo ou submodules (modules 07 & 08)

Première décision : un seul dépôt qui contient tout, ou plusieurs dépôts liés.

| Choix | Quand | Prix à payer |
|---|---|---|
| **Monorepo** (workspaces pnpm/Nx/Turborepo) | Code partagé, refacto atomique cross-package, une seule CI | Tooling de build à maîtriser |
| **Submodules** | Dépôts au cycle de vie indépendant (SDK public, thème réutilisé) | Pointeurs de commit à gérer à la main |

Pour TribuZen (front + api + types partagés, déployés ensemble) → **monorepo pnpm workspaces**.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'      # apps/web, apps/api
  - 'packages/*'  # packages/shared-types
```

```text
tribuzen/
├── apps/
│   ├── web/          # front React
│   └── api/          # NestJS
├── packages/
│   └── shared-types/ # types partagés web ↔ api
├── .husky/
├── .github/
├── CONTRIBUTING.md
└── pnpm-workspace.yaml
```

### 2.2 Configurer les hooks — husky + lint-staged + commitlint (module 06)

Les hooks garantissent qu'un commit sale **n'entre jamais** dans l'historique. Trois outils, trois rôles :

- **husky** — installe les hooks Git dans `.husky/` (versionnés, partagés par l'équipe).
- **lint-staged** — ne lint/formate que les fichiers *stagés*, pas tout le repo (rapide).
- **commitlint** — valide que le message respecte Conventional Commits.

```bash
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init                                    # crée .husky/ + hook pre-commit
echo "npx lint-staged" > .husky/pre-commit
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
```

```js
// commitlint.config.js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

```json
// package.json (racine) — lint-staged
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

> **Rappel module 06 :** les hooks locaux sont un *garde-fou*, pas une sécurité. Un `--no-verify` les contourne. La vraie barrière est la CI côté serveur (§2.5).

### 2.3 Branching + protection de main + CODEOWNERS (modules 02 & 09)

**Stratégie de branches** (module 02) : pour une équipe qui livre en continu → **GitHub Flow**. `main` toujours déployable, une branche courte par feature, merge par PR.

```text
main ───●───────●───────●──────►   (toujours vert, déployable)
         \         \
          feat/invite  fix/quota   (branches courtes, 1 PR chacune)
```

**Protection de `main`** (règles côté GitHub, pas un fichier) — c'est ce qui aurait empêché l'incident de lundi :

```text
Settings → Branches → Branch protection rule pour "main"
  ☑ Require a pull request before merging
  ☑ Require approvals (1)
  ☑ Require review from Code Owners
  ☑ Require status checks to pass (CI)
  ☑ Require branches to be up to date before merging
  ☑ Do not allow force pushes        ← bloque le force-push de lundi
  ☑ Do not allow deletions
```

**CODEOWNERS** (module 09) — attribue automatiquement des relecteurs selon les fichiers touchés :

```text
# .github/CODEOWNERS
*                        @smaurier
/apps/api/               @smaurier @backend-lead
/packages/shared-types/  @smaurier @backend-lead
*.md                     @smaurier
```

### 2.4 Workflow de PR de bout en bout (module 09)

Le trajet standard d'une contribution, de la branche au merge :

```bash
git switch -c feat/invite-member          # 1. brancher depuis main à jour
# ... commits atomiques et conventionnels ...
git push -u origin feat/invite-member     # 2. pousser la branche
gh pr create --fill                        # 3. ouvrir la PR (template + CODEOWNERS auto)
# 4. CI verte + review approuvée
gh pr merge --squash --delete-branch       # 5. merge propre + suppression branche
```

Un **PR template** (`.github/pull_request_template.md`) standardise le contenu :

```markdown
## Quoi
<!-- Que fait cette PR ? -->
## Pourquoi
<!-- Contexte / issue liée -->
## Comment tester
- [ ] Étapes de repro
## Checklist
- [ ] Tests ajoutés/à jour
- [ ] Pas de secret commité
```

### 2.5 CI — la vraie barrière (module 09)

La CI rejoue lint + tests + build sur le serveur. C'est le status check requis par la protection de branche.

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r lint
      - run: pnpm -r test
      - run: pnpm -r build
```

### 2.6 Nettoyer l'historique avant PR — rebase interactif (module 04)

L'incident de mardi (PR de 40 commits sales) se règle **avant** d'ouvrir la PR : on réécrit sa branche pour que chaque commit raconte une étape logique.

```bash
git rebase -i main
# dans l'éditeur :
#   pick   a1b2c3  feat: form d'invitation
#   squash d4e5f6  wip
#   squash 7890ab  fix typo          → fusionnés dans le feat
#   reword cdef01  feat: envoi email  → message reformulé
#   drop   234567  console.log debug  → supprimé
```

> **Règle d'or (module 03) :** on ne réécrit **que sa propre branche non partagée**. Jamais `main`, jamais une branche sur laquelle un collègue travaille.

### 2.7 Débugger une régression — bisect (module 05)

L'incident de mercredi (CI rouge, coupable inconnu) → recherche binaire automatisée :

```bash
git bisect start HEAD <dernier-tag-vert>       # ex. v1.4.0
git bisect run pnpm --filter api test          # 0 = vert, 1 = rouge
git bisect reset
# → "<hash> is the first bad commit"
```

### 2.8 Git firefighting — les urgences (le maillon "terrain")

Trois situations que tout dev vit tôt ou tard. La clé commune : **`git reflog`**, le journal local de *tous* les endroits où `HEAD` est passé — même les commits « perdus » y figurent pendant ~90 jours.

**a) Récupérer un commit perdu** (après un mauvais `reset --hard` ou une branche supprimée) :

```bash
git reflog                       # retrouve le hash orphelin
#   9a8b7c6 HEAD@{2}: commit: feat: quota famille
git switch -c recup 9a8b7c6      # recrée une branche sur le commit retrouvé
# ou, pour le ramener sur la branche courante :
git cherry-pick 9a8b7c6
```

**b) Annuler un mauvais push** — la règle change selon que la branche est partagée :

```bash
# Branche PARTAGÉE (main) → revert : crée un commit qui ANNULE, ne réécrit rien
git revert <hash-fautif>
git push

# Branche PERSO non partagée → reset local puis push forcé PRUDENT
git reset --hard HEAD~1
git push --force-with-lease      # refuse si quelqu'un a poussé entre-temps
```

> `--force-with-lease` > `--force` : il n'écrase que si l'état distant est bien celui que tu as vu. C'est ce qui aurait sauvé les collègues lundi.

**c) Rebase parti en vrille** (conflits en cascade, branche méconnaissable) :

```bash
git rebase --abort               # PENDANT le rebase : tout annuler, revenir à l'état d'avant
# Trop tard, rebase déjà terminé et cassé ?
git reflog                        # repère "rebase (finish)" et la ligne juste AVANT
git reset --hard HEAD@{5}         # remet la branche exactement à l'état pré-rebase
```

**`revert` vs `reset` — le choix qui compte :**

| | `git revert` | `git reset` |
|---|---|---|
| Effet | Ajoute un commit inverse | Déplace `HEAD` en arrière |
| Historique | Préservé (rien n'est réécrit) | Réécrit |
| Usage | Branche **partagée** / publique | Branche **perso** non poussée |
| Sécurité | Sans danger pour l'équipe | Danger si déjà poussé |

### 2.9 Le runbook Git d'équipe

Tout ça, condensé dans un `CONTRIBUTING.md` versionné : la stratégie de branches, le format de commit, le trajet d'une PR, et une section **« En cas d'urgence »** qui liste les recettes du §2.8. Un runbook n'a de valeur que s'il est **dans le repo**, à côté du code, et non dans la tête d'une seule personne.

---

## 3. Worked examples — construction guidée

### Exemple 1 — Setup Git complet d'un monorepo de zéro

On monte la chaîne entière, dans l'ordre, comme sur un vrai premier jour de projet.

```bash
# ── 1. Structure monorepo (modules 07/08) ─────────────────────────
mkdir tribuzen && cd tribuzen
git init -q
mkdir -p apps/web apps/api packages/shared-types
pnpm init
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# ── 2. Hooks (module 06) ──────────────────────────────────────────
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
cat > commitlint.config.js <<'EOF'
module.exports = { extends: ['@commitlint/config-conventional'] };
EOF

# lint-staged dans package.json racine (édition manuelle) :
#   "lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }

# ── 3. Fichiers d'équipe (modules 02/09) ──────────────────────────
mkdir -p .github/workflows
cat > .github/CODEOWNERS <<'EOF'
*                        @smaurier
/apps/api/               @smaurier @backend-lead
/packages/shared-types/  @smaurier @backend-lead
EOF

cat > .github/pull_request_template.md <<'EOF'
## Quoi
## Pourquoi
## Comment tester
- [ ]
## Checklist
- [ ] Tests à jour
- [ ] Aucun secret commité
EOF

# .github/workflows/ci.yml : lint + test + build (voir §2.5)

cat > CONTRIBUTING.md <<'EOF'
# Contribuer à TribuZen
- Branching : GitHub Flow. `main` toujours déployable.
- Commits : Conventional Commits (validés par commitlint).
- PR : 1 feature = 1 branche courte = 1 PR (squash merge).
- CI verte + 1 review CODEOWNERS obligatoires avant merge.

## En cas d'urgence
- Commit perdu        → `git reflog` puis `git switch -c recup <hash>`
- Mauvais push (main) → `git revert <hash>` (jamais force-push sur main)
- Rebase en vrille    → `git rebase --abort`, sinon `git reset --hard HEAD@{n}`
EOF

# ── 4. Premier commit propre ──────────────────────────────────────
git add .
git commit -m "chore: setup monorepo, hooks, CI et CONTRIBUTING"
#   → pre-commit lance lint-staged, commit-msg valide le format ✓
```

À ce stade : structure, hooks, ownership, CI, runbook — tout est en place et versionné. La protection de `main` se règle ensuite dans les settings GitHub (§2.3), ce n'est pas un fichier.

### Exemple 2 — Firefighting : sauver un `reset --hard` accidentel

Scénario réel : tu fais `git reset --hard HEAD~2` en pensant être sur une branche jetable — tu étais sur `feat/quota` et tu viens de « perdre » 2 commits.

```bash
# 1. Ne PAS paniquer : les commits ne sont pas détruits, juste déréférencés.
git reflog
#   3f1a2b HEAD@{0}: reset: moving to HEAD~2      ← le geste fatal
#   c4d5e6 HEAD@{1}: commit: feat: écran quota     ← perdu #2
#   9a8b7c HEAD@{2}: commit: feat: calcul quota     ← perdu #1

# 2. Remettre la branche exactement là où elle était AVANT le reset :
git reset --hard c4d5e6         # HEAD@{1} = le sommet d'avant
#   → les 2 commits sont de retour, working tree identique à avant l'accident.

# 3. Vérifier :
git log --oneline -3            # feat: écran quota / feat: calcul quota / ...
```

**Pourquoi ça marche :** `reset --hard` déplace seulement le pointeur de branche ; les objets commit restent dans la base Git et `reflog` en garde l'adresse. Tant que le garbage collector n'est pas passé (~90 j par défaut), rien n'est perdu. C'est LA raison pour laquelle « j'ai tout perdu avec Git » est presque toujours faux.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que les hooks locaux protègent `main`

```bash
git commit --no-verify -m "msg pourri"   # contourne pre-commit ET commit-msg
git push                                  # part quand même
```

Les hooks vivent dans le repo local de chaque dev et sont **contournables**. La seule barrière fiable est la **protection de branche + CI** côté serveur. Hooks = confort local ; CI = loi.

### PIÈGE #2 — `git reset --hard` sur une branche déjà poussée

```bash
# ❌ La branche est partagée → reset + force réécrit l'histoire des collègues
git reset --hard HEAD~3
git push --force

# ✅ Sur du partagé, on ANNULE sans réécrire
git revert HEAD~2..HEAD          # crée les commits inverses
git push
```

`reset` est pour le **privé non poussé**. Dès que d'autres ont la branche, `revert`.

### PIÈGE #3 — `git push --force` au lieu de `--force-with-lease`

```bash
# ❌ écrase le distant même si un collègue a poussé entre-temps → travail perdu
git push --force
# ✅ refuse le push si le distant a bougé depuis ton dernier fetch
git push --force-with-lease
```

Même quand un force-push est légitime (ta branche perso après rebase), `--force-with-lease` est le défaut à prendre systématiquement.

### PIÈGE #4 — Rebaser une branche partagée pour « nettoyer »

```bash
# ❌ des collègues bossent sur feat/api → rebase = leur historique diverge
git switch feat/api && git rebase main && git push --force

# ✅ nettoyage réservé à SA branche perso avant la 1re ouverture de PR
git switch feat/mon-truc && git rebase -i main
```

La règle d'or du module 03 est absolue : ne jamais réécrire une histoire que quelqu'un d'autre a déjà.

### PIÈGE #5 — Penser qu'un commit orphelin est perdu à jamais

Un `branch -D`, un `reset --hard`, un rebase raté ne **détruisent** rien immédiatement. `git reflog` retrouve le hash, `git fsck --lost-found` liste les objets orphelins. La panique fait faire des gestes destructeurs (re-clone, suppression) qui, eux, peuvent vraiment perdre le travail. Premier réflexe : `reflog`.

---

## 5. Ancrage TribuZen

Ce module **est** le livrable final du fil-rouge : le setup Git réel du repo `smaurier/tribuzen`, à committer pour de vrai.

```text
tribuzen/
├── .husky/
│   ├── pre-commit               # lint-staged (module 06)
│   └── commit-msg               # commitlint  (module 06)
├── .github/
│   ├── CODEOWNERS               # ownership   (module 09)
│   ├── pull_request_template.md # PR template (module 09)
│   └── workflows/ci.yml         # lint+test+build (module 09)
├── commitlint.config.js
├── pnpm-workspace.yaml          # monorepo    (modules 07/08)
└── CONTRIBUTING.md              # runbook + section « En cas d'urgence »
```

Le `CONTRIBUTING.md` de TribuZen consolide tout le cours : stratégie de branches (02), règle merge/rebase (03), nettoyage avant PR (04), routine bisect (05), hooks (06), structure monorepo (07/08), workflow PR (09), et le **runbook de récupération d'urgence** (ce module). C'est le document qu'un nouveau dev lit en arrivant, et celui qu'on rouvre le jour où `main` prend feu.

**Commits cibles :**
```text
chore: setup monorepo pnpm + hooks husky/lint-staged/commitlint
ci: workflow lint+test+build + protection de main
docs(contributing): branching, PR, CODEOWNERS + runbook d'urgence
```

---

## 6. Points clés

1. Le setup Git d'un projet est une chaîne : structure (07/08) → hooks (06) → branching + protection (02/09) → PR (09) → CI (09). Chaque maillon vient d'un module du cours.
2. Monorepo pnpm workspaces pour du code couplé déployé ensemble (TribuZen) ; submodules pour des dépôts au cycle de vie indépendant.
3. husky + lint-staged + commitlint = garde-fou **local** contournable (`--no-verify`) ; la vraie barrière est la protection de branche + CI **serveur**.
4. Nettoyer sa branche avec `rebase -i` (squash/reword/drop) **avant** d'ouvrir la PR — et seulement sur sa branche perso non partagée.
5. Régression à coupable inconnu → `git bisect run` sur le vrai test, bornes = tags de release.
6. `git reflog` est le filet de sécurité : commits « perdus » (reset, branche supprimée, rebase raté) restent récupérables ~90 j.
7. `revert` (ajoute un commit inverse) sur branche **partagée** ; `reset` (réécrit) sur branche **perso** ; toujours `--force-with-lease`, jamais `--force`.
8. Le runbook Git d'équipe vit dans `CONTRIBUTING.md`, versionné, avec une section « En cas d'urgence » actionnable.

---

## 7. Seeds Anki

```
Quelle est la chaîne complète d'un setup Git projet, et de quels modules vient chaque maillon ?|Structure du repo (07/08 monorepo/submodules) → hooks locaux (06 husky/lint-staged/commitlint) → branching + protection de main + CODEOWNERS (02/09) → workflow de PR (09) → CI serveur (09). Le firefighting (reflog/revert/reset) est le maillon terrain.
Pourquoi les hooks husky ne protègent-ils pas main, et qu'est-ce qui la protège vraiment ?|Les hooks sont locaux et contournables (git commit --no-verify). La vraie barrière est côté serveur : la protection de branche GitHub (require PR, require status checks, no force push) + la CI qui rejoue lint/test/build.
Quand utiliser git revert plutôt que git reset pour annuler un commit ?|revert sur une branche PARTAGÉE/publique : il ajoute un commit inverse sans rien réécrire, sûr pour l'équipe. reset sur une branche PERSO non poussée : il réécrit l'historique, dangereux si déjà partagé.
Comment récupérer un commit perdu après un git reset --hard accidentel ?|git reflog pour retrouver le hash orphelin (HEAD@{n}), puis git reset --hard <hash> pour remettre la branche à l'état d'avant, ou git switch -c recup <hash>. Les objets survivent ~90 j avant le gc.
Différence entre git push --force et git push --force-with-lease ?|--force écrase le distant même si un collègue a poussé entre-temps (travail perdu). --force-with-lease refuse le push si l'état distant a changé depuis ton dernier fetch : c'est le défaut à prendre pour tout force-push légitime.
Comment sortir d'un rebase parti en vrille ?|Pendant le rebase : git rebase --abort revient à l'état d'avant. Si le rebase est déjà terminé et cassé : git reflog repère la ligne juste avant "rebase (finish)", puis git reset --hard HEAD@{n} restaure la branche pré-rebase.
Quelle est la règle d'or pour choisir monorepo vs submodules ?|Monorepo (pnpm/Nx/Turborepo) quand le code est couplé, refacto atomique cross-package et déployé ensemble. Submodules quand les dépôts ont des cycles de vie indépendants (SDK public, thème réutilisé) au prix de pointeurs de commit gérés à la main.
Où doit vivre le runbook Git d'équipe et que doit-il contenir ?|Dans CONTRIBUTING.md, versionné à côté du code : stratégie de branches, format de commit, trajet d'une PR, et une section « En cas d'urgence » (commit perdu → reflog, mauvais push sur main → revert, rebase en vrille → abort/reset).
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-10-projet-final/README.md`. Monter le setup Git complet d'un repo de zéro (structure, hooks, fichiers d'équipe, CI), puis résoudre un scénario de firefighting réel — le tout avec de vraies commandes git, corrigé inline.
