---
titre: Git hooks et automatisation
cours: 07-git-avance
notions: [hooks client vs serveur, hooks natifs .git/hooks non versionnés, pre-commit, commit-msg, prepare-commit-msg, pre-push, husky v9, lint-staged, commitlint conventional commits, contournement --no-verify, défense en profondeur CI]
outcomes: [installer husky v9 et versionner des hooks partagés en équipe, formater et linter uniquement les fichiers stagés avec lint-staged, valider les messages avec commitlint, comprendre pourquoi un hook local ne remplace jamais la CI]
prerequis: [05-git-bisect-debugging]
next: 07-worktrees-submodules
libs: [{ name: husky, version: "^9" }, { name: "lint-staged", version: "latest" }]
tribuzen: chaîne qualité locale du repo TribuZen (pre-commit prettier+eslint sur fichiers stagés, commit-msg conventionnel, pre-push npm test), doublée par la CI GitHub Actions qui reste l'autorité
last-reviewed: 2026-07
---

# Git hooks et automatisation

> **Outcomes — tu sauras FAIRE :** installer husky v9 et versionner des hooks partagés en équipe, formater/linter uniquement les fichiers stagés avec lint-staged, valider les messages de commit avec commitlint, et articuler pourquoi un hook local ne remplace jamais la CI.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu rejoins l'équipe TribuZen. Depuis une semaine, la branche `main` accumule des dégâts silencieux :

- un `console.log(user.token)` oublié dans `AuthService.ts` est parti en prod ;
- trois commits s'appellent `wip`, `fix`, `enfin` — impossible de générer un changelog ;
- la moitié des fichiers sont formatés en 2 espaces, l'autre en 4, parce que chacun a sa config d'éditeur ;
- la CI casse une fois sur deux sur des erreurs ESLint qui auraient pu être vues **avant** de push.

Le lead te demande : « Mets en place une barrière **automatique**, la même pour tout le monde, qui refuse un commit mal formaté et un message non conventionnel. » Le réflexe naïf est d'éditer `.git/hooks/pre-commit` à la main. Problème : ce fichier vit dans `.git/`, qui n'est **pas** versionné — ton collègue ne l'aura jamais. Ce module te donne la vraie solution (husky + lint-staged + commitlint), et surtout te fait comprendre sa limite : un hook local est **contournable**, donc la CI reste l'autorité finale.

---

## 2. Théorie complète, concise

### 2.1 Qu'est-ce qu'un hook Git

Un hook est un script que Git exécute **automatiquement** à un moment précis de son cycle de vie (avant un commit, après, avant un push…). Si le script sort avec un **code de retour non nul**, Git **annule** l'opération. C'est le levier : un `exit 1` bloque le commit.

Les hooks natifs vivent dans `.git/hooks/`. Git y dépose des exemples désactivés :

```bash
ls .git/hooks/
# applypatch-msg.sample   pre-commit.sample
# commit-msg.sample       pre-push.sample
# post-update.sample      pre-rebase.sample
# prepare-commit-msg.sample  ...
```

Un fichier `*.sample` est inactif. Pour activer un hook natif, on retire le suffixe et on rend le fichier exécutable :

