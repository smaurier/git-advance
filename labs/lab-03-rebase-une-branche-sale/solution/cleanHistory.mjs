// cleanHistory.mjs — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
export async function cleanHistory({ run, base }) {
  // 1) GIT_SEQUENCE_EDITOR réécrit le TODO du rebase interactif SANS ouvrir d'éditeur réel :
  //    garde "pick" sur la première ligne, passe toutes les suivantes en "squash".
  // 2) GIT_EDITOR=true accepte le message combiné par défaut (les 4 messages concaténés) —
  //    volontairement pas "propre" à cette étape, corrigé juste après avec --amend.
  run("rebase -i " + base, {
    GIT_SEQUENCE_EDITOR: "sed -i '2,$ s/^pick/squash/'",
    GIT_EDITOR: "true",
  });

  // Le message combiné automatique est un empilement des 4 messages WIP — on le remplace
  // par un message clair, SANS toucher au contenu déjà squashé.
  run('commit --amend -m "Ajouter le formulaire d\'invitation famille"');
}
