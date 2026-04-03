import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 01 — Git Objects : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertIncludes, summary } = createTestRunner('Lab 01 — Git Objects');

type GitObjectType = 'blob' | 'tree' | 'commit' | 'tag';

interface GitBlob { type: 'blob'; content: string; }
interface GitTreeEntry { mode: string; name: string; hash: string; }
interface GitTree { type: 'tree'; entries: GitTreeEntry[]; }
interface GitCommit { type: 'commit'; tree: string; parents: string[]; author: string; message: string; }
type GitObject = GitBlob | GitTree | GitCommit;
interface GitObjectStore { [hash: string]: GitObject; }
interface GitRefs { [name: string]: string; }

// ---------------------------------------------------------------------------
// Solution 1 : Hash simple
// ---------------------------------------------------------------------------

function hashObject(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Solution 2 : Object store
// ---------------------------------------------------------------------------

function createObjectStore(): GitObjectStore {
  return {};
}

function storeBlob(store: GitObjectStore, content: string): string {
  const blob: GitBlob = { type: 'blob', content };
  const hash = hashObject(`blob:${content}`);
  store[hash] = blob;
  return hash;
}

function storeTree(store: GitObjectStore, entries: GitTreeEntry[]): string {
  const tree: GitTree = { type: 'tree', entries };
  const content = entries.map(e => `${e.mode} ${e.name} ${e.hash}`).join('\n');
  const hash = hashObject(`tree:${content}`);
  store[hash] = tree;
  return hash;
}

function storeCommit(store: GitObjectStore, treeHash: string, parents: string[], author: string, message: string): string {
  const commit: GitCommit = { type: 'commit', tree: treeHash, parents, author, message };
  const content = `commit:${treeHash}:${parents.join(',')}:${author}:${message}`;
  const hash = hashObject(content);
  store[hash] = commit;
  return hash;
}

// ---------------------------------------------------------------------------
// Solution 3 : Résoudre une référence
// ---------------------------------------------------------------------------

function resolveRef(refs: GitRefs, store: GitObjectStore, refName: string): GitObject | null {
  const hash = refs[refName];
  if (!hash) return null;
  return store[hash] ?? null;
}

// ---------------------------------------------------------------------------
// Solution 4 : Lister les fichiers d'un commit
// ---------------------------------------------------------------------------

function listFilesInCommit(store: GitObjectStore, commitHash: string): string[] {
  const commit = store[commitHash];
  if (!commit || commit.type !== 'commit') return [];
  const tree = store[commit.tree];
  if (!tree || tree.type !== 'tree') return [];
  return tree.entries.map(e => e.name).sort();
}

// ---------------------------------------------------------------------------
// Solution 5 : Ancêtre commun
// ---------------------------------------------------------------------------

function findCommonAncestor(store: GitObjectStore, hash1: string, hash2: string): string | null {
  const ancestors1 = new Set<string>();
  let current: string | undefined = hash1;
  while (current) {
    ancestors1.add(current);
    const commit = store[current];
    if (!commit || commit.type !== 'commit' || commit.parents.length === 0) break;
    current = commit.parents[0];
  }

  current = hash2;
  while (current) {
    if (ancestors1.has(current)) return current;
    const commit = store[current];
    if (!commit || commit.type !== 'commit' || commit.parents.length === 0) break;
    current = commit.parents[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Solution 6 : Compter les commits
// ---------------------------------------------------------------------------

function countCommitsBetween(store: GitObjectStore, fromHash: string, toHash: string): number {
  let count = 0;
  let current: string | undefined = toHash;
  while (current && current !== fromHash) {
    count++;
    const commit = store[current];
    if (!commit || commit.type !== 'commit' || commit.parents.length === 0) break;
    current = commit.parents[0];
  }
  return current === fromHash ? count : 0;
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 01 — Git Objects (Solution)\n');

await test('Ex1: hashObject retourne un hash hexadecimal de 8 caractères', () => {
  const hash = hashObject('Hello Git');
  assertEqual(hash.length, 8, 'Le hash doit faire 8 caractères');
  assert(/^[0-9a-f]+$/.test(hash), 'Le hash doit être hexadécimal');
});

await test('Ex1: hashObject est deterministique', () => {
  assertEqual(hashObject('test'), hashObject('test'), 'Même contenu = même hash');
});

await test('Ex1: hashObject produit des hashes differents pour des contenus differents', () => {
  assert(hashObject('aaa') !== hashObject('bbb'), 'Contenus différents = hashes différents');
});

await test('Ex2: storeBlob stocke un blob et retourne son hash', () => {
  const store = createObjectStore();
  const hash = storeBlob(store, 'console.log("hello")');
  assert(hash.length > 0, 'Le hash ne doit pas être vide');
  assert(store[hash] !== undefined, 'L\'objet doit être dans le store');
  assertEqual((store[hash] as GitBlob).type, 'blob');
  assertEqual((store[hash] as GitBlob).content, 'console.log("hello")');
});

await test('Ex2: storeTree stocke un tree avec ses entries', () => {
  const store = createObjectStore();
  const blobHash = storeBlob(store, 'content');
  const treeHash = storeTree(store, [
    { mode: '100644', name: 'file.ts', hash: blobHash }
  ]);
  assert(treeHash.length > 0);
  assertEqual((store[treeHash] as GitTree).type, 'tree');
  assertEqual((store[treeHash] as GitTree).entries.length, 1);
});

await test('Ex2: storeCommit stocke un commit avec tree et parents', () => {
  const store = createObjectStore();
  const blobHash = storeBlob(store, 'hello');
  const treeHash = storeTree(store, [{ mode: '100644', name: 'readme.md', hash: blobHash }]);
  const commitHash = storeCommit(store, treeHash, [], 'Alice', 'initial commit');
  assertEqual((store[commitHash] as GitCommit).type, 'commit');
  assertEqual((store[commitHash] as GitCommit).message, 'initial commit');
  assertEqual((store[commitHash] as GitCommit).parents.length, 0);
});

await test('Ex3: resolveRef résout une référence vers un objet', () => {
  const store = createObjectStore();
  const blobHash = storeBlob(store, 'content');
  const treeHash = storeTree(store, [{ mode: '100644', name: 'file.ts', hash: blobHash }]);
  const commitHash = storeCommit(store, treeHash, [], 'Alice', 'first');
  const refs: GitRefs = { 'refs/heads/main': commitHash };
  const obj = resolveRef(refs, store, 'refs/heads/main');
  assert(obj !== null);
  assertEqual(obj!.type, 'commit');
});

await test('Ex3: resolveRef retourne null pour une ref inexistante', () => {
  const refs: GitRefs = {};
  const store = createObjectStore();
  assertEqual(resolveRef(refs, store, 'refs/heads/missing'), null);
});

await test('Ex4: listFilesInCommit retourne les fichiers du tree du commit', () => {
  const store = createObjectStore();
  const b1 = storeBlob(store, 'a');
  const b2 = storeBlob(store, 'b');
  const b3 = storeBlob(store, 'c');
  const treeHash = storeTree(store, [
    { mode: '100644', name: 'index.ts', hash: b1 },
    { mode: '100644', name: 'app.ts', hash: b2 },
    { mode: '100644', name: 'utils.ts', hash: b3 },
  ]);
  const commitHash = storeCommit(store, treeHash, [], 'Alice', 'add files');
  const files = listFilesInCommit(store, commitHash);
  assertDeepEqual(files, ['app.ts', 'index.ts', 'utils.ts']);
});

await test('Ex5: findCommonAncestor trouve l\'ancêtre commun', () => {
  const store = createObjectStore();
  const t = storeTree(store, []);
  const c1 = storeCommit(store, t, [], 'A', 'initial');
  const c2 = storeCommit(store, t, [c1], 'A', 'second');
  const c3 = storeCommit(store, t, [c2], 'A', 'branch-a');
  const c4 = storeCommit(store, t, [c2], 'A', 'branch-b');
  assertEqual(findCommonAncestor(store, c3, c4), c2);
});

await test('Ex5: findCommonAncestor retourne null si pas d\'ancêtre commun', () => {
  const store = createObjectStore();
  const t = storeTree(store, []);
  const c1 = storeCommit(store, t, [], 'A', 'root-a');
  const c2 = storeCommit(store, t, [], 'A', 'root-b');
  assertEqual(findCommonAncestor(store, c1, c2), null);
});

await test('Ex6: countCommitsBetween compte les commits entre deux points', () => {
  const store = createObjectStore();
  const t = storeTree(store, []);
  const c1 = storeCommit(store, t, [], 'A', 'first');
  const c2 = storeCommit(store, t, [c1], 'A', 'second');
  const c3 = storeCommit(store, t, [c2], 'A', 'third');
  const c4 = storeCommit(store, t, [c3], 'A', 'fourth');
  assertEqual(countCommitsBetween(store, c1, c4), 3);
});

summary();
