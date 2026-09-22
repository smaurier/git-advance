#!/usr/bin/env node
// Oracle du lab 01 (Git avancé) : un VRAI dépôt git scratch, de vraies commandes git,
// vérifiées par de la vraie plomberie git (merge-base, rev-parse, cat-file) — pas une
// simulation de topologie. Usage : node run-oracle.mjs lab | solution
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "solution" ? "solution" : "lab";
const PLAN_PATH = join(HERE, mode === "solution" ? "solution/plan.mjs" : "src/plan.mjs");

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "✅" : "❌"} ${label}`);
  if (!condition) failed = true;
}

async function main() {
  const repo = mkdtempSync(join(tmpdir(), "tribuzen-git-lab01-"));
  console.log(`\n— dépôt scratch : ${repo} —\n`);

  function run(cmd) {
    return execSync(`git ${cmd}`, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  }
  function commitFile(filename, content, message) {
    writeFileSync(join(repo, filename), content);
    run(`add ${filename}`);
    run(`commit -m "${message}"`);
  }

  run("init -q -b main");
  run('config user.email "lab@tribuzen.test"');
  run('config user.name "Lab TribuZen"');
  writeFileSync(join(repo, "README.md"), "TribuZen\n");
  run("add README.md");
  run('commit -m "Initial commit"');
  const initial = run("rev-parse HEAD");

  const { applyPlan } = await import(pathToFileURL(PLAN_PATH).href);
  try {
    await applyPlan({ run, commitFile });
  } catch (e) {
    check(`applyPlan s'exécute sans erreur (${e.message})`, false);
    rmSync(repo, { recursive: true, force: true });
    return;
  }
  check("applyPlan s'exécute sans erreur", true);

  // ── Vérifications de topologie (la vraie preuve) ────────────────────────────────────────
  let hotfixCommit = "";
  try {
    hotfixCommit = run("log hotfix/urgent --format=%H -1");
  } catch {
    /* la branche n'existe peut-être pas — vérifié juste après */
  }
  check("la branche hotfix/urgent existe", hotfixCommit.length > 0);

  if (hotfixCommit) {
    const parentDeHotfix = run(`log ${hotfixCommit} --format=%P -1`).trim();
    check(
      "hotfix/urgent est branché DEPUIS main (son commit initial a pour parent le commit initial), pas depuis une feature",
      parentDeHotfix === initial,
    );
  }

  let f3Commit = "";
  try {
    f3Commit = run("log feature/f3 --format=%H -1");
  } catch {
    /* vérifié juste après */
  }
  check("la branche feature/f3 existe", f3Commit.length > 0);

  if (hotfixCommit && f3Commit) {
    let f3ContientHotfix = false;
    try {
      run(`merge-base --is-ancestor ${hotfixCommit} feature/f3`);
      f3ContientHotfix = true;
    } catch {
      f3ContientHotfix = false;
    }
    check("feature/f3 a été créée APRÈS le hotfix (elle en hérite)", f3ContientHotfix);
  }

  for (const fichier of ["f1.txt", "f2.txt", "f3.txt", "hotfix.txt", "README.md"]) {
    let present = false;
    try {
      run(`cat-file -e main:${fichier}`);
      present = true;
    } catch {
      present = false;
    }
    check(`main contient bien ${fichier} (tout a fini par y être mergé)`, present);
  }

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
