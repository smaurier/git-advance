import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 03 — Merge vs Rebase : Simuler merge et rebase
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, summary } = createTestRunner('Lab 03 — Merge vs Rebase');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Commit {
  hash: string;
  message: string;
  parent: string | null;
}

interface BranchState {
  name: string;
  head: string; // hash du dernier commit
  commits: Commit[];
}

// ---------------------------------------------------------------------------
// Helper : hash simple
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
// Exercice 1 : Détecter si un fast-forward est possible
// ---------------------------------------------------------------------------

function canFastForward(target: BranchState, source: BranchState): boolean {
  // TODO: Un fast-forward est possible si le head de target est un ancêtre
  // du head de source (i.e. target.head apparait dans source.commits)
  // Retourner true si fast-forward possible, false sinon
  return false;
}

// ---------------------------------------------------------------------------
// Exercice 2 : Effectuer un fast-forward merge
// ---------------------------------------------------------------------------

function fastForwardMerge(target: BranchState, source: BranchState): BranchState {
  // TODO: Déplacer target.head vers source.head
  // Ajouter tous les commits de source qui ne sont pas dans target
  // Retourner la nouvelle branche target
  return target;
}

// ---------------------------------------------------------------------------
// Exercice 3 : Effectuer un 3-way merge (avec commit de merge)
// ---------------------------------------------------------------------------

function threeWayMerge(target: BranchState, source: BranchState): BranchState {
  // TODO: Créer un commit de merge avec le message "Merge <source.name> into <target.name>"
  // Le hash du merge commit = simpleHash("merge:" + source.head + ":" + target.head)
  // Le parent du merge commit = target.head
  // Ajouter les commits de source absents de target, puis le merge commit
  // Mettre à jour target.head
  return target;
}

// ---------------------------------------------------------------------------
// Exercice 4 : Simuler un rebase
// ---------------------------------------------------------------------------

function rebase(feature: BranchState, base: BranchState): BranchState {
  // TODO: Rejouer les commits "propres" de feature sur base
  // Les commits propres = ceux de feature qui ne sont pas dans base
  // Pour chaque commit propre, créer un nouveau commit avec :
  //   - hash = simpleHash("rebase:" + original.hash + ":" + base.head)
  //   - message = original.message (inchangé)
  //   - parent = hash du commit précédent dans la séquence rebasée (ou base.head pour le premier)
  // Retourner la branche feature rebasée (avec les commits de base + les nouveaux)
  return feature;
}

// ---------------------------------------------------------------------------
// Exercice 5 : Détecter si deux branches ont divergé
// ---------------------------------------------------------------------------

function haveDiverged(branch1: BranchState, branch2: BranchState): boolean {
  // TODO: Deux branches ont divergé si chacune a des commits
  // que l'autre n'a pas (ni l'une n'est ancêtre de l'autre)
  // Comparer les ensembles de hashes
  return false;
}

// ---------------------------------------------------------------------------
// Exercice 6 : Trouver les commits exclusifs à une branche
// ---------------------------------------------------------------------------

function exclusiveCommits(branch: BranchState, other: BranchState): Commit[] {
  // TODO: Retourner les commits présents dans branch mais pas dans other
  // Conserver l'ordre original
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 03 — Merge vs Rebase\n');

// Setup commun
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
  // Les commits rebasés doivent avoir de nouveaux hashes
  const originalHashes = new Set(['ccc333', 'ddd444']);
  const rebasedOnly = result.commits.filter(c => !mainDiverged.commits.some(mc => mc.hash === c.hash));
  assert(rebasedOnly.length === 2, 'Il doit y avoir 2 commits rebasés');
  rebasedOnly.forEach(c => {
    assert(!originalHashes.has(c.hash), 'Les hashes doivent être différents après rebase');
  });
  // Les messages doivent être préservés
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
