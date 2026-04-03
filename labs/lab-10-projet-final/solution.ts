import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 10 — Projet Final : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, assertIncludes, summary } = createTestRunner('Lab 10 — Projet Final');

interface GitObject {
  hash: string;
  type: 'blob' | 'tree' | 'commit';
  content: string;
}

interface Branch {
  name: string;
  commits: string[];
}

interface Repository {
  objects: Map<string, GitObject>;
  branches: Branch[];
  currentBranch: string;
}

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Solution 1 : Créer un repository
// ---------------------------------------------------------------------------

function createRepository(): Repository {
  return {
    objects: new Map(),
    branches: [{ name: 'main', commits: [] }],
    currentBranch: 'main',
  };
}

// ---------------------------------------------------------------------------
// Solution 2 : Stocker un objet et créer un commit
// ---------------------------------------------------------------------------

function storeObject(repo: Repository, type: 'blob' | 'tree' | 'commit', content: string): string {
  const hash = simpleHash(type + ':' + content);
  repo.objects.set(hash, { hash, type, content });
  return hash;
}

function createCommit(repo: Repository, message: string, files: string[]): Repository {
  const blobHashes: string[] = [];
  for (const file of files) {
    blobHashes.push(storeObject(repo, 'blob', file));
  }
  const treeHash = storeObject(repo, 'tree', blobHashes.join(','));
  const commitHash = storeObject(repo, 'commit', message);

  const newBranches = repo.branches.map(b =>
    b.name === repo.currentBranch
      ? { ...b, commits: [...b.commits, commitHash] }
      : b
  );

  return { ...repo, branches: newBranches };
}

// ---------------------------------------------------------------------------
// Solution 3 : Branching et merge
// ---------------------------------------------------------------------------

function createBranch(repo: Repository, name: string): Repository {
  const current = repo.branches.find(b => b.name === repo.currentBranch)!;
  return {
    ...repo,
    branches: [...repo.branches, { name, commits: [...current.commits] }],
  };
}

function checkout(repo: Repository, name: string): Repository {
  return { ...repo, currentBranch: name };
}

function merge(repo: Repository, sourceBranch: string): Repository {
  const source = repo.branches.find(b => b.name === sourceBranch)!;
  const current = repo.branches.find(b => b.name === repo.currentBranch)!;

  const currentSet = new Set(current.commits);
  const newCommits = source.commits.filter(c => !currentSet.has(c));
  const mergeHash = storeObject(repo, 'commit', `merge:${sourceBranch}`);

  const newBranches = repo.branches.map(b =>
    b.name === repo.currentBranch
      ? { ...b, commits: [...b.commits, ...newCommits, mergeHash] }
      : b
  );

  return { ...repo, branches: newBranches };
}

// ---------------------------------------------------------------------------
// Solution 4 : Rebase
// ---------------------------------------------------------------------------

function rebase(repo: Repository, targetBranch: string): Repository {
  const target = repo.branches.find(b => b.name === targetBranch)!;
  const current = repo.branches.find(b => b.name === repo.currentBranch)!;

  const targetSet = new Set(target.commits);
  const exclusiveCommits = current.commits.filter(c => !targetSet.has(c));

  const rebasedCommits = exclusiveCommits.map(hash => {
    const newHash = simpleHash('rebase:' + hash);
    const original = repo.objects.get(hash);
    if (original) {
      repo.objects.set(newHash, { ...original, hash: newHash });
    }
    return newHash;
  });

  const newBranches = repo.branches.map(b =>
    b.name === repo.currentBranch
      ? { ...b, commits: [...target.commits, ...rebasedCommits] }
      : b
  );

  return { ...repo, branches: newBranches };
}

// ---------------------------------------------------------------------------
// Solution 5 : Bisect automatique
// ---------------------------------------------------------------------------

function bisectAuto(commits: string[], testFn: (hash: string) => boolean): string | null {
  if (commits.length === 0) return null;
  if (testFn(commits[commits.length - 1])) return null;

  let low = 0;
  let high = commits.length - 1;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (testFn(commits[mid])) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return commits[high];
}

// ---------------------------------------------------------------------------
// Solution 6 : Valider un message de commit
// ---------------------------------------------------------------------------

