// plan.mjs — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
export async function applyPlan({ run, commitFile }) {
  // 1. feature/f1 depuis main
  run("checkout -b feature/f1 main");
  commitFile("f1.txt", "f1", "F1: work");

  // 2. feature/f2 depuis main (on repart bien de main, pas de f1)
  run("checkout -b feature/f2 main");
  commitFile("f2.txt", "f2", "F2: work");

  // 3. Bug critique : on revient sur main AVANT de brancher le hotfix — jamais depuis f1/f2,
  //    même si on était physiquement positionné sur feature/f2 juste avant.
  run("checkout main");
  run("checkout -b hotfix/urgent main");
  commitFile("hotfix.txt", "fix", "Hotfix: fix critical bug");

  // 4. Le hotfix rejoint main tout de suite, sans attendre aucune feature.
  run("checkout main");
  run('merge --no-ff hotfix/urgent -m "Merge hotfix/urgent"');

  // 5. feature/f3 démarre APRÈS le hotfix — elle en hérite naturellement, sans rien faire de
  //    spécial.
  run("checkout -b feature/f3 main");
  commitFile("f3.txt", "f3", "F3: work");

  // 6. Les features rejoignent main quand elles sont prêtes.
  run("checkout main");
  run('merge --no-ff feature/f1 -m "Merge feature/f1"');
  run('merge --no-ff feature/f2 -m "Merge feature/f2"');
  run('merge --no-ff feature/f3 -m "Merge feature/f3"');
}
