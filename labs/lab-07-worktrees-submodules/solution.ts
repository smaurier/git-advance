import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 07 — Worktrees & Submodules : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 07 — Worktrees & Submodules');

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
  commit: string;
}

interface SubmoduleConfig {
  submodules: Submodule[];
}

// ---------------------------------------------------------------------------
// Solution 1 : Créer un manager
// ---------------------------------------------------------------------------

function createWorktreeManager(mainPath: string, mainBranch: string): WorktreeManager {
  return {
    worktrees: [{ path: mainPath, branch: mainBranch, isMain: true }],
  };
}

// ---------------------------------------------------------------------------
// Solution 2 : Ajouter un worktree
// ---------------------------------------------------------------------------

function addWorktree(manager: WorktreeManager, path: string, branch: string): WorktreeManager {
  if (manager.worktrees.some(w => w.branch === branch)) {
    throw new Error(`Branch already checked out: ${branch}`);
  }
  if (manager.worktrees.some(w => w.path === path)) {
    throw new Error(`Path already in use: ${path}`);
  }
  return {
    worktrees: [...manager.worktrees, { path, branch, isMain: false }],
  };
}

// ---------------------------------------------------------------------------
// Solution 3 : Supprimer un worktree
// ---------------------------------------------------------------------------

function removeWorktree(manager: WorktreeManager, path: string): WorktreeManager {
  const wt = manager.worktrees.find(w => w.path === path);
  if (!wt) throw new Error(`Worktree not found: ${path}`);
  if (wt.isMain) throw new Error('Cannot remove main worktree');
  return {
    worktrees: manager.worktrees.filter(w => w.path !== path),
  };
}

// ---------------------------------------------------------------------------
// Solution 4 : Lister les worktrees
// ---------------------------------------------------------------------------

function listWorktrees(manager: WorktreeManager): { path: string; branch: string }[] {
  return manager.worktrees
    .map(w => ({ path: w.path, branch: w.branch }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------------------------
// Solution 5 : Vérifier disponibilité de branche
// ---------------------------------------------------------------------------

function isBranchAvailable(manager: WorktreeManager, branch: string): boolean {
  return !manager.worktrees.some(w => w.branch === branch);
}

// ---------------------------------------------------------------------------
// Solution 6 : Ajouter un submodule
// ---------------------------------------------------------------------------

function addSubmodule(config: SubmoduleConfig, name: string, url: string, path: string, commit: string): SubmoduleConfig {
  if (config.submodules.some(s => s.name === name)) {
    throw new Error(`Submodule already exists: ${name}`);
  }
  if (config.submodules.some(s => s.path === path)) {
    throw new Error(`Path already in use: ${path}`);
  }
  return {
    submodules: [...config.submodules, { name, url, path, commit }],
  };
}

// ---------------------------------------------------------------------------
// Solution 7 : Mettre à jour un submodule
// ---------------------------------------------------------------------------

function updateSubmodule(config: SubmoduleConfig, name: string, newCommit: string): SubmoduleConfig {
  if (!config.submodules.some(s => s.name === name)) {
    throw new Error(`Submodule not found: ${name}`);
  }
  return {
    submodules: config.submodules.map(s =>
      s.name === name ? { ...s, commit: newCommit } : s
    ),
  };
}

// ---------------------------------------------------------------------------
// Solution 8 : Submodules obsolètes
// ---------------------------------------------------------------------------

function findOutdatedSubmodules(config: SubmoduleConfig, latestCommits: Record<string, string>): Submodule[] {
  return config.submodules.filter(s => {
    const latest = latestCommits[s.name];
    return latest !== undefined && s.commit !== latest;
  });
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 07 — Worktrees & Submodules (Solution)\n');

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
