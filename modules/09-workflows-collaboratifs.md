---
titre: Workflows collaboratifs — cycle de PR
cours: 07-git-avance
notions: [cycle de PR/MR, fork vs branche, draft PR, review de code, CODEOWNERS, commits conventionnels, changelog automatique, protection de branche, stratégies de merge (merge commit / squash / rebase), gestion des reviews, stacked PRs, forking workflow vs branche interne, git request-pull]
outcomes: [conduire un cycle de PR complet de la branche au squash merge, configurer la protection de main avec required reviews et status checks, choisir la bonne stratégie de merge selon le contexte]
prerequis: [08-monorepos]
next: 10-projet-final
libs: []
tribuzen: workflow de contribution TribuZen — branche feature, commits conventionnels, PR, CI verte + review, squash merge, maj pointeur submodule
last-reviewed: 2026-07
---

# Workflows collaboratifs — cycle de PR

> **Outcomes — tu sauras FAIRE :** conduire un cycle de pull request complet (branche → commits conventionnels → PR → review → squash merge), configurer la protection de `main` (required reviews, status checks, linear history), et choisir la bonne stratégie de merge selon le contexte.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu rejoins une ESN qui maintient TribuZen. On te confie ta première tâche : ajouter un endpoint `GET /families/:id/members`. Tu as le réflexe naturel du dev solo :

```bash
git switch main
# ... tu codes directement sur main ...
git add .
git commit -m "ajout endpoint members"
git push
```

