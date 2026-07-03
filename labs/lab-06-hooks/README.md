# Lab 06 — Hooks Git avec husky v9 + lint-staged

> **Outcome :** à la fin, tu sais installer husky v9 dans un vrai repo, écrire un `pre-commit` qui formate les fichiers stagés (lint-staged + Prettier) et un `commit-msg` qui valide les Conventional Commits (commitlint) — et tu as vu de tes propres yeux que `--no-verify` contourne tout.
> **Vrai outil :** husky 9.x, lint-staged, @commitlint/cli, Prettier, un vrai repo Git. Aucun harnais simulé.
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

## Énoncé

Tu pars d'un dossier vide. Tu montes la chaîne qualité locale demandée par le lead TribuZen :

1. un `pre-commit` qui **formate** automatiquement les fichiers stagés ;
2. un `commit-msg` qui **refuse** les messages non conventionnels.

Puis tu **prouves** la limite de sécurité : `git commit --no-verify` passe à travers les deux. Toutes les commandes ci-dessous sont réelles — exécute-les dans un terminal.

## Étapes (en friction)

Fais-les toi-même, sans copier le corrigé d'abord.

1. **Créer le repo et le projet npm.**
   ```bash
   mkdir lab-hooks && cd lab-hooks
   git init
   npm init -y
   ```
2. **Installer les outils.**
   ```bash
   npm install -D husky lint-staged prettier @commitlint/cli @commitlint/config-conventional
   ```
3. **Initialiser husky v9.** Repère ce que `npx husky init` ajoute à `package.json` (script `prepare`) et le dossier créé.
4. **Configurer lint-staged** dans `package.json` : les fichiers `*.js` doivent passer par `prettier --write`.
5. **Écrire le hook `pre-commit`** (format v9 : commandes seules, pas de shebang) pour lancer `lint-staged`.
6. **Configurer commitlint** (`commitlint.config.js`) et **écrire le hook `commit-msg`**.
7. **Prouver que ça marche** : crée un fichier `.js` mal indenté, commit-le avec un message conventionnel, vérifie qu'il a été reformaté. Puis tente un commit avec le message `wip` → il doit être refusé.
8. **Prouver la faille** : refais le commit `wip` avec `--no-verify` → il passe. Note ce que ça implique.

## Corrigé complet commenté

```bash
# --- Étape 1-2 : repo + deps ---
mkdir lab-hooks && cd lab-hooks
git init
npm init -y
npm install -D husky lint-staged prettier @commitlint/cli @commitlint/config-conventional

# --- Étape 3 : init husky v9 ---
npx husky init
# Effets :
#   - crée le dossier .husky/ (versionné)
#   - ajoute "prepare": "husky" dans package.json
#   - crée un .husky/pre-commit d'exemple contenant "npm test" (on va l'écraser)
```

```jsonc
// --- Étape 4 : package.json (extrait) ---
// "prepare" est ajouté par husky init ; on ajoute le bloc lint-staged à la main.
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    // Sur chaque fichier .js stagé : Prettier réécrit le fichier,
    // puis lint-staged le re-stage automatiquement.
    "*.js": ["prettier --write"]
  }
}
```

```bash
# --- Étape 5 : hook pre-commit (husky v9 = commandes seules) ---
# On ÉCRASE l'exemple. Pas de #!/bin/sh, pas de ligne husky.sh (déprécié en v9).
echo "npx lint-staged" > .husky/pre-commit
```

```javascript
// --- Étape 6a : commitlint.config.js ---
export default {
  extends: ['@commitlint/config-conventional'],
};
```

```bash
# --- Étape 6b : hook commit-msg ---
# $1 = chemin du fichier temporaire contenant le message saisi.
# On échappe $1 pour qu'il soit écrit littéralement dans le fichier de hook.
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

```bash
# --- Étape 7 : preuve que la chaîne fonctionne ---

# Fichier JS volontairement mal formaté (indentation 4 espaces, guillemets doubles)
printf 'const    x=1\nconsole.log(   "hi"    )\n' > app.js

git add app.js
git commit -m "feat(app): add hello script"
# → pre-commit : lint-staged lance prettier --write sur app.js (reformaté + re-stagé)
# → commit-msg : "feat(app): ..." est conventionnel → OK, commit créé.
# Vérifie que app.js a bien été reformaté :
cat app.js
# const x = 1;
# console.log('hi');

# Message NON conventionnel → doit échouer
echo "// change" >> app.js
git add app.js
git commit -m "wip"
# → commit-msg : commitlint rejette "wip" (pas de type valide)
#   ✖ subject may not be empty / type may not be empty
#   → exit 1 → COMMIT ANNULÉ.
```

```bash
# --- Étape 8 : preuve de la faille de sécurité ---
git commit --no-verify -m "wip"
# → pre-commit ET commit-msg sont IGNORÉS.
# → le commit "wip" est créé, non formaté, non conventionnel.
#
# Leçon : le hook local est un CONFORT (feedback rapide), pas une GARANTIE.
# La seule barrière non contournable est la CI serveur (GitHub Actions)
# + les branch protection rules, qui relancent lint/commitlint/tests
# là où --no-verify n'a aucun effet.
```

## Variante J+30 (fading)

Sans relire ce corrigé, en **15 minutes** :

- Repars d'un repo vide et remonte la chaîne complète **de mémoire**.
- Ajoute une contrainte : un **troisième hook `pre-push`** qui lance `npm test` (mets un `"test": "node -e \"process.exit(0)\""` bidon dans `package.json` pour que ça passe), puis un vrai `process.exit(1)` pour vérifier qu'un push est bien **bloqué**.
- Bonus : ajoute à lint-staged une glob `*.{json,md}` → `prettier --write`, et vérifie qu'un `.md` mal formaté est corrigé au commit.

Critère de réussite : un commit conventionnel bien formaté passe, un `wip` est refusé, un `--no-verify` contourne, et un `pre-push` rouge bloque le push.

## Application TribuZen

Porte la chaîne dans le vrai repo `smaurier/tribuzen` :

- `pre-commit` → `npx lint-staged` avec `"*.{ts,tsx}": ["eslint --fix", "prettier --write"]` (front React + back NestJS).
- `commit-msg` → `npx --no -- commitlint --edit $1` avec `@commitlint/config-conventional`.
- `pre-push` → `npm test` (Vitest).
- **Puis** ouvre `.github/workflows/ci.yml` : la CI relance `eslint`, `prettier --check`, `commitlint` et `npm test` sur chaque PR, et les branch protection rules de `main` exigent le vert pour merger.

Commit conventionnel dans `smaurier/tribuzen`, par exemple :

```bash
git commit -m "chore(tooling): add husky + lint-staged + commitlint quality gate"
```

Rappel à écrire en commentaire dans la PR : *les hooks husky accélèrent le feedback, la CI reste l'autorité — défense en profondeur.*
