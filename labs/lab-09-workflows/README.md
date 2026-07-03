# Lab 09 — Cycle de PR complet avec gh CLI

> **Outcome :** à la fin, tu sais conduire un cycle de pull request de bout en bout — brancher, committer en Conventional Commits, ouvrir une PR, gérer une review, puis squash merge — entièrement en ligne de commande avec `git` + `gh`.
> **Vrai outil :** Git + GitHub CLI (`gh`) sur un vrai dépôt GitHub que tu crées. Aucun test simulé, aucun harnais.
> **Feedback :** le coach valide en session (l'historique `main` et la PR fermée sont la preuve) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu simules le workflow d'une squad : `main` protégée, commits conventionnels, review, squash merge. Tu joues **les deux rôles** (auteur + reviewer) sur ton propre repo — c'est le seul moyen de dérouler le cycle complet en solo.

**Prérequis machine :**

```bash
gh --version          # GitHub CLI installé
gh auth status        # authentifié (sinon : gh auth login)
git --version
```

**Objectif concret :** ajouter un fichier `members.md` documentant l'endpoint `GET /families/:id/members`, via une PR reviewée et squash-mergée, sur un repo où `main` interdit le push direct.

**Contraintes :**
- `main` doit être **protégée** (push direct interdit) avant d'ouvrir la PR.
- Tous les commits respectent **Conventional Commits**.
- La PR est **squash-mergée** (1 commit final sur `main`), branche supprimée.
- **Pas de manipulation via l'UI web** : tout en CLI (`git` + `gh`).

### Starter minimal

Crée un repo neuf et pousse un premier commit sur `main` :

```bash
mkdir tribuzen-lab09 && cd tribuzen-lab09
git init -b main
printf "# TribuZen API\n\nDoc des endpoints.\n" > README.md
git add README.md
git commit -m "chore: init repo"
gh repo create tribuzen-lab09 --private --source=. --push
```

---

## Étapes (en friction)

1. **Protéger `main`** — active la protection qui interdit le push direct et exige une PR. Vérifie qu'un push direct est bien refusé (tu dois voir l'échec de tes yeux).
2. **Brancher** — crée `feat/members-doc` depuis une `main` à jour.
3. **Committer en conventionnel** — ajoute `members.md`, fais **deux** commits conventionnels distincts (le `feat` puis un `docs` de complément).
4. **Ouvrir la PR** — pousse la branche et ouvre la PR en CLI avec un corps quoi/pourquoi/test.
5. **Reviewer** — ajoute un commentaire de review, puis approuve la PR (rôle reviewer).
6. **Squash merge** — merge en squash, supprime la branche, reviens sur `main` à jour et vérifie qu'il n'y a **qu'un seul** commit ajouté.

Essaie d'exécuter chaque étape **sans regarder le corrigé** d'abord. Bloque-toi volontairement sur l'étape 1 (le push refusé) : c'est l'apprentissage central.

---

## Corrigé complet commenté

```bash
# ─── Étape 1 — Protéger main ───────────────────────────────────────
# On exige une PR + 1 approbation. L'API protection attend un JSON.
# (Sur repo perso, tu es admin : tu pourras merger tes propres PR.)
gh api -X PUT repos/:owner/tribuzen-lab09/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks=null" \
  -F "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -f "restrictions=null" \
  -F "required_linear_history=true"        # force squash/rebase, pas de merge commit

# Preuve que le push direct est bloqué (échec ATTENDU) :
echo "hack" >> README.md
git commit -am "docs: sneaky direct edit"
git push origin main
#   -> remote: error: GH006: Protected branch update failed. (c'est le but)
git reset --hard origin/main             # on annule ce commit local

# ─── Étape 2 — Brancher depuis une main à jour ─────────────────────
git switch main
git pull --ff-only                        # main propre et à jour
git switch -c feat/members-doc            # jamais coder sur main

# ─── Étape 3 — Deux commits Conventional Commits ───────────────────
cat > members.md <<'EOF'
# GET /families/:id/members

Retourne la liste des membres d'une famille.

- **Params** : `id` (uuid de la famille)
- **200** : `Member[]`
- **404** : famille inconnue
EOF
git add members.md
git commit -m "feat(members): document list-members endpoint"

# Deuxième commit distinct, autre type conventionnel
printf "\n## Exemple\n\ncurl localhost:3000/families/f1/members\n" >> members.md
git add members.md
git commit -m "docs(members): add curl example"

# ─── Étape 4 — Pousser + ouvrir la PR (CLI) ────────────────────────
git push -u origin feat/members-doc
gh pr create \
  --base main \
  --title "feat(members): document list-members endpoint" \
  --body "## Quoi
Documente GET /families/:id/members dans members.md.

## Pourquoi
L'admin a besoin du contrat de l'endpoint.

## Test
Relecture du markdown rendu."
#   -> gh affiche l'URL de la PR (note son numéro, ex #1)

# ─── Étape 5 — Review (rôle reviewer) ──────────────────────────────
# Commentaire général de review (préfixe conventionnel dans le texte)
gh pr comment 1 --body "[nit] on pourrait préciser le format de date des membres, non bloquant."

# Approuver la PR. NB : GitHub interdit d'approuver SA PROPRE PR.
# En solo tu ne peux donc pas t'auto-approuver -> deux options :
#   (a) demander au coach/binôme d'approuver, OU
#   (b) constater la limite puis merger en admin (voir étape 6).
gh pr review 1 --approve --body "[praise] doc claire, LGTM."   # échoue si c'est ta propre PR

# ─── Étape 6 — Squash merge + nettoyage ────────────────────────────
# --squash : les 2 commits (feat + docs) deviennent UN commit sur main.
# --admin  : contourne "1 approbation requise" quand tu es seul (repo perso).
# --delete-branch : supprime la branche distante après merge.
gh pr merge 1 --squash --delete-branch --admin

# Vérifier le résultat côté main
git switch main
git pull --ff-only
git log --oneline -3
#   -> tu vois UN seul commit ajouté (le squash), pas les 2 commits de branche
#   -> l'historique de main reste linéaire et lisible
```

