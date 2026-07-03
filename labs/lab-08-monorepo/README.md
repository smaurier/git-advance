# Lab 08 — Monter un monorepo pnpm + Turborepo

> **Outcome :** à la fin, tu sais monter de zéro un workspace pnpm avec deux packages partagés + une app qui les consomme, y brancher Turborepo, et observer le cache de tâches + le build affecté.
> **Vrai outil :** pnpm ^9 et turbo ^2 (installés réellement, aucune simulation). Corepack active pnpm sans installation globale.
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. Tu observes les vraies sorties CLI (`cache miss`, `FULL TURBO`).

## Énoncé

Tu vas construire ce monorepo minimal de TribuZen :

```
tribuzen-lab/
├── apps/
│   └── admin/          # app qui consomme ui + types
├── packages/
│   ├── types/          # interface Member
│   └── ui/             # fonction formatMemberLabel(member) -> string
├── package.json        # racine private
├── pnpm-workspace.yaml
└── turbo.json
```

Contraintes :
- `apps/admin` dépend de `@tribuzen/ui` ET `@tribuzen/types` en `workspace:*`.
- `@tribuzen/ui` dépend de `@tribuzen/types` en `workspace:*`.
- Turborepo orchestre un script `build` (ici un simple `tsc` ou un `node -e` daté, peu importe le contenu — c'est le *graphe* et le *cache* qu'on observe).
- Objectif final : lancer `build` deux fois et voir `FULL TURBO`, puis modifier `admin` seul et voir que seul `admin` est reconstruit.

Prérequis machine :

```bash
corepack enable          # active pnpm/yarn gérés par Node
pnpm --version           # doit afficher 9.x (sinon: corepack prepare pnpm@latest --activate)
```

## Étapes (en friction)

1. **Crée l'arborescence** et le `package.json` racine avec `"private": true` et `turbo` en devDependency. Tu ne mets AUCUNE dépendance applicative à la racine.
2. **Écris `pnpm-workspace.yaml`** qui déclare `apps/*` et `packages/*`.
3. **Crée `packages/types`** : un `package.json` (`@tribuzen/types`) et un `src/index.ts` qui exporte `interface Member { id: string; name: string; role: string }`.
4. **Crée `packages/ui`** : `package.json` (`@tribuzen/ui`) qui dépend de `@tribuzen/types` en `workspace:*`, et `src/index.ts` avec `formatMemberLabel(m: Member): string`.
5. **Crée `apps/admin`** : `package.json` (`@tribuzen/admin`) qui dépend des DEUX packages en `workspace:*`, et `src/main.ts` qui importe `Member` + `formatMemberLabel` et logue une ligne.
6. **`pnpm install`** à la racine. Vérifie dans `node_modules/@tribuzen` que ce sont des liens (symlinks) vers `packages/`, pas des copies téléchargées.
7. **Ajoute un script `build`** à chaque package (ex. `"build": "tsc -p tsconfig.json"` ou, pour aller vite, `"build": "node -e \"console.log('built ' + require('./package.json').name)\""`).
8. **Écris `turbo.json`** avec une tâche `build` en `dependsOn: ["^build"]` et `outputs`.
9. **Lance `pnpm turbo run build` deux fois.** Note la sortie : 1er run = `cache miss`, 2e run = `FULL TURBO`.
10. **Modifie uniquement `apps/admin/src/main.ts`** puis relance `pnpm turbo run build`. Observe : seul `admin` est un `cache miss`, `types` et `ui` restent `cache hit`.
11. **Bonus (friction max) :** modifie `packages/types/src/index.ts` et relance. Explique à voix haute pourquoi `types`, `ui` ET `admin` sont maintenant tous des cache miss.

## Corrigé complet commenté

```jsonc
// package.json (racine) — jamais publié, réunit workspaces + outils communs
{
  "name": "tribuzen-lab",
  "private": true,                 // OBLIGATOIRE : la racine ne se publie pas
  "devDependencies": {
    "turbo": "^2",                 // le build system, partagé par tout le repo
    "typescript": "^5.6"
  }
}
```

```yaml
# pnpm-workspace.yaml — dit à pnpm OÙ sont les packages
packages:
  - 'apps/*'
  - 'packages/*'
```

```jsonc
// packages/types/package.json
{
  "name": "@tribuzen/types",
  "version": "0.0.0",              // 0.0.0 : version fictive, jamais publiée
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    // build minimal observable ; remplace par "tsc -p tsconfig.json" si tu veux du vrai typage
    "build": "node -e \"console.log('built @tribuzen/types')\""
  }
}
```

```ts
// packages/types/src/index.ts — la source de vérité partagée
export interface Member {
  id: string;
  name: string;
  role: string;
}
```

```jsonc
// packages/ui/package.json — consomme types en LOCAL via workspace:*
{
  "name": "@tribuzen/ui",
  "version": "0.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@tribuzen/types": "workspace:*"   // <- lien local, pas un download npm
  },
  "scripts": {
    "build": "node -e \"console.log('built @tribuzen/ui')\""
  }
}
```

