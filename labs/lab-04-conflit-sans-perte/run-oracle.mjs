#!/usr/bin/env node
// Oracle du lab 04 (Git avancé) : un VRAI dépôt scratch, un VRAI conflit de merge (deux
// branches insèrent chacune une clé différente au même endroit), résolu à la main sans
// perdre aucune des deux intentions. Usage : node run-oracle.mjs lab | solution
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "solution" ? "solution" : "lab";
const PLAN_PATH = join(HERE, mode === "solution" ? "solution/resolveConflict.mjs" : "src/resolveConflict.mjs");

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "✅" : "❌"} ${label}`);
  if (!condition) failed = true;
}

const FICHIER = "family-settings.mjs";
const BASE = `export const settings = {
  familyName: "Martin",
  locale: "fr-FR",
};
`;
const VERSION_MAIN = `export const settings = {
  familyName: "Martin",
  locale: "fr-FR",
  timezone: "Europe/Paris",
};
`;
const VERSION_FEATURE = `export const settings = {
  familyName: "Martin",
  locale: "fr-FR",
  notificationChannel: "email",
};
`;

async function main() {
  const repo = mkdtempSync(join(tmpdir(), "tribuzen-git-lab04-"));
  console.log(`\n— dépôt scratch : ${repo} —\n`);

  function run(cmd) {
    return execSync(`git ${cmd}`, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }

  run("init -q -b main");
  run('config user.email "lab@tribuzen.test"');
  run('config user.name "Lab TribuZen"');
  writeFileSync(join(repo, FICHIER), BASE);
  run(`add ${FICHIER}`);
  run('commit -m "Réglages de la famille : version initiale"');

  run("checkout -b feature/notifications");
  writeFileSync(join(repo, FICHIER), VERSION_FEATURE);
  run(`add ${FICHIER}`);
  run('commit -m "Ajouter le canal de notification par défaut"');

  run("checkout main");
  writeFileSync(join(repo, FICHIER), VERSION_MAIN);
  run(`add ${FICHIER}`);
  run('commit -m "Ajouter le fuseau horaire par défaut"');

  // Sanity check de l'oracle lui-même : le scénario doit VRAIMENT produire un conflit —
  // jamais supposer, toujours vérifier avant de noter le lab dessus.
  let conflitReel = false;
  try {
    run('merge feature/notifications --no-ff -m "sonde"');
  } catch {
    conflitReel = true;
    run("merge --abort");
  }
  if (!conflitReel) {
    throw new Error("le scénario ne produit pas de conflit réel — bug de l'oracle, pas du lab");
  }

  const { resolveConflict } = await import(pathToFileURL(PLAN_PATH).href);
  try {
    await resolveConflict({ run, repoDir: repo });
  } catch (e) {
    check(`resolveConflict s'exécute sans erreur (${e.message})`, false);
    try {
      run("merge --abort");
    } catch {
      /* rien à annuler */
    }
    rmSync(repo, { recursive: true, force: true });
    return;
  }
  check("resolveConflict s'exécute sans erreur", true);

  const statut = run("status --porcelain");
  check("le dépôt est propre après résolution (rien à committer, aucun conflit en cours)", statut === "");

  let mergeEnCours = true;
  try {
    run("rev-parse -q --verify MERGE_HEAD");
  } catch {
    mergeEnCours = false;
  }
  check("le merge est terminé (pas de MERGE_HEAD résiduel)", !mergeEnCours);

  check(
    "feature/notifications est bien fusionnée dans main (vrai merge, pas un contournement)",
    (() => {
      try {
        run("merge-base --is-ancestor feature/notifications main");
        return true;
      } catch {
        return false;
      }
    })(),
  );

  const contenuFinal = run(`show HEAD:${FICHIER}`);
  check("aucun marqueur de conflit ne subsiste dans le fichier final", !/<{7}|={7}|>{7}/.test(contenuFinal));
  check('le fuseau horaire ajouté sur main est préservé ("timezone")', /timezone:\s*"Europe\/Paris"/.test(contenuFinal));
  check(
    'le canal de notification ajouté sur feature/notifications est préservé ("notificationChannel")',
    /notificationChannel:\s*"email"/.test(contenuFinal),
  );
  check(
    "les clés déjà présentes avant le conflit (familyName, locale) n'ont pas été perdues",
    /familyName:\s*"Martin"/.test(contenuFinal) && /locale:\s*"fr-FR"/.test(contenuFinal),
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
