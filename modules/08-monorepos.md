---
titre: Monorepos — workspaces et build orchestré
cours: 07-git-avance
notions: [monorepo vs polyrepo vs submodules, workspaces pnpm/npm/yarn, protocole workspace, hoisting de dépendances, cache de tâches, graphe de dépendances, tâches affectées, gestion de versions avec Changesets, CI d'un monorepo, sparse-checkout]
outcomes: [monter un workspace pnpm avec packages partagés, orchestrer les builds avec Turborepo et son cache, ne builder que l'affecté en CI, choisir entre monorepo et submodules en connaissance de cause]
prerequis: [07-worktrees-submodules]
next: 09-workflows-collaboratifs
libs: [{ name: pnpm, version: "^9" }, { name: turbo, version: "^2" }]
tribuzen: structurer TribuZen en monorepo (apps/admin, apps/api, packages/ui, packages/types) avec pnpm workspaces + Turborepo
last-reviewed: 2026-07
---

# Monorepos — workspaces et build orchestré

> **Outcomes — tu sauras FAIRE :** monter un workspace pnpm avec des packages partagés, orchestrer les builds avec Turborepo et son cache de tâches, ne builder que l'affecté en CI, choisir entre monorepo et submodules en connaissance de cause.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

TribuZen a grossi. Tu as maintenant trois dépôts Git séparés :

- `tribuzen-admin` — le back-office React.
- `tribuzen-api` — l'API NestJS.
- `tribuzen-types` — les types TypeScript partagés (`Member`, `Family`, `Event`), publiés en package npm privé.

Tu ajoutes un champ `Member.timezone`. Voici ce que ça coûte aujourd'hui :

```bash
# 1. Modifier le type dans tribuzen-types
cd tribuzen-types
# ... éditer src/member.ts
npm version patch          # 1.4.0 -> 1.4.1
npm publish                # publier sur le registre privé

# 2. Mettre à jour l'API
cd ../tribuzen-api
pnpm add @tribuzen/types@1.4.1
# ... utiliser member.timezone
git commit && git push     # PR n°1

# 3. Mettre à jour l'admin
cd ../tribuzen-admin
pnpm add @tribuzen/types@1.4.1
# ... afficher member.timezone
git commit && git push     # PR n°2
```

**Un seul champ ajouté = 3 commits, 2 PR, 1 publication npm, et une fenêtre où l'API tourne sur `1.4.1` pendant que l'admin est encore sur `1.4.0`.** Si tu te trompes de version quelque part, le type est désynchronisé et TypeScript ne te prévient qu'au runtime du package désaligné.

Le monorepo supprime cette friction : un seul dépôt, un `import { Member } from '@tribuzen/types'` qui pointe vers le code local, un seul commit atomique qui change le type ET ses trois consommateurs. Ce module te donne les outils pour construire ça — et pour savoir quand ça n'en vaut *pas* la peine.

---

## 2. Théorie complète, concise

### 2.1 Monorepo — définition

Un **monorepo** est un dépôt Git unique qui contient plusieurs projets (applications) et/ou packages (bibliothèques), chacun avec son propre `package.json`, mais versionnés et clonés ensemble.

```
tribuzen/
├── apps/
│   ├── admin/          <- app React (package.json)
│   └── api/            <- app NestJS (package.json)
├── packages/
│   ├── ui/             <- composants partagés (package.json)
│   └── types/          <- types TS partagés (package.json)
├── package.json        <- racine : outils communs, scripts
├── pnpm-workspace.yaml <- déclare où sont les packages
└── turbo.json          <- orchestration des tâches
```

Le mot-clé, c'est **atomicité** : un commit peut modifier un package et tous ses consommateurs d'un coup, avec revue et CI sur le tout.

### 2.2 Monorepo vs polyrepo vs submodules — trade-offs honnêtes

Ce sont trois réponses à la même question : « comment partager du code entre projets ? »

| Critère | Monorepo | Polyrepo (multirepo) | Submodules |
|---|---|---|---|
| Nombre de dépôts | 1 | N | 1 parent + N enfants |
| Partage de code | import local direct | package npm publié + versionné | chemin de fichiers dans le repo enfant |
| Refactoring cross-projet | 1 commit atomique | N PR synchronisées | N commits + bump du pointeur parent |
| Versionnement des libs | interne (Changesets) | npm registry | SHA de commit figé |
| Isolation / droits d'accès | tout ou rien | par dépôt | par dépôt enfant |
| CI | complexe (détection d'affecté) | simple par repo | moyenne (chaque submodule a sa CI) |
| Onboarding | 1 clone | N clones | 1 clone + `--recurse-submodules` |
| Outillage requis | workspaces + build system | aucun (mais duplication) | Git seul |

**Le rapport avec le module 07 (worktrees & submodules).** Un submodule et un package de monorepo résolvent des besoins voisins mais opposés dans la philosophie :

- **Submodule** = « j'embarque un *autre* dépôt, à un *commit figé*, sans le mélanger au mien ». Chaque submodule garde son historique, ses droits, son cycle de release. Idéal quand le code partagé est **une dépendance externe versionnée** (une lib open-source vendorisée, un thème, un SDK d'une autre équipe). Coût : chaque changement cross-repo = un commit dans l'enfant PUIS un commit dans le parent pour bouger le pointeur. Pas d'atomicité.
- **Package de monorepo** = « ce code partagé vit *dans le même dépôt*, au *même commit* que ses consommateurs ». Un seul historique, un seul commit atomique. Coût : tout le monde partage droits d'accès, CI et outillage.

Règle de discrimination : si tu veux **figer une version externe et garder les historiques séparés** → submodule. Si tu veux **refactorer type + API + UI en un commit** → monorepo. Les submodules ne remplacent PAS un monorepo (pas d'atomicité), et un monorepo ne remplace PAS les submodules (pas d'isolation ni de versionnage figé).

### 2.3 Workspaces — la fondation

Un **workspace** est un package géré par le package manager à l'intérieur du dépôt. pnpm, npm et yarn savent tous résoudre les dépendances entre workspaces localement, sans passer par un registre.

pnpm déclare les workspaces dans un fichier dédié :

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

npm et yarn les déclarent dans le `package.json` racine :

```json
{
  "name": "tribuzen",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

> **Attention :** la racine d'un monorepo DOIT être `"private": true`. Elle n'est jamais publiée ; elle ne sert qu'à réunir les workspaces et les outils communs.

### 2.4 Le protocole `workspace:`

Quand un package consomme un autre package du même dépôt, on référence la version locale avec le protocole `workspace:` (pnpm et yarn) :

```json
{
  "name": "@tribuzen/api",
  "dependencies": {
    "@tribuzen/types": "workspace:*"
  }
}
```

`workspace:*` signifie « prends la version qui est dans ce dépôt, quelle qu'elle soit ». pnpm crée un lien symbolique vers `packages/types` au lieu de télécharger depuis npm. À la publication (si tu publies un jour), pnpm réécrit `workspace:*` en la vraie version semver. Variantes : `workspace:~` et `workspace:^` réécrivent avec le préfixe correspondant.

### 2.5 Hoisting de dépendances

Le **hoisting** consiste à remonter les dépendances communes des packages vers un `node_modules` partagé, au lieu de les dupliquer dans chaque package.

- **npm/yarn classiques** aplatissent tout dans le `node_modules` racine par défaut. Rapide, mais dangereux : un package peut importer une lib qu'il n'a **pas** déclarée, simplement parce qu'un voisin l'a hoistée (« phantom dependency »). Le jour où le voisin la retire, ton package casse sans qu'aucun `package.json` n'ait changé.
- **pnpm** utilise par défaut un `node_modules` **non-plat** avec liens symboliques : chaque package ne voit QUE ce qu'il a déclaré. C'est plus strict et ça élimine les phantom dependencies. Le disque est économisé par un *content-addressable store* global partagé entre tous les projets de ta machine.

Si tu as besoin d'ajuster le comportement, pnpm expose `nodeLinker` (`isolated` par défaut, ou `hoisted` pour imiter npm) et `hoistingLimits` (`workspaces` pour ne hoister que jusqu'à chaque package).

```yaml
# pnpm-workspace.yaml — imiter le hoisting npm si un outil legacy l'exige
nodeLinker: hoisted
hoistingLimits: workspaces
```

> Honnêteté : le hoisting strict de pnpm révèle parfois des bugs latents (des libs qui comptaient sur les phantom dependencies). C'est un mal pour un bien — mais attends-toi à corriger quelques `package.json` en migrant vers pnpm.

### 2.6 Build system — cache de tâches et graphe de dépendances

Les workspaces résolvent le *partage de code*. Ils ne résolvent PAS le *build* : lancer `build` dans 8 packages, dans le bon ordre, sans rejouer ce qui n'a pas changé. C'est le rôle d'un **build system** comme **Turborepo** (Vercel) ou **Nx** (Nrwl).

Deux mécanismes clés :

**a) Le graphe de dépendances de tâches.** Turborepo lit les `dependencies` de chaque `package.json` pour savoir que `admin` dépend de `ui` et `types`. Le préfixe `^` dans `dependsOn` signifie « d'abord la même tâche dans mes dépendances » :

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`build.dependsOn = ["^build"]` → avant de builder `admin`, Turborepo build `types` puis `ui`. `test.dependsOn = ["build"]` (sans `^`) → tester un package exige d'avoir buildé ce même package d'abord.

> **Note de version :** dans Turborepo 1.x, la clé s'appelait `pipeline`. Depuis Turborepo 2.0 c'est `tasks`. Le schéma est `https://turborepo.dev/schema.json`. Si tu tombes sur `pipeline` dans un tuto, c'est de l'ancien.

**b) Le cache de tâches.** Turborepo calcule une empreinte (hash) des entrées d'une tâche : fichiers sources, `package.json`, dépendances, variables d'env déclarées. Si l'empreinte est déjà connue, il **restaure la sortie depuis le cache** au lieu de rejouer la tâche — logs inclus, en quelques millisecondes.

```bash
pnpm turbo run build
#   types:build   cache miss, executing...
#   ui:build      cache miss, executing...
#   admin:build   cache miss, executing...

pnpm turbo run build   # aucune source modifiée
#   types:build   cache hit, replaying logs...
#   ui:build      cache hit, replaying logs...
#   admin:build   cache hit, replaying logs...
#  >>> FULL TURBO (0.2s)
```

Ce cache peut être **partagé** (Remote Cache) : ton collègue ou la CI récupèrent le build que tu as déjà produit. C'est là qu'un monorepo devient plus rapide qu'un polyrepo, pas plus lent.

### 2.7 Tâches affectées — ne travailler que sur ce qui a changé

Le levier CI le plus important. Inutile de rebuilder les 8 packages si le commit ne touche que `apps/admin`.

Avec Turborepo, le filtre `--filter` cible un package et, avec la syntaxe `[<ref>]`, tout ce qui a changé depuis une référence Git :

```bash
# Builder uniquement admin et ses dépendances internes
pnpm turbo run build --filter=@tribuzen/admin

# Builder tout package modifié depuis main (et ses dépendants)
pnpm turbo run build --filter='...[origin/main]'
```

Depuis Turborepo 2.1, le flag `--affected` fait ce dernier calcul automatiquement (base = la branche par défaut) :

```bash
pnpm turbo run test --affected
```

Nx expose le même concept sous le nom `affected` :

```bash
npx nx affected --target=test --base=origin/main --head=HEAD
```

### 2.8 Gestion des versions avec Changesets

Dans un monorepo qui **publie** des packages (une lib open-source, un design system), il faut décider *quel* package bump vers *quelle* version, et générer les changelogs. **Changesets** est l'outil standard.

Le flux :

```bash
# 1. À chaque changement notable, l'auteur décrit l'impact
pnpm changeset
#   ? Which packages? -> @tribuzen/ui
#   ? Type? -> minor
#   ? Summary -> ajout du composant <Timeline>
# -> crée un fichier markdown dans .changeset/

# 2. Au moment de release, appliquer les changesets accumulés
pnpm changeset version   # bump les package.json + génère les CHANGELOG.md

# 3. Publier
pnpm changeset publish   # npm publish les packages bumpés
```

Changesets comprend le graphe : si `@tribuzen/ui` bump en minor et que `@tribuzen/admin` en dépend, il bump `admin` aussi. C'est ce qui remplace proprement le `npm version && npm publish` manuel du cas concret.

> Si tes packages ne sont **pas** publiés (100 % internes, comme `@tribuzen/types` consommé seulement en interne via `workspace:*`), tu n'as PAS besoin de Changesets : le `workspace:*` suffit, il n'y a pas de version à gérer. Changesets sert dès qu'un artefact sort du dépôt.

### 2.9 CI d'un monorepo — ne builder que l'affecté

Le piège du monorepo : à chaque push, rebuilder/retester *tout* devient vite insoutenable. La CI doit détecter l'affecté. Deux stratégies :

**Stratégie A — déléguer au build system** (recommandé si tu as déjà Turborepo/Nx) :

```yaml
# .github/workflows/ci.yml (extrait)
- uses: actions/checkout@v4
  with:
    fetch-depth: 0          # <- indispensable : Turborepo compare des commits
- uses: pnpm/action-setup@v4
- run: pnpm install --frozen-lockfile
- run: pnpm turbo run lint test build --affected
```

`fetch-depth: 0` est crucial : sans l'historique complet, Turborepo ne peut pas diff contre `main` et retombera sur « tout builder ».

**Stratégie B — filtre de chemins** (sans build system, plus manuel) :

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      admin: ${{ steps.filter.outputs.admin }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            admin:
              - 'apps/admin/**'
              - 'packages/ui/**'
              - 'packages/types/**'
  build-admin:
    needs: changes
    if: needs.changes.outputs.admin == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "build admin"
```

La stratégie A est plus fiable car le graphe de dépendances est calculé par l'outil, pas maintenu à la main dans un YAML.

### 2.10 Sparse-checkout — survivre aux très gros monorepos

Sur un monorepo massif (des milliers de packages, type Google/Meta), cloner *tout* est lourd. `git sparse-checkout` ne matérialise sur disque que les dossiers dont tu as besoin, tout en gardant un seul dépôt.

```bash
git clone --filter=blob:none --no-checkout https://…/tribuzen.git
cd tribuzen
git sparse-checkout init --cone
git sparse-checkout set apps/admin packages/ui packages/types
git checkout main
# -> l'arbre de travail ne contient QUE ces dossiers
```

`--cone` optimise le pattern-matching pour des dossiers entiers. `--filter=blob:none` (partial clone) évite en plus de télécharger les blobs des fichiers non checkout. Pour un monorepo d'équipe classique (dizaines de packages), tu n'en as pas besoin : c'est un outil pour l'échelle.

> Honnêteté générale : un monorepo est **puissant mais pas gratuit**. Sans build system (cache + affected), il devient plus lent qu'un polyrepo à chaque push. Sans discipline sur les droits, tout le monde touche à tout. Le monorepo se justifie quand le partage de code atomique dépasse le coût de l'outillage — pas par principe.

---

## 3. Worked examples

### Exemple 1 — Monter le workspace pnpm de TribuZen, de zéro

Objectif : `packages/types` définit `Member`, `apps/api` le consomme.

```bash
# Arborescence
mkdir -p tribuzen/apps/api tribuzen/packages/types
cd tribuzen
```

```json
// package.json (racine) — private, réunit les workspaces
{
  "name": "tribuzen",
  "private": true,
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.6"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// packages/types/package.json
{
  "name": "@tribuzen/types",
  "version": "0.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

```ts
// packages/types/src/index.ts
export interface Member {
  id: string;
  name: string;
  timezone: string;   // le champ du cas concret
}
```

```json
// apps/api/package.json — consomme le package local via workspace:*
{
  "name": "@tribuzen/api",
  "version": "0.0.0",
  "dependencies": {
    "@tribuzen/types": "workspace:*"
  }
}
```

```ts
// apps/api/src/main.ts
import type { Member } from '@tribuzen/types';

const founder: Member = {
  id: 'm1',
  name: 'Sylvain',
  timezone: 'Europe/Paris',
};
console.log(founder);
```

```bash
pnpm install
# pnpm crée un lien symbolique node_modules/@tribuzen/types -> packages/types
# Modifier packages/types se répercute instantanément dans apps/api :
# aucune publication npm, aucun bump de version.
```

Le cas concret d'ouverture (3 commits, 2 PR, 1 publish) est maintenant **un seul commit** qui édite `types/src/index.ts` et `api/src/main.ts` ensemble.

### Exemple 2 — Orchestrer et ne rebuilder que l'affecté

On ajoute Turborepo et une app `admin` qui dépend elle aussi de `types`.

```json
// turbo.json (racine)
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

Chaque package expose ses scripts :

```json
// packages/types/package.json (extrait)
{ "scripts": { "build": "tsc -p tsconfig.json", "test": "vitest run" } }
```

```bash
# Premier run : tout est un cache miss
pnpm turbo run build
#   @tribuzen/types:build   cache miss, executing...
#   @tribuzen/admin:build   cache miss, executing...   (attend types)
#   @tribuzen/api:build     cache miss, executing...   (attend types)

# Deuxième run sans modif : tout depuis le cache
pnpm turbo run build
#  >>> FULL TURBO

# On ne touche QUE apps/admin puis on cible l'affecté
# (edit apps/admin/src/…)
pnpm turbo run build --affected
#   @tribuzen/admin:build   cache miss, executing...
#   (types et api : cache hit — leurs entrées n'ont pas bougé)
```

**Lecture du résultat :** modifier `admin` seul ne rejoue QUE le build de `admin`. Si on avait modifié `packages/types`, Turborepo aurait rejoué `types`, `admin` ET `api` — parce que le graphe sait qu'ils en dépendent. C'est exactement le comportement qu'on veut en CI : `pnpm turbo run lint test build --affected` avec `fetch-depth: 0`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que « workspaces = monorepo complet »

Les workspaces pnpm/npm résolvent le *lien de code* entre packages. Ils ne cachent RIEN et ne connaissent PAS l'ordre de build optimal au-delà de l'install.

```bash
# ❌ Sans build system : rebuild aveugle et séquentiel de tout
pnpm -r run build        # rejoue les 8 builds à chaque fois, cache zéro

# ✅ Avec Turborepo : ordre par graphe + cache + parallélisme
pnpm turbo run build     # FULL TURBO si rien n'a changé
```

**Correct :** workspaces = fondation (résolution des deps locales). Build system (Turborepo/Nx) = couche au-dessus pour cache + affected + ordre. Un monorepo sérieux a les deux.

### PIÈGE #2 — Confondre submodule et package de monorepo

```
❌ « Je vais mettre mes types partagés en submodule pour les réutiliser dans admin et api »
   -> chaque changement de type = commit dans le submodule + 2 bumps de pointeur
      dans admin et api. Aucune atomicité. Pire qu'un polyrepo pour ça.

✅ Types partagés fortement couplés aux consommateurs -> package de monorepo (workspace:*)
✅ Dépendance externe versionnée, historique séparé, droits distincts -> submodule
```

**Discrimination :** submodule = figer un *autre* dépôt à un commit précis (isolation, versionnage figé). Package de monorepo = code au *même* commit que ses consommateurs (atomicité). Ce ne sont pas des alternatives interchangeables ; ils répondent à des besoins opposés.

### PIÈGE #3 — Oublier `fetch-depth: 0` en CI

```yaml
# ❌ checkout shallow par défaut -> pas d'historique -> --affected rebuild TOUT
- uses: actions/checkout@v4

# ✅ historique complet -> Turborepo/Nx peut diff contre main
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

Symptôme classique : « mon `--affected` reconstruit tout le monorepo en CI alors qu'en local il est malin ». C'est presque toujours le checkout shallow.

### PIÈGE #4 — Compter sur des phantom dependencies (post-migration pnpm)

```ts
// ❌ apps/api importe lodash SANS l'avoir dans son package.json.
//    Marchait sous npm (hoisté à la racine par un voisin), casse sous pnpm strict.
import { groupBy } from 'lodash';

// ✅ Déclarer explicitement ce qu'on utilise dans apps/api/package.json
//    "dependencies": { "lodash": "^4.17.21" }
```

pnpm rend visible une dette invisible : chaque package doit déclarer ses vraies dépendances. C'est correct, mais surprend en migration.

### PIÈGE #5 — Sortir Changesets pour des packages jamais publiés

```
❌ Monorepo 100 % interne (rien ne va sur npm) + Changesets + versions bumpées
   -> cérémonie de versionnage sans consommateur externe. Pure friction.

✅ Tout est en workspace:* et consommé en interne -> pas de versions à gérer, pas de Changesets.
✅ Changesets APPARAÎT quand un package est publié hors du dépôt (lib, design system).
```

---

## 5. Ancrage TribuZen

On rassemble les dépôts épars de TribuZen dans un monorepo unique `smaurier/tribuzen` :

```
tribuzen/
├── apps/
│   ├── admin/                 # back-office React (module 04)
│   │   └── package.json        #   dépend de @tribuzen/ui et @tribuzen/types
│   └── api/                   # API NestJS
│       └── package.json        #   dépend de @tribuzen/types
├── packages/
│   ├── ui/                    # design system partagé (Card, Avatar, Badge — module 04)
│   │   └── package.json
│   └── types/                 # Member, Family, Event partagés
│       └── package.json
├── package.json               # private: true, turbo + typescript en devDeps
├── pnpm-workspace.yaml        # packages: apps/*, packages/*
└── turbo.json                 # tasks: build/lint/test avec dependsOn ^build
```

Décisions concrètes pour TribuZen :

- **`packages/types` et `packages/ui` sont consommés en `workspace:*`** — jamais publiés sur npm. Donc **pas de Changesets** : le lien local suffit. Ajouter `Member.timezone` = un commit atomique qui touche `types`, `api` et `admin`.
- **Turborepo orchestre** `build`, `lint`, `test`. Le cache local évite de rebuilder `ui` quand seule l'`api` change.
- **CI : ne builder que l'affecté.** Un push qui ne touche que `apps/admin` déclenche `pnpm turbo run lint test build --affected` → seul `admin` (et ce dont il dépend et qui a changé) est traité. Avec `fetch-depth: 0` sur le checkout.
- **Pas de sparse-checkout** : TribuZen a 4 packages, tout tient largement dans un clone normal. C'est un outil pour l'échelle Google, pas pour nous — le mentionner, ne pas l'appliquer.

Ce monorepo remplace l'ancien montage où `tribuzen-types` était pressenti en submodule : on gagne l'atomicité type + consommateurs, au prix d'un dépôt partagé (acceptable, une seule équipe).

---

## 6. Points clés

1. Un monorepo = un seul dépôt Git, plusieurs packages/apps, commits atomiques cross-projet.
2. Monorepo (atomicité), polyrepo (isolation par registre npm), submodules (isolation + version figée) répondent à des besoins différents — le monorepo ne remplace PAS les submodules et inversement.
3. Les workspaces (pnpm/npm/yarn) résolvent les dépendances locales via le protocole `workspace:*` — pas de publication npm entre packages internes.
4. pnpm évite les phantom dependencies avec un `node_modules` strict non-plat ; le hoisting agressif de npm crée des dépendances fantômes.
5. Un build system (Turborepo/Nx) ajoute le graphe de tâches (`dependsOn: ["^build"]`), le cache de tâches (FULL TURBO) et les tâches affectées (`--affected`).
6. En CI, ne builder que l'affecté est obligatoire pour rester rapide — avec `fetch-depth: 0` pour que le diff Git fonctionne.
7. Changesets gère versions et changelogs UNIQUEMENT pour les packages publiés hors du dépôt ; inutile pour du 100 % interne.
8. `git sparse-checkout` matérialise un sous-ensemble de dossiers — outil pour les très gros monorepos, pas pour un projet d'équipe classique.
9. Turborepo 2.x utilise la clé `tasks` (ex-`pipeline` en 1.x) et le schéma `https://turborepo.dev/schema.json`.
10. Un monorepo est puissant mais exige de l'outillage : sans cache + affected il est plus lent qu'un polyrepo.

---

## 7. Seeds Anki

```
Quelle est la différence de fond entre un submodule et un package de monorepo ?|Le submodule embarque un AUTRE dépôt à un commit figé (isolation, historique et droits séparés, pas d'atomicité). Le package de monorepo vit au MÊME commit que ses consommateurs (un seul historique, commit atomique cross-projet). Besoins opposés, pas interchangeables.
À quoi sert le protocole workspace:* dans un package.json de monorepo ?|Il référence la version locale d'un autre package du dépôt : pnpm/yarn créent un lien vers le dossier au lieu de télécharger depuis npm. À la publication, workspace:* est réécrit en vraie version semver.
Pourquoi pnpm évite-t-il les phantom dependencies contrairement à npm ?|pnpm utilise un node_modules non-plat à liens symboliques : chaque package ne voit QUE ce qu'il a déclaré. npm aplatit tout à la racine, si bien qu'un package peut importer une lib non déclarée hoistée par un voisin (phantom dependency) et casser quand le voisin la retire.
Que signifie dependsOn: ["^build"] dans turbo.json ?|Le caret ^ veut dire « d'abord la tâche build de mes dépendances internes ». Avant de builder un package, Turborepo build d'abord les packages dont il dépend, dans l'ordre du graphe. Sans ^ (ex: dependsOn: ["build"]), c'est une dépendance dans le même package.
Comment Turborepo accélère-t-il les rebuilds (cache de tâches) ?|Il calcule un hash des entrées d'une tâche (sources, package.json, deps, env déclarées). Si le hash est déjà connu, il restaure la sortie et les logs depuis le cache (cache hit / FULL TURBO) au lieu de rejouer la tâche. Ce cache peut être partagé (Remote Cache) entre CI et équipe.
En CI de monorepo, que fait --affected et quel réglage de checkout est indispensable ?|--affected ne lance la tâche que sur les packages modifiés depuis la branche de base (et leurs dépendants). Il faut fetch-depth: 0 au checkout pour que Turborepo/Nx ait l'historique Git complet ; sinon le diff échoue et tout est rebuildé.
Quand a-t-on besoin de Changesets, et quand non ?|Changesets gère versions + changelogs des packages PUBLIÉS hors du dépôt (lib, design system sur npm). Pour un monorepo 100 % interne où tout est consommé en workspace:*, il n'y a pas de version à gérer : Changesets est inutile.
À quoi sert git sparse-checkout et pour qui ?|Il ne matérialise sur disque qu'un sous-ensemble de dossiers du dépôt (git sparse-checkout set apps/admin ...), tout en gardant un seul repo. Utile pour les très gros monorepos (échelle Google/Meta) ; superflu pour un monorepo d'équipe de quelques packages.
Quel est le coût honnête d'un monorepo ?|Il exige de l'outillage : sans build system (cache + tâches affectées) il devient plus lent qu'un polyrepo à chaque push, et sans discipline sur les droits, tout le monde touche à tout. Il se justifie quand l'atomicité du partage de code dépasse le coût de l'outillage.
Quelle clé de turbo.json a remplacé pipeline en Turborepo 2.x ?|La clé tasks (Turborepo 1.x utilisait pipeline). Le schéma de référence est https://turborepo.dev/schema.json.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-08-monorepo/README.md`. Monter de zéro un workspace pnpm avec deux packages partagés + une app qui les consomme, puis y brancher Turborepo et observer le cache + l'affecté.