```ts
// packages/ui/src/index.ts
import type { Member } from '@tribuzen/types';

// Fonction présentationnelle pure : reçoit un Member, retourne un label.
export function formatMemberLabel(m: Member): string {
  const roleTag = m.role === 'admin' ? '[Admin]' : '';
  return `${m.name} ${roleTag}`.trim();
}
```

```jsonc
// apps/admin/package.json — consomme les DEUX packages en local
{
  "name": "@tribuzen/admin",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@tribuzen/types": "workspace:*",
    "@tribuzen/ui": "workspace:*"
  },
  "scripts": {
    "build": "node -e \"console.log('built @tribuzen/admin')\""
  }
}
```

```ts
// apps/admin/src/main.ts — le consommateur final
import type { Member } from '@tribuzen/types';
import { formatMemberLabel } from '@tribuzen/ui';

const founder: Member = { id: 'm1', name: 'Sylvain', role: 'admin' };
console.log(formatMemberLabel(founder)); // -> "Sylvain [Admin]"
```

```jsonc
// turbo.json — le graphe de tâches + le cache
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],   // ^ = build d'abord mes dépendances internes
      "outputs": ["dist/**"]     // ce que Turborepo met en cache (ici vide, mais déclaré)
    }
  }
}
```

```bash
# --- Installation ---
corepack enable
pnpm install
# node_modules/@tribuzen/types et /ui sont des symlinks vers packages/ (vérifie avec: ls -l node_modules/@tribuzen)

# --- Observer le graphe ---
pnpm turbo run build
#   @tribuzen/types:build   cache miss, executing...
#   @tribuzen/ui:build      cache miss, executing...   (a attendu types)
#   @tribuzen/admin:build   cache miss, executing...   (a attendu types + ui)

# --- Observer le cache ---
pnpm turbo run build         # rien n'a changé
#  >>> FULL TURBO            # tout restauré depuis le cache en ~0.1s

# --- Observer l'affecté ---
# (édite apps/admin/src/main.ts, change le texte loggé)
pnpm turbo run build
#   @tribuzen/types:build   cache hit          <- pas touché
#   @tribuzen/ui:build      cache hit          <- pas touché
#   @tribuzen/admin:build   cache miss, executing...   <- seul admin rejoué

# --- Bonus : modifier la dépendance racine du graphe ---
# (édite packages/types/src/index.ts)
pnpm turbo run build
#   @tribuzen/types:build   cache miss   <- source changée
#   @tribuzen/ui:build      cache miss   <- dépend de types
#   @tribuzen/admin:build   cache miss   <- dépend de types (via ui + direct)
# => toucher la racine du graphe invalide tous les descendants. C'est voulu.
```

**Pourquoi le bonus invalide tout :** le hash de cache d'une tâche inclut le hash de ses dépendances internes. Changer `types` change son hash, donc celui de `ui`, donc celui de `admin`. C'est exactement la garantie qu'on veut : impossible de livrer un `admin` buildé contre un ancien `types`.

## Variante J+30 (fading)

Refais le lab **sans relire ce corrigé**, en 25 minutes, avec DEUX contraintes ajoutées :

1. Ajoute un flag `--affected` : au lieu de `pnpm turbo run build`, initialise un dépôt Git (`git init && git add -A && git commit -m init`), puis après avoir modifié `admin`, lance `pnpm turbo run build --affected` et vérifie que seul `admin` est traité (pense à ce que `--affected` compare contre la branche de base).
2. Ajoute une tâche `test` dans `turbo.json` avec `dependsOn: ["build"]` (sans `^`) et explique en une phrase pourquoi ce n'est PAS `^build`.

Si tu bloques sur `--affected`, souviens-toi : il compare contre la branche par défaut, donc il faut au moins un commit d'historique. En CI, l'équivalent est `fetch-depth: 0`.

## Application TribuZen

Porte ce montage dans le vrai dépôt `smaurier/tribuzen` :

1. Restructure le repo en `apps/admin`, `apps/api`, `packages/ui`, `packages/types` (déplace le code existant avec `git mv` pour garder l'historique).
2. Passe les imports de types vers `@tribuzen/types` en `workspace:*` — supprime toute publication npm interne des types.
3. Ajoute `turbo.json` avec `build`, `lint`, `test` (`build` en `dependsOn: ["^build"]`).
4. Dans `.github/workflows/ci.yml`, passe le checkout en `fetch-depth: 0` et remplace le build global par `pnpm turbo run lint test build --affected`.
5. Commit atomique de démonstration : ajoute `Member.timezone` dans `packages/types` ET affiche-le dans `apps/admin` dans **le même commit** — la preuve que le monorepo tient sa promesse d'atomicité.

Commit : `smaurier/tribuzen`, message type `chore(repo): passage en monorepo pnpm + turborepo`.
