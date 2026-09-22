// plan.mjs — PAGE BLANCHE. Le scénario TribuZen (GitHub Flow — module 02) : deux features en
// cours de développement, et un bug critique tombe en pleine session de travail sur
// `feature/f1`. Écris la SÉQUENCE RÉELLE de commandes git qui applique la bonne stratégie de
// branches — c'est un vrai dépôt git scratch qui reçoit ces commandes, pas une simulation.
//
// export async function applyPlan({ run, commitFile })
//   - `run(cmd: string): string` — exécute `git <cmd>` dans le dépôt scratch (créé par
//     l'oracle, déjà sur `main` avec un premier commit) et renvoie la sortie.
//   - `commitFile(filename: string, content: string, message: string): void` — écrit
//     `filename` avec `content`, `git add`, `git commit -m message`, dans la branche
//     COURANTE (celle où tu es positionné au moment de l'appel).
//
// Scénario à reproduire, DANS CET ORDRE :
//   1. Branche `feature/f1` depuis `main`, commit `f1.txt` ("F1: work").
//   2. Branche `feature/f2` depuis `main`, commit `f2.txt` ("F2: work").
//   3. Un bug CRITIQUE tombe. Reviens sur `main`, branche `hotfix/urgent` DEPUIS `main`
//      (jamais depuis une feature en cours — le hotfix ne doit dépendre d'AUCUN travail de
//      feature non terminé), commit `hotfix.txt` ("Hotfix: fix critical bug").
//   4. Merge `hotfix/urgent` dans `main` (`--no-ff` pour garder la trace du merge).
//   5. Branche `feature/f3` depuis `main` (maintenant à jour du hotfix), commit `f3.txt`
//      ("F3: work").
//   6. Merge `feature/f1`, `feature/f2`, puis `feature/f3` dans `main`.
//
// LE PIÈGE (le sujet réel du lab) : au moment où le bug tombe, tu es probablement encore
// positionné sur `feature/f1` (tu y travaillais). Faire `checkout -b hotfix/urgent` À CE
// MOMENT-LÀ, sans revenir sur `main` d'abord, branche le hotfix depuis `feature/f1` — il
// embarque alors TOUT le travail (pas forcément terminé, pas forcément revu) de f1. Le
// hotfix doit dépendre UNIQUEMENT de `main`, jamais d'une feature en cours.
export async function applyPlan(_ctx) {
  throw new Error("applyPlan n'est pas encore implémenté");
}
