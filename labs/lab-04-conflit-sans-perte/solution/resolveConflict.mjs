// resolveConflict.mjs — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function resolveConflict({ run, repoDir }) {
  // 1) On tente la fusion normalement. Elle VA échouer (les deux branches ont modifié le
  //    même point d'insertion) — on laisse l'erreur passer, c'est attendu, pas un bug.
  try {
    run('merge feature/notifications --no-ff -m "Fusionner les notifications"');
  } catch {
    // conflit attendu — résolu à la main ci-dessous.
  }

  // 2) Le fichier en conflit contient les marqueurs des deux côtés. On lit le contenu réel
  //    plutôt que de supposer sa forme, pour ne résoudre que s'il y a vraiment un conflit.
  const cheminFichier = join(repoDir, "family-settings.mjs");
  const contenu = readFileSync(cheminFichier, "utf8");

  if (contenu.includes("<<<<<<<")) {
    // 3) Résolution manuelle : garder LES DEUX intentions, aucune des deux n'est fautive.
    const contenuResolu = `export const settings = {
  familyName: "Martin",
  locale: "fr-FR",
  timezone: "Europe/Paris",
  notificationChannel: "email",
};
`;
    writeFileSync(cheminFichier, contenuResolu);

    // 4) `add` marque le conflit comme résolu aux yeux de git ; `commit --no-edit` termine
    //    le merge avec le message que git avait déjà préparé — pas besoin d'éditeur.
    run("add family-settings.mjs");
    run("commit --no-edit");
  }
}
