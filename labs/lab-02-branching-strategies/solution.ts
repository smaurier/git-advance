import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 02 — Branching Strategies : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 02 — Branching Strategies');

interface Branch {
  name: string;
  base: string;
  commits: string[];
}

interface GitRepo {
  branches: Branch[];
  currentBranch: string;
}

// ---------------------------------------------------------------------------
// Solution 1 : Créer un repo
// ---------------------------------------------------------------------------

function createRepo(): GitRepo {
  return {
    branches: [{ name: 'main', base: '', commits: [] }],
    currentBranch: 'main',
  };
}

// ---------------------------------------------------------------------------
// Solution 2 : Créer une branche
// ---------------------------------------------------------------------------

function createBranch(repo: GitRepo, branchName: string): GitRepo {
  if (repo.branches.some(b => b.name === branchName)) {
    throw new Error(`Branch already exists: ${branchName}`);
  }
  return {
    ...repo,
    branches: [...repo.branches, { name: branchName, base: repo.currentBranch, commits: [] }],
  };
}

// ---------------------------------------------------------------------------
// Solution 3 : Lister les branches
// ---------------------------------------------------------------------------

function listBranches(repo: GitRepo): string[] {
  return repo.branches.map(b => b.name).sort();
}

// ---------------------------------------------------------------------------
// Solution 4 : Checkout
// ---------------------------------------------------------------------------

function checkout(repo: GitRepo, branchName: string): GitRepo {
  if (!repo.branches.some(b => b.name === branchName)) {
    throw new Error(`Branch not found: ${branchName}`);
  }
  return { ...repo, currentBranch: branchName };
}

// ---------------------------------------------------------------------------
// Solution 5 : Ajouter un commit
// ---------------------------------------------------------------------------

function addCommit(repo: GitRepo, message: string): GitRepo {
  return {
    ...repo,
    branches: repo.branches.map(b =>
      b.name === repo.currentBranch ? { ...b, commits: [...b.commits, message] } : b
    ),
  };
}

// ---------------------------------------------------------------------------
// Solution 6 : Fusionner une branche
// ---------------------------------------------------------------------------

function mergeBranch(repo: GitRepo, sourceBranch: string): GitRepo {
  const source = repo.branches.find(b => b.name === sourceBranch);
  if (!source) throw new Error(`Branch not found: ${sourceBranch}`);
  const mergeCommit = `Merge ${sourceBranch} into ${repo.currentBranch}`;
  return {
    ...repo,
    branches: repo.branches.map(b =>
      b.name === repo.currentBranch
        ? { ...b, commits: [...b.commits, ...source.commits, mergeCommit] }
        : b
    ),
  };
}

// ---------------------------------------------------------------------------
// Solution 7 : Valider les noms de branches
// ---------------------------------------------------------------------------

function isValidBranchName(name: string): boolean {
  if (name === 'main' || name === 'develop') return true;
  const pattern = /^(feature|release|hotfix)\/[a-z0-9][a-z0-9.\-]+$/;
  return pattern.test(name);
}

// ---------------------------------------------------------------------------
// Solution 8 : Valider le workflow Git Flow
// ---------------------------------------------------------------------------

function validateGitFlowBranch(branchName: string, baseBranch: string): boolean {
  if (branchName.startsWith('feature/')) return baseBranch === 'develop';
  if (branchName.startsWith('release/')) return baseBranch === 'develop';
  if (branchName.startsWith('hotfix/')) return baseBranch === 'main';
  return false;
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 02 — Branching Strategies (Solution)\n');

await test('Ex1: createRepo crée un repo avec la branche main', () => {
  const repo = createRepo();
  assertEqual(repo.currentBranch, 'main');
  assertEqual(repo.branches.length, 1);
  assertEqual(repo.branches[0].name, 'main');
});

await test('Ex2: createBranch crée une branche et détecte les doublons', () => {
  let repo = createRepo();
  repo = createBranch(repo, 'develop');
  assertEqual(repo.branches.length, 2);
  assertThrows(() => createBranch(repo, 'develop'));
});

await test('Ex3-4: listBranches et checkout fonctionnent', () => {
  let repo = createRepo();
  repo = createBranch(repo, 'develop');
  repo = createBranch(repo, 'feature/auth');
  assertDeepEqual(listBranches(repo), ['develop', 'feature/auth', 'main']);
  repo = checkout(repo, 'develop');
  assertEqual(repo.currentBranch, 'develop');
  assertThrows(() => checkout(repo, 'nonexistent'));
});

await test('Ex5: addCommit ajoute un commit sur la branche courante', () => {
  let repo = createRepo();
  repo = addCommit(repo, 'initial commit');
  const main = repo.branches.find(b => b.name === 'main')!;
  assertEqual(main.commits.length, 1);
  assertEqual(main.commits[0], 'initial commit');
});

await test('Ex6: mergeBranch fusionne les commits', () => {
  let repo = createRepo();
  repo = createBranch(repo, 'feature/login');
  repo = checkout(repo, 'feature/login');
  repo = addCommit(repo, 'feat: add login form');
  repo = addCommit(repo, 'feat: add validation');
  repo = checkout(repo, 'main');
  repo = mergeBranch(repo, 'feature/login');
  const main = repo.branches.find(b => b.name === 'main')!;
  assertEqual(main.commits.length, 3);
  assert(main.commits[2].includes('Merge feature/login into main'));
});

await test('Ex7: isValidBranchName valide les conventions', () => {
  assertEqual(isValidBranchName('main'), true);
  assertEqual(isValidBranchName('develop'), true);
  assertEqual(isValidBranchName('feature/user-auth'), true);
  assertEqual(isValidBranchName('release/1.2.0'), true);
  assertEqual(isValidBranchName('hotfix/login-crash'), true);
  assertEqual(isValidBranchName('random-branch'), false);
  assertEqual(isValidBranchName('feature/'), false);
  assertEqual(isValidBranchName('feature/UPPER'), false);
});

await test('Ex8: validateGitFlowBranch vérifie le workflow', () => {
  assertEqual(validateGitFlowBranch('feature/auth', 'develop'), true);
  assertEqual(validateGitFlowBranch('feature/auth', 'main'), false);
  assertEqual(validateGitFlowBranch('release/1.0.0', 'develop'), true);
  assertEqual(validateGitFlowBranch('release/1.0.0', 'main'), false);
  assertEqual(validateGitFlowBranch('hotfix/crash', 'main'), true);
  assertEqual(validateGitFlowBranch('hotfix/crash', 'develop'), false);
});

summary();
