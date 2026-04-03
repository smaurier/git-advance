import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 06 — Git Hooks : Simuler les hooks Git
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 06 — Git Hooks');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HookResult {
  passed: boolean;
  errors: string[];
}

type HookFn = (input: string) => HookResult;

// ---------------------------------------------------------------------------
// Exercice 1 : Valider un message de commit (Conventional Commits)
// ---------------------------------------------------------------------------

function validateCommitMessage(message: string): HookResult {
  // TODO: Valider un message de commit selon le format Conventional Commits :
  // Format : <type>(<scope>): <description>  ou  <type>: <description>
  // Types autorisés : feat, fix, docs, style, refactor, test, chore, perf, ci, build
  // Le scope est optionnel, entre parenthèses
  // La description doit commencer par une minuscule
  // La description ne doit pas être vide
  // Retourner { passed: true, errors: [] } si valide
  // Retourner { passed: false, errors: [...] } avec les messages d'erreur sinon
  return { passed: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Vérifier qu'il n'y a pas de console.log dans le code
// ---------------------------------------------------------------------------

function checkNoConsoleLog(code: string): HookResult {
  // TODO: Vérifier que le code ne contient pas de "console.log"
  // Retourner les numéros de ligne où console.log apparaît
  // Erreur format : "console.log found on line <n>"
  return { passed: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 3 : Vérifier qu'il n'y a pas de marqueurs TODO
// ---------------------------------------------------------------------------

function checkNoTodoMarkers(code: string): HookResult {
  // TODO: Vérifier que le code ne contient pas de "TODO" ou "FIXME"
  // Retourner les numéros de ligne où ils apparaissent
  // Erreur format : "TODO/FIXME found on line <n>"
  return { passed: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 4 : Vérifier la longueur maximale des lignes
// ---------------------------------------------------------------------------

function checkMaxLineLength(code: string, maxLength: number): HookResult {
  // TODO: Vérifier que chaque ligne ne dépasse pas maxLength caractères
  // Erreur format : "Line <n> exceeds <maxLength> chars (<actual> chars)"
  return { passed: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 5 : Exécuter une chaîne de hooks
// ---------------------------------------------------------------------------

function runHookChain(input: string, hooks: HookFn[]): HookResult {
  // TODO: Exécuter chaque hook dans l'ordre sur le même input
  // Collecter toutes les erreurs de tous les hooks
  // passed = true seulement si TOUS les hooks passent
  return { passed: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Exercice 6 : Créer un hook pre-commit complet
// ---------------------------------------------------------------------------

function createPreCommitHook(options: { maxLineLength: number }): HookFn {
  // TODO: Retourner une fonction hook qui exécute :
  // 1. checkNoConsoleLog
  // 2. checkNoTodoMarkers
  // 3. checkMaxLineLength avec options.maxLineLength
  // Utiliser runHookChain pour combiner les résultats
  return (_input: string) => ({ passed: false, errors: [] });
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 06 — Git Hooks\n');

await test('Ex1: validateCommitMessage accepte un message valide', () => {
  const r1 = validateCommitMessage('feat: add login page');
  assertEqual(r1.passed, true);
  assertEqual(r1.errors.length, 0);
  const r2 = validateCommitMessage('fix(auth): resolve token expiry');
  assertEqual(r2.passed, true);
});

await test('Ex1: validateCommitMessage rejette les messages invalides', () => {
  const r1 = validateCommitMessage('added stuff');
  assertEqual(r1.passed, false);
  const r2 = validateCommitMessage('feat:');
  assertEqual(r2.passed, false);
  const r3 = validateCommitMessage('invalid: Uppercase description');
  assertEqual(r3.passed, false);
});

await test('Ex2: checkNoConsoleLog détecte les console.log', () => {
  const code = 'const x = 1;\nconsole.log(x);\nreturn x;';
  const result = checkNoConsoleLog(code);
  assertEqual(result.passed, false);
  assertEqual(result.errors.length, 1);
  assert(result.errors[0].includes('line 2'));
});

await test('Ex2: checkNoConsoleLog passe sur du code propre', () => {
  const code = 'const x = 1;\nreturn x;';
  const result = checkNoConsoleLog(code);
  assertEqual(result.passed, true);
});

await test('Ex3: checkNoTodoMarkers détecte TODO et FIXME', () => {
  const code = 'const x = 1; // TODO: refactor\n// FIXME: bug here\nreturn x;';
  const result = checkNoTodoMarkers(code);
  assertEqual(result.passed, false);
  assertEqual(result.errors.length, 2);
});

await test('Ex4: checkMaxLineLength détecte les lignes trop longues', () => {
  const code = 'short\n' + 'a'.repeat(100) + '\nok';
  const result = checkMaxLineLength(code, 80);
  assertEqual(result.passed, false);
  assertEqual(result.errors.length, 1);
  assert(result.errors[0].includes('Line 2'));
});

await test('Ex5: runHookChain combine les résultats de plusieurs hooks', () => {
  const alwaysPass: HookFn = () => ({ passed: true, errors: [] });
  const alwaysFail: HookFn = () => ({ passed: false, errors: ['hook failed'] });
  const r1 = runHookChain('test', [alwaysPass, alwaysPass]);
  assertEqual(r1.passed, true);
  const r2 = runHookChain('test', [alwaysPass, alwaysFail]);
  assertEqual(r2.passed, false);
  assertEqual(r2.errors.length, 1);
});

await test('Ex6: createPreCommitHook combine toutes les vérifications', () => {
  const hook = createPreCommitHook({ maxLineLength: 80 });
  const cleanCode = 'const x = 1;\nreturn x;';
  assertEqual(hook(cleanCode).passed, true);
  const dirtyCode = 'console.log("debug");\n// TODO: fix\n' + 'a'.repeat(100);
  const result = hook(dirtyCode);
  assertEqual(result.passed, false);
  assert(result.errors.length >= 3);
});

summary();