Le push est **rejeté** :

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
```

Puis, une fois ta branche poussée et ta PR ouverte, la CI passe au rouge et un collègue commente : *« Ton message de commit ne respecte pas Conventional Commits, du coup `release-please` ne saura pas quoi bumper. Et tu as 14 commits "wip" — squashe-les. »*

Tu viens de heurter les trois murs du travail en équipe : **on ne pousse pas sur `main`**, **les messages de commit sont un contrat machine**, et **une PR se relit et se merge proprement**. Ce module te donne le cycle complet, tel qu'il tourne dans une vraie squad.

**Audit d'abord — avant d'ouvrir une PR, réponds à ces questions :**

```
[ ] main est-elle protégée ? (Settings -> Branches, ou : gh api repos/:owner/:repo/branches/main/protection)
[ ] Y a-t-il un CODEOWNERS qui va m'ajouter des reviewers d'office ?
[ ] Quelle stratégie de merge le repo autorise-t-il ? (merge / squash / rebase)
[ ] Mes commits respectent-ils Conventional Commits ?
[ ] La CI (lint, tests, build) passe-t-elle en local avant le push ?
```

---

## 2. Théorie complète, concise

### 2.1 Le cycle de PR/MR

**PR** (Pull Request, GitHub) et **MR** (Merge Request, GitLab) désignent la même chose : une **demande d'intégration** d'une branche dans une autre, avec review et CI avant merge. Le cycle canonique :

```
1. brancher     git switch -c feat/xxx        (jamais sur main)
2. committer    commits conventionnels petits et cohérents
3. pousser      git push -u origin feat/xxx
4. ouvrir       PR feat/xxx -> main (draft si pas fini)
5. CI           lint + tests + build tournent automatiquement
6. review       un.e collègue relit, commente, approuve
7. résoudre     tu réponds aux threads, tu corriges, tu re-pushes
8. merger       squash / merge / rebase selon la politique du repo
9. nettoyer     la branche est supprimée après merge
```

La PR n'est pas un formalisme : c'est le **point de synchronisation** où la CI vérifie, où la connaissance se partage (review), et où l'historique se décide (stratégie de merge).

### 2.2 Fork vs branche

Deux topologies pour proposer du code :

| | Branche dans le repo | Fork |
|---|---|---|
| Où vit ta branche | Dans le dépôt d'origine | Dans **ta copie** du dépôt |
| Droits requis | Write sur le repo | Aucun (lecture publique suffit) |
| Usage typique | **Équipe interne / ESN** | **Open-source**, contributeurs externes |
| PR | `feat/x` -> `main` (même repo) | `ton-fork:feat/x` -> `origin:main` |

En équipe interne, tout le monde a les droits Write : on travaille en **branches** dans le repo unique (plus simple, CODEOWNERS et protection s'appliquent directement). En open-source, un inconnu n'a pas les droits : il **forke**, pousse sur son fork, et ouvre une PR *cross-repo*.

```bash
# Forking workflow (open-source)
gh repo fork owner/tribuzen --clone       # crée ton fork + clone
git remote -v
# origin    -> ton fork (push ici)
# upstream  -> repo d'origine (pull ici pour rester à jour)
git switch -c fix/typo-readme
git push -u origin fix/typo-readme
gh pr create --repo owner/tribuzen         # PR depuis ton fork vers upstream
```

### 2.3 Draft PR

Une **draft PR** (PR brouillon) signale « travail en cours, ne pas merger ». Elle déclenche quand même la CI et permet de demander un avis précoce, mais bloque le merge et n'envoie pas de notification de review « prête ».

```bash
gh pr create --draft --title "feat(members): endpoint list" --body "WIP, manque les tests"
# quand c'est prêt :
gh pr ready
```

Utile pour : partager tôt une direction, faire tourner la CI sur une grosse feature, éviter des reviews prématurées.

### 2.4 Review de code

La review sert à **partager la connaissance** et **attraper les problèmes** avant `main`. Deux rôles.

**Côté auteur :**
- PR **petite** (< ~400 lignes) : plus la PR est grosse, plus la review devient superficielle.
- Description claire : *quoi*, *pourquoi*, *comment tester*.
- Réponds à **chaque** commentaire ; résous le thread quand c'est traité.

**Côté reviewer — ton constructif, pas prescriptif :**

```
NON  "C'est faux."          -> OUI  "Un reduce simplifierait ici, qu'en penses-tu ?"
NON  "Change ça."           -> OUI  "nit: userPermissions serait plus explicite."
```

**Préfixes de commentaire** — ils calibrent l'exigence :

```
[blocking]   doit être corrigé avant merge
[nit]        suggestion mineure, non bloquante
[question]   demande de clarification
[suggestion] alternative à considérer
[praise]     bon pattern, à souligner
```

### 2.5 CODEOWNERS

Fichier `.github/CODEOWNERS` : il **ajoute automatiquement des reviewers** selon les fichiers touchés. Combiné à la protection de branche (« require review from Code Owners »), il devient **obligatoire**.

```
# .github/CODEOWNERS
# Owner par défaut de tout le repo
*                    @team-core

# Par répertoire — la règle la plus SPÉCIFIQUE (la dernière qui matche) gagne
/apps/web/           @team-frontend
/apps/api/           @team-backend
/packages/ui-kit/    @team-design-system

# Par type de fichier
*.sql                @team-dba
```

> La **dernière** règle qui matche un fichier l'emporte (contrairement à `.gitignore`). Un `.sql` dans `/apps/api/` sera assigné à `@team-dba`, pas à `@team-backend`.

### 2.6 Commits conventionnels + changelog automatique

**Conventional Commits** est une convention de message lisible par la machine :

```
<type>(<scope>)<!>: <description courte>

[corps optionnel]

