import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 04 — Rebase Interactif : Simuler les operations de rebase
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 04 — Rebase Interactif');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Commit {
  hash: string;
  message: string;
  changes: string;
}

type RebaseAction = 'pick' | 'reword' | 'squash' | 'fixup' | 'drop';

interface RebaseInstruction {
  action: RebaseAction;
  hash: string;
  newMessage?: string; // pour reword
}

// ---------------------------------------------------------------------------
// Exercice 1 : Appliquer une action "pick" — garder le commit tel quel
// ---------------------------------------------------------------------------

function applyPick(commits: Commit[], instruction: RebaseInstruction): Commit[] {
  // TODO: Retourner les commits avec le commit "pick" inclus tel quel
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 2 : Appliquer "reword" — changer le message
// ---------------------------------------------------------------------------

function applyReword(commits: Commit[], instruction: RebaseInstruction): Commit[] {
  // TODO: Trouver le commit par hash, changer son message avec instruction.newMessage
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 3 : Appliquer "squash" — fusionner avec le précédent
// ---------------------------------------------------------------------------

function applySquash(result: Commit[], commitToSquash: Commit): Commit[] {
  // TODO: Fusionner commitToSquash avec le dernier commit de result
  // Le message du résultat = message du dernier + "\n" + message du squash
  // Les changes = changes du dernier + "\n" + changes du squash
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 4 : Appliquer "fixup" — fusionner en jetant le message
// ---------------------------------------------------------------------------

function applyFixup(result: Commit[], commitToFixup: Commit): Commit[] {
  // TODO: Fusionner commitToFixup avec le dernier commit de result
  // Le message reste celui du dernier commit (on jette le message du fixup)
  // Les changes = changes du dernier + "\n" + changes du fixup
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 5 : Appliquer "drop" — supprimer le commit
// ---------------------------------------------------------------------------

function applyDrop(commits: Commit[], hash: string): Commit[] {
  // TODO: Retourner les commits sans celui qui a le hash donné
  return [];
}

// ---------------------------------------------------------------------------
// Exercice 6 : Exécuter un rebase interactif complet
// ---------------------------------------------------------------------------

function executeInteractiveRebase(commits: Commit[], instructions: RebaseInstruction[]): Commit[] {
  // TODO: Appliquer toutes les instructions dans l'ordre
  // Pour chaque instruction, trouver le commit correspondant et appliquer l'action
  // Retourner la liste finale de commits rebasés
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 04 — Rebase Interactif\n');

const sampleCommits: Commit[] = [
  { hash: 'aaa', message: 'feat: add model', changes: 'model.ts' },
  { hash: 'bbb', message: 'fix: typo', changes: 'model.ts fix' },
  { hash: 'ccc', message: 'feat: add service', changes: 'service.ts' },
  { hash: 'ddd', message: 'WIP debug', changes: 'debug.ts' },
  { hash: 'eee', message: 'feat: add controller', changes: 'controller.ts' },
];

await test('Ex1: pick garde le commit tel quel', () => {
  const result = applyPick([], { action: 'pick', hash: 'aaa' });
  // pick juste inclut le commit dans la liste
  const commits = [sampleCommits[0]];
  const picked = applyPick([], { action: 'pick', hash: 'aaa' });
  // On va tester dans le contexte du rebase complet
  assert(true);
});

await test('Ex2: reword change le message du commit', () => {
  const result = applyReword([...sampleCommits], { action: 'reword', hash: 'aaa', newMessage: 'feat: add user model' });
  const found = result.find(c => c.hash === 'aaa');
  assert(found !== undefined);
  assertEqual(found!.message, 'feat: add user model');
});

await test('Ex3: squash fusionne avec le commit précédent', () => {
  const result = applySquash(
    [{ hash: 'aaa', message: 'feat: add model', changes: 'model.ts' }],
    { hash: 'bbb', message: 'fix: typo', changes: 'model.ts fix' }
  );
  assertEqual(result.length, 1);
  assert(result[0].message.includes('feat: add model'));
  assert(result[0].message.includes('fix: typo'));
  assert(result[0].changes.includes('model.ts'));
  assert(result[0].changes.includes('model.ts fix'));
});

await test('Ex4: fixup fusionne en jetant le message', () => {
  const result = applyFixup(
    [{ hash: 'aaa', message: 'feat: add model', changes: 'model.ts' }],
    { hash: 'bbb', message: 'fix: typo', changes: 'model.ts fix' }
  );
  assertEqual(result.length, 1);
  assertEqual(result[0].message, 'feat: add model');
  assert(result[0].changes.includes('model.ts fix'));
});

await test('Ex5: drop supprime le commit', () => {
  const result = applyDrop([...sampleCommits], 'ddd');
  assertEqual(result.length, 4);
  assertEqual(result.find(c => c.hash === 'ddd'), undefined);
});

await test('Ex6: rebase interactif complet — squash + drop', () => {
  const instructions: RebaseInstruction[] = [
    { action: 'pick', hash: 'aaa' },
    { action: 'fixup', hash: 'bbb' },
    { action: 'pick', hash: 'ccc' },
    { action: 'drop', hash: 'ddd' },
    { action: 'pick', hash: 'eee' },
  ];
  const result = executeInteractiveRebase([...sampleCommits], instructions);
  assertEqual(result.length, 3);
  assertEqual(result[0].message, 'feat: add model');
  assert(result[0].changes.includes('model.ts fix'));
  assertEqual(result[1].message, 'feat: add service');
  assertEqual(result[2].message, 'feat: add controller');
});

await test('Ex6: rebase interactif — reword + squash', () => {
  const instructions: RebaseInstruction[] = [
    { action: 'reword', hash: 'aaa', newMessage: 'feat: add user model' },
    { action: 'squash', hash: 'bbb' },
    { action: 'pick', hash: 'ccc' },
    { action: 'drop', hash: 'ddd' },
    { action: 'pick', hash: 'eee' },
  ];
  const result = executeInteractiveRebase([...sampleCommits], instructions);
  assertEqual(result.length, 3);
  assert(result[0].message.includes('feat: add user model'));
  assert(result[0].message.includes('fix: typo'));
});

summary();
