// resolveConflict.mjs — PAGE BLANCHE. `main` et `feature/notifications` ont chacun ajouté
// une clé DIFFÉRENTE au même endroit de `family-settings.mjs` (juste après `locale`) : un
// conflit de fusion RÉEL, pas simulé — les deux ajouts sont légitimes, aucun ne doit
// disparaître (module 09 : résoudre un conflit sans perdre de travail).
//
// export async function resolveConflict({ run, repoDir })
//   - `run(cmd: string): string` — exécute `git <cmd>` dans le dépôt (positionné sur
//     `main`, feature/notifications existe mais n'est pas encore fusionnée).
//   - `repoDir: string` — chemin absolu du dépôt, pour lire/écrire le fichier en conflit
//     avec `node:fs` (un conflit, une fois déclaré par git, s'édite dans le contenu du
//     fichier — pas seulement par des commandes git).
//
//   Après ton implémentation :
//   - `feature/notifications` doit être fusionnée dans `main` (un vrai `git merge`, pas un
//     cherry-pick ni une réécriture manuelle qui contourne l'historique).
//   - Le fichier `family-settings.mjs` final doit contenir LES DEUX nouvelles clés :
//     `timezone` (ajoutée sur `main`) ET `notificationChannel` (ajoutée sur
//     `feature/notifications`) — ainsi que `familyName` et `locale`, jamais touchées.
//   - AUCUN marqueur de conflit (`<<<<<<<`, `=======`, `>>>>>>>`) ne doit rester dans le
//     fichier final.
//   - Le dépôt doit être dans un état propre (pas de merge en cours, rien à committer).
//
// COMMENT RÉSOUDRE UN CONFLIT RÉEL (le point du lab, module 09) :
// `git merge feature/notifications` va échouer (exit code non-zéro) et laisser le fichier
// avec des marqueurs `<<<<<<< HEAD` / `=======` / `>>>>>>> feature/notifications` autour des
// deux versions concurrentes. Lis le fichier (`readFileSync`), réécris son contenu propre
// en gardant les DEUX intentions (`writeFileSync`), puis `git add` + `git commit --no-edit`
// pour terminer le merge SANS ouvrir d'éditeur (git a déjà préparé le message de fusion).
export async function resolveConflict(_ctx) {
  throw new Error("resolveConflict n'est pas encore implémenté");
}
