import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 03 — Merge vs Rebase : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 03 — Merge vs Rebase');

interface Commit {
  hash: string;
  message: string;
  parent: string | null;
}

interface BranchState {
  name: string;
  head: string;
  commits: Commit[];
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
// Solution 1 : Fast-forward detection
// ---------------------------------------------------------------------------

function canFastForward(target: BranchState, source: BranchState): boolean {
  return source.commits.some(c => c.hash === target.head);
}

// ---------------------------------------------------------------------------
// Solution 2 : Fast-forward merge
// ---------------------------------------------------------------------------

function fastForwardMerge(target: BranchState, source: BranchState): BranchState {
  const targetHashes = new Set(target.commits.map(c => c.hash));
  const newCommits = source.commits.filter(c => !targetHashes.has(c.hash));
  return {
    ...target,
    head: source.head,
    commits: [...target.commits, ...newCommits],
  };
}

// ---------------------------------------------------------------------------
// Solution 3 : 3-way merge
// ---------------------------------------------------------------------------

function threeWayMerge(target: BranchState, source: BranchState): BranchState {
  const targetHashes = new Set(target.commits.map(c => c.hash));
  const newCommits = source.commits.filter(c => !targetHashes.has(c.hash));
  const mergeHash = simpleHash('merge:' + source.head + ':' + target.head);
  const mergeCommit: Commit = {
    hash: mergeHash,
    message: `Merge ${source.name} into ${target.name}`,
    parent: target.head,
  };
  return {
    ...target,
    head: mergeHash,
    commits: [...target.commits, ...newCommits, mergeCommit],
  };
}

// ---------------------------------------------------------------------------
// Solution 4 : Rebase
// ---------------------------------------------------------------------------

function rebase(feature: BranchState, base: BranchState): BranchState {
  const baseHashes = new Set(base.commits.map(c => c.hash));
  const ownCommits = feature.commits.filter(c => !baseHashes.has(c.hash));

  let prevHash = base.head;
  const rebasedCommits: Commit[] = [];
  for (const commit of ownCommits) {
    const newHash = simpleHash('rebase:' + commit.hash + ':' + base.head);
    rebasedCommits.push({
      hash: newHash,
      message: commit.message,
      parent: prevHash,
    });
    prevHash = newHash;
  }

  return {
    ...feature,
    head: prevHash,
    commits: [...base.commits, ...rebasedCommits],
  };
}

// ---------------------------------------------------------------------------
// Solution 5 : Détection de divergence
// ---------------------------------------------------------------------------

function haveDiverged(branch1: BranchState, branch2: BranchState): boolean {
  const hashes1 = new Set(branch1.commits.map(c => c.hash));
  const hashes2 = new Set(branch2.commits.map(c => c.hash));
  const only1 = branch1.commits.some(c => !hashes2.has(c.hash));
  const only2 = branch2.commits.some(c => !hashes1.has(c.hash));
  return only1 && only2;
}

// ---------------------------------------------------------------------------
// Solution 6 : Commits exclusifs
// ---------------------------------------------------------------------------

function exclusiveCommits(branch: BranchState, other: BranchState): Commit[] {
  const otherHashes = new Set(other.commits.map(c => c.hash));
  return branch.commits.filter(c => !otherHashes.has(c.hash));
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 03 — Merge vs Rebase (Solution)\n');

const rootCommit: Commit = { hash: 'root00', message: 'initial', parent: null };
const commitA: Commit = { hash: 'aaa111', message: 'feat: A', parent: 'root00' };
const commitB: Commit = { hash: 'bbb222', message: 'feat: B', parent: 'aaa111' };
const commitC: Commit = { hash: 'ccc333', message: 'feat: C', parent: 'root00' };
const commitD: Commit = { hash: 'ddd444', message: 'feat: D', parent: 'ccc333' };

const mainLinear: BranchState = { name: 'main', head: 'root00', commits: [rootCommit] };
const featureLinear: BranchState = { name: 'feature', head: 'bbb222', commits: [rootCommit, commitA, commitB] };

const mainDiverged: BranchState = { name: 'main', head: 'bbb222', commits: [rootCommit, commitA, commitB] };
const featureDiverged: BranchState = { name: 'feature', head: 'ddd444', commits: [rootCommit, commitC, commitD] };

await test('Ex1: canFastForward détecte un fast-forward possible', () => {
  assertEqual(canFastForward(mainLinear, featureLinear), true);
});

await test('Ex1: canFastForward retourne false quand les branches ont divergé', () => {
  assertEqual(canFastForward(mainDiverged, featureDiverged), false);
});

await test('Ex2: fastForwardMerge avance le head de target', () => {
  const result = fastForwardMerge(
    { ...mainLinear, commits: [...mainLinear.commits] },
    featureLinear
  );
  assertEqual(result.head, 'bbb222');
  assertEqual(result.commits.length, 3);
});

await test('Ex3: threeWayMerge crée un commit de merge', () => {
  const result = threeWayMerge(
    { ...mainDiverged, commits: [...mainDiverged.commits] },
    { ...featureDiverged, commits: [...featureDiverged.commits] }
  );
  const mergeCommit = result.commits[result.commits.length - 1];
  assert(mergeCommit.message.includes('Merge feature into main'));
  assertEqual(result.head, mergeCommit.hash);
  assert(result.commits.length > mainDiverged.commits.length);
});

await test('Ex4: rebase rejoue les commits avec de nouveaux hashes', () => {
  const result = rebase(
    { ...featureDiverged, commits: [...featureDiverged.commits] },
    mainDiverged
  );
  const originalHashes = new Set(['ccc333', 'ddd444']);
  const rebasedOnly = result.commits.filter(c => !mainDiverged.commits.some(mc => mc.hash === c.hash));
  assert(rebasedOnly.length === 2, 'Il doit y avoir 2 commits rebasés');
  rebasedOnly.forEach(c => {
    assert(!originalHashes.has(c.hash), 'Les hashes doivent être différents après rebase');
  });
  assertEqual(rebasedOnly[0].message, 'feat: C');
  assertEqual(rebasedOnly[1].message, 'feat: D');
});

await test('Ex5: haveDiverged détecte la divergence', () => {
  assertEqual(haveDiverged(mainDiverged, featureDiverged), true);
  assertEqual(haveDiverged(mainLinear, featureLinear), false);
});

await test('Ex6: exclusiveCommits retourne les commits uniques', () => {
  const exclusive = exclusiveCommits(featureDiverged, mainDiverged);
  assertEqual(exclusive.length, 2);
  assertEqual(exclusive[0].hash, 'ccc333');
  assertEqual(exclusive[1].hash, 'ddd444');
});

summary();
