import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 05 — Git Bisect : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 05 — Git Bisect');

interface Commit {
  hash: string;
  message: string;
}

interface BisectState {
  commits: Commit[];
  low: number;
  high: number;
  current: number;
  found: boolean;
}

// ---------------------------------------------------------------------------
// Solution 1 : Initialiser bisect
// ---------------------------------------------------------------------------

function bisectStart(commits: Commit[], goodHash: string, badHash: string): BisectState {
  const low = commits.findIndex(c => c.hash === goodHash);
  const high = commits.findIndex(c => c.hash === badHash);
  if (low === -1 || high === -1) throw new Error('Commit not found');
  const current = Math.floor((low + high) / 2);
  return { commits, low, high, current, found: false };
}

// ---------------------------------------------------------------------------
// Solution 2 : Marquer good/bad
// ---------------------------------------------------------------------------

function bisectMark(state: BisectState, verdict: 'good' | 'bad'): BisectState {
  const newState = { ...state };
  if (verdict === 'good') {
    newState.low = state.current;
  } else {
    newState.high = state.current;
  }
  if (newState.high - newState.low <= 1) {
    newState.found = true;
    newState.current = newState.high;
  } else {
    newState.current = Math.floor((newState.low + newState.high) / 2);
  }
  return newState;
}

// ---------------------------------------------------------------------------
// Solution 3 : Résultat du bisect
// ---------------------------------------------------------------------------

function bisectResult(state: BisectState): Commit | null {
  if (!state.found) return null;
  return state.commits[state.high];
}

// ---------------------------------------------------------------------------
// Solution 4 : Bisect automatique
// ---------------------------------------------------------------------------

function bisectAuto(commits: Commit[], testFn: (commit: Commit) => boolean): Commit | null {
  let low = 0;
  let high = commits.length - 1;

  if (testFn(commits[high])) return null; // all good

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
// Solution 5 : Nombre d'étapes
// ---------------------------------------------------------------------------

function bisectStepsNeeded(totalCommits: number): number {
  if (totalCommits <= 1) return 0;
  return Math.ceil(Math.log2(totalCommits));
}

// ---------------------------------------------------------------------------
// Solution 6 : Plage suspecte
// ---------------------------------------------------------------------------

function bisectSuspectRange(state: BisectState): Commit[] {
  return state.commits.slice(state.low + 1, state.high + 1);
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 05 — Git Bisect (Solution)\n');

const commits: Commit[] = [
  { hash: 'c0', message: 'initial' },
  { hash: 'c1', message: 'feat: add login' },
  { hash: 'c2', message: 'feat: add dashboard' },
  { hash: 'c3', message: 'refactor: utils' },
  { hash: 'c4', message: 'fix: broken import' },
  { hash: 'c5', message: 'feat: add profile' },
  { hash: 'c6', message: 'feat: add settings' },
  { hash: 'c7', message: 'fix: typo' },
];

await test('Ex1: bisectStart initialise correctement l\'état', () => {
  const state = bisectStart(commits, 'c0', 'c7');
  assertEqual(state.low, 0);
  assertEqual(state.high, 7);
  assertEqual(state.current, 3);
  assertEqual(state.found, false);
});

await test('Ex2: bisectMark met à jour l\'état selon le verdict', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');
  assertEqual(state.low, 3);
  assertEqual(state.current, 5);
});

await test('Ex2: bisectMark détecte quand le bisect est terminé', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');
  state = bisectMark(state, 'bad');
  state = bisectMark(state, 'bad');
  assertEqual(state.found, true);
});

await test('Ex3: bisectResult retourne le premier bad commit', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');
  state = bisectMark(state, 'bad');
  state = bisectMark(state, 'bad');
  const result = bisectResult(state);
  assert(result !== null);
  assertEqual(result!.hash, 'c4');
  assertEqual(result!.message, 'fix: broken import');
});

await test('Ex4: bisectAuto trouve le premier commit fautif automatiquement', () => {
  const bugAtC4 = (commit: Commit) => {
    const idx = commits.findIndex(c => c.hash === commit.hash);
    return idx < 4;
  };
  const result = bisectAuto(commits, bugAtC4);
  assert(result !== null);
  assertEqual(result!.hash, 'c4');
});

await test('Ex5: bisectStepsNeeded calcule les étapes nécessaires', () => {
  assertEqual(bisectStepsNeeded(8), 3);
  assertEqual(bisectStepsNeeded(16), 4);
  assertEqual(bisectStepsNeeded(100), 7);
  assertEqual(bisectStepsNeeded(1), 0);
});

await test('Ex6: bisectSuspectRange retourne la plage suspecte', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');
  const suspects = bisectSuspectRange(state);
  assertEqual(suspects.length, 4);
  assertEqual(suspects[0].hash, 'c4');
  assertEqual(suspects[3].hash, 'c7');
});

summary();
