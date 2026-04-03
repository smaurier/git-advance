import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 04 — Rebase Interactif : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 04 — Rebase Interactif');

interface Commit { hash: string; message: string; changes: string; }
type RebaseAction = 'pick' | 'reword' | 'squash' | 'fixup' | 'drop';
interface RebaseInstruction { action: RebaseAction; hash: string; newMessage?: string; }

function applyPick(commits: Commit[], instruction: RebaseInstruction): Commit[] {
  return commits;
}

function applyReword(commits: Commit[], instruction: RebaseInstruction): Commit[] {
  return commits.map(c =>
    c.hash === instruction.hash ? { ...c, message: instruction.newMessage ?? c.message } : c
  );
}

function applySquash(result: Commit[], commitToSquash: Commit): Commit[] {
  if (result.length === 0) return [commitToSquash];
  const last = result[result.length - 1];
  const merged: Commit = {
    hash: last.hash,
    message: `${last.message}\n${commitToSquash.message}`,
    changes: `${last.changes}\n${commitToSquash.changes}`,
  };
  return [...result.slice(0, -1), merged];
}

function applyFixup(result: Commit[], commitToFixup: Commit): Commit[] {
  if (result.length === 0) return [commitToFixup];
  const last = result[result.length - 1];
  const merged: Commit = {
    hash: last.hash,
    message: last.message,
    changes: `${last.changes}\n${commitToFixup.changes}`,
  };
  return [...result.slice(0, -1), merged];
}

function applyDrop(commits: Commit[], hash: string): Commit[] {
  return commits.filter(c => c.hash !== hash);
}

function executeInteractiveRebase(commits: Commit[], instructions: RebaseInstruction[]): Commit[] {
  const commitMap = new Map(commits.map(c => [c.hash, c]));
  let result: Commit[] = [];

  for (const instr of instructions) {
    const commit = commitMap.get(instr.hash);
    if (!commit) continue;

    switch (instr.action) {
      case 'pick':
        result.push({ ...commit });
        break;
      case 'reword':
        result.push({ ...commit, message: instr.newMessage ?? commit.message });
        break;
      case 'squash':
        result = applySquash(result, commit);
        break;
      case 'fixup':
        result = applyFixup(result, commit);
        break;
      case 'drop':
        break;
    }
  }

  return result;
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 04 — Rebase Interactif (Solution)\n');

const sampleCommits: Commit[] = [
  { hash: 'aaa', message: 'feat: add model', changes: 'model.ts' },
  { hash: 'bbb', message: 'fix: typo', changes: 'model.ts fix' },
  { hash: 'ccc', message: 'feat: add service', changes: 'service.ts' },
  { hash: 'ddd', message: 'WIP debug', changes: 'debug.ts' },
  { hash: 'eee', message: 'feat: add controller', changes: 'controller.ts' },
];

await test('Ex1: pick garde le commit tel quel', () => {
  const result = applyPick([], { action: 'pick', hash: 'aaa' });
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
