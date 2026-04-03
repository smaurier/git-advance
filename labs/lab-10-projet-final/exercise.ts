import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 10 — Projet Final : Synthèse Git Avancé
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, assertIncludes, summary } = createTestRunner('Lab 10 — Projet Final');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitObject {
  hash: string;
  type: 'blob' | 'tree' | 'commit';
  content: string;
}

interface Branch {
  name: string;
  commits: string[]; // liste de hashes
}

interface Repository {
  objects: Map<string, GitObject>;
  branches: Branch[];
  currentBranch: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Exercice 1 : Créer un repository
// ---------------------------------------------------------------------------

function createRepository(): Repository {
  // TODO: Créer un repo vide avec une branche "main" et aucun objet
  return { objects: new Map(), branches: [], currentBranch: '' };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Stocker un objet et créer un commit
// ---------------------------------------------------------------------------

function storeObject(repo: Repository, type: 'blob' | 'tree' | 'commit', content: string): string {
  // TODO: Créer un objet Git, calculer son hash avec simpleHash(type + ":" + content)
  // Stocker dans repo.objects et retourner le hash
  return '';
}

function createCommit(repo: Repository, message: string, files: string[]): Repository {
  // TODO:
  // 1. Stocker chaque fichier comme blob
  // 2. Stocker un tree (content = hashes des blobs joints par ",")
  // 3. Stocker un commit (content = message)
  // 4. Ajouter le hash du commit à la branche courante
  // Retourner le repo mis à jour
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Créer et merger une branche
// ---------------------------------------------------------------------------

function createBranch(repo: Repository, name: string): Repository {
  // TODO: Créer une branche qui copie les commits de la branche courante
  return repo;
}

function checkout(repo: Repository, name: string): Repository {
  // TODO: Changer de branche
  return repo;
}

function merge(repo: Repository, sourceBranch: string): Repository {
  // TODO: Merger les commits de sourceBranch dans la branche courante
  // Ajouter uniquement les commits absents de la branche courante
  // Ajouter un commit de merge "merge:<sourceBranch>"
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 4 : Simuler un rebase
// ---------------------------------------------------------------------------

function rebase(repo: Repository, targetBranch: string): Repository {
  // TODO: Rebaser la branche courante sur targetBranch
  // Prendre les commits exclusifs de la branche courante (absents de targetBranch)
  // Créer de nouveaux hashes pour chacun : simpleHash("rebase:" + oldHash)
  // La branche courante résultante = commits de targetBranch + commits rebasés
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 5 : Bisect automatique
// ---------------------------------------------------------------------------

function bisectAuto(commits: string[], testFn: (hash: string) => boolean): string | null {
  // TODO: Trouver le premier commit "bad" par recherche binaire
  // testFn retourne true si le commit est "good", false si "bad"
  // Retourner le hash du premier bad commit, ou null
  return null;
}

// ---------------------------------------------------------------------------
// Exercice 6 : Valider un message de commit
// ---------------------------------------------------------------------------

function validateCommitMessage(message: string): { valid: boolean; errors: string[] } {
  // TODO: Valider selon Conventional Commits
  // Types autorisés : feat, fix, docs, style, refactor, test, chore
  // Format : <type>: <description> ou <type>(<scope>): <description>
  // Description non vide, commence par minuscule
  return { valid: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 7 : Vérifier le code avant commit (pre-commit hook)
// ---------------------------------------------------------------------------

function preCommitCheck(code: string): { passed: boolean; issues: string[] } {
  // TODO: Vérifier :
  // 1. Pas de console.log
  // 2. Pas de debugger
  // 3. Pas de TODO
  // Retourner les problèmes trouvés avec le numéro de ligne
  // Format : "<type> on line <n>"
  return { passed: false, issues: [] };
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 10 — Projet Final\n');

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
  assert(repo.objects.size >= 4); // 2 blobs + 1 tree + 1 commit
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
  // main should have: initial + feature commit + merge commit
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
  // The rebased commit should have a different hash
  assert(!featureAfter.commits.includes(originalHash), 'Rebased commits should have new hashes');
  // Feature should contain all main commits + rebased commit
  const mainBranch = repo.branches.find(b => b.name === 'main')!;
  assertEqual(featureAfter.commits.length, mainBranch.commits.length + 1);
});

await test('Ex5: bisectAuto trouve le premier bad commit', () => {
  const commits = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
  // Bug introduced at c4
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
