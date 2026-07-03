# Lab 10 — Projet final : setup Git complet + firefighting

> **Outcome :** à la fin, tu sais monter le setup Git complet d'un repo de zéro (structure, hooks, fichiers d'équipe, CI) **et** te sortir d'une urgence Git réelle (`reflog` / `revert` / `reset`).
> **Vrai outil :** Git réel + Node/pnpm dans un dépôt que tu crées de zéro — pas de harnais simulé, aucune fonction à compléter, aucun `npm run lab:10`.
> **Feedback :** le coach valide en session (les vraies commandes affichent elles-mêmes leur résultat : hook qui bloque, `git log`, `reflog`).

---

## Énoncé

Ce lab final assemble tout le cours en deux temps.

- **Partie 1 — Setup** : tu montes de zéro le setup Git d'un mini-monorepo TribuZen : structure de workspaces, hooks husky/lint-staged/commitlint, `.github/` (CODEOWNERS, PR template, CI), et un `CONTRIBUTING.md` avec runbook d'urgence.
- **Partie 2 — Firefighting** : tu fabriques un incident réel (un `reset --hard` qui « perd » du travail + un mauvais commit poussé sur `main`) et tu t'en sors sans rien perdre.

**Tout se fait avec de vraies commandes git.** Le but n'est pas d'installer une vraie toolchain complète (eslint, etc.) mais de câbler la mécanique Git correctement et de vérifier que les hooks **bloquent** vraiment.

---

## Étapes (en friction)

### Partie 1 — Monter le setup de zéro

1. Crée le dépôt et la structure monorepo : `git init`, `apps/web`, `apps/api`, `packages/shared-types`, un `package.json` racine (`"private": true`) et `pnpm-workspace.yaml`.
2. Installe et câble les hooks : `husky init`, un `pre-commit` qui lance `lint-staged`, un `commit-msg` qui lance `commitlint`. Ajoute `commitlint.config.js` (config conventional) et une clé `lint-staged` dans le `package.json` racine.
3. Ajoute les fichiers d'équipe dans `.github/` : `CODEOWNERS`, `pull_request_template.md`, `workflows/ci.yml`.
4. Écris `CONTRIBUTING.md` avec la stratégie de branches, le format de commit **et** une section « En cas d'urgence ».
5. **Prouve que le hook bloque** : tente un commit avec un message non conventionnel (`git commit -m "truc"`) → il doit être **rejeté** par commitlint. Recommence avec un message valide → il passe.

### Partie 2 — Firefighting

6. Sur une branche `feat/quota`, fais 2 commits, puis simule l'accident : `git reset --hard HEAD~2`. Retrouve et restaure les 2 commits avec `git reflog` + `git reset --hard <hash>`.
7. Simule un mauvais commit sur `main` (branche « partagée ») : annule-le proprement avec `git revert` (surtout **pas** `reset`), puis explique à voix haute pourquoi `revert` et pas `reset` ici.

---

## Corrigé complet commenté

```bash
# ══════════════ PARTIE 1 — SETUP DE ZÉRO ══════════════

# ── 1. Structure monorepo (modules 07/08) ─────────────────────────
mkdir tribuzen && cd tribuzen
git init -q
mkdir -p apps/web apps/api packages/shared-types

cat > package.json <<'EOF'
{
  "name": "tribuzen",
  "private": true,
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# ── 2. Hooks (module 06) ──────────────────────────────────────────
# (npm suffit ici pour le lab ; en vrai projet : pnpm add -D -w ...)
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init                         # crée .husky/ + un pre-commit par défaut

echo "npx lint-staged" > .husky/pre-commit
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg

cat > commitlint.config.js <<'EOF'
module.exports = { extends: ['@commitlint/config-conventional'] };
EOF

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

cat > .github/workflows/ci.yml <<'EOF'
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
EOF

# ── 4. Runbook (ce module) ────────────────────────────────────────
cat > CONTRIBUTING.md <<'EOF'
# Contribuer à TribuZen
- Branching : GitHub Flow. `main` toujours déployable.
- Commits : Conventional Commits (validés par commitlint).
- PR : 1 feature = 1 branche courte = 1 PR (squash merge).
- CI verte + 1 review CODEOWNERS obligatoires avant merge.

## En cas d'urgence
- Commit perdu        -> git reflog puis git switch -c recup <hash>
- Mauvais push (main) -> git revert <hash>  (jamais force-push sur main)
- Rebase en vrille    -> git rebase --abort, sinon git reset --hard HEAD@{n}
EOF

# ── 5. Preuve que le hook BLOQUE ──────────────────────────────────
git add .
git commit -m "truc"          # ❌ message non conventionnel
#   ⧗   input: truc
#   ✖   subject may not be empty / type may not be empty
#   husky - commit-msg script failed (code 1)   → commit REFUSÉ

git commit -m "chore: setup monorepo, hooks, CI et CONTRIBUTING"
#   ✓ commit-msg passe, pre-commit (lint-staged) passe → commit CRÉÉ
git log --oneline             # un seul commit, propre


# ══════════════ PARTIE 2 — FIREFIGHTING ══════════════

# ── 6. Récupérer 2 commits "perdus" par un reset --hard ───────────
git switch -c feat/quota
echo "calcul" > apps/api/quota.js && git add . && git commit -qm "feat: calcul quota"
echo "ecran"  > apps/web/quota.js && git add . && git commit -qm "feat: écran quota"

git reset --hard HEAD~2        # 💥 ACCIDENT : les 2 commits disparaissent de la branche
git log --oneline             # ils ne sont plus là...

git reflog                    # ... mais reflog les connaît encore
#   a1b2c3 HEAD@{0}: reset: moving to HEAD~2
#   d4e5f6 HEAD@{1}: commit: feat: écran quota    <- le sommet d'AVANT l'accident
#   9a8b7c HEAD@{2}: commit: feat: calcul quota

git reset --hard d4e5f6       # remet la branche au sommet d'avant (utilise TON hash)
git log --oneline             # ✓ les 2 commits sont revenus, working tree identique
# Pourquoi ça marche : reset --hard ne déplace que le pointeur ; les objets commit
# restent dans .git et reflog garde leur adresse (~90 j avant le gc).

# ── 7. Annuler un mauvais commit sur main (branche partagée) ──────
git switch main
echo "SECRET=oops" > apps/api/.env && git add -f . && git commit -qm "feat: config"
#   ⚠️ ce commit ne doit pas rester : imagine-le déjà poussé et récupéré par l'équipe

git revert HEAD --no-edit      # ✅ crée un commit INVERSE, ne réécrit rien
git log --oneline
#   f00ba7 Revert "feat: config"
#   1a2b3c feat: config
#   ...
# Pourquoi revert et PAS reset : main est partagée. reset --hard + force réécrirait
# l'historique que les collègues ont déjà -> divergence, travail perdu. revert est
# sûr car il ajoute un commit au lieu d'en supprimer.
```

