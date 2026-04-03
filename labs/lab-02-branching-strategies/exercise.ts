import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 02 — Branching Strategies : Modéliser les branches Git et Git Flow
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertThrows, summary } = createTestRunner('Lab 02 — Branching Strategies');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Branch {
  name: string;
  base: string; // nom de la branche d'origine
  commits: string[];
}

interface GitRepo {
  branches: Branch[];
  currentBranch: string;
}

// ---------------------------------------------------------------------------
// Exercice 1 : Créer un repository avec une branche main
// ---------------------------------------------------------------------------

function createRepo(): GitRepo {
  // TODO: Créer un repo avec une branche "main" (pas de base, commits vides)
  // currentBranch = "main"
  return { branches: [], currentBranch: '' };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Créer une branche à partir de la branche courante
// ---------------------------------------------------------------------------

function createBranch(repo: GitRepo, branchName: string): GitRepo {
  // TODO: Créer une nouvelle branche basée sur la branche courante
  // Si la branche existe déjà, lancer une erreur "Branch already exists: <name>"
  // Retourner le repo mis à jour (sans changer currentBranch)
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Lister les branches
// ---------------------------------------------------------------------------

function listBranches(repo: GitRepo): string[] {
  // TODO: Retourner la liste triée des noms de branches
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 4 : Changer de branche
// ---------------------------------------------------------------------------

function checkout(repo: GitRepo, branchName: string): GitRepo {
  // TODO: Changer currentBranch vers branchName
  // Si la branche n'existe pas, lancer une erreur "Branch not found: <name>"
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 5 : Ajouter un commit sur la branche courante
// ---------------------------------------------------------------------------

function addCommit(repo: GitRepo, message: string): GitRepo {
  // TODO: Ajouter un message de commit à la branche courante
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 6 : Fusionner une branche dans la branche courante
// ---------------------------------------------------------------------------

function mergeBranch(repo: GitRepo, sourceBranch: string): GitRepo {
  // TODO: Fusionner les commits de sourceBranch dans la branche courante
  // Ajouter un commit de merge "Merge <sourceBranch> into <currentBranch>"
  // Si sourceBranch n'existe pas, lancer une erreur "Branch not found: <name>"
  return repo;
}

// ---------------------------------------------------------------------------
// Exercice 7 : Valider les noms de branches (convention)
// ---------------------------------------------------------------------------

function isValidBranchName(name: string): boolean {
  // TODO: Valider le nom de branche selon les conventions :
  // - feature/<description>  (ex: feature/user-auth)
  // - release/<version>      (ex: release/1.2.0)
  // - hotfix/<description>   (ex: hotfix/login-crash)
  // - main, develop
  // La description/version doit être composée de [a-z0-9.-]+
  // Retourner true si valide, false sinon
  return false;
}

// ---------------------------------------------------------------------------
// Exercice 8 : Valider le workflow Git Flow
// ---------------------------------------------------------------------------

function validateGitFlowBranch(branchName: string, baseBranch: string): boolean {
  // TODO: Valider que la branche est créée depuis la bonne base selon Git Flow :
  // - feature/* doit être basée sur "develop"
  // - release/* doit être basée sur "develop"
  // - hotfix/* doit être basée sur "main"
  // Retourner true si le workflow est respecté, false sinon
  return false;
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 02 — Branching Strategies\n');

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
  assertEqual(main.commits.length, 3); // 2 commits + 1 merge commit
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