function validateCommitMessage(message: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
  const pattern = /^(\w+)(?:\(([a-z0-9-]+)\))?:\s(.+)$/;
  const match = message.match(pattern);

  if (!match) {
    return { valid: false, errors: ['Invalid commit message format'] };
  }

  const [, type, , description] = match;
  if (!validTypes.includes(type)) {
    errors.push(`Invalid type: ${type}`);
  }
  if (!description || description.length === 0) {
    errors.push('Description must not be empty');
  } else if (description[0] !== description[0].toLowerCase()) {
    errors.push('Description must start with lowercase');
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Solution 7 : Pre-commit hook
// ---------------------------------------------------------------------------

function preCommitCheck(code: string): { passed: boolean; issues: string[] } {
  const lines = code.split('\n');
  const issues: string[] = [];

  lines.forEach((line, i) => {
    if (line.includes('console.log')) {
      issues.push(`console.log on line ${i + 1}`);
    }
    if (/\bdebugger\b/.test(line)) {
      issues.push(`debugger on line ${i + 1}`);
    }
    if (line.includes('TODO')) {
      issues.push(`TODO on line ${i + 1}`);
    }
  });

  return { passed: issues.length === 0, issues };
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 10 — Projet Final (Solution)\n');

await test('Ex1: createRepository initialise un repo vide', () => {
  const repo = createRepository();
  assertEqual(repo.currentBranch, 'main');
  assertEqual(repo.branches.length, 1);
  assertEqual(repo.branches[0].name, 'main');
  assertEqual(repo.objects.size, 0);
});

await test('Ex2: storeObject stocke un objet et retourne son hash', () => {
  const repo = createRepository();
  const hash = storeObject(repo, 'blob', 'hello world');
  assert(hash.length === 8);
  assert(repo.objects.has(hash));
  assertEqual(repo.objects.get(hash)!.type, 'blob');
});

await test('Ex2: createCommit crée un commit avec blobs et tree', () => {
  let repo = createRepository();
  repo = createCommit(repo, 'initial commit', ['file1.ts', 'file2.ts']);
  assert(repo.objects.size >= 4);
  const main = repo.branches.find(b => b.name === 'main')!;
  assertEqual(main.commits.length, 1);
});

await test('Ex3: createBranch et merge fonctionnent', () => {
  let repo = createRepository();
  repo = createCommit(repo, 'initial', ['init.ts']);
  repo = createBranch(repo, 'feature');
  repo = checkout(repo, 'feature');
  repo = createCommit(repo, 'feat: add feature', ['feature.ts']);
  repo = checkout(repo, 'main');
  repo = merge(repo, 'feature');
  const main = repo.branches.find(b => b.name === 'main')!;
  assertEqual(main.commits.length, 3);
});

await test('Ex4: rebase crée de nouveaux hashes', () => {
  let repo = createRepository();
  repo = createCommit(repo, 'base', ['base.ts']);
  repo = createBranch(repo, 'feature');
  repo = checkout(repo, 'feature');
  repo = createCommit(repo, 'feat: X', ['x.ts']);
  const featureBefore = repo.branches.find(b => b.name === 'feature')!;
  const originalHash = featureBefore.commits[featureBefore.commits.length - 1];
  repo = checkout(repo, 'main');
  repo = createCommit(repo, 'main work', ['main.ts']);
  repo = checkout(repo, 'feature');
  repo = rebase(repo, 'main');
  const featureAfter = repo.branches.find(b => b.name === 'feature')!;
  assert(!featureAfter.commits.includes(originalHash), 'Rebased commits should have new hashes');
  const mainBranch = repo.branches.find(b => b.name === 'main')!;
  assertEqual(featureAfter.commits.length, mainBranch.commits.length + 1);
});

await test('Ex5: bisectAuto trouve le premier bad commit', () => {
  const commits = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
  const result = bisectAuto(commits, (hash) => {
    const idx = commits.indexOf(hash);
    return idx < 4;
  });
  assertEqual(result, 'c4');
});

await test('Ex5: bisectAuto retourne null si tous sont good', () => {
  const commits = ['c0', 'c1', 'c2'];
  const result = bisectAuto(commits, () => true);
  assertEqual(result, null);
});

await test('Ex6: validateCommitMessage accepte et rejette correctement', () => {
  const ok = validateCommitMessage('feat: add login');
  assertEqual(ok.valid, true);
  const ok2 = validateCommitMessage('fix(auth): resolve bug');
  assertEqual(ok2.valid, true);
  const bad1 = validateCommitMessage('invalid message');
  assertEqual(bad1.valid, false);
  const bad2 = validateCommitMessage('feat: Uppercase');
  assertEqual(bad2.valid, false);
});

await test('Ex7: preCommitCheck détecte les problèmes dans le code', () => {
  const clean = 'const x = 1;\nreturn x;';
  const resultClean = preCommitCheck(clean);
  assertEqual(resultClean.passed, true);
  assertEqual(resultClean.issues.length, 0);
});

await test('Ex7: preCommitCheck signale console.log, debugger, TODO', () => {
  const dirty = 'console.log("test");\ndebugger;\n// TODO: fix this';
  const result = preCommitCheck(dirty);
  assertEqual(result.passed, false);
  assertEqual(result.issues.length, 3);
  assertIncludes(result.issues[0], 'line 1');
  assertIncludes(result.issues[1], 'line 2');
  assertIncludes(result.issues[2], 'line 3');
});

summary();
