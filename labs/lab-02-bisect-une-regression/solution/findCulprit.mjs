// findCulprit.mjs — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
export async function findCulprit({ run, firstCommit }) {
  run("bisect start");
  run("bisect bad");
  run(`bisect good ${firstCommit}`);
  run("bisect run node check.mjs");

  // À la fin d'un `bisect run` réussi, git a DÉJÀ checkout le premier commit fautif — HEAD
  // EST la réponse, pas besoin de parser la sortie texte de `bisect run`.
  const coupable = run("rev-parse HEAD");

  run("bisect reset");
  return coupable;
}
