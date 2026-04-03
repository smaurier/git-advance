import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 09 — Workflows : Conventional Commits, Changelog, Semver
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertIncludes, summary } = createTestRunner('Lab 09 — Workflows');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedCommit {
  type: string;
  scope: string | null;
  description: string;
  breaking: boolean;
}

interface ChangelogSection {
  title: string;
  items: string[];
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

// ---------------------------------------------------------------------------
// Exercice 1 : Parser un message de commit conventionnel
// ---------------------------------------------------------------------------

function parseConventionalCommit(message: string): ParsedCommit | null {
  // TODO: Parser un message au format Conventional Commits
  // Format : <type>(<scope>): <description>  ou  <type>: <description>
  // Si le message contient "BREAKING CHANGE" ou le type finit par "!", breaking = true
  // Retourner null si le message ne correspond pas au format
  return null;
}

// ---------------------------------------------------------------------------
// Exercice 2 : Classifier les commits par type
// ---------------------------------------------------------------------------

function classifyCommits(commits: string[]): Record<string, ParsedCommit[]> {
  // TODO: Parser chaque commit et les grouper par type
  // Ignorer les commits qui ne sont pas au format conventionnel
  // Retourner un objet { feat: [...], fix: [...], ... }
  return {};
}

// ---------------------------------------------------------------------------
// Exercice 3 : Générer un changelog
// ---------------------------------------------------------------------------

function generateChangelog(commits: string[], version: string): string {
  // TODO: Générer un changelog au format :
  // "## <version>\n\n### Features\n\n- <description>\n...\n\n### Bug Fixes\n\n- <description>\n..."
  // Sections : "Features" pour feat, "Bug Fixes" pour fix, "Other" pour le reste
  // Inclure le scope entre parenthèses si présent : "- **scope**: description"
  // N'inclure une section que si elle contient des items
  // Ordre des sections : Features, Bug Fixes, Other
  return '';
}

// ---------------------------------------------------------------------------
// Exercice 4 : Parser une version sémantique
// ---------------------------------------------------------------------------

function parseSemVer(version: string): SemVer {
  // TODO: Parser une version au format "major.minor.patch"
  // Lancer une erreur "Invalid version: <version>" si le format est incorrect
  return { major: 0, minor: 0, patch: 0 };
}

// ---------------------------------------------------------------------------
// Exercice 5 : Calculer la prochaine version
// ---------------------------------------------------------------------------

function calculateNextVersion(current: string, commits: string[]): string {
  // TODO: Calculer la prochaine version basée sur les commits
  // - Si un commit a breaking = true → major bump
  // - Si un commit a type = "feat" → minor bump
  // - Sinon → patch bump
  // Retourner la version au format "major.minor.patch"
  // Rappel : major bump remet minor et patch à 0, minor bump remet patch à 0
  return '';
}

// ---------------------------------------------------------------------------
// Exercice 6 : Détecter les breaking changes
// ---------------------------------------------------------------------------

function extractBreakingChanges(commits: string[]): string[] {
  // TODO: Extraire les descriptions des commits qui sont des breaking changes
  // Retourner un tableau de descriptions
  return [];
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 09 — Workflows\n');

await test('Ex1: parseConventionalCommit parse un commit simple', () => {
  const parsed = parseConventionalCommit('feat: add login page');
  assert(parsed !== null);
  assertEqual(parsed!.type, 'feat');
  assertEqual(parsed!.scope, null);
  assertEqual(parsed!.description, 'add login page');
  assertEqual(parsed!.breaking, false);
});

await test('Ex1: parseConventionalCommit parse un commit avec scope et breaking', () => {
  const parsed = parseConventionalCommit('feat(auth)!: redesign auth flow');
  assert(parsed !== null);
  assertEqual(parsed!.type, 'feat');
  assertEqual(parsed!.scope, 'auth');
  assertEqual(parsed!.breaking, true);
  const invalid = parseConventionalCommit('random message');
  assertEqual(invalid, null);
});

await test('Ex2: classifyCommits groupe les commits par type', () => {
  const commits = [
    'feat: add login',
    'fix: resolve crash',
    'feat: add dashboard',
    'not a conventional commit',
    'docs: update readme',
  ];
  const classified = classifyCommits(commits);
  assertEqual(classified['feat']?.length, 2);
  assertEqual(classified['fix']?.length, 1);
  assertEqual(classified['docs']?.length, 1);
});

await test('Ex3: generateChangelog génère un changelog formaté', () => {
  const commits = [
    'feat(ui): add button component',
    'feat: add routing',
    'fix(auth): resolve token expiry',
    'chore: update deps',
  ];
  const changelog = generateChangelog(commits, '1.2.0');
  assertIncludes(changelog, '## 1.2.0');
  assertIncludes(changelog, '### Features');
  assertIncludes(changelog, '**ui**: add button component');
  assertIncludes(changelog, '- add routing');
  assertIncludes(changelog, '### Bug Fixes');
  assertIncludes(changelog, '**auth**: resolve token expiry');
});

await test('Ex4: parseSemVer parse une version correctement', () => {
  const v = parseSemVer('1.2.3');
  assertEqual(v.major, 1);
  assertEqual(v.minor, 2);
  assertEqual(v.patch, 3);
});

await test('Ex5: calculateNextVersion calcule la bonne version', () => {
  assertEqual(calculateNextVersion('1.0.0', ['feat: add feature']), '1.1.0');
  assertEqual(calculateNextVersion('1.1.0', ['fix: bug fix']), '1.1.1');
  assertEqual(calculateNextVersion('1.1.1', ['feat!: breaking change']), '2.0.0');
});

await test('Ex5: calculateNextVersion préfère le bump le plus important', () => {
  const commits = ['fix: small fix', 'feat: new feature', 'fix: another fix'];
  assertEqual(calculateNextVersion('1.0.0', commits), '1.1.0');
});

await test('Ex6: extractBreakingChanges extrait les breaking changes', () => {
  const commits = [
    'feat: normal feature',
    'feat!: redesign API',
    'fix: normal fix',
    'refactor!: drop legacy support',
  ];
  const breaking = extractBreakingChanges(commits);
  assertEqual(breaking.length, 2);
  assertIncludes(breaking, 'redesign API');
  assertIncludes(breaking, 'drop legacy support');
});

summary();
