import { createTestRunner } from '../test-utils.ts';

// =============================================================================
// Lab 09 — Workflows : SOLUTION
// =============================================================================

const { test, assert, assertEqual, assertDeepEqual, assertIncludes, summary } = createTestRunner('Lab 09 — Workflows');

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
// Solution 1 : Parser Conventional Commits
// ---------------------------------------------------------------------------

function parseConventionalCommit(message: string): ParsedCommit | null {
  const pattern = /^(\w+)(?:\(([a-z0-9-]+)\))?(!)?\s*:\s+(.+)$/;
  const match = message.match(pattern);
  if (!match) return null;

  const [, type, scope, bang, description] = match;
  const breaking = bang === '!' || message.includes('BREAKING CHANGE');

  return {
    type,
    scope: scope ?? null,
    description,
    breaking,
  };
}

// ---------------------------------------------------------------------------
// Solution 2 : Classifier les commits
// ---------------------------------------------------------------------------

function classifyCommits(commits: string[]): Record<string, ParsedCommit[]> {
  const result: Record<string, ParsedCommit[]> = {};
  for (const msg of commits) {
    const parsed = parseConventionalCommit(msg);
    if (!parsed) continue;
    if (!result[parsed.type]) result[parsed.type] = [];
    result[parsed.type].push(parsed);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Solution 3 : Générer un changelog
// ---------------------------------------------------------------------------

function generateChangelog(commits: string[], version: string): string {
  const classified = classifyCommits(commits);

  const sections: ChangelogSection[] = [];

  const formatItem = (c: ParsedCommit): string =>
    c.scope ? `- **${c.scope}**: ${c.description}` : `- ${c.description}`;

  if (classified['feat']) {
    sections.push({ title: 'Features', items: classified['feat'].map(formatItem) });
  }
  if (classified['fix']) {
    sections.push({ title: 'Bug Fixes', items: classified['fix'].map(formatItem) });
  }

  const otherTypes = Object.keys(classified).filter(t => t !== 'feat' && t !== 'fix');
  const otherItems: string[] = [];
  for (const type of otherTypes) {
    otherItems.push(...classified[type].map(formatItem));
  }
  if (otherItems.length > 0) {
    sections.push({ title: 'Other', items: otherItems });
  }

  let changelog = `## ${version}\n`;
  for (const section of sections) {
    changelog += `\n### ${section.title}\n\n${section.items.join('\n')}\n`;
  }

  return changelog;
}

// ---------------------------------------------------------------------------
// Solution 4 : Parser semver
// ---------------------------------------------------------------------------

function parseSemVer(version: string): SemVer {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid version: ${version}`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

// ---------------------------------------------------------------------------
// Solution 5 : Calculer la prochaine version
// ---------------------------------------------------------------------------

function calculateNextVersion(current: string, commits: string[]): string {
  const ver = parseSemVer(current);
  let bump: 'major' | 'minor' | 'patch' = 'patch';

  for (const msg of commits) {
    const parsed = parseConventionalCommit(msg);
    if (!parsed) continue;
    if (parsed.breaking) {
      bump = 'major';
      break;
    }
    if (parsed.type === 'feat' && bump !== 'major') {
      bump = 'minor';
    }
  }

  if (bump === 'major') return `${ver.major + 1}.0.0`;
  if (bump === 'minor') return `${ver.major}.${ver.minor + 1}.0`;
  return `${ver.major}.${ver.minor}.${ver.patch + 1}`;
}

// ---------------------------------------------------------------------------
// Solution 6 : Extraire les breaking changes
// ---------------------------------------------------------------------------

function extractBreakingChanges(commits: string[]): string[] {
  const result: string[] = [];
  for (const msg of commits) {
    const parsed = parseConventionalCommit(msg);
    if (parsed && parsed.breaking) {
      result.push(parsed.description);
    }
  }
  return result;
}

// =============================================================================
// Tests
// =============================================================================

console.log('\n🔬 Lab 09 — Workflows (Solution)\n');

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
