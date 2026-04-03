# Glossaire Git Avancé

## B

**Bisect** — Commande Git qui utilise une recherche binaire pour trouver le commit qui a introduit un bug. On marque un commit "good" et un "bad", Git teste automatiquement les commits intermédiaires.

**Blob** — Objet Git stockant le contenu d'un fichier. Identifié par le hash SHA-1 de son contenu.

**Branch** — Pointeur mobile vers un commit. Techniquement un fichier dans `.git/refs/heads/` contenant un hash SHA-1.

## C

**Cherry-pick** — Appliquer un commit spécifique d'une branche sur une autre, créant un nouveau commit avec le même diff.

**Commit** — Objet Git contenant un pointeur vers un tree, le(s) parent(s), l'auteur, le committer et le message.

## D

**Dangling object** — Objet Git (commit, blob, tree) qui n'est référencé par aucune branche, tag ou autre référence.

**Detached HEAD** — État où HEAD pointe directement vers un commit plutôt que vers une branche.

## F

**Fast-forward** — Type de merge où la branche cible est simplement avancée au commit de la branche source (pas de commit de merge).

**Fixup** — Commit destiné à être fusionné avec un commit précédent lors d'un rebase interactif (`git commit --fixup=<hash>`).

## G

**GC (Garbage Collection)** — Processus de nettoyage des objets non référencés et de compression en packfiles (`git gc`).

## H

**HEAD** — Référence spéciale pointant vers le commit actuel ou la branche active. Fichier `.git/HEAD`.

**Hook** — Script exécuté automatiquement lors d'événements Git (pre-commit, commit-msg, pre-push, etc.). Stockés dans `.git/hooks/`.

## I

**Index (staging area)** — Zone intermédiaire entre le working directory et le repository. Les fichiers sont "staged" avant d'être committés.

## M

**Merge commit** — Commit spécial avec deux parents, créé lors d'un merge non fast-forward.

**Monorepo** — Stratégie de gestion de code où plusieurs projets/packages cohabitent dans un seul dépôt Git.

## O

**Object** — Unité fondamentale de stockage Git. Quatre types : blob (fichier), tree (répertoire), commit, tag annoté.

**Octopus merge** — Merge de plus de 2 branches simultanément (utilisé en interne par Linux pour les merges de sous-systèmes).

## P

**Packfile** — Format compressé de stockage des objets Git, utilisant le delta compression pour réduire l'espace disque.

**Partial clone** — Clone qui ne télécharge pas tous les blobs immédiatement (`--filter=blob:none`), les récupérant à la demande.

## R

**Rebase** — Opération qui rejoue les commits d'une branche sur une nouvelle base, créant un historique linéaire.

**Rebase interactif** — Rebase avec interface permettant de réordonner, squash, edit, fixup ou drop des commits (`git rebase -i`).

**Reflog** — Journal local des mouvements de HEAD et des branches. Filet de sécurité pour récupérer des commits "perdus" (`git reflog`).

**Ref (référence)** — Nom lisible pointant vers un hash SHA-1 (branches, tags, HEAD, remotes).

## S

**SHA-1** — Algorithme de hachage utilisé par Git pour identifier chaque objet (40 caractères hexadécimaux). Migration vers SHA-256 en cours.

**Sparse checkout** — Configuration permettant de ne checkout qu'un sous-ensemble des fichiers du repo.

**Squash** — Fusionner plusieurs commits en un seul lors d'un rebase interactif ou d'un merge squash.

**Stash** — Sauvegarde temporaire des modifications non committées (`git stash`). Stocké comme un commit spécial.

**Submodule** — Référence à un commit spécifique d'un autre dépôt Git, inclus comme sous-répertoire.

## T

**Tag** — Référence immutable vers un commit. Tags annotés sont des objets Git complets avec message et signature.

**Tree** — Objet Git représentant un répertoire : liste de blobs (fichiers) et d'autres trees (sous-répertoires).

## W

**Worktree** — Répertoire de travail additionnel lié au même dépôt Git (`git worktree add`). Permet de travailler sur plusieurs branches simultanément sans stash.

**Working directory** — Répertoire contenant les fichiers extraits du dépôt Git sur lesquels vous travaillez.