**Pourquoi ce corrigé est correct :**
- La protection est posée **avant** la PR : on constate de ses yeux le rejet `GH006` (audit-first), pas juste en théorie.
- Deux commits conventionnels distincts (`feat` + `docs`) montrent la granularité attendue — et prouvent que le squash les fusionne bien en un seul.
- `--squash` produit **1 PR = 1 commit** sur `main` : c'est la politique par défaut d'équipe, cohérente avec `required_linear_history`.
- `--admin` est le contournement **assumé** du solo : en équipe réelle, c'est un collègue qui approuve, jamais toi-même sur ta propre PR.
- `--delete-branch` garde le repo propre (pas de branches mergées qui traînent).

---

## Variante J+30 (fading)

**Même cycle, contraintes ajoutées — à reproduire de mémoire en 20 minutes, sans rouvrir ce corrigé :**

1. Ajoute un **`.github/CODEOWNERS`** (`*.md @ton-user`) via une **première** PR mergée.
2. Ouvre une **draft PR** pour une seconde modif de `members.md`, fais tourner « comme si » la CI, puis passe-la en `ready` (`gh pr ready`).
3. Cette fois, merge en **rebase** (`--rebase`) au lieu de squash, et compare l'historique `main` obtenu avec celui de la variante squash.
4. Introduis **volontairement** un commit non conventionnel (`git commit -m "wip"`), puis corrige-le avant merge avec `git commit --amend` ou un rebase interactif (module 04).

**Critère de réussite :** deux PR mergées, un CODEOWNERS actif qui t'ajoute en reviewer sur les `.md`, et tu sais expliquer à voix haute la différence d'historique entre `--squash` et `--rebase`.

---

## Application TribuZen

Dans le repo réel `smaurier/tribuzen`, ce cycle est le workflow de contribution quotidien :

```
1. git switch -c feat/family-invites
2. commits Conventional Commits (feat/fix/chore/docs)
3. git push -u origin feat/family-invites
4. gh pr create --base main            # CODEOWNERS ajoute les reviewers
5. CI verte (lint + test + build) + 1 review approuvée + threads résolus
6. gh pr merge --squash --delete-branch # 1 PR = 1 commit sur main
7. release-please ouvre/maj la PR de release (CHANGELOG + tag auto)
```

**Différences par rapport au lab :**
- L'approbation vient d'un **vrai collègue** (CODEOWNERS `@tribuzen/backend`), pas de `--admin`.
- Les status checks CI sont **required** : pas de merge tant que `lint + test + build` ne sont pas verts.
- Le bump de version et le `CHANGELOG.md` sont générés par `release-please` à partir des messages conventionnels — d'où l'exigence stricte sur le format des commits.
- Un bump de pointeur de submodule (`/vendor/...`, module 07) passe par la **même** mécanique de PR + review.

**Commits cibles :**

```
feat(members): document list-members endpoint (#1)
docs(members): add CODEOWNERS for markdown docs (#2)
```
