import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 06 — Git Hooks : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 06 — Git Hooks');

interface HookResult {
  passed: boolean;
  errors: string[];
}

type HookFn = (input: string) => HookResult;

// ---------------------------------------------------------------------------
// Solution 1 : Valider message Conventional Commits
// ---------------------------------------------------------------------------

function validateCommitMessage(message: string): HookResult {
  const errors: string[] = [];
  const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build'];
  const pattern = /^(\w+)(?:\(([a-z0-9-]+)\))?:\s(.+)$/;
  const match = message.match(pattern);

  if (!match) {
    errors.push('Invalid format: expected "<type>: <description>" or "<type>(<scope>): <description>"');
    return { passed: false, errors };
  }

  const [, type, , description] = match;

  if (!validTypes.includes(type)) {
    errors.push(`Invalid type "${type}". Allowed: ${validTypes.join(', ')}`);
  }

  if (!description || description.length === 0) {
    errors.push('Description must not be empty');
  } else if (description[0] !== description[0].toLowerCase()) {
    errors.push('Description must start with a lowercase letter');
  }

  return { passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Solution 2 : Vérifier console.log
// ---------------------------------------------------------------------------

function checkNoConsoleLog(code: string): HookResult {
  const lines = code.split('\n');
  const errors: string[] = [];
  lines.forEach((line, i) => {
    if (line.includes('console.log')) {
      errors.push(`console.log found on line ${i + 1}`);
    }
  });
  return { passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Solution 3 : Vérifier TODO/FIXME
// ---------------------------------------------------------------------------

function checkNoTodoMarkers(code: string): HookResult {
  const lines = code.split('\n');
  const errors: string[] = [];
  lines.forEach((line, i) => {
    if (/TODO|FIXME/.test(line)) {
      errors.push(`TODO/FIXME found on line ${i + 1}`);
    }
  });
  return { passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Solution 4 : Vérifier la longueur des lignes
// ---------------------------------------------------------------------------

function checkMaxLineLength(code: string, maxLength: number): HookResult {
  const lines = code.split('\n');
  const errors: string[] = [];
  lines.forEach((line, i) => {
    if (line.length > maxLength) {
      errors.push(`Line ${i + 1} exceeds ${maxLength} chars (${line.length} chars)`);
    }
  });
  return { passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Solution 5 : Chaîne de hooks
// ---------------------------------------------------------------------------

function runHookChain(input: string, hooks: HookFn[]): HookResult {
  const allErrors: string[] = [];
  let allPassed = true;
  for (const hook of hooks) {
    const result = hook(input);
    if (!result.passed) allPassed = false;
    allErrors.push(...result.errors);
  }
  return { passed: allPassed, errors: allErrors };
}

// ---------------------------------------------------------------------------
// Solution 6 : Hook pre-commit complet
// ---------------------------------------------------------------------------

function createPreCommitHook(options: { maxLineLength: number }): HookFn {
  return (input: string) => {
    return runHookChain(input, [
      (code) => checkNoConsoleLog(code),
      (code) => checkNoTodoMarkers(code),
      (code) => checkMaxLineLength(code, options.maxLineLength),
    ]);
  };
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 06 — Git Hooks (Solution)\n');

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
