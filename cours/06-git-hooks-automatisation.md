---
title: "Git hooks et automatisation"
description: "Hooks client-side, Husky, lint-staged, commitlint, automatiser la qualité"
duration: "45 min"
difficulty: "Avancé"
---

# Module 06 — Git hooks et automatisation

## Qu'est-ce qu'un hook Git ?

Un hook est un script exécuté automatiquement lors d'événements Git. Ils vivent dans `.git/hooks/`.

```bash
ls .git/hooks/
# applypatch-msg.sample  pre-commit.sample
# commit-msg.sample      pre-push.sample
# post-update.sample     pre-rebase.sample
# pre-applypatch.sample  prepare-commit-msg.sample
# pre-merge-commit.sample
```

Retire `.sample` pour activer un hook. Le script doit être exécutable.

## Hooks client-side importants

### pre-commit — Avant chaque commit

S'exécute avant que le commit ne soit créé. Exit code non-zero = commit annulé.

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Linter
npx eslint --quiet src/ || exit 1

# Formatter
npx prettier --check src/ || exit 1

# TypeScript
npx tsc --noEmit || exit 1

echo "✅ Pre-commit checks passed"
```

### commit-msg — Valider le message de commit

```bash
#!/bin/sh
# .git/hooks/commit-msg

# Vérifier le format Conventional Commits
COMMIT_MSG=$(cat "$1")
PATTERN="^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\(.+\))?: .{1,72}$"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "❌ Message de commit invalide."
  echo "   Format attendu : type(scope): description"
  echo "   Exemple : feat(auth): add JWT refresh token"
  exit 1
fi
```

### pre-push — Avant un push

```bash
#!/bin/sh
# .git/hooks/pre-push

# Lancer les tests avant de push
npm test || {
  echo "❌ Tests échoués. Push annulé."
  exit 1
}
```

## Le problème des hooks natifs

Les hooks `.git/hooks/` ne sont **pas versionnés** (`.git/` est ignoré par Git). Impossible de les partager en équipe. Solution : **Husky**.

## Husky — Hooks versionnés

```bash
# Installation
npm install -D husky
npx husky init

# Crée un dossier .husky/ (versionné !)
# et configure le hook pre-commit
```

Structure créée :

```
.husky/
├── _/
│   └── husky.sh
└── pre-commit    ← ton hook
```

### Configurer les hooks avec Husky

```bash
# pre-commit : lint + format
echo "npx lint-staged" > .husky/pre-commit

# commit-msg : valider le message
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg

# pre-push : tests
echo "npm test" > .husky/pre-push
```

## lint-staged — Linter uniquement les fichiers modifiés

Lancer ESLint sur tout le projet à chaque commit est lent. **lint-staged** ne lint que les fichiers dans le staging area.

```bash
npm install -D lint-staged
```

Configuration dans `package.json` :

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"],
    "*.css": ["stylelint --fix", "prettier --write"]
  }
}
```

Le hook pre-commit :

```bash
# .husky/pre-commit
npx lint-staged
```

> **Résultat** : seuls les fichiers que tu as modifiés sont lintés et formattés. Un commit prend 1-2 secondes au lieu de 30.

## commitlint — Conventional Commits

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

Configuration `commitlint.config.js` :

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'ci', 'perf', 'build', 'revert'
    ]],
    'subject-max-length': [2, 'always', 72],
  }
};
```

### Conventional Commits — Format

```
type(scope): description

feat(auth): add JWT refresh token rotation
fix(api): handle null response from user service
docs(readme): update installation instructions
refactor(users): extract validation into separate module
test(auth): add integration tests for login flow
chore(deps): update typescript to 5.7
ci(github): add caching for node_modules
```

## Hooks server-side

Exécutés sur le serveur Git (GitHub, GitLab). Configurés via l'interface web, pas les fichiers.

| Hook | Usage |
|------|-------|
| `pre-receive` | Valider les pushes (branch protection, signed commits) |
| `update` | Valider chaque branche mise à jour |
| `post-receive` | Notifications, trigger CI/CD |

> En pratique, tu utilises les **branch protection rules** de GitHub/GitLab plutôt que des hooks server-side manuels.

## Setup complet recommandé

```bash
# 1. Installer les dépendances
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# 2. Initialiser Husky
npx husky init

# 3. Configurer pre-commit
echo "npx lint-staged" > .husky/pre-commit

# 4. Configurer commit-msg
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

## Résumé

- **Hooks natifs** : scripts dans `.git/hooks/`, non versionnés
- **Husky** : hooks dans `.husky/`, versionnés et partagés en équipe
- **lint-staged** : lint uniquement les fichiers modifiés (rapide)
- **commitlint** : enforce les Conventional Commits
- Setup recommandé : Husky + lint-staged + commitlint + pre-push tests