[footer optionnel, ex: BREAKING CHANGE: ...]
```

```bash
git commit -m "feat(members): add GET /families/:id/members endpoint"
git commit -m "fix(auth): prevent null token on refresh"
git commit -m "docs(readme): update setup steps"
git commit -m "feat(api)!: rename member.role to member.permission"   # ! = breaking
```

Le **type** pilote le bump de version SemVer (`MAJOR.MINOR.PATCH`) :

| Commit | Bump | Exemple |
|---|---|---|
| `fix:` | PATCH | 1.2.0 -> 1.2.1 |
| `feat:` | MINOR | 1.2.1 -> 1.3.0 |
| `feat!:` / `BREAKING CHANGE:` | MAJOR | 1.3.0 -> 2.0.0 |
| `chore:`, `docs:`, `test:` | aucun | pas de release |

**Changelog automatique** — deux outils standard (ne pas utiliser `standard-version`, déprécié depuis 2022) :

- **release-please** (Google) : une GitHub Action qui, à chaque push sur `main`, ouvre/met à jour une PR de release regroupant les changements. Merger cette PR crée le tag + la release + le `CHANGELOG.md`.
- **Changesets** (idéal monorepo pnpm) : chaque PR ajoute un fichier `.changeset/*.md` déclarant l'impact ; le versioning est décorrélé du message de commit.

```yaml
# .github/workflows/release.yml — release-please
name: release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
```

```bash
# Changesets (monorepo)
pnpm add -D @changesets/cli
pnpm changeset init
pnpm changeset          # déclare l'impact d'une PR (patch/minor/major)
pnpm changeset version  # bump + génère CHANGELOG
pnpm changeset publish  # publie sur npm
```

### 2.7 Protection de branche

Règles serveur sur `main` (GitHub : Settings -> Branches -> Branch protection rules) :

```
[x] Require a pull request before merging   (interdit le push direct)
    [x] Require approvals: 1                 (au moins 1 review approuvée)
    [x] Require review from Code Owners
[x] Require status checks to pass            (CI verte obligatoire)
    [x] Require branches to be up to date    (rebaser sur main avant merge)
[x] Require conversation resolution          (tous les threads résolus)
[x] Require linear history                    (interdit les merge commits)
[x] Do not allow bypassing the above settings
```

**Linear history** interdit les merge commits sur `main` -> force squash ou rebase merge -> historique en ligne droite, bisect (module 05) trivial.

```bash
# Lire la protection en place (audit-first)
gh api repos/:owner/:repo/branches/main/protection
```

### 2.8 Stratégies de merge d'une PR

Trois façons de faire atterrir une branche sur `main`. **Le choix est structurant** pour l'historique.

| Stratégie | Ce que ça produit | Quand l'utiliser |
|---|---|---|
| **Merge commit** | Garde tous les commits + ajoute un commit de merge (2 parents) | Rarement ; quand l'historique fin de la branche a de la valeur |
| **Squash** | Fusionne **tous** les commits de la PR en **un seul** sur `main` | **Défaut recommandé** : 1 PR = 1 commit atomique, historique lisible |
| **Rebase** | Rejoue les commits de la branche un par un sur `main`, sans merge commit | Quand chaque commit est déjà propre et mérite d'exister seul |

```bash
gh pr merge 42 --squash --delete-branch    # défaut équipe : 1 commit propre
gh pr merge 42 --merge                      # conserve tout l'historique de branche
gh pr merge 42 --rebase --delete-branch     # rejoue chaque commit sur main
```

> **Règle simple** : squash par défaut (les 14 commits "wip" disparaissent, `main` reste propre). Rebase seulement si tes commits sont déjà atomiques et racontent une histoire utile. Merge commit presque jamais quand `linear history` est actif — il serait de toute façon refusé.

### 2.9 Stacked PRs (survol)

Pour une grosse feature, découpe en **PRs empilées**, chacune basée sur la précédente. Chaque PR reste petite et reviewable ; on merge de bas en haut.

```
main <- PR1 (modèle) <- PR2 (service) <- PR3 (controller)
```

```bash
git switch -c feat/member-model            # base = main
git push -u origin feat/member-model        # PR1 : base=main

git switch -c feat/member-service           # base = feat/member-model
git push -u origin feat/member-service      # PR2 : base=feat/member-model

git switch -c feat/member-controller        # base = feat/member-service
```

Coût : quand PR1 change, il faut rebaser PR2 puis PR3. Des outils (`gh stack`, Graphite, `git town`) automatisent cette propagation.

### 2.10 git request-pull

Ancêtre décentralisé de la PR, hors plateforme (workflow noyau Linux, mailing-list). Il **génère un résumé texte** des changements entre deux points, à envoyer à un mainteneur qui tirera lui-même.

```bash
# request-pull <base> <url-publique> [<branche>]
git request-pull v2.3.0 https://github.com/smaurier/tribuzen feat/members
# -> produit un résumé (shortlog + diffstat + URL à tirer) à coller dans un mail
```

À connaître pour la culture Git et les projets sans forge centralisée ; en pratique ESN, on utilise `gh pr create`.

---

## 3. Worked examples

### Exemple 1 — Cycle de PR complet en interne (TribuZen)

Tâche : ajouter l'endpoint members. Repo interne, `main` protégée, squash merge, CODEOWNERS actif.

```bash
# 0. AUDIT — quelle politique ? (avant de coder)
gh api repos/smaurier/tribuzen/branches/main/protection --jq '.required_pull_request_reviews'
#   -> { "required_approving_review_count": 1, "require_code_owner_reviews": true }

# 1. Partir d'une main À JOUR
git switch main
git pull --ff-only origin main

# 2. Brancher (convention de nommage type/scope-court)
git switch -c feat/members-list

# 3. Coder, puis committer en Conventional Commits (petits commits cohérents)
git add apps/api/src/members/members.controller.ts
git commit -m "feat(members): add GET /families/:id/members endpoint"
git add apps/api/src/members/members.controller.spec.ts
git commit -m "test(members): cover empty-family case"

# 4. Vérifier la CI EN LOCAL avant de pousser (économise un aller-retour)
pnpm lint && pnpm test && pnpm build

# 5. Pousser + ouvrir la PR (draft si pas fini ; ici c'est prêt)
git push -u origin feat/members-list
gh pr create \
  --base main \
  --title "feat(members): endpoint list members of a family" \
  --body "## Quoi
Ajoute GET /families/:id/members.

## Pourquoi
L'admin doit lister les membres d'une famille.

## Test
curl localhost:3000/families/f1/members"
#   -> CODEOWNERS ajoute @team-backend en reviewer automatiquement

# 6. La CI tourne. Un reviewer commente [nit] + [blocking]. Tu corriges :
git add apps/api/src/members/members.controller.ts
git commit -m "refactor(members): extract pagination helper"
git push                      # la PR se met à jour, threads à résoudre

# 7. Une fois approuvée + CI verte + threads résolus : squash merge
gh pr merge --squash --delete-branch
#   -> main reçoit UN commit : "feat(members): endpoint list members... (#42)"
#   -> la branche distante est supprimée
```

**Ce que ce cycle garantit :**
- `main` ne reçoit jamais de push direct ni de commit non relu.
- L'historique de `main` = une suite de commits `feat/fix` atomiques -> `release-please` bumpe juste.
- La connaissance a circulé via la review.

### Exemple 2 — Contribution open-source via fork

Tâche : corriger une typo dans le README d'un repo public dont tu n'es pas membre.

```bash
# 1. Forker + cloner (crée origin=ton fork, upstream=repo d'origine)
gh repo fork opensource/awesome-lib --clone
cd awesome-lib

# 2. Synchroniser avec upstream avant de brancher
git switch main
git fetch upstream
git rebase upstream/main

# 3. Brancher + corriger + committer
git switch -c fix/readme-typo
# ... correction ...
git commit -am "docs(readme): fix broken install command"

# 4. Pousser sur TON fork (origin), pas sur upstream (tu n'as pas les droits)
git push -u origin fix/readme-typo

# 5. Ouvrir la PR cross-repo : ton-fork:fix/readme-typo -> upstream:main
gh pr create --repo opensource/awesome-lib --base main
#   -> le mainteneur review ; tu ne mergeras pas toi-même
```

**Différence clé avec l'exemple 1 :** ta branche vit sur **ton** fork (`origin`), la PR pointe vers le repo `upstream` sur lequel tu n'as aucun droit d'écriture. C'est le seul moyen de contribuer sans être membre.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que « squash » et « rebase merge » c'est pareil

```
Squash merge  : les N commits de la PR -> 1 SEUL commit sur main.
Rebase merge  : les N commits de la PR -> N commits rejoués sur main, sans merge commit.
```

Les deux produisent un historique linéaire (compatibles `linear history`), mais **squash aplatit**, **rebase préserve** le nombre de commits. Choisis squash si tes commits sont brouillons (wip, fixup) ; rebase si chacun est déjà propre et atomique.

### PIÈGE #2 — Confondre le type de commit et l'importance perçue

```bash
# NON : "C'est une grosse feature donc je mets feat!" — non, ! = BREAKING, pas "gros"
git commit -m "feat(api)!: add optional sort param"   # FAUX : rien ne casse

# OUI : le ! (ou BREAKING CHANGE) = incompatibilité pour les consommateurs
git commit -m "feat(api): add optional sort param"     # ajout rétro-compatible = MINOR
```

`feat!` déclenche un bump **MAJOR** automatique. L'utiliser à tort publie une version majeure injustifiée et alarme les consommateurs.

### PIÈGE #3 — Ouvrir une PR géante « pour tout faire d'un coup »

Une PR de 2000 lignes est **relue superficiellement** : le reviewer approuve sans vraiment lire, les bugs passent. Le nombre de commentaires utiles chute quand la taille augmente. Découpe en **stacked PRs** ou en PRs successives < ~400 lignes. Petites PRs = reviews réelles = moins de bugs en prod.

### PIÈGE #4 — Pousser sur `main` en local puis s'étonner du rejet

```bash
# NON : réflexe solo
git switch main && git commit -am "quick fix" && git push
# remote: GH006: Protected branch update failed.

# OUI : toujours passer par une branche + PR, même pour un one-liner
git switch -c fix/typo && git commit -am "fix: typo" && git push -u origin fix/typo
gh pr create --fill
```

Sur un repo protégé, `main` est **read-only** en push direct. Il n'y a pas d'exception « c'est juste une virgule » : le hotfix passe aussi par une PR (éventuellement mergée vite).

### PIÈGE #5 — Ne pas résoudre les threads de conversation

Avec « Require conversation resolution » actif, une PR approuvée et CI verte reste **non mergeable** tant qu'un seul thread de commentaire n'est pas marqué *resolved*. Répondre ≠ résoudre : après avoir traité, clique explicitement « Resolve conversation » (ou l'auteur du thread le fait).

---

## 5. Ancrage TribuZen

TribuZen est un **monorepo** (module 08) versionné dans `smaurier/tribuzen`, avec des dépendances externes gérées en **submodules** (module 07). Le workflow de contribution est celui d'une squad ESN.

**Protection de `main`** — configurée dès le jour 1 :

```
Require PR before merging        [x] (personne ne pousse sur main)
Require approvals: 1             [x] + require Code Owners review
Require status checks            [x] (lint + test + build + typecheck)
Require linear history           [x] (squash merge only)
Require conversation resolution  [x]
```

**`.github/CODEOWNERS`** — chaque zone a son owner :

```
*                       @smaurier
/apps/web/              @tribuzen/frontend
/apps/api/              @tribuzen/backend
/packages/ui-kit/       @tribuzen/design
/vendor/                @smaurier          # les submodules externes
```

**Cycle type d'une contribution TribuZen :**

```
1. git switch -c feat/family-invites            # branche feature
2. commits Conventional Commits                  # feat(family): ...
3. gh pr create --base main                      # PR, CODEOWNERS ajoute les reviewers
4. CI verte (lint/test/build) + 1 review approuvée
5. gh pr merge --squash --delete-branch          # 1 PR = 1 commit sur main
6. release-please ouvre/maj la PR de release      # CHANGELOG + tag auto
```

**Cas particulier — mise à jour d'un pointeur de submodule** (lien avec module 07) : bumper une dépendance externe se fait **aussi** par PR, car le commit qui déplace le pointeur touche `/vendor/` -> CODEOWNERS `@smaurier` est requis en review.

```bash
git switch -c chore/bump-vendor-auth
git -C vendor/auth-lib fetch && git -C vendor/auth-lib checkout v3.1.0
git add vendor/auth-lib
git commit -m "chore(vendor): bump auth-lib to v3.1.0"
git push -u origin chore/bump-vendor-auth
gh pr create --fill        # review obligatoire même pour un bump de pointeur
```

Commits cibles dans `smaurier/tribuzen` :

```
feat(family): endpoint & UI for family invites (#57)
chore(vendor): bump auth-lib to v3.1.0 (#58)
```

---

## 6. Points clés

1. Sur un repo protégé, on ne pousse jamais sur `main` : tout passe par une branche + PR relue + CI verte.
2. Fork = contributeur externe (open-source) ; branche dans le repo = équipe interne avec droits Write.
3. Conventional Commits est un contrat machine : `feat` -> MINOR, `fix` -> PATCH, `feat!`/`BREAKING CHANGE` -> MAJOR ; il alimente release-please / Changesets.
4. CODEOWNERS ajoute des reviewers d'office ; la **dernière** règle qui matche un fichier gagne.
5. Squash merge (défaut) aplatit la PR en 1 commit ; rebase merge rejoue N commits propres ; merge commit garde tout — presque jamais avec `linear history`.
6. Petites PRs (< ~400 lignes) = reviews réelles ; les grosses features se découpent en stacked PRs.
7. Une PR approuvée + CI verte reste non mergeable tant que les threads ne sont pas *resolved* (si la règle est active).
8. `git request-pull` génère un résumé texte pour un workflow décentralisé sans forge (culture Git) ; en ESN on utilise `gh pr create`.

---

## 7. Seeds Anki

```
Pourquoi un push direct sur main est-il rejeté sur un repo protégé ?|La règle "Require a pull request before merging" rend main read-only en push direct. Tout changement doit passer par une branche puis une PR relue + CI verte. Erreur typique : GH006 Protected branch update failed.
Quand forker plutôt que brancher dans le repo ?|Fork = contributeur SANS droits Write (open-source, externe) : la branche vit sur ton fork, la PR pointe cross-repo vers upstream. Branche dans le repo = équipe interne avec droits Write.
Que déclenche le type d'un commit conventionnel sur la version SemVer ?|fix: -> PATCH (x.y.Z), feat: -> MINOR (x.Y.0), feat! ou footer BREAKING CHANGE -> MAJOR (X.0.0). chore/docs/test ne déclenchent aucune release.
Différence entre squash merge et rebase merge d'une PR ?|Squash fusionne les N commits de la PR en UN seul sur main (aplatit). Rebase rejoue les N commits un par un sur main sans merge commit (préserve). Les deux donnent un historique linéaire ; squash si commits brouillons, rebase si déjà atomiques.
En cas de règles CODEOWNERS multiples qui matchent un fichier, laquelle gagne ?|La DERNIÈRE règle qui matche l'emporte (contrairement à .gitignore). Ex : *.sql assigné à team-dba passe avant /apps/api/ team-backend si la ligne *.sql est écrite après.
Qu'est-ce qu'une draft PR et à quoi sert-elle ?|Une PR "brouillon" : elle fait tourner la CI mais bloque le merge et n'envoie pas de demande de review "prête". Sert à partager tôt une direction ou lancer la CI sur une grosse feature. gh pr ready la passe en prête.
Que fait la règle "Require linear history" sur main ?|Elle interdit les merge commits sur main : seuls squash ou rebase merge sont autorisés. Résultat : historique en ligne droite, git bisect trivial. Un gh pr merge --merge serait refusé.
À quoi sert git request-pull ?|Générer un résumé texte (shortlog + diffstat + URL à tirer) des changements entre deux points, à envoyer à un mainteneur dans un workflow décentralisé sans forge (ex : noyau Linux par mailing-list). Ancêtre de la PR de plateforme.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-09-workflows/README.md`. Simuler un cycle de PR complet avec la CLI `gh` : brancher, committer en Conventional Commits, ouvrir la PR, gérer une review, puis squash merge — corrigé inline, variante J+30 et application TribuZen.
