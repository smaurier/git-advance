#!/usr/bin/env node
// Oracle du lab 02 (Git avancé) : un VRAI historique de 10 commits, une VRAIE régression, un
// VRAI `git bisect run`. Usage : node run-oracle.mjs lab | solution
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "solution" ? "solution" : "lab";
const PLAN_PATH = join(HERE, mode === "solution" ? "solution/findCulprit.mjs" : "src/findCulprit.mjs");

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "✅" : "❌"} ${label}`);
  if (!condition) failed = true;
}

const CALC_SAIN = `export function add(a, b) { return a + b; }\n`;
const CALC_CASSE = `export function add(a, b) { return a - b; }\n`; // le bug : - au lieu de +
const CHECK_SCRIPT = `import { add } from "./calc.mjs";\nprocess.exit(add(2, 3) === 5 ? 0 : 1);\n`;

async function main() {
  const repo = mkdtempSync(join(tmpdir(), "tribuzen-git-lab02-"));
  console.log(`\n— dépôt scratch : ${repo} —\n`);

  function run(cmd) {
    return execSync(`git ${cmd}`, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  }

  run("init -q -b main");
  run('config user.email "lab@tribuzen.test"');
  run('config user.name "Lab TribuZen"');
  writeFileSync(join(repo, "check.mjs"), CHECK_SCRIPT);

  // 10 commits : 1-5 sains, LE 6e introduit le bug (- au lieu de +), 6-10 restent cassés.
  let culpritReel = "";
  for (let i = 1; i <= 10; i++) {
    writeFileSync(join(repo, "calc.mjs"), i < 6 ? CALC_SAIN : CALC_CASSE);
    // Chaque commit change aussi ce fichier — un historique réel n'a jamais deux commits
    // strictement identiques, et git refuse de committer "rien".
    writeFileSync(join(repo, "NOTES.md"), `commit ${i}\n`);
    run("add calc.mjs check.mjs NOTES.md");
    run(`commit -m "commit ${i}"`);
    if (i === 6) culpritReel = run("rev-parse HEAD");
  }
  const firstCommit = run("log --format=%H --reverse").split("\n")[0];

  const { findCulprit } = await import(pathToFileURL(PLAN_PATH).href);
  let trouve = "";
  try {
    trouve = await findCulprit({ run, firstCommit });
  } catch (e) {
    check(`findCulprit s'exécute sans erreur (${e.message})`, false);
    rmSync(repo, { recursive: true, force: true });
    return;
  }
  check("findCulprit s'exécute sans erreur", true);
  check("identifie EXACTEMENT le commit qui a introduit la régression (le 6e, ni avant ni après)", trouve === culpritReel);

  const bisectEnCours = run("status --porcelain=v1 -uno").includes("You are currently bisecting")
    ? true
    : (() => {
        try {
          run("rev-parse --verify -q refs/bisect/bad");
          return true;
        } catch {
          return false;
        }
      })();
  check("le bisect a bien été nettoyé (bisect reset), le dépôt n'est plus en état de bisect", !bisectEnCours);

  const brancheFinale = run("branch --show-current");
  check("le dépôt est revenu sur main après le bisect", brancheFinale === "main");

  rmSync(repo, { recursive: true, force: true });
}

main()
  .catch((e) => {
    console.error(e);
    failed = true;
  })
  .finally(() => {
    console.log(failed ? "\n❌ RED\n" : "\n✅ GREEN\n");
    process.exit(failed ? 1 : 0);
  });