```bash
mv .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2.2 Hooks client vs hooks serveur

Deux familles, exécutées à des endroits différents :

| | Hooks **client** | Hooks **serveur** |
|---|---|---|
| S'exécutent sur | ta machine (le poste du dev) | le serveur Git (GitHub, GitLab) |
| Exemples | `pre-commit`, `commit-msg`, `prepare-commit-msg`, `pre-push` | `pre-receive`, `update`, `post-receive` |
| Contournables par le dev | **Oui** (`--no-verify`) | Non |
| Configurés comment | fichiers dans `.git/hooks` (ou husky) | config serveur / self-hosted |
| En SaaS (GitHub) | oui | remplacés par les **branch protection rules** + la CI |

**Point clé pour la suite :** les hooks client sont un **confort local**, pas une garantie. Sur GitHub tu ne poses pas de `pre-receive` toi-même ; tu utilises les *branch protection rules* et la CI GitHub Actions. On y revient en §2.8.

### 2.3 Les hooks client qui comptent

**`pre-commit`** — s'exécute **avant** que le commit soit créé. C'est là qu'on lint/formate. `exit ≠ 0` → commit annulé.

**`prepare-commit-msg`** — s'exécute quand le message par défaut est préparé, **avant** l'ouverture de l'éditeur. Sert à **pré-remplir** le message (préfixer le numéro de ticket extrait du nom de branche, injecter un template). Reçoit le chemin du fichier de message en `$1`.

**`commit-msg`** — s'exécute **après** que tu as saisi le message, **avant** que le commit soit finalisé. Reçoit en `$1` le chemin d'un fichier temporaire contenant le message. C'est là qu'on **valide** le format (Conventional Commits). `exit ≠ 0` → commit annulé.

**`pre-push`** — s'exécute avant l'envoi vers le remote. Bon endroit pour lancer la suite de **tests** ou un build : on évite de pousser du rouge.

```
git commit  ──►  pre-commit  ──►  prepare-commit-msg  ──►  [éditeur]  ──►  commit-msg  ──►  commit créé
```

> Retiens surtout : **pre-commit valide le contenu, commit-msg valide le message.**

### 2.4 Le problème des hooks natifs : non versionnés

`.git/hooks/` est **à l'intérieur** de `.git/`. Or `.git/` n'est jamais commité — c'est la base de données locale du repo. Conséquence directe :

- ton `pre-commit` artisanal reste sur **ta** machine ;
- un `git clone` ne récupère **aucun** hook ;
- aucune façon de dire « toute l'équipe utilise ces hooks ».

C'est exactement le problème du cas concret. La solution : déplacer les hooks dans un dossier **versionné** et dire à Git de les chercher là. C'est le rôle de **husky**.

### 2.5 husky v9 — hooks versionnés et partagés

husky déplace les hooks dans un dossier `.husky/` **commité** dans le repo, et configure Git (`core.hooksPath`) pour pointer dessus. Tout le monde qui clone + `npm install` récupère les hooks.

**Setup v9 (le format a changé vs v8 — vérifié via Context7, husky 9.1.7) :**

```bash
npm install -D husky
npx husky init
```

`npx husky init` fait trois choses :
1. crée le dossier `.husky/` ;
2. ajoute un script `prepare` dans `package.json` (`"prepare": "husky"`) pour que husky se réinstalle après chaque `npm install` ;
3. crée un `.husky/pre-commit` d'exemple (contenant `npm test`).

```jsonc
// package.json — ajouté par husky init
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**Format d'un hook en v9 — c'est un simple fichier de commandes.** Nouveauté majeure vs v8 : **plus besoin** de la ligne shebang `#!/bin/sh` ni de la ligne `. "$(dirname "$0")/_/husky.sh"`. Ces deux lignes sont **dépréciées** en v9 (elles produisent un warning et seront supprimées en v10). Un hook v9 se contente des commandes :

```bash
# .husky/pre-commit  (husky v9)
npx lint-staged
```

```bash
# .husky/commit-msg  (husky v9) — $1 = chemin du fichier de message
npx --no -- commitlint --edit $1
```

```bash
# .husky/pre-push  (husky v9)
npm test
```

> **Migration v8 → v9 :** si tu vois encore un vieux hook avec `#!/bin/sh` + `. "$(dirname "$0")/_/husky.sh"` en tête, supprime ces deux lignes, garde seulement les commandes.

### 2.6 lint-staged — n'agir que sur les fichiers stagés

