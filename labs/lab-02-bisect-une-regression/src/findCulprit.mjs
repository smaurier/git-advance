// findCulprit.mjs — PAGE BLANCHE. Une VRAIE régression, dans un VRAI historique de 10
// commits (préparé par l'oracle) : `calc.mjs` (une fonction `add`) casse à un endroit précis
// de l'historique, et reste cassée jusqu'à `HEAD`. Un script `check.mjs`, committé à CHAQUE
// commit, dit si CE commit est sain (exit 0) ou cassé (exit 1) — exactement le contrat que
// `git bisect run` attend.
//
// export async function findCulprit({ run, firstCommit }): Promise<string>
//   - `run(cmd: string): string` — exécute `git <cmd>` dans le dépôt (déjà positionné sur
//     `main`, à `HEAD` = le 10e commit, connu CASSÉ).
//   - `firstCommit: string` — le SHA du tout premier commit, connu SAIN (donné, tu n'as pas
//     à le chercher).
//   - Utilise `git bisect start` / `git bisect bad` / `git bisect good <firstCommit>` /
//     `git bisect run node check.mjs` pour trouver AUTOMATIQUEMENT le commit fautif (celui
//     qui a introduit la régression) — PAS une recherche manuelle, PAS une boucle "for"
//     JS qui checkout chaque commit un par un (ça marcherait, mais ce n'est pas le sujet :
//     `git bisect` fait une VRAIE recherche binaire, O(log n), c'est ce que ce lab prouve).
//   - Après la recherche, `git bisect reset` pour remettre le dépôt sur `main`.
//   - Retourne le SHA COMPLET du commit fautif identifié par bisect.
export async function findCulprit(_ctx) {
  throw new Error("findCulprit n'est pas encore implémenté");
}
