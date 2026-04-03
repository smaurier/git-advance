import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 08 — Monorepo : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 08 — Monorepo');

interface Package {
  name: string;
  path: string;
  dependencies: string[];
}

interface WorkspaceConfig {
  packages: string[];
}

// ---------------------------------------------------------------------------
// Solution 1 : Parser config workspace
// ---------------------------------------------------------------------------

function parseWorkspaceConfig(yaml: string): WorkspaceConfig {
  const lines = yaml.split('\n');
  const packages: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      packages.push(match[1].trim());
    }
  }
  return { packages };
}

// ---------------------------------------------------------------------------
// Solution 2 : Pattern matching
// ---------------------------------------------------------------------------

function matchesPattern(filePath: string, pattern: string): boolean {
  // "packages/*" → le fichier doit commencer par "packages/"
  const prefix = pattern.replace('/*', '/');
  return filePath.startsWith(prefix);
}

// ---------------------------------------------------------------------------
// Solution 3 : Packages affectés
// ---------------------------------------------------------------------------

function detectAffectedPackages(packages: Package[], changedFiles: string[]): string[] {
  const affected = new Set<string>();
  for (const file of changedFiles) {
    for (const pkg of packages) {
      if (file.startsWith(pkg.path + '/')) {
        affected.add(pkg.name);
      }
    }
  }
  return [...affected].sort();
}

// ---------------------------------------------------------------------------
// Solution 4 : Dépendants
// ---------------------------------------------------------------------------

function findDependents(packages: Package[], packageName: string): string[] {
  return packages
    .filter(p => p.dependencies.includes(packageName))
    .map(p => p.name)
    .sort();
}

// ---------------------------------------------------------------------------
// Solution 5 : Tri topologique (Kahn's algorithm)
// ---------------------------------------------------------------------------

function topologicalSort(packages: Package[]): string[] {
  const nameSet = new Set(packages.map(p => p.name));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const pkg of packages) {
    inDegree.set(pkg.name, 0);
    adjList.set(pkg.name, []);
  }

  for (const pkg of packages) {
    for (const dep of pkg.dependencies) {
      if (nameSet.has(dep)) {
        adjList.get(dep)!.push(pkg.name);
        inDegree.set(pkg.name, (inDegree.get(pkg.name) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    queue.sort();
    const current = queue.shift()!;
    result.push(current);
    for (const neighbor of adjList.get(current)!) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (result.length !== packages.length) {
    throw new Error('Circular dependency detected');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Solution 6 : Graphe d'impact complet
// ---------------------------------------------------------------------------

function computeImpactGraph(packages: Package[], changedPackages: string[]): string[] {
  const impacted = new Set<string>(changedPackages);
  const queue = [...changedPackages];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = findDependents(packages, current);
    for (const dep of dependents) {
      if (!impacted.has(dep)) {
        impacted.add(dep);
        queue.push(dep);
      }
    }
  }

  return [...impacted].sort();
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 08 — Monorepo (Solution)\n');

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
  assertDeepEqual(impacted, ['@app/api', '@app/core', '@app/docs', '@app/ui', '@app/utils', '@app/web']);
});

await test('Ex6: computeImpactGraph avec changement feuille', () => {
  const impacted = computeImpactGraph(packages, ['@app/web']);
  assertDeepEqual(impacted, ['@app/web']);
});

summary();
