import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 08 — Monorepo : Gestion de packages et dépendances
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 08 — Monorepo');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Package {
  name: string;
  path: string;
  dependencies: string[]; // noms des packages dont il dépend
}

interface WorkspaceConfig {
  packages: string[]; // patterns de glob (ex: "packages/*")
}

// ---------------------------------------------------------------------------
// Exercice 1 : Parser une config workspace
// ---------------------------------------------------------------------------

function parseWorkspaceConfig(yaml: string): WorkspaceConfig {
  // TODO: Parser une config simplifiée au format :
  // "packages:\n  - packages/*\n  - apps/*"
  // Extraire la liste des patterns (lignes commençant par "  - ")
  return { packages: [] };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Matcher des fichiers avec des patterns workspace
// ---------------------------------------------------------------------------

function matchesPattern(filePath: string, pattern: string): boolean {
  // TODO: Vérifier si un chemin de fichier correspond à un pattern workspace
  // Les patterns utilisent "/*" pour matcher un niveau de dossier
  // Ex: "packages/*" matche "packages/lib-core/src/index.ts"
  // car le fichier est dans un sous-dossier de "packages/"
  // "apps/*" matche "apps/web/pages/home.ts"
  // "packages/*" ne matche PAS "other/file.ts"
  return false;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Détecter les packages affectés par des changements
// ---------------------------------------------------------------------------

function detectAffectedPackages(packages: Package[], changedFiles: string[]): string[] {
  // TODO: Pour chaque fichier modifié, déterminer quel package est affecté
  // Un fichier "packages/lib-core/src/index.ts" affecte le package dont le path est "packages/lib-core"
  // Retourner les noms uniques des packages affectés, triés
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 4 : Trouver les dépendants (packages qui dépendent d'un package donné)
// ---------------------------------------------------------------------------

function findDependents(packages: Package[], packageName: string): string[] {
  // TODO: Retourner les noms des packages qui ont packageName dans leurs dépendances
  // Triés alphabétiquement
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 5 : Tri topologique pour l'ordre de build
// ---------------------------------------------------------------------------

function topologicalSort(packages: Package[]): string[] {
  // TODO: Trier les packages par ordre de build (dépendances d'abord)
  // Utiliser l'algorithme de Kahn (BFS avec compteur d'in-degree)
  // Si un cycle est détecté, lancer "Circular dependency detected"
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 6 : Calculer le graphe complet d'impact
// ---------------------------------------------------------------------------

function computeImpactGraph(packages: Package[], changedPackages: string[]): string[] {
  // TODO: À partir des packages modifiés, trouver TOUS les packages impactés
  // (récursivement : si A dépend de B et B a changé, A est impacté)
  // Retourner tous les packages impactés (y compris changedPackages), triés
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 08 — Monorepo\n');

const packages: Package[] = [
  { name: '@app/core', path: 'packages/core', dependencies: [] },
  { name: '@app/utils', path: 'packages/utils', dependencies: ['@app/core'] },
  { name: '@app/ui', path: 'packages/ui', dependencies: ['@app/core', '@app/utils'] },
  { name: '@app/api', path: 'packages/api', dependencies: ['@app/core', '@app/utils'] },
  { name: '@app/web', path: 'apps/web', dependencies: ['@app/ui', '@app/api'] },
  { name: '@app/docs', path: 'apps/docs', dependencies: ['@app/ui'] },
];

await test('Ex1: parseWorkspaceConfig parse la config YAML simplifiée', () => {
  const yaml = 'packages:\n  - packages/*\n  - apps/*';
  const config = parseWorkspaceConfig(yaml);
  assertDeepEqual(config.packages, ['packages/*', 'apps/*']);
});

await test('Ex2: matchesPattern vérifie les patterns', () => {
  assertEqual(matchesPattern('packages/core/src/index.ts', 'packages/*'), true);
  assertEqual(matchesPattern('apps/web/pages/home.ts', 'apps/*'), true);
  assertEqual(matchesPattern('other/file.ts', 'packages/*'), false);
  assertEqual(matchesPattern('packages/core/src/index.ts', 'apps/*'), false);
});

await test('Ex3: detectAffectedPackages identifie les packages touchés', () => {
  const changed = ['packages/core/src/model.ts', 'packages/ui/components/Button.tsx'];
  const affected = detectAffectedPackages(packages, changed);
  assertDeepEqual(affected, ['@app/core', '@app/ui']);
});

await test('Ex4: findDependents trouve les dépendants directs', () => {
  const deps = findDependents(packages, '@app/core');
  assertDeepEqual(deps, ['@app/api', '@app/ui', '@app/utils']);
});

await test('Ex5: topologicalSort trie par ordre de build', () => {
  const order = topologicalSort(packages);
  // core doit être avant utils, utils avant ui et api, etc.
  const coreIdx = order.indexOf('@app/core');
  const utilsIdx = order.indexOf('@app/utils');
  const uiIdx = order.indexOf('@app/ui');
  const apiIdx = order.indexOf('@app/api');
  const webIdx = order.indexOf('@app/web');
  assert(coreIdx < utilsIdx, 'core before utils');
  assert(utilsIdx < uiIdx, 'utils before ui');
  assert(utilsIdx < apiIdx, 'utils before api');
  assert(uiIdx < webIdx, 'ui before web');
  assert(apiIdx < webIdx, 'api before web');
  assertEqual(order.length, 6);
});

await test('Ex5: topologicalSort détecte les cycles', () => {
  const cyclic: Package[] = [
    { name: 'a', path: 'a', dependencies: ['b'] },
    { name: 'b', path: 'b', dependencies: ['a'] },
  ];
  assertThrows(() => topologicalSort(cyclic));
});

await test('Ex6: computeImpactGraph calcule l\'impact complet', () => {
  const impacted = computeImpactGraph(packages, ['@app/core']);
  // core change → utils, ui, api, web, docs sont tous impactés
  assertDeepEqual(impacted, ['@app/api', '@app/core', '@app/docs', '@app/ui', '@app/utils', '@app/web']);
});

await test('Ex6: computeImpactGraph avec changement feuille', () => {
  const impacted = computeImpactGraph(packages, ['@app/web']);
  // web est une feuille, personne n'en dépend
  assertDeepEqual(impacted, ['@app/web']);
});

summary();
