#!/usr/bin/env node
// Oracle du lab 03 (Git avancé) : un VRAI dépôt scratch, une VRAIE branche WIP à 4 commits,
// un VRAI rebase interactif piloté sans éditeur (GIT_SEQUENCE_EDITOR/GIT_EDITOR). Usage :
// node run-oracle.mjs lab | solution
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "solution" ? "solution" : "lab";
const PLAN_PATH = join(HERE, mode === "solution" ? "solution/cleanHistory.mjs" : "src/cleanHistory.mjs");

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "✅" : "❌"} ${label}`);
  if (!condition) failed = true;
}

async function main() {
  const repo = mkdtempSync(join(tmpdir(), "tribuzen-git-lab03-"));
  console.log(`\n— dépôt scratch : ${repo} —\n`);

  function run(cmd, extraEnv) {
    return execSync(`git ${cmd}`, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    }).trim();
  }

  run("init -q -b main");
  run('config user.email "lab@tribuzen.test"');
  run('config user.name "Lab TribuZen"');
  writeFileSync(join(repo, "README.md"), "TribuZen\n");
  run("add README.md");
  run('commit -m "Initial commit"');
  const base = run("rev-parse HEAD");

  run("checkout -b feature/messy");
  const etapes = [
    { contenu: "// v1 du formulaire\n", message: "wip" },
    { contenu: "// v1 du formulaire\n// + validation email\n", message: "wip 2" },
    { contenu: "// v1 du formulaire\n// + validation email\n// correction bug\n", message: "fix" },
    {
      contenu: "// v1 du formulaire\n// + validation email\n// correction bug\n// nettoyage final\n",
      message: "actually done",
    },
  ];
  for (const etape of etapes) {
    writeFileSync(join(repo, "invite-form.mjs"), etape.contenu);
    run("add invite-form.mjs");
    run(`commit -m "${etape.message}"`);
  }
  const contenuFinalAttendu = etapes[etapes.length - 1].contenu;
  const nombreCommitsAvant = run(`rev-list --count ${base}..HEAD`);

  const { cleanHistory } = await import(pathToFileURL(PLAN_PATH).href);
  try {
    await cleanHistory({ run, base });
  } catch (e) {
    check(`cleanHistory s'exécute sans erreur (${e.message})`, false);
    try {
      run("rebase --abort");
    } catch {
      /* rien à annuler */
    }
    rmSync(repo, { recursive: true, force: true });
    return;
  }
  check("cleanHistory s'exécute sans erreur", true);

  check(
    `l'historique avant nettoyage avait bien ${nombreCommitsAvant} commits WIP (le point de départ du lab)`,
    nombreCommitsAvant === "4",
  );

  const nombreCommitsApres = run(`rev-list --count ${base}..HEAD`);
  check("feature/messy n'a plus qu'UN SEUL commit au-dessus de main", nombreCommitsApres === "1");

  const messageFinal = run("log -1 --format=%s").toLowerCase();
  check(
    'le message ne contient plus "wip", "fix" ni "actually" (plus un historique de brouillon)',
    !/wip|fix|actually/.test(messageFinal),
  );

  const contenuActuel = run("show HEAD:invite-form.mjs");
  check(
    "le contenu final du fichier est identique à ce qu'il était avant (aucun travail perdu dans le squash)",
    contenuActuel === contenuFinalAttendu.trim(),
  );

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
