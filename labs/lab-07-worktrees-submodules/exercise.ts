import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 07 — Worktrees & Submodules
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 07 — Worktrees & Submodules');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Worktree {
  path: string;
  branch: string;
  isMain: boolean;
}

interface WorktreeManager {
  worktrees: Worktree[];
}

interface Submodule {
  name: string;
  url: string;
  path: string;
  commit: string; // hash du commit épinglé
}

interface SubmoduleConfig {
  submodules: Submodule[];
}

// ---------------------------------------------------------------------------
// Exercice 1 : Créer un gestionnaire de worktrees
// ---------------------------------------------------------------------------

function createWorktreeManager(mainPath: string, mainBranch: string): WorktreeManager {
  // TODO: Créer un manager avec un worktree principal (isMain = true)
  return { worktrees: [] };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Ajouter un worktree
// ---------------------------------------------------------------------------

function addWorktree(manager: WorktreeManager, path: string, branch: string): WorktreeManager {
  // TODO: Ajouter un worktree pour la branche donnée
  // Si la branche est déjà utilisée par un autre worktree, lancer une erreur
  // "Branch already checked out: <branch>"
  // Si le path est déjà utilisé, lancer "Path already in use: <path>"
  return manager;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Supprimer un worktree
// ---------------------------------------------------------------------------

function removeWorktree(manager: WorktreeManager, path: string): WorktreeManager {
  // TODO: Supprimer le worktree au path donné
  // On ne peut pas supprimer le worktree principal (isMain = true)
  // Lancer "Cannot remove main worktree" si on essaie
  // Lancer "Worktree not found: <path>" si le path n'existe pas
  return manager;
}

// ---------------------------------------------------------------------------
// Exercice 4 : Lister les worktrees
// ---------------------------------------------------------------------------

function listWorktrees(manager: WorktreeManager): { path: string; branch: string }[] {
  // TODO: Retourner la liste des worktrees triée par path
  // Format : { path, branch }
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 5 : Vérifier les conflits de branche
// ---------------------------------------------------------------------------

function isBranchAvailable(manager: WorktreeManager, branch: string): boolean {
  // TODO: Retourner true si la branche n'est utilisée par aucun worktree
  return false;
}

// ---------------------------------------------------------------------------
// Exercice 6 : Ajouter un submodule
// ---------------------------------------------------------------------------

function addSubmodule(config: SubmoduleConfig, name: string, url: string, path: string, commit: string): SubmoduleConfig {
  // TODO: Ajouter un submodule à la config
  // Si un submodule avec le même name existe déjà, lancer "Submodule already exists: <name>"
  // Si le path est déjà utilisé, lancer "Path already in use: <path>"
  return config;
}

// ---------------------------------------------------------------------------
// Exercice 7 : Mettre à jour le commit d'un submodule
// ---------------------------------------------------------------------------

function updateSubmodule(config: SubmoduleConfig, name: string, newCommit: string): SubmoduleConfig {
  // TODO: Mettre à jour le commit épinglé du submodule
  // Lancer "Submodule not found: <name>" si le submodule n'existe pas
  return config;
}

// ---------------------------------------------------------------------------
// Exercice 8 : Lister les submodules obsolètes
// ---------------------------------------------------------------------------

function findOutdatedSubmodules(config: SubmoduleConfig, latestCommits: Record<string, string>): Submodule[] {
  // TODO: Comparer le commit épinglé de chaque submodule avec latestCommits[name]
  // Retourner les submodules dont le commit ne correspond pas au dernier
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 07 — Worktrees & Submodules\n');

await test('Ex1: createWorktreeManager crée le manager avec le worktree principal', () => {
  const m = createWorktreeManager('/repo', 'main');
  assertEqual(m.worktrees.length, 1);
  assertEqual(m.worktrees[0].path, '/repo');
  assertEqual(m.worktrees[0].branch, 'main');
  assertEqual(m.worktrees[0].isMain, true);
});

await test('Ex2: addWorktree ajoute un worktree et détecte les conflits', () => {
  let m = createWorktreeManager('/repo', 'main');
  m = addWorktree(m, '/repo-feature', 'feature/auth');
  assertEqual(m.worktrees.length, 2);
  assertThrows(() => addWorktree(m, '/repo-other', 'feature/auth'));
  assertThrows(() => addWorktree(m, '/repo-feature', 'other-branch'));
});

await test('Ex3: removeWorktree supprime un worktree non-principal', () => {
  let m = createWorktreeManager('/repo', 'main');
  m = addWorktree(m, '/repo-feature', 'feature/auth');
  m = removeWorktree(m, '/repo-feature');
  assertEqual(m.worktrees.length, 1);
  assertThrows(() => removeWorktree(m, '/repo'));
  assertThrows(() => removeWorktree(m, '/nonexistent'));
});

await test('Ex4: listWorktrees retourne la liste triée', () => {
  let m = createWorktreeManager('/repo', 'main');
  m = addWorktree(m, '/repo-feature', 'feature/auth');
  m = addWorktree(m, '/repo-bugfix', 'fix/bug');
  const list = listWorktrees(m);
  assertEqual(list.length, 3);
  assertEqual(list[0].path, '/repo');
  assertEqual(list[1].path, '/repo-bugfix');
  assertEqual(list[2].path, '/repo-feature');
});

await test('Ex5: isBranchAvailable vérifie la disponibilité', () => {
  let m = createWorktreeManager('/repo', 'main');
  m = addWorktree(m, '/repo-feature', 'feature/auth');
  assertEqual(isBranchAvailable(m, 'develop'), true);
  assertEqual(isBranchAvailable(m, 'main'), false);
  assertEqual(isBranchAvailable(m, 'feature/auth'), false);
});

await test('Ex6: addSubmodule ajoute un submodule', () => {
  let config: SubmoduleConfig = { submodules: [] };
  config = addSubmodule(config, 'lib-core', 'https://github.com/org/lib-core.git', 'vendor/lib-core', 'abc123');
  assertEqual(config.submodules.length, 1);
  assertEqual(config.submodules[0].name, 'lib-core');
  assertThrows(() => addSubmodule(config, 'lib-core', 'url', 'other/path', 'def456'));
  assertThrows(() => addSubmodule(config, 'lib-other', 'url', 'vendor/lib-core', 'def456'));
});

await test('Ex7: updateSubmodule met à jour le commit', () => {
  let config: SubmoduleConfig = { submodules: [] };
  config = addSubmodule(config, 'lib-core', 'https://github.com/org/lib-core.git', 'vendor/lib-core', 'abc123');
  config = updateSubmodule(config, 'lib-core', 'def456');
  assertEqual(config.submodules[0].commit, 'def456');
  assertThrows(() => updateSubmodule(config, 'nonexistent', 'xyz'));
});

await test('Ex8: findOutdatedSubmodules détecte les submodules obsolètes', () => {
  const config: SubmoduleConfig = {
    submodules: [
      { name: 'lib-a', url: 'url-a', path: 'vendor/a', commit: 'aaa111' },
      { name: 'lib-b', url: 'url-b', path: 'vendor/b', commit: 'bbb222' },
      { name: 'lib-c', url: 'url-c', path: 'vendor/c', commit: 'ccc333' },
    ],
  };
  const latest = { 'lib-a': 'aaa999', 'lib-b': 'bbb222', 'lib-c': 'ccc999' };
  const outdated = findOutdatedSubmodules(config, latest);
  assertEqual(outdated.length, 2);
  assertEqual(outdated[0].name, 'lib-a');
  assertEqual(outdated[1].name, 'lib-c');
});

summary();