**Pourquoi ce corrigé est correct :**
- Le hook `commit-msg` **rejette réellement** `"truc"` (exit 1 de commitlint) : c'est la preuve tangible que le garde-fou est câblé, pas juste présent.
- `pre-commit` + `commit-msg` sont deux hooks distincts (lint des fichiers vs format du message) — les deux doivent passer pour que le commit existe.
- En Partie 2, le hash à réutiliser est **`HEAD@{1}`** (le sommet AVANT le reset), pas `HEAD@{0}` (qui est le reset lui-même). Erreur classique.
- `revert` sur `main` préserve l'historique partagé ; `reset` y serait destructeur — c'est la discrimination centrale du module (§2.8).
- `add -f` force le `.env` malgré un éventuel `.gitignore`, juste pour fabriquer l'incident ; en vrai on ne commite jamais de secret.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire, en 25 minutes :**

1. Remonte le setup complet **sans relire le corrigé**, et fais échouer puis réussir un commit pour prouver le hook.
2. Nouveau scénario firefighting : crée une branche `feat/x`, lance un `git rebase -i main`, provoque volontairement un conflit, puis **sors-en de deux façons** — d'abord `git rebase --abort`, puis (après avoir recommencé et terminé un rebase que tu juges raté) via `git reflog` + `git reset --hard HEAD@{n}`.
3. Supprime une branche non mergée avec `git branch -D feat/x` puis **récupère-la** par `reflog`.
4. Explique à voix haute, sans notes : quand `revert` vs `reset`, et pourquoi `--force-with-lease` plutôt que `--force`.

**Critère de réussite :** un commit non conventionnel est rejeté par le hook, un commit valide passe, et tu restaures dans les trois scénarios (rebase avorté, rebase raté, branche supprimée) le bon état sans re-cloner ni perdre de commit.

---

## Application TribuZen

Dans le vrai repo `smaurier/tribuzen`, ce lab **est** le setup de production, à committer pour de bon :

```bash
# Hooks + workspaces réels (pnpm)
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
# .husky/pre-commit  -> npx lint-staged
# .husky/commit-msg  -> npx --no -- commitlint --edit "$1"

# Protection de main : Settings GitHub (pas un fichier)
#   Require PR + approvals + CODEOWNERS review + status checks (CI) + no force push
```

**Différences par rapport au lab :**
- `lint-staged` lance de vrais `eslint --fix` + `prettier --write` sur les `*.ts/tsx`, et la CI (`ci.yml`) rejoue `pnpm -r lint/test/build` — le hook local n'est qu'un pré-filtre, la CI est la barrière.
- La protection de `main` est configurée dans les settings GitHub : c'est elle (pas les hooks) qui bloque un force-push comme l'incident de lundi.
- Le runbook « En cas d'urgence » du `CONTRIBUTING.md` est relu et enrichi à chaque vrai incident post-mortem.

**Commits cibles :**
```text
chore: setup monorepo pnpm + hooks husky/lint-staged/commitlint
ci: workflow lint+test+build
docs(contributing): branching, PR, CODEOWNERS + runbook de récupération d'urgence
```