Lancer ESLint + Prettier sur **tout** le projet à chaque commit est lent (20-30 s) et bruyant (il te signale des fichiers que tu n'as pas touchés). **lint-staged** ne traite que les fichiers présents dans le **staging area** (ceux que ton commit va réellement inclure).

```bash
npm install -D lint-staged
```

Configuration (dans `package.json` ou `.lintstagedrc`) — une glob → une liste de commandes :

```jsonc
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

Mécanique : lint-staged prend la liste des fichiers stagés, la filtre par glob, passe **ces chemins** en argument aux commandes, puis **re-stage** automatiquement les fichiers modifiés par `--fix`/`--write`. Résultat : un commit passe de 30 s à 1-2 s, et seul ce que tu touches est corrigé.

### 2.7 commitlint — messages Conventional Commits

Les **Conventional Commits** normalisent le message : `type(scope): description`. Ça permet de générer un changelog, de calculer le prochain numéro de version (SemVer) et de filtrer l'historique.

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

Le hook `commit-msg` appelle commitlint avec `$1` (le fichier de message) :

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

Types conventionnels courants et messages valides :

```
feat(auth): add JWT refresh token rotation
fix(api): handle null response from user service
docs(readme): update installation instructions
refactor(members): extract validation into a module
test(auth): add integration tests for login flow
chore(deps): update typescript to 5.7
```

Un message comme `wip` ou `enfin` est **refusé** (pas de type valide) → `exit 1` → commit annulé.

### 2.8 SÉCURITÉ : un hook local n'est PAS une garantie

C'est le point le plus important du module. **Tout hook client est contournable** par un flag :

```bash
git commit --no-verify -m "wip"   # saute pre-commit ET commit-msg
git push --no-verify              # saute pre-push
```

`--no-verify` (alias `-n`) demande à Git d'**ignorer** les hooks. Un dev pressé, un script d'automatisation, un `git commit` fait par un outil tiers : tous peuvent passer à côté. Donc :

- un hook local **améliore le feedback** (tu vois l'erreur en 1 s, pas 5 min plus tard dans la CI) ;
- il ne **garantit rien** sur ce qui arrive dans `main`.

La vraie barrière est la **CI** (GitHub Actions) couplée aux **branch protection rules** : elle re-lance lint + format-check + tests sur le serveur, où **personne ne peut mettre `--no-verify`**. Si la CI est rouge, la PR ne peut pas merger. C'est de la **défense en profondeur** : hook local (rapide, contournable) **+** CI serveur (lente, non contournable, autorité). Les deux, jamais l'un à la place de l'autre.

> Règle à graver : **le hook local est un confort, la CI est l'autorité.**

---

## 3. Worked examples

### Exemple 1 — Chaîne qualité complète husky v9 + lint-staged + commitlint

Objectif : à chaque commit, formater/linter les fichiers stagés et valider le message ; à chaque push, lancer les tests.

```bash
# 1. Dépendances
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# 2. Initialiser husky (crée .husky/, ajoute le script prepare)
npx husky init
```

```jsonc
// 3. package.json — config lint-staged + script prepare (ajouté par husky init)
{
  "scripts": {
    "prepare": "husky",
    "test": "vitest run"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```javascript
// 4. commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

```bash
# 5. Écrire les hooks (format v9 : commandes seules, pas de shebang)
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
echo "npm test" > .husky/pre-push
```

Contenu final des trois fichiers versionnés :

```bash
# .husky/pre-commit
npx lint-staged
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

```bash
# .husky/pre-push
npm test
```

Test du résultat :

```bash
# Un fichier mal formaté est auto-corrigé au commit :
git add src/AuthService.ts
git commit -m "feat(auth): add token refresh"
# → pre-commit lance lint-staged (eslint --fix + prettier --write) sur AuthService.ts
# → commit-msg valide "feat(auth): ..." → OK, commit créé

# Un message non conventionnel est refusé :
git commit -m "wip"
# → commit-msg : ✖ message doit matcher type(scope): description → commit ANNULÉ
```

### Exemple 2 — prepare-commit-msg qui préfixe le ticket + démonstration du contournement

Convention d'équipe : les branches s'appellent `feat/TRIBU-123-...`. On veut préfixer automatiquement chaque message par `[TRIBU-123]`.

```bash
# .husky/prepare-commit-msg  (v9 : commandes seules)
# $1 = fichier du message en préparation
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TICKET=$(echo "$BRANCH" | grep -oE 'TRIBU-[0-9]+')

# N'ajoute le préfixe que s'il y a un ticket et qu'il n'est pas déjà présent
if [ -n "$TICKET" ] && ! grep -q "$TICKET" "$1"; then
  sed -i.bak "1s|^|[$TICKET] |" "$1"
  rm -f "$1.bak"
fi
```

```bash
# Sur la branche feat/TRIBU-123-refresh :
git commit -m "feat(auth): add refresh"
# Message final : "[TRIBU-123] feat(auth): add refresh"
```

**Démonstration que le hook ne garantit rien** — le même commit, en sautant tous les hooks :

```bash
git commit --no-verify -m "wip"
# → prepare-commit-msg, commit-msg, pre-commit : TOUS ignorés.
# → commit "wip" créé, sans préfixe, sans lint.
```

Conclusion : si ce commit part sur une PR, c'est la **CI GitHub Actions** (qui relance `commitlint` et `eslint` côté serveur) qui bloquera le merge. Le hook local n'était qu'un garde-fou de confort.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire qu'un hook local protège `main`

```bash
# ❌ Raisonnement faux
# "J'ai un pre-commit qui bloque les console.log, donc main est propre."
git commit --no-verify -m "quick fix"   # le pre-commit n'a jamais tourné
```

**Pourquoi c'est faux :** `--no-verify` saute tous les hooks client, et rien n'empêche un dev de l'utiliser. **Correct :** la garantie vient de la CI serveur + branch protection (merge bloqué si rouge). Le hook local n'est qu'un feedback rapide.

### PIÈGE #2 — Éditer `.git/hooks/` à la main et croire que c'est partagé

```bash
# ❌ Hook artisanal non versionné
nano .git/hooks/pre-commit   # vit dans .git/, jamais commité
```

**Pourquoi c'est faux :** `.git/` n'est pas versionné → le collègue qui clone n'a rien. **Correct :** husky (`.husky/`, commité) + `core.hooksPath` pour que Git aille chercher les hooks versionnés.

### PIÈGE #3 — Garder le vieux format de hook husky v8

```bash
# ❌ Format v8, déprécié en v9 (warning, cassera en v10)
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
npx lint-staged
```

**Pourquoi c'est faux :** en v9, husky sait déjà quoi faire ; ces deux lignes sont dépréciées. **Correct :** ne garder que les commandes :

```bash
# ✅ v9
npx lint-staged
```

### PIÈGE #4 — Linter tout le projet au lieu des fichiers stagés

```jsonc
// ❌ pre-commit qui relint tout → lent, bruyant
// .husky/pre-commit : npx eslint . && npx prettier --check .
```

**Pourquoi c'est faux :** tu attends 30 s et tu reçois des erreurs sur des fichiers que tu n'as pas touchés. **Correct :** `lint-staged`, qui ne traite que les fichiers du staging area et re-stage les corrections.

### PIÈGE #5 — Confondre `pre-commit` et `commit-msg`

```
pre-commit  → valide le CONTENU (lint, format, secrets)  → pas d'accès au message
commit-msg  → valide le MESSAGE (Conventional Commits)    → reçoit $1 = fichier du message
```

**Pourquoi ça piège :** on met parfois la validation de message dans `pre-commit`, qui n'a pas encore le message. **Correct :** validation du texte du commit → toujours dans `commit-msg` (avec `$1`).

---

## 5. Ancrage TribuZen

Le repo `smaurier/tribuzen` monte exactement la chaîne du cas concret, en **deux couches**.

**Couche locale (husky, confort/feedback rapide) :**

```
tribuzen/
├── .husky/
│   ├── pre-commit          # npx lint-staged
│   ├── commit-msg          # npx --no -- commitlint --edit $1
│   └── pre-push            # npm test
├── commitlint.config.js    # extends @commitlint/config-conventional
└── package.json            # "prepare": "husky" + bloc "lint-staged"
```

- `pre-commit` → `lint-staged` lance `eslint --fix` + `prettier --write` sur les seuls fichiers `.ts/.tsx` stagés (front React et back NestJS de TribuZen).
- `commit-msg` → `commitlint` refuse tout message hors `type(scope): description` : garantit un changelog propre et le calcul SemVer.
- `pre-push` → `npm test` (Vitest) empêche de pousser une suite rouge.

**Couche serveur (l'autorité) :** `.github/workflows/ci.yml` relance, sur chaque PR, `eslint`, `prettier --check`, `commitlint` sur les commits de la PR et `npm test`. Les **branch protection rules** de `main` exigent que ce workflow soit **vert** pour merger. Aucun `--no-verify` n'a de prise ici : c'est là que la qualité est réellement garantie.

> Dans TribuZen, husky sert à ne pas *perdre de temps* (feedback en 1 s) ; la CI sert à ne pas *casser main* (barrière non contournable). Les deux cohabitent — défense en profondeur.

---

## 6. Points clés

1. Un hook Git est un script lancé automatiquement ; un code de retour non nul annule l'opération Git.
2. Hooks **client** (`pre-commit`, `commit-msg`, `prepare-commit-msg`, `pre-push`) sur ta machine, contournables ; hooks **serveur** (`pre-receive`…) sur le remote, non contournables mais remplacés en SaaS par branch protection + CI.
3. Les hooks natifs vivent dans `.git/hooks/`, **non versionnés** → impossible à partager en équipe.
4. **husky v9** versionne les hooks dans `.husky/` (commité) ; `npx husky init` ajoute `"prepare": "husky"`. En v9, un hook = **commandes seules** (plus de shebang ni de `husky.sh`).
5. **lint-staged** n'exécute lint/format que sur les fichiers **stagés** et re-stage les corrections → commits rapides.
6. **commitlint** + `@commitlint/config-conventional` valident le format `type(scope): description` dans le hook `commit-msg` (via `$1`).
7. **`--no-verify` saute tous les hooks client** : un hook local est un confort, jamais une garantie. La **CI** (GitHub Actions + branch protection) reste **l'autorité** — défense en profondeur.

---

## 7. Seeds Anki

```
Où vivent les hooks Git natifs et quel est leur défaut majeur ?|Dans .git/hooks/. Comme .git/ n'est pas versionné, ces hooks ne sont jamais commités ni partagés : un clone n'en récupère aucun. D'où husky.
Différence entre un hook pre-commit et un hook commit-msg ?|pre-commit valide le CONTENU (lint, format, secrets) avant la création du commit et n'a pas accès au message. commit-msg valide le MESSAGE (Conventional Commits), il reçoit en $1 le fichier contenant le message.
En husky v9, que contient un fichier de hook et qu'est-ce qui a changé vs v8 ?|Juste les commandes (ex : npx lint-staged). Les lignes v8 #!/bin/sh et . "$(dirname "$0")/_/husky.sh" sont dépréciées et ne doivent plus être présentes.
À quoi sert lint-staged et pourquoi est-ce plus rapide qu'un lint global ?|Il n'exécute eslint/prettier que sur les fichiers présents dans le staging area (ceux du commit), puis re-stage les corrections. On passe de ~30 s (tout le projet) à 1-2 s.
Que fait git commit --no-verify et quelle leçon de sécurité en tirer ?|Il saute tous les hooks client (pre-commit, commit-msg, prepare-commit-msg). Leçon : un hook local est contournable, donc jamais une garantie. La CI serveur reste l'autorité.
Pourquoi garder à la fois des hooks husky ET une CI GitHub Actions ?|Défense en profondeur : le hook local donne un feedback rapide (1 s) mais est contournable ; la CI relance lint/tests côté serveur où --no-verify n'a pas de prise, et les branch protection rules bloquent le merge si c'est rouge.
Que fait npx husky init en v9 ?|Crée le dossier .husky/, ajoute "prepare": "husky" dans package.json (réinstall après npm install) et crée un pre-commit d'exemple.
Quel hook utiliser pour préfixer automatiquement un message avec un numéro de ticket, et pourquoi pas commit-msg ?|prepare-commit-msg : il s'exécute pendant la préparation du message et peut le modifier (reçoit $1). commit-msg sert à valider/refuser, pas à pré-remplir.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-06-hooks/README.md`. Installer husky v9 + lint-staged de zéro dans un vrai repo, écrire un `pre-commit` qui formate les fichiers stagés et un `commit-msg` conventionnel, puis vérifier de tes yeux que `--no-verify` les contourne — et pourquoi la CI reste nécessaire.
