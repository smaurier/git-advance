import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 05 — Git Bisect : Trouver le premier commit fautif
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 05 — Git Bisect');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Commit {
  hash: string;
  message: string;
}

interface BisectState {
  commits: Commit[];
  low: number;  // index du dernier "good"
  high: number; // index du premier "bad"
  current: number; // index du commit en cours de test
  found: boolean;
}

// ---------------------------------------------------------------------------
// Exercice 1 : Initialiser une session bisect
// ---------------------------------------------------------------------------

function bisectStart(commits: Commit[], goodHash: string, badHash: string): BisectState {
  // TODO: Initialiser l'état du bisect
  // - low = index du commit "good" dans le tableau
  // - high = index du commit "bad" dans le tableau
  // - current = milieu entre low et high (Math.floor)
  // - found = false
  // Si goodHash ou badHash n'est pas trouvé, lancer une erreur "Commit not found"
  return { commits: [], low: 0, high: 0, current: 0, found: false };
}

// ---------------------------------------------------------------------------
// Exercice 2 : Marquer le commit courant comme "good" ou "bad"
// ---------------------------------------------------------------------------

function bisectMark(state: BisectState, verdict: 'good' | 'bad'): BisectState {
  // TODO: Mettre à jour l'état selon le verdict :
  // - Si "good" : low = current
  // - Si "bad" : high = current
  // - Recalculer current = milieu entre low et high
  // - Si high - low <= 1, le premier bad commit est à l'index high → found = true
  return state;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Obtenir le résultat du bisect
// ---------------------------------------------------------------------------

function bisectResult(state: BisectState): Commit | null {
  // TODO: Si found est true, retourner le commit à l'index high
  // Sinon retourner null
  return null;
}

// ---------------------------------------------------------------------------
// Exercice 4 : Bisect automatique avec une fonction de test
// ---------------------------------------------------------------------------

function bisectAuto(commits: Commit[], testFn: (commit: Commit) => boolean): Commit | null {
  // TODO: Effectuer un bisect automatique
  // testFn retourne true si le commit est "good", false si "bad"
  // On suppose que commits[0] est good et commits[last] est bad
  // Utiliser la recherche binaire pour trouver le premier commit "bad"
  // Retourner le premier commit bad trouvé, ou null si tous sont good
  return null;
}

// ---------------------------------------------------------------------------
// Exercice 5 : Compter le nombre d'étapes du bisect
// ---------------------------------------------------------------------------

function bisectStepsNeeded(totalCommits: number): number {
  // TODO: Calculer le nombre maximum d'étapes nécessaires pour un bisect
  // C'est ceil(log2(totalCommits))
  return 0;
}

// ---------------------------------------------------------------------------
// Exercice 6 : Bisect avec plage de commits suspects
// ---------------------------------------------------------------------------

function bisectSuspectRange(state: BisectState): Commit[] {
  // TODO: Retourner les commits entre low (exclu) et high (inclus)
  // Ce sont les commits suspects restants
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 05 — Git Bisect\n');

const commits: Commit[] = [
  { hash: 'c0', message: 'initial' },
  { hash: 'c1', message: 'feat: add login' },
  { hash: 'c2', message: 'feat: add dashboard' },
  { hash: 'c3', message: 'refactor: utils' },
  { hash: 'c4', message: 'fix: broken import' },  // <-- bug introduced here
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
  // c3 est "good" (le bug est en c4)
  state = bisectMark(state, 'good');
  assertEqual(state.low, 3);
  assertEqual(state.current, 5); // milieu entre 3 et 7
});

await test('Ex2: bisectMark détecte quand le bisect est terminé', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');  // c3 good → low=3, current=5
  state = bisectMark(state, 'bad');   // c5 bad → high=5, current=4
  state = bisectMark(state, 'bad');   // c4 bad → high=4, high-low=1 → found!
  assertEqual(state.found, true);
});

await test('Ex3: bisectResult retourne le premier bad commit', () => {
  let state = bisectStart(commits, 'c0', 'c7');
  state = bisectMark(state, 'good');  // c3 good
  state = bisectMark(state, 'bad');   // c5 bad
  state = bisectMark(state, 'bad');   // c4 bad → found
  const result = bisectResult(state);
  assert(result !== null);
  assertEqual(result!.hash, 'c4');
  assertEqual(result!.message, 'fix: broken import');
});

await test('Ex4: bisectAuto trouve le premier commit fautif automatiquement', () => {
  const bugAtC4 = (commit: Commit) => {
    const idx = commits.findIndex(c => c.hash === commit.hash);
    return idx < 4; // commits avant c4 sont good
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
  state = bisectMark(state, 'good'); // low=3
  const suspects = bisectSuspectRange(state);
  assertEqual(suspects.length, 4); // c4, c5, c6, c7
  assertEqual(suspects[0].hash, 'c4');
  assertEqual(suspects[3].hash, 'c7');
});

summary();
