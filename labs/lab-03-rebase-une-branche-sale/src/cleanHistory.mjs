// cleanHistory.mjs — PAGE BLANCHE. `feature/messy` (préparée par l'oracle, branchée sur
// `main`) porte 4 commits WIP réels : "wip", "wip 2", "fix", "actually done" — le genre
// d'historique qu'on ne montre JAMAIS dans une PR (module 04). Nettoie-le AVANT la revue :
// un seul commit, message clair, AUCUN travail perdu.
//
// export async function cleanHistory({ run, base, env })
//   - `run(cmd: string, extraEnv?: object): string` — exécute `git <cmd>` dans le dépôt
//     (positionné sur `feature/messy`), avec des variables d'environnement additionnelles
//     optionnelles (utile pour piloter un rebase interactif sans éditeur — voir ci-dessous).
//   - `base: string` — le SHA du commit `main` dont `feature/messy` est partie.
//
//   Après ton implémentation :
//   - `feature/messy` doit avoir EXACTEMENT UN SEUL commit au-dessus de `base`.
//   - Le message de ce commit ne doit PLUS contenir "wip", "fix" ni "actually" (peu importe
//     la casse) — un message clair, au format `Verbe à l'infinitif : ce que ça fait`.
//   - Le contenu final du fichier `invite-form.mjs` doit être IDENTIQUE à ce qu'il était
//     avant le nettoyage (squash = compacter l'historique, jamais perdre de travail).
//
// COMMENT AUTOMATISER un rebase interactif SANS éditeur (le point du lab, module 04) :
// `git rebase -i <base>` ouvre normalement un éditeur pour choisir les verbes (pick/squash),
// PUIS un second éditeur pour fusionner les messages. Pilote les DEUX sans jamais ouvrir
// d'éditeur réel, via les variables d'environnement `GIT_SEQUENCE_EDITOR` (réécrit le TODO :
// garde "pick" sur la première ligne, passe les suivantes en "squash") et `GIT_EDITOR`
// (accepte le message combiné généré, tu le corrigeras après avec `commit --amend -m`).
export async function cleanHistory(_ctx) {
  throw new Error("cleanHistory n'est pas encore implémenté");
}
